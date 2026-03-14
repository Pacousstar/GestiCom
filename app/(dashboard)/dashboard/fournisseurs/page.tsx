'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Truck, Search, Plus, Loader2, Pencil, Trash2, FileSpreadsheet, Download, Clock, X, FileText, Calendar, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { fournisseurSchema } from '@/lib/validations'
import { validateForm, formatApiError } from '@/lib/validation-helpers'
import { MESSAGES } from '@/lib/messages'
import Pagination from '@/components/ui/Pagination'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'

type Fournisseur = {
  id: number
  nom: string
  telephone: string | null
  email: string | null
  ncc: string | null
  dette?: number
}

export default function FournisseursPage() {
  const searchParams = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  const [q, setQ] = useState(qFromUrl)
  const [list, setList] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState<Fournisseur | null>(null)
  const [err, setErr] = useState('')
  const { success: showSuccess, error: showError } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [formData, setFormData] = useState({ nom: '', telephone: '', email: '', ncc: '' })
  const [userRole, setUserRole] = useState<string>('')
  const [selectedHistory, setSelectedHistory] = useState<{ id: number; nom: string } | null>(null)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetch('/api/auth/check').then((r) => r.ok && r.json()).then((d) => d && setUserRole(d.role)).catch(() => { })
  }, [])

  const fetchList = async (page?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page ?? currentPage),
        limit: '20',
      })
      if (q) params.set('q', q)
      const res = await fetch(`/api/fournisseurs?${params.toString()}`)
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchList(page)
  }

  const handleDelete = async (f: Fournisseur) => {
    if (!confirm(`Supprimer le fournisseur « ${f.nom} » ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/fournisseurs/${f.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCurrentPage(1)
        fetchList(1)
        showSuccess(MESSAGES.FOURNISSEUR_SUPPRIME)
      } else {
        const d = await res.json()
        showError(res.status === 403 ? (d.error || MESSAGES.RESERVE_SUPER_ADMIN) : formatApiError(d.error || 'Erreur lors de la suppression.'))
      }
    } catch (e) {
      showError(formatApiError(e))
    }
  }

  const openForm = (f?: Fournisseur) => {
    if (f) {
      setEditing(f)
      setFormData({
        nom: f.nom,
        telephone: f.telephone || '',
        email: f.email || '',
        ncc: f.ncc || '',
      })
    } else {
      setEditing(null)
      setFormData({ nom: '', telephone: '', email: '', ncc: '' })
    }
    setForm(true)
    setErr('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')

    const validationData = {
      nom: formData.nom.trim(),
      telephone: formData.telephone.trim() || null,
      email: formData.email.trim() || null,
      ncc: formData.ncc.trim() || null,
    }

    const validation = validateForm(fournisseurSchema, validationData)
    if (!validation.success) {
      setErr(validation.error)
      showError(validation.error)
      return
    }

    // Vérifier si on est hors-ligne
    if (!isOnline()) {
      if (editing) {
        addToSyncQueue({
          action: 'UPDATE',
          entity: 'FOURNISSEUR',
          entityId: editing.id,
          data: validationData,
          endpoint: `/api/fournisseurs/${editing.id}`,
          method: 'PATCH',
        })
        showSuccess('Fournisseur modifié localement. Il sera synchronisé dès que la connexion sera rétablie.')
      } else {
        addToSyncQueue({
          action: 'CREATE',
          entity: 'FOURNISSEUR',
          data: validationData,
          endpoint: '/api/fournisseurs',
          method: 'POST',
        })
        showSuccess('Fournisseur enregistré localement. Il sera synchronisé dès que la connexion sera rétablie.')
      }
      setForm(false)
      setEditing(null)
      setCurrentPage(1)
      fetchList(1)
      return
    }

    try {
      if (editing) {
        const res = await fetch(`/api/fournisseurs/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validationData),
        })
        const data = await res.json()
        if (res.ok) {
          setForm(false)
          setEditing(null)
          setCurrentPage(1)
          fetchList(1)
          setTimeout(() => fetchList(1), 500)
          showSuccess(MESSAGES.FOURNISSEUR_MODIFIE)
        } else {
          const errorMsg = formatApiError(data.error || 'Erreur lors de la modification.')
          setErr(errorMsg)
          showError(errorMsg)
        }
      } else {
        const res = await fetch('/api/fournisseurs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validationData),
        })
        const data = await res.json()
        if (res.ok) {
          setForm(false)
          setCurrentPage(1)
          fetchList(1)
          setTimeout(() => fetchList(1), 500)
          showSuccess(MESSAGES.FOURNISSEUR_ENREGISTRE)
        } else {
          const errorMsg = formatApiError(data.error || 'Erreur lors de la création.')
          setErr(errorMsg)
          showError(errorMsg)
        }
      }
    } catch (e) {
      const errorMsg = formatApiError(e)
      setErr(errorMsg)
      showError(errorMsg)
    }
  }

  const fetchHistory = async (f: Fournisseur) => {
    setSelectedHistory({ id: f.id, nom: f.nom })
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/rapports/achats/fournisseurs/${f.id}/history`)
      if (res.ok) {
        setHistoryData(await res.json())
      }
    } catch (e) {
      showError('Erreur chargement historique.')
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Fournisseurs</h1>
          <p className="mt-1 text-white/90">Fiches fournisseurs</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Nouveau
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher par nom, tél. ou email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (q) params.set('q', q)
              window.open(`/api/fournisseurs/export-excel?${params.toString()}`, '_blank')
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            title="Exporter les fournisseurs en Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (q) params.set('q', q)
              window.open(`/api/fournisseurs/export-pdf?${params.toString()}`, '_blank')
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
            title="Exporter les fournisseurs en PDF"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {form && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom *</label>
              <input
                required
                value={formData.nom}
                onChange={(e) => setFormData((f) => ({ ...f, nom: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                value={formData.telephone}
                onChange={(e) => setFormData((f) => ({ ...f, telephone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NCC (Numéro de Compte Contribuable)</label>
              <input
                value={formData.ncc}
                onChange={(e) => setFormData((f) => ({ ...f, ncc: e.target.value }))}
                placeholder="Numéro de compte contribuable"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => { setForm(false); setEditing(null); }}
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
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Aucun fournisseur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Tél.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">NCC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Solde</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.telephone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.ncc || '—'}</td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${f.dette && f.dette > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(f.dette ?? 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                          <button
                            onClick={() => fetchHistory(f)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                            title="Historique des opérations"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openForm(f)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-orange-600"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        {userRole === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDelete(f)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Supprimer définitivement (Super Admin)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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

      {selectedHistory && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b flex items-center justify-between bg-orange-600 text-white">
            <div>
              <h2 className="text-xl font-bold">{selectedHistory.nom}</h2>
              <p className="text-orange-100 text-xs">Historique des achats</p>
            </div>
            <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-gray-500 text-sm">Chargement...</p>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                Désolé, aucune opération trouvée.
              </div>
            ) : (
              <div className="space-y-4">
                {historyData.map((h, i) => (
                  <div key={i} className="border rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="font-mono text-sm font-bold text-gray-900">{h.numero}</span>
                       <span className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <p className="text-lg font-bold text-gray-900">{h.montantTotal.toLocaleString()} F</p>
                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${h.statutPaiement === 'PAYE' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                         {h.statutPaiement}
                       </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px] text-gray-500">
                       <span>{h.modePaiement}</span>
                       <button 
                        onClick={() => window.location.href = `/dashboard/achats?numero=${h.numero}`}
                        className="text-orange-600 font-bold flex items-center gap-1"
                       >
                        Voir <ChevronRight className="h-3 w-3" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
