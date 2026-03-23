'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, Search, Plus, Loader2, Pencil, Trash2, X, FileSpreadsheet, Download, Clock, Calendar, FileText, ChevronRight, DollarSign } from 'lucide-react'
import PaymentModal from '@/components/dashboard/PaymentModal'
import { useToast } from '@/hooks/useToast'
import { clientSchema } from '@/lib/validations'
import { validateForm, formatApiError } from '@/lib/validation-helpers'
import { MESSAGES } from '@/lib/messages'
import Pagination from '@/components/ui/Pagination'
import { addToSyncQueue, isOnline } from '@/lib/offline-sync'

type Client = {
  id: number
  code: string | null
  nom: string
  telephone: string | null
  type: string
  plafondCredit: number | null
  ncc: string | null
  localisation: string | null
  soldeInitial: number
  dette?: number
  derniereFacture?: string | null
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const qFromUrl = searchParams.get('q') ?? ''
  const [q, setQ] = useState(qFromUrl)
  const [list, setList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [err, setErr] = useState('')
  const { success: showSuccess, error: showError } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    telephone: '',
    type: 'CASH',
    plafondCredit: '',
    ncc: '',
    localisation: '',
    soldeInitial: '',
  })
  const [userRole, setUserRole] = useState<string>('')
  const [selectedHistory, setSelectedHistory] = useState<{ id: number; nom: string } | null>(null)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{ client: Client; invoices: any[] } | null>(null)

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
      const res = await fetch(`/api/clients?${params.toString()}`)
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

  const handleDelete = async (c: Client) => {
    if (!confirm(`Supprimer le client « ${c.nom} » ? Toutes les données historiques liées (ventes, paiements) seront également supprimées via la suppression en cascade. Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCurrentPage(1)
        fetchList(1)
        showSuccess(MESSAGES.CLIENT_SUPPRIME)
      } else {
        const d = await res.json()
        showError(res.status === 403 ? (d.error || MESSAGES.RESERVE_SUPER_ADMIN) : formatApiError(d.error || 'Erreur lors de la suppression.'))
      }
    } catch (e) {
      showError(formatApiError(e))
    }
  }

  const openForm = (c?: Client) => {
    if (c) {
      setEditing(c)
      setFormData({
        code: c.code || '',
        nom: c.nom,
        telephone: c.telephone || '',
        type: c.type,
        plafondCredit: c.plafondCredit != null ? String(c.plafondCredit) : '',
        ncc: c.ncc || '',
        localisation: c.localisation || '',
        soldeInitial: c.soldeInitial != null ? String(c.soldeInitial) : '',
      })
    } else {
      setEditing(null)
      setFormData({ code: '', nom: '', telephone: '', type: 'CASH', plafondCredit: '', ncc: '', localisation: '', soldeInitial: '' })
    }
    setForm(true)
    setErr('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')

    const plaf = formData.type === 'CREDIT' && formData.plafondCredit
      ? Math.max(0, Number(formData.plafondCredit))
      : null

    const validationData = {
      code: formData.code.trim() || null,
      nom: formData.nom.trim(),
      telephone: formData.telephone.trim() || null,
      type: formData.type as 'CASH' | 'CREDIT',
      plafondCredit: plaf,
      ncc: formData.ncc.trim() || null,
      localisation: formData.localisation.trim() || null,
      soldeInitial: formData.soldeInitial ? Number(formData.soldeInitial) : 0,
    }

    const validation = validateForm(clientSchema, validationData)
    if (!validation.success) {
      setErr(validation.error)
      showError(validation.error)
      return
    }

    // Dans GestiCom Offline, l'enregistrement se fait toujours directement vers le serveur local.

    try {
      if (editing) {
        const res = await fetch(`/api/clients/${editing.id}`, {
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
          showSuccess(MESSAGES.CLIENT_MODIFIE)
        } else {
          const errorMsg = formatApiError(data.error || 'Erreur lors de la modification.')
          setErr(errorMsg)
          showError(errorMsg)
        }
      } else {
        const res = await fetch('/api/clients', {
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
          showSuccess(MESSAGES.CLIENT_ENREGISTRE)
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

  const fetchHistory = async (c: Client) => {
    setSelectedHistory({ id: c.id, nom: c.nom })
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/rapports/ventes/clients/${c.id}/history`)
      if (res.ok) {
        setHistoryData(await res.json())
      }
    } catch (e) {
      showError('Erreur chargement historique client.')
    } finally {
      setLoadingHistory(false)
    }
  }

  const openPaymentModal = async (c: Client) => {
    try {
      const res = await fetch(`/api/rapports/finances/etat-paiements?type=VENTE&filter=NON_SOLDER&dateDebut=2000-01-01&dateFin=2100-12-31`)
      if (res.ok) {
        const allInvoices = await res.json()
        const clientInvoices = allInvoices.filter((inv: any) => inv.tier === c.nom || (inv.client?.nom === c.nom))
        if (clientInvoices.length === 0) {
            showError("Aucune facture impayée trouvée pour ce client.")
            return
        }
        setPaymentModal({ client: c, invoices: clientInvoices })
      }
    } catch (e) {
      showError("Erreur lors de la récupération des factures.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Clients</h1>
          <p className="mt-1 text-white/80 font-bold uppercase text-[10px] tracking-widest">
            Gestion du portefeuille clients et des soldes
          </p>
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
              placeholder="Rechercher par code, nom ou téléphone..."
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
              window.open(`/api/clients/export-excel?${params.toString()}`, '_blank')
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            title="Exporter les clients en Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (q) params.set('q', q)
              window.open(`/api/clients/export-pdf?${params.toString()}`, '_blank')
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
            title="Exporter les clients en PDF"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {form && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {editing ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Code Client</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                placeholder="Ex: CLT001"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
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
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                <option value="CASH">CASH</option>
                <option value="CREDIT">CREDIT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NCC (Numéro de Compte Contribuable)</label>
              <input
                value={formData.ncc}
                onChange={(e) => setFormData((f) => ({ ...f, ncc: e.target.value }))}
                placeholder="Ex: 0000000X"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Localisation</label>
              <input
                value={formData.localisation}
                onChange={(e) => setFormData((f) => ({ ...f, localisation: e.target.value }))}
                placeholder="Ex: Abidjan, Cocody"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Solde Initial (Déposé)</label>
              <input
                type="number"
                value={formData.soldeInitial}
                onChange={(e) => setFormData((f) => ({ ...f, soldeInitial: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
              />
            </div>
            {formData.type === 'CREDIT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Plafond crédit (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.plafondCredit}
                  onChange={(e) => setFormData((f) => ({ ...f, plafondCredit: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                />
              </div>
            )}
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
          <p className="py-12 text-center text-gray-500">Aucun client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Tél.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">NCC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Localisation</th>
                   <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Plafond</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Solde Global</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{c.code || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.telephone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${c.type === 'CREDIT' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                        {c.type}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">{c.ncc || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.localisation || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {c.type === 'CREDIT' && c.plafondCredit != null
                        ? `${Number(c.plafondCredit).toLocaleString('fr-FR')} F`
                        : '—'}
                    </td>
                     <td className="px-4 py-3 text-right text-sm font-black tabular-nums">
                      {Number(c.dette ?? 0) > 0 ? (
                        <span className="text-red-600">+{Math.abs(c.dette || 0).toLocaleString('fr-FR')} F (Dette)</span>
                      ) : Number(c.dette ?? 0) < 0 ? (
                        <span className="text-green-600">-{Math.abs(c.dette || 0).toLocaleString('fr-FR')} F (Avoir)</span>
                      ) : (
                        <span className="text-gray-400">À jour</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                          <button
                            onClick={() => fetchHistory(c)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-green-600"
                            title="Historique des ventes / règlements"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          {Number(c.dette ?? 0) > 0 && (
                            <button
                              onClick={() => openPaymentModal(c)}
                              className="rounded p-1.5 text-green-600 hover:bg-green-50"
                              title="Solder / Encaisser règlement"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openForm(c)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-orange-600"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
                          <button
                            onClick={() => handleDelete(c)}
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
          <div className="p-6 border-b flex items-center justify-between bg-green-700 text-white">
            <div>
              <h2 className="text-xl font-bold">{selectedHistory.nom}</h2>
              <p className="text-green-100 text-xs">Mouvements & Historique</p>
            </div>
            <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-gray-500 text-sm">Chargement des opérations...</p>
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                Désolé, aucune vente trouvée pour ce client.
              </div>
            ) : (
              <div className="space-y-4">
                {historyData.map((h, i) => (
                  <div key={i} className="border rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="font-mono text-sm font-bold text-gray-900">{h.numero}</span>
                       <span className="text-xs text-gray-500">{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                    </div>

                    <div className="mt-2 mb-4 space-y-2">
                      {h.lignes && h.lignes.length > 0 && h.lignes.map((l: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between text-[11px] text-gray-600 border-b border-gray-100 pb-1 last:border-0">
                          <div className="flex-1">
                            <span className="font-bold text-gray-800">{l.quantite}</span>
                            <span className="mx-1">x</span>
                            <span>{l.produit?.designation || l.designation}</span>
                          </div>
                          <div className="font-medium text-gray-900">
                            {(l.quantite * l.prixUnitaire).toLocaleString()} F
                          </div>
                        </div>
                      ))}
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
                        onClick={() => window.location.href = `/dashboard/ventes?numero=${h.numero}`}
                        className="text-green-700 font-bold flex items-center gap-1"
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

      {paymentModal && (
        <PaymentModal
          isOpen={!!paymentModal}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => fetchList()}
          type="VENTE"
          tierId={paymentModal.client.id}
          tierNom={paymentModal.client.nom}
          totalDu={paymentModal.client.dette || 0}
          invoices={paymentModal.invoices}
        />
      )}
    </div>
  )
}
