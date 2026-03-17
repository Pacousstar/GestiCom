'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Upload, Download, Loader2, Pencil, Trash2, AlertTriangle, FileSpreadsheet, X } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { produitSchema } from '@/lib/validations'
import { validateForm, formatApiError } from '@/lib/validation-helpers'
import Pagination from '@/components/ui/Pagination'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'
import { formatDate } from '@/lib/format-date'

type Produit = {
  id: number
  code: string
  codeBarres: string | null
  designation: string
  categorie: string
  unite: string
  prixAchat: number | null
  prixVente: number | null
  seuilMin: number
  createdAt: string
}

type Stats = { total: number; enStock: number; totalConsolide: number | null }
type Magasin = { id: number; code: string; nom: string }

export default function ProduitsPage() {
  const searchParams = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  const [q, setQ] = useState(qFromUrl)
  const [list, setList] = useState<Produit[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<string[]>(['DIVERS'])
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState<Produit | null>(null)
  const [editPrix, setEditPrix] = useState({ prixAchat: '', prixVente: '' })
  const [err, setErr] = useState('')
  const [savingPrix, setSavingPrix] = useState(false)
  const [deleting, setDeleting] = useState<Produit | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    codeBarres: '',
    designation: '',
    categorie: 'DIVERS',
    unite: 'unite',
    magasinId: '',
    prixAchat: '',
    prixVente: '',
    seuilMin: '5',
    quantiteInitiale: '0',
  })

  const fetchList = async (page?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page ?? currentPage),
        limit: '20',
      })
      if (q) params.set('q', q)
      const res = await fetch(`/api/produits?${params.toString()}`)
      if (res.ok) {
        const response = await res.json()
        if (response.data) {
          setList(response.data)
          setPagination(response.pagination)
        } else {
          // Compatibilité avec l'ancien format
          setList(Array.isArray(response) ? response : [])
          setPagination(null)
        }
      } else {
        setList([])
        setPagination(null)
      }
    } catch {
      setList([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setQ(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    setCurrentPage(1)
    fetchList(1)
  }, [q])

  useEffect(() => {
    fetchList()
  }, [currentPage])

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N ou Cmd+N : Nouveau produit
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !form) {
        e.preventDefault()
        setFormData({ code: '', codeBarres: '', designation: '', categorie: 'DIVERS', unite: 'unite', magasinId: '', prixAchat: '', prixVente: '', seuilMin: '5', quantiteInitiale: '0' })
        setForm(true)
        fetchNextCode('DIVERS')
      }
      // Échap : Fermer le formulaire
      if (e.key === 'Escape' && form) {
        setForm(false)
        setEditing(null)
        setErr('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchList(page)
  }

  const fetchStats = () => {
    fetch('/api/produits/stats').then((r) => (r.ok ? r.json() : null)).then((s) => { if (s) setStats(s) })
  }

  const fetchCategories = () => {
    fetch('/api/produits/categories')
      .then((r) => (r.ok ? r.json() : ['DIVERS']))
      .then((cat) => setCategories(Array.isArray(cat) && cat.length ? cat : ['DIVERS']))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/produits/stats').then((r) => (r.ok ? r.json() : { total: 0, enStock: 0, totalConsolide: null })),
      fetch('/api/produits/categories').then((r) => (r.ok ? r.json() : ['DIVERS'])),
      fetch('/api/magasins').then((r) => (r.ok ? r.json() : [])),
    ]).then(([st, cat, mags]) => {
      setStats(st)
      setCategories(Array.isArray(cat) && cat.length ? cat : ['DIVERS'])
      setMagasins(Array.isArray(mags) ? mags : [])
    })
  }, [])

  useEffect(() => {
    fetchStats()
    fetchCategories()
  }, [list])

  const openEditPrix = (p: Produit) => {
    setEditing(p)
    setEditPrix({
      prixAchat: p.prixAchat != null ? String(p.prixAchat) : '',
      prixVente: p.prixVente != null ? String(p.prixVente) : '',
    })
    setErr('')
  }

  const handleSavePrix = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSavingPrix(true)
    setErr('')
    try {
      const res = await fetch(`/api/produits/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prixAchat: editPrix.prixAchat === '' ? null : Math.max(0, Number(editPrix.prixAchat)),
          prixVente: editPrix.prixVente === '' ? null : Math.max(0, Number(editPrix.prixVente)),
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setEditing(null)
        fetchList()
        showSuccess('Prix modifiés avec succès.')
      } else {
        const errorMsg = formatApiError(d.error || 'Erreur lors de la modification.')
        setErr(errorMsg)
        showError(errorMsg)
      }
    } catch (e) {
      const errorMsg = formatApiError(e)
      setErr(errorMsg)
      showError(errorMsg)
    } finally { setSavingPrix(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/produits/${deleting.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setDeleting(null)
        fetchList()
        showSuccess(data.softDeleted ? 'Produit archivé ( historique conservé).' : 'Produit supprimé définitivement.')
      } else {
        showError(data.error || 'Erreur lors de la suppression.')
      }
    } catch (e) {
      showError('Erreur réseau lors de la suppression.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImportExcel = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImporting(true)
      setErr('')
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'produits')
        const res = await fetch('/api/import/excel', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (res.ok) {
          let msg = `Import Excel OK: ${data.created} créés, ${data.updated} mis à jour.`
          if (data.errors && data.errors.length > 0) {
            msg += `\n\nErreurs:\n${data.errors.slice(0, 5).join('\n')}`
            if (data.errors.length > 5) msg += `\n... et ${data.errors.length - 5} autres`
          }
          showSuccess(msg)
          fetchList()
          // Notifier les autres pages pour rafraîchir leurs listes de produits
          window.dispatchEvent(new CustomEvent('produit-created'))
        } else {
          showError(formatApiError(data.error || 'Erreur import Excel'))
        }
      } catch (e) {
        showError(formatApiError(e))
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/produits/export')
      if (!res.ok) {
        const data = await res.json()
        showError(formatApiError(data.error || 'Erreur lors de l\'export Excel'))
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'produits.xlsx'
        : 'produits.xlsx'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess('Export Excel réussi.')
    } catch (e) {
      showError(formatApiError(e))
    }
  }

  const fetchNextCode = (categorie: string) => {
    fetch('/api/produits/next-code?categorie=' + encodeURIComponent(categorie || 'DIVERS'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.nextCode) {
          setFormData((f) => ({ ...f, code: data.nextCode }))
        }
      })
  }

  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const designation = formData.designation.trim()
    if (!form || designation.length < 2) return
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)
    suggestTimeoutRef.current = setTimeout(() => {
      suggestTimeoutRef.current = null
      const requestedDesignation = designation
      fetch('/api/produits/suggest?designation=' + encodeURIComponent(requestedDesignation))
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.code == null && data?.categorie == null) return
          setFormData((f) => {
            if (f.designation.trim() !== requestedDesignation) return f
            return {
              ...f,
              ...(data.code != null && { code: data.code }),
              ...(data.categorie != null && { categorie: data.categorie }),
            }
          })
          if (data.categorie) {
            setCategories((prev) =>
              prev.includes(data.categorie) ? prev : [...prev, data.categorie].sort((a, b) => a.localeCompare(b, 'fr'))
            )
          }
        })
    }, 400)
    return () => {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)
    }
  }, [form, formData.designation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')

    const validationData = {
      code: formData.code.trim().toUpperCase(),
      designation: formData.designation.trim(),
      categorie: formData.categorie.trim() || 'DIVERS',
      prixAchat: formData.prixAchat ? Number(formData.prixAchat) : null,
      prixVente: formData.prixVente ? Number(formData.prixVente) : null,
      seuilMin: Math.max(0, Number(formData.seuilMin) || 5),
    }

    const validation = validateForm(produitSchema, validationData)
    if (!validation.success) {
      setErr(validation.error)
      showError(validation.error)
      return
    }

    // POINT DE VENTE OBLIGATOIRE
    if (!formData.magasinId || formData.magasinId === '') {
      setErr('Le point de vente est obligatoire.')
      showError('Le point de vente est obligatoire pour créer un produit.')
      return
    }

    const requestData = {
      ...validationData,
      codeBarres: formData.codeBarres.trim() || null,
      unite: formData.unite || 'unite',
      magasinId: Number(formData.magasinId),
      quantiteInitiale: Math.max(0, Number(formData.quantiteInitiale) || 0),
    }

    // Dans GestiCom Offline, on enregistre toujours vers le serveur local.

    try {
      const res = await fetch('/api/produits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })
      const data = await res.json()
      if (res.ok) {
        setForm(false)
        setFormData({ code: '', codeBarres: '', designation: '', categorie: 'DIVERS', unite: 'unite', magasinId: '', prixAchat: '', prixVente: '', seuilMin: '5', quantiteInitiale: '0' })
        setCurrentPage(1)
        fetchList(1)
        // Notifier les autres pages pour rafraîchir leurs listes de produits
        window.dispatchEvent(new CustomEvent('produit-created'))
        showSuccess(`Produit ${data.code} créé avec succès.`)
        // Rafraîchir plusieurs fois pour être sûr (problème cache parfois en standalone)
        fetchList(1)
        setTimeout(() => fetchList(1), 500)
        setTimeout(() => fetchStats(), 1000)
      } else {
        const errorMsg = formatApiError(data.error || 'Erreur lors de la création.')
        setErr(errorMsg)
        showError(errorMsg)
      }
    } catch (e) {
      const errorMsg = formatApiError(e)
      setErr(errorMsg)
      showError(errorMsg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Produits</h1>
          <p className="mt-1 text-white/90">Catalogue et gestion des articles</p>
          <p className="mt-1 text-sm font-medium text-white/80">
            Total : <span className="text-amber-300 font-bold">{stats?.total ?? '—'}</span>
            {' · '}En stock : <span className="text-emerald-300 font-bold">{stats?.enStock ?? '—'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleImportExcel}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-60"
            title="Importer depuis un fichier Excel (.xlsx, .xls). Colonnes: Code, Designation, Categorie, PrixAchat, PrixVente, SeuilMin"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            title="Exporter tous les produits vers un fichier Excel"
          >
            <Download className="h-4 w-4" />
            Exporter Excel
          </button>
          <button
            onClick={() => {
              setFormData({ code: '', codeBarres: '', designation: '', categorie: 'DIVERS', unite: 'unite', magasinId: '', prixAchat: '', prixVente: '', seuilMin: '5', quantiteInitiale: '0' })
              setForm(true)
              fetchNextCode('DIVERS')
            }}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            title="Nouveau produit (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
            Nouveau
            <span className="hidden sm:inline text-xs opacity-75 ml-1">(Ctrl+N)</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Rechercher par code, désignation, catégorie..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {form && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouveau produit</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Ligne 1 : Code + Désignation + Catégorie + Point de vente */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Code *</label>
              <input
                required
                value={formData.code}
                onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
              <p className="mt-0.5 text-xs text-gray-500">Suggéré selon la catégorie ou la désignation</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Désignation *</label>
              <input
                required
                value={formData.designation}
                onChange={(e) => setFormData((f) => ({ ...f, designation: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
              <p className="mt-0.5 text-xs text-gray-500">Code et catégorie suggérés automatiquement à partir des produits similaires en base.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Catégorie *</label>
              <input
                list="categories-list"
                value={formData.categorie}
                onChange={(e) => {
                  const cat = e.target.value.toUpperCase()
                  setFormData((f) => ({ ...f, categorie: cat }))
                  if (cat.length >= 1) fetchNextCode(cat)
                }}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                placeholder="Ex: BOISSONS"
                required
              />
              <datalist id="categories-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-0.5 text-xs text-gray-500">Choisissez ou tapez une nouvelle catégorie</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Point de vente *</label>
              <select
                required
                value={formData.magasinId}
                onChange={(e) => setFormData((f) => ({ ...f, magasinId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="">— Choisir un point de vente —</option>
                {magasins.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>
                ))}
              </select>
              <p className="mt-0.5 text-xs text-gray-500">Le produit sera en stock uniquement dans ce point de vente (obligatoire)</p>
            </div>
            {/* Ligne 2 : Code-barres + Unité + Prix achat + Prix vente */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Code-barres (EAN-13/QR)</label>
              <input
                value={formData.codeBarres}
                onChange={(e) => setFormData((f) => ({ ...f, codeBarres: e.target.value }))}
                placeholder="Ex: 3017620422003"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none font-mono text-sm"
              />
              <p className="mt-0.5 text-xs text-gray-500">Permet la détection automatique via le scanner caméra 📷</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unité de vente</label>
              <select
                value={formData.unite}
                onChange={(e) => setFormData((f) => ({ ...f, unite: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="unite">Unité (pièce)</option>
                <option value="kg">Kilogramme (kg)</option>
                <option value="g">Gramme (g)</option>
                <option value="litre">Litre (L)</option>
                <option value="cl">Centilitre (cl)</option>
                <option value="m">Mètre (m)</option>
                <option value="m2">Mètre carré (m²)</option>
                <option value="m3">Mètre cube (m³)</option>
                <option value="boite">Boîte</option>
                <option value="carton">Carton</option>
                <option value="sachet">Sachet</option>
                <option value="heure">Heure (service)</option>
                <option value="jour">Jour (service)</option>
                <option value="forfait">Forfait (service)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prix d&apos;achat (FCFA)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.prixAchat}
                onChange={(e) => setFormData((f) => ({ ...f, prixAchat: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prix de vente (FCFA)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.prixVente}
                onChange={(e) => setFormData((f) => ({ ...f, prixVente: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Seuil min.</label>
              <input
                type="number"
                min="0"
                value={formData.seuilMin}
                onChange={(e) => setFormData((f) => ({ ...f, seuilMin: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité initiale *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantiteInitiale}
                onChange={(e) => setFormData((f) => ({ ...f, quantiteInitiale: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
              <p className="mt-0.5 text-xs text-gray-500">Stock initial dans le magasin sélectionné</p>
            </div>
            <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-4">
              <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                Enregistrer
              </button>
              <button type="button" onClick={() => setForm(false)} className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300">
                Annuler
              </button>
            </div>
          </form>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Aucun produit. Importez depuis un fichier Excel ou ajoutez-en manuellement.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Désignation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Prix achat</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Prix vente</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Seuil</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Date création</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{(pagination ? (pagination.page - 1) * pagination.limit : 0) + idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{p.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{p.designation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.categorie}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {p.prixAchat != null ? `${Number(p.prixAchat).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {p.prixVente != null ? `${Number(p.prixVente).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{p.seuilMin}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(p.createdAt, { includeTime: true })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPrix(p)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-orange-600"
                          title="Modifier prix"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(p)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Supprimer ce produit"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Prix — {editing.code}</h3>
              <button onClick={() => setEditing(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-sm text-gray-600">{editing.designation}</p>
            <form onSubmit={handleSavePrix} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prix d&apos;achat (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editPrix.prixAchat}
                  onChange={(e) => setEditPrix((f) => ({ ...f, prixAchat: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prix de vente (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editPrix.prixVente}
                  onChange={(e) => setEditPrix((f) => ({ ...f, prixVente: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={savingPrix} className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60">Enregistrer</button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Confirmation Suppression */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Confirmer la suppression</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Voulez-vous vraiment supprimer le produit **{deleting.designation}** ({deleting.code}) ? 
              **Attention :** Cette opération est définitive et supprimera également tout l'historique associé (stocks, ventes, achats, mouvements) via la suppression en cascade.
            </p>
            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
