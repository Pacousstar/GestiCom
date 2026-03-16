'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, Loader2, Trash2, Eye, FileSpreadsheet, Printer, X, Search, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { formatApiError } from '@/lib/validation-helpers'
import { MESSAGES } from '@/lib/messages'
import { fournisseurSchema } from '@/lib/validations'
import { validateForm } from '@/lib/validation-helpers'
import Pagination from '@/components/ui/Pagination'
import { printDocument, generateLignesHTML, type TemplateData } from '@/lib/print-templates'
import PrintPreview from '@/components/print/PrintPreview'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'

type Magasin = { id: number; code: string; nom: string }
type Fournisseur = { id: number; nom: string }
type Produit = { id: number; code: string; designation: string; categorie?: string; prixAchat: number | null }
type Ligne = { produitId: number; designation: string; quantite: number; prixUnitaire: number }

export default function AchatsPage() {
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [achats, setAchats] = useState<Array<{
    id: number
    numero: string
    date: string
    montantTotal: number
    montantPaye?: number
    statutPaiement?: string
    modePaiement: string
    magasin: { code: string; nom: string }
    fournisseur: { nom: string } | null
    fournisseurLibre: string | null
    lignes: Array<{ quantite: number; prixUnitaire: number; designation: string }>
  }>>([])
  const [detailAchat, setDetailAchat] = useState<{
    id: number
    numero: string
    date: string
    montantTotal: number
    montantPaye?: number
    statutPaiement?: string
    modePaiement: string
    fournisseurLibre: string | null
    observation: string | null
    magasin: { code: string; nom: string }
    fournisseur: { nom: string; telephone?: string | null; email?: string | null } | null
    lignes: Array<{ designation: string; quantite: number; prixUnitaire: number; montant: number }>
  } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(false)
  const [err, setErr] = useState('')
  const { success: showSuccess, error: showError } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [totals, setTotals] = useState<{ montantTotal: number; montantPaye: number; resteAPayer: number } | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    magasinId: '',
    fournisseurId: '',
    fournisseurLibre: '',
    modePaiement: 'ESPECES',
    montantPaye: '',
    lignes: [] as Ligne[],
  })
  const [ajoutProduit, setAjoutProduit] = useState({ produitId: '', quantite: '1', prixUnitaire: '', recherche: '' })
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [showCreateFournisseur, setShowCreateFournisseur] = useState(false)
  const [fournisseurForm, setFournisseurForm] = useState({
    nom: '',
    telephone: '',
    email: '',
  })
  const [savingFournisseur, setSavingFournisseur] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [supprimant, setSupprimant] = useState<number | null>(null)
  const [showReglement, setShowReglement] = useState<{ id: number; numero: string; reste: number } | null>(null)
  const [reglementData, setReglementData] = useState({ montant: '', modePaiement: 'ESPECES' })
  const [savingReglement, setSavingReglement] = useState(false)

  useEffect(() => {
    fetch('/api/auth/check').then((r) => r.ok && r.json()).then((d) => d && setUserRole(d.role)).catch(() => { })
  }, [])

  const refetchProduits = () => {
    fetch('/api/produits?complet=1')
      .then((r) => (r.ok ? r.json() : []))
      .then((res) => setProduits(Array.isArray(res) ? res : []))
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/magasins').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/fournisseurs?limit=1000').then((r) => (r.ok ? r.json() : { data: [] })).then((res) => setFournisseurs(Array.isArray(res) ? res : res.data || [])),
      fetch('/api/produits?complet=1').then((r) => (r.ok ? r.json() : [])).then((res) => setProduits(Array.isArray(res) ? res : [])),
    ]).then(([m]) => {
      setMagasins(m)
    })
  }, [])

  useEffect(() => {
    if (form) refetchProduits()
  }, [form])

  // Écouter les événements de création de produit depuis d'autres pages
  useEffect(() => {
    const handleProduitCreated = () => {
      refetchProduits()
    }
    window.addEventListener('produit-created', handleProduitCreated)
    return () => window.removeEventListener('produit-created', handleProduitCreated)
  }, [])

  const fetchAchats = (overrideDeb?: string, overrideFin?: string, page?: number) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page ?? currentPage),
      limit: '20'
    })
    const deb = overrideDeb ?? dateDebut
    const fin = overrideFin ?? dateFin
    if (deb) params.set('dateDebut', deb)
    if (fin) params.set('dateFin', fin)
    fetch('/api/achats?' + params.toString())
      .then((r) => (r.ok ? r.json() : { data: [], pagination: null, totals: null }))
      .then((response) => {
        if (response.data) {
          setAchats(response.data)
          setPagination(response.pagination)
          setTotals(response.totals)
        } else {
          // Compatibilité avec l'ancien format
          setAchats(Array.isArray(response) ? response : [])
          setPagination(null)
          setTotals(null)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAchats()
  }, [currentPage])

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N ou Cmd+N : Nouvel achat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !form) {
        e.preventDefault()
        setForm(true)
      }
      // Échap : Fermer les modals
      if (e.key === 'Escape') {
        if (form) {
          setForm(false)
        } else if (detailAchat) {
          setDetailAchat(null)
        } else if (showCreateFournisseur) {
          setShowCreateFournisseur(false)
          setErr('')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form, detailAchat, showCreateFournisseur])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchAchats(undefined, undefined, page)
  }

  const addLigne = () => {
    const pid = Number(ajoutProduit.produitId)
    const q = Math.max(1, Math.floor(Number(ajoutProduit.quantite) || 0))
    const pu = Math.max(0, Number(ajoutProduit.prixUnitaire) || 0)
    const p = produits.find((x) => x.id === pid)
    if (!p || !q) return
    setFormData((f) => ({
      ...f,
      lignes: [...f.lignes, { produitId: pid, designation: p.designation, quantite: q, prixUnitaire: pu }],
    }))
    setAjoutProduit({ produitId: '', quantite: '1', prixUnitaire: '', recherche: '' })
  }

  const removeLigne = (i: number) => {
    setFormData((f) => ({ ...f, lignes: f.lignes.filter((_, j) => j !== i) }))
  }

  const handleCreateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFournisseur(true)
    setErr('')

    const validationData = {
      nom: fournisseurForm.nom.trim(),
      telephone: fournisseurForm.telephone.trim() || null,
      email: fournisseurForm.email.trim() || null,
      ncc: null,
    }

    const validation = validateForm(fournisseurSchema, validationData)
    if (!validation.success) {
      setErr(validation.error)
      showError(validation.error)
      setSavingFournisseur(false)
      return
    }

    try {
      const res = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateFournisseur(false)
        setFournisseurs((prev) => [...prev, data])
        setFormData((f) => ({ ...f, fournisseurId: String(data.id) }))
        setFournisseurForm({
          nom: '',
          telephone: '',
          email: '',
        })
        showSuccess('Fournisseur créé avec succès.')
      } else {
        const errorMsg = formatApiError(data.error || 'Erreur lors de la création.')
        setErr(errorMsg)
        showError(errorMsg)
      }
    } catch (e) {
      const errorMsg = formatApiError(e)
      setErr(errorMsg)
      showError(errorMsg)
    } finally {
      setSavingFournisseur(false)
    }
  }

  const total = formData.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  // Récupérer le templateId par défaut pour ACHAT
  const [defaultTemplateId, setDefaultTemplateId] = useState<number | null>(null)
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<TemplateData | null>(null)

  useEffect(() => {
    fetch('/api/print-templates?type=ACHAT&actif=true')
      .then((r) => (r.ok ? r.json() : []))
      .then((templates: Array<{ id: number; actif: boolean }>) => {
        const activeTemplate = templates.find((t) => t.actif)
        if (activeTemplate) {
          setDefaultTemplateId(activeTemplate.id)
        }
      })
      .catch(() => { })
  }, [])

  const imprimerAchat = async () => {
    if (!detailAchat) return
    const d = detailAchat
    const date = new Date(d.date)

    // Préparer les données pour le template
    const lignesHtml = generateLignesHTML(d.lignes.map((l) => ({
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      montant: l.montant,
    })))

    const templateData: TemplateData = {
      NUMERO: d.numero,
      DATE: date.toLocaleDateString('fr-FR'),
      HEURE: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      MAGASIN_CODE: d.magasin.code,
      MAGASIN_NOM: d.magasin.nom,
      FOURNISSEUR_NOM: d.fournisseur?.nom || d.fournisseurLibre || undefined,
      CLIENT_NOM: d.fournisseur?.nom || d.fournisseurLibre || undefined, // Pour compatibilité template
      CLIENT_CONTACT: d.fournisseur?.telephone || undefined,
      LIGNES: lignesHtml,
      TOTAL: `${Number(d.montantTotal).toLocaleString('fr-FR')} FCFA`,
      MONTANT_PAYE: d.montantPaye ? `${Number(d.montantPaye).toLocaleString('fr-FR')} FCFA` : undefined,
      RESTE: d.statutPaiement !== 'PAYE' ? `${(Number(d.montantTotal) - (Number(d.montantPaye) || 0)).toLocaleString('fr-FR')} FCFA` : undefined,
      MODE_PAIEMENT: d.modePaiement,
      OBSERVATION: d.observation || undefined,
    }



    setPrintData(templateData)
    setPrintPreviewOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    const magasinId = Number(formData.magasinId)
    if (!magasinId) { setErr('Choisissez un magasin.'); return }
    if (!formData.lignes.length) { setErr('Ajoutez au moins une ligne.'); return }

    const requestData = {
      date: formData.date || undefined,
      magasinId,
      fournisseurId: formData.fournisseurId ? Number(formData.fournisseurId) : null,
      fournisseurLibre: formData.fournisseurLibre.trim() || null,
      modePaiement: formData.modePaiement,
      montantPaye: formData.montantPaye !== '' ? Number(formData.montantPaye) : undefined,
      lignes: formData.lignes.map((l) => ({
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
    }

    // Dans GestiCom Offline, l'enregistrement se fait toujours directement vers le serveur local.

    try {
      const res = await fetch('/api/achats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })
      const data = await res.json()
      if (res.ok) {
        setForm(false)
        setFormData({
          date: new Date().toISOString().split('T')[0],
          magasinId: '',
          fournisseurId: '',
          fournisseurLibre: '',
          modePaiement: 'ESPECES',
          montantPaye: '',
          lignes: [],
        })
        setAchats((a) => [data, ...a])
        setTimeout(() => fetchAchats(undefined, undefined, 1), 500)
        showSuccess(MESSAGES.ACHAT_ENREGISTRE)
      } else {
        const errorMsg = formatApiError(data.error || 'Erreur lors de l\'enregistrement.')
        setErr(errorMsg)
        showError(errorMsg)
      }
    } catch (e) {
      const errorMsg = formatApiError(e)
      setErr(errorMsg)
      showError(errorMsg)
    }
  }

  const onSelectProduit = (id: string) => {
    const p = produits.find((x) => x.id === Number(id))
    if (p) setAjoutProduit((a) => ({ ...a, produitId: id, prixUnitaire: String(p.prixAchat ?? '') }))
  }

  const handleVoirDetail = async (id: number) => {
    setDetailAchat(null)
    setLoadingDetail(id)
    try {
      const res = await fetch(`/api/achats/${id}`)
      if (res.ok) setDetailAchat(await res.json())
    } finally {
      setLoadingDetail(null)
    }
  }

  const handleReglement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showReglement) return
    setSavingReglement(true)
    try {
      const res = await fetch(`/api/achats/${showReglement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: Number(reglementData.montant),
          modePaiement: reglementData.modePaiement
        }),
      })
      if (res.ok) {
        showSuccess('Règlement enregistré avec succès.')
        setShowReglement(null)
        setReglementData({ montant: '', modePaiement: 'ESPECES' })
        fetchAchats()
        if (detailAchat?.id === showReglement.id) {
          handleVoirDetail(showReglement.id)
        }
      } else {
        const d = await res.json()
        showError(d.error || 'Erreur lors du règlement.')
      }
    } catch (e) {
      showError('Erreur réseau.')
    } finally {
      setSavingReglement(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Achats</h1>
          <p className="mt-1 text-white/90">Approvisionnements et entrées en stock</p>
        </div>
        <button
          onClick={() => setForm(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          title="Nouvel achat (Ctrl+N)"
        >
          <Plus className="h-4 w-4" />
          Nouvel achat
          <span className="hidden sm:inline text-xs opacity-75 ml-1">(Ctrl+N)</span>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">Du</label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Au</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() => { setCurrentPage(1); fetchAchats(undefined, undefined, 1); }}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Filtrer
        </button>
        <button
          type="button"
          onClick={() => { setDateDebut(''); setDateFin(''); setCurrentPage(1); fetchAchats('', '', 1); }}
          className="rounded-lg border-2 border-orange-400 bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-900 hover:bg-orange-200"
        >
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({ limit: '1000' })
            if (dateDebut) params.set('dateDebut', dateDebut)
            if (dateFin) params.set('dateFin', dateFin)
            window.open('/api/achats/export?' + params.toString(), '_blank')
          }}
          className="rounded-lg border-2 border-green-500 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 flex items-center gap-1.5"
          title="Exporter la liste des achats en Excel"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter Excel
        </button>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({ limit: '1000' })
            if (dateDebut) params.set('dateDebut', dateDebut)
            if (dateFin) params.set('dateFin', dateFin)
            window.open('/api/achats/export-pdf?' + params.toString(), '_blank')
          }}
          className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 flex items-center gap-1.5"
          title="Exporter la liste des achats en PDF"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter PDF
        </button>
      </div>

      {form && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvel achat</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-800">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800">Magasin *</label>
                <select
                  required
                  value={formData.magasinId}
                  onChange={(e) => setFormData((f) => ({ ...f, magasinId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">—</option>
                  {magasins.map((m) => (
                    <option key={m.id} value={m.id}>{m.code} – {m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fournisseur (optionnel)</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={formData.fournisseurId}
                    onChange={(e) => setFormData((f) => ({ ...f, fournisseurId: e.target.value, fournisseurLibre: '' }))}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">—</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateFournisseur(true)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
                    title="Créer un nouveau fournisseur"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ou nom libre</label>
                <input
                  value={formData.fournisseurLibre}
                  onChange={(e) => setFormData((f) => ({ ...f, fournisseurLibre: e.target.value }))}
                  placeholder="Si pas de fiche fournisseur"
                  disabled={!!formData.fournisseurId}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 disabled:bg-gray-100 disabled:text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Paiement</label>
                <select
                  value={formData.modePaiement}
                  onChange={(e) => {
                    const mode = e.target.value
                    setFormData((f) => ({
                      ...f,
                      modePaiement: mode,
                      montantPaye: mode === 'CREDIT' ? '0' : (f.montantPaye === '' ? String(total) : f.montantPaye),
                    }))
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="CREDIT">Crédit</option>
                </select>
              </div>
            </div>

            {formData.lignes.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Paiement (avance / reste à payer)</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Total à payer</label>
                    <p className="mt-0.5 font-semibold text-gray-900">{total.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Montant payé (avance)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.montantPaye}
                      onChange={(e) => setFormData((f) => ({ ...f, montantPaye: e.target.value }))}
                      placeholder={formData.modePaiement === 'CREDIT' ? '0' : String(total)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">Laisser vide = tout payé (sauf si Crédit)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Reste à payer</label>
                    <p className="mt-0.5 font-semibold text-amber-800">
                      {Math.max(0, total - (Number(formData.montantPaye) || 0)).toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Lignes</h3>
              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit (code, désignation, catégorie)..."
                    value={ajoutProduit.recherche || ''}
                    onChange={(e) => {
                      setAjoutProduit((a) => ({ ...a, recherche: e.target.value }))
                    }}
                    onFocus={refetchProduits}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <select
                  value={ajoutProduit.produitId}
                  onChange={(e) => onSelectProduit(e.target.value)}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  title="Liste de tous les produits enregistrés"
                >
                  <option value="">Choisir un produit</option>
                  {produits
                    .filter(p => {
                      if (!ajoutProduit.recherche) return true
                      const search = ajoutProduit.recherche.toLowerCase()
                      return (
                        p.code.toLowerCase().includes(search) ||
                        p.designation.toLowerCase().includes(search) ||
                        (p.categorie && p.categorie.toLowerCase().includes(search))
                      )
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.code} – {p.designation}</option>
                    ))}
                </select>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="number"
                  min="1"
                  value={ajoutProduit.quantite}
                  onChange={(e) => setAjoutProduit((a) => ({ ...a, quantite: e.target.value }))}
                  placeholder="Qté"
                  className="w-20 rounded border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={ajoutProduit.prixUnitaire}
                  onChange={(e) => setAjoutProduit((a) => ({ ...a, prixUnitaire: e.target.value }))}
                  placeholder="Prix unit. (achat)"
                  className="w-32 rounded border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
                <button type="button" onClick={addLigne} className="rounded-lg border-2 border-orange-400 bg-orange-100 px-3 py-2 text-sm font-medium text-orange-900 hover:bg-orange-200">
                  Ajouter
                </button>
              </div>
              {formData.lignes.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="pb-2">Désignation</th>
                      <th className="pb-2 text-right">Qté</th>
                      <th className="pb-2 text-right">P.U.</th>
                      <th className="pb-2 text-right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lignes.map((l, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">{l.designation}</td>
                        <td className="text-right">{l.quantite}</td>
                        <td className="text-right">{l.prixUnitaire.toLocaleString('fr-FR')} F</td>
                        <td className="text-right">{(l.quantite * l.prixUnitaire).toLocaleString('fr-FR')} F</td>
                        <td className="w-10">
                          <button
                            type="button"
                            onClick={() => removeLigne(i)}
                            title="Supprimer la ligne"
                            className="rounded p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 font-medium text-gray-900">Total: {total.toLocaleString('fr-FR')} FCFA</p>
              <p className="mt-1 text-xs text-gray-500">Les quantités seront ajoutées au stock du magasin sélectionné.</p>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                Enregistrer l&apos;achat
              </button>
              <button
                type="button"
                onClick={() => setForm(false)}
                className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300"
              >
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
        ) : achats.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Aucun achat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">N°</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Magasin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fournisseur</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Paiement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Statut paiement</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Reste à payer</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {achats.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{a.numero}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(a.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.magasin.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.fournisseur?.nom || a.fournisseurLibre || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {Number(a.montantTotal).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.modePaiement}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.statutPaiement === 'PAYE' ? 'bg-green-100 text-green-800' :
                        a.statutPaiement === 'PARTIEL' ? 'bg-amber-100 text-amber-800' :
                          a.statutPaiement === 'CREDIT' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {a.statutPaiement === 'PAYE' ? 'Payé' : a.statutPaiement === 'PARTIEL' ? 'Partiel' : a.statutPaiement === 'CREDIT' ? 'Crédit' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-amber-800">
                      {(Number(a.montantTotal) - (Number(a.montantPaye) || 0)).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {a.statutPaiement !== 'PAYE' && (
                          <button
                            onClick={() => setShowReglement({ id: a.id, numero: a.numero, reste: Number(a.montantTotal) - (Number(a.montantPaye) || 0) })}
                            className="rounded p-1.5 text-orange-600 hover:bg-orange-100"
                            title="Enregistrer un règlement"
                          >
                            <Wallet className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleVoirDetail(a.id)}
                          disabled={loadingDetail === a.id}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          title="Voir le détail"
                        >
                          {loadingDetail === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {userRole === 'SUPER_ADMIN' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Supprimer définitivement l'achat ${a.numero} ? Stock et comptabilité seront mis à jour. Irréversible.`)) return
                              setSupprimant(a.id)
                              try {
                                const res = await fetch(`/api/achats/${a.id}`, { method: 'DELETE' })
                                if (res.ok) {
                                  setAchats((list) => list.filter((x) => x.id !== a.id))
                                  if (detailAchat?.id === a.id) setDetailAchat(null)
                                  showSuccess(MESSAGES.ACHAT_SUPPRIME)
                                } else {
                                  const d = await res.json()
                                  showError(res.status === 403 ? (d.error || MESSAGES.RESERVE_SUPER_ADMIN) : formatApiError(d.error || 'Erreur suppression.'))
                                }
                              } catch (e) {
                                showError(formatApiError(e))
                              } finally {
                                setSupprimant(null)
                              }
                            }}
                            disabled={supprimant === a.id}
                            className="rounded p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            title="Supprimer définitivement"
                          >
                            {supprimant === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot className="bg-orange-50 font-bold text-gray-900 border-t-2 border-orange-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 uppercase text-xs tracking-wider text-gray-700">Total Période</td>
                    <td className="px-4 py-3 text-right text-orange-700">{totals.montantTotal.toLocaleString('fr-FR')} F</td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-3 text-right text-red-700">{totals.resteAPayer.toLocaleString('fr-FR')} F</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
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

      {detailAchat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailAchat(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Détail achat {detailAchat.numero}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={imprimerAchat} className="rounded-lg border-2 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1.5" title="Imprimer le bon d'achat">
                  <Printer className="h-4 w-4" />
                  Imprimer
                </button>
                <button onClick={() => setDetailAchat(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">×</button>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="font-medium text-gray-700">Date :</span> <span className="text-gray-900">{new Date(detailAchat.date).toLocaleString('fr-FR')}</span></div>
                <div><span className="font-medium text-gray-700">Magasin :</span> <span className="text-gray-900">{detailAchat.magasin.code} – {detailAchat.magasin.nom}</span></div>
                <div><span className="font-medium text-gray-700">Fournisseur :</span> <span className="text-gray-900">{detailAchat.fournisseur?.nom || detailAchat.fournisseurLibre || '—'}</span></div>
                <div><span className="font-medium text-gray-700">Paiement :</span> <span className="text-gray-900">{detailAchat.modePaiement}</span></div>
                <div><span className="font-medium text-gray-700">Statut paiement :</span>
                  <span className={`ml-1 rounded px-2 py-0.5 text-xs font-medium ${detailAchat.statutPaiement === 'PAYE' ? 'bg-green-100 text-green-800' :
                    detailAchat.statutPaiement === 'PARTIEL' ? 'bg-amber-100 text-amber-800' :
                      detailAchat.statutPaiement === 'CREDIT' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {detailAchat.statutPaiement === 'PAYE' ? 'Payé' : detailAchat.statutPaiement === 'PARTIEL' ? 'Partiel' : detailAchat.statutPaiement === 'CREDIT' ? 'Crédit' : '—'}
                  </span>
                </div>
                <div><span className="font-medium text-gray-700">Montant payé (avance) :</span> <span className="text-gray-900">{(Number(detailAchat.montantPaye) || 0).toLocaleString('fr-FR')} FCFA</span></div>
                <div><span className="font-medium text-gray-700">Reste à payer :</span> <strong className="text-amber-800">{(Number(detailAchat.montantTotal) - (Number(detailAchat.montantPaye) || 0)).toLocaleString('fr-FR')} FCFA</strong></div>
              </div>
              {detailAchat.observation && <p className="text-sm"><span className="font-medium text-gray-700">Observation :</span> <span className="text-gray-900">{detailAchat.observation}</span></p>}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b bg-gray-50 text-left text-gray-800"><th className="px-4 py-2">Désignation</th><th className="px-4 py-2 text-right">Qté</th><th className="px-4 py-2 text-right">P.U.</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailAchat.lignes.map((l, i) => (
                      <tr key={i}><td className="px-4 py-2 text-gray-900">{l.designation}</td><td className="px-4 py-2 text-right text-gray-900">{l.quantite}</td><td className="px-4 py-2 text-right text-gray-900">{l.prixUnitaire.toLocaleString('fr-FR')} F</td><td className="px-4 py-2 text-right text-gray-900">{l.montant.toLocaleString('fr-FR')} F</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-right font-semibold text-gray-900">Montant total : {Number(detailAchat.montantTotal).toLocaleString('fr-FR')} FCFA</p>
            </div>
          </div>
        </div>
      )}

      {showCreateFournisseur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-orange-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Créer un nouveau fournisseur</h2>
              <button
                onClick={() => {
                  setShowCreateFournisseur(false)
                  setErr('')
                }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateFournisseur} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom *</label>
                <input
                  required
                  value={fournisseurForm.nom}
                  onChange={(e) => setFournisseurForm((f) => ({ ...f, nom: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                <input
                  value={fournisseurForm.telephone}
                  onChange={(e) => setFournisseurForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={fournisseurForm.email}
                  onChange={(e) => setFournisseurForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingFournisseur}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {savingFournisseur ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer et continuer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFournisseur(false)
                    setErr('')
                  }}
                  className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          </div>
        </div>
      )}

      {showReglement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-orange-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Règlement Achat {showReglement.numero}</h2>
              <button onClick={() => setShowReglement(null)} className="rounded p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleReglement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reste à payer</label>
                <div className="mt-1 text-lg font-bold text-orange-600">{showReglement.reste.toLocaleString('fr-FR')} FCFA</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Montant du règlement *</label>
                <input
                  type="number"
                  required
                  max={showReglement.reste}
                  value={reglementData.montant}
                  onChange={(e) => setReglementData(prev => ({ ...prev, montant: e.target.value }))}
                  placeholder={`Max ${showReglement.reste}`}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
                <select
                  value={reglementData.modePaiement}
                  onChange={(e) => setReglementData(prev => ({ ...prev, modePaiement: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                  <option value="VIREMENT">Virement</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingReglement}
                  className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {savingReglement ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Enregistrer le paiement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReglement(null)}
                  className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printData && (
        <PrintPreview
          isOpen={printPreviewOpen}
          onClose={() => setPrintPreviewOpen(false)}
          type="ACHAT"
          data={printData}
          defaultTemplateId={defaultTemplateId}
        />
      )}
    </div>
  )
}
