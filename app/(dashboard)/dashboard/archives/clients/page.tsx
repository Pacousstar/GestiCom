'use client'

import { useState, useEffect } from 'react'
import { 
  Wallet, Plus, Loader2, Search, FileText, 
  ArrowLeft, Calendar, User, History, Trash2, Printer
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/format-date'

type ArchiveSolde = {
  id: number
  montant: number
  dateArchive: string
  clientLibre: string | null
  observation: string | null
  client: { nom: string } | null
  utilisateur: { nom: string }
}

export default function ArchivesClientsPage() {
  const { success, error } = useToast()
  const [archives, setArchives] = useState<ArchiveSolde[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [filterMontantMin, setFilterMontantMin] = useState('')
  
  const [clients, setClients] = useState<Array<{id: number, nom: string}>>([])
  
  const [formData, setFormData] = useState({
    clientId: '',
    clientLibre: '',
    montant: '',
    dateArchive: new Date().toISOString().split('T')[0],
    observation: ''
  })

  useEffect(() => {
    fetchArchives()
    fetchClients()
  }, [])

  const fetchArchives = async () => {
    try {
      const res = await fetch('/api/archives/clients')
      const data = await res.json()
      setArchives(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients?actif=true')
      const data = await res.json()
      setClients(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.montant || (!formData.clientId && !formData.clientLibre)) {
      error('Veuillez remplir les champs obligatoires')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/archives/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        success('Archive de solde enregistrée !')
        setShowAddModal(false)
        setFormData({ clientId: '', clientLibre: '', montant: '', dateArchive: new Date().toISOString().split('T')[0], observation: '' })
        fetchArchives()
      } else {
        error('Erreur lors de l\'enregistrement')
      }
    } catch (e) {
      error('Erreur serveur')
    } finally {
      setSaving(false)
    }
  }

  const filteredArchives = archives.filter(a => {
    const matchSearch = (a.client?.nom || a.clientLibre || '').toLowerCase().includes(search.toLowerCase())
    
    const matchDate = (!filterDateDebut || a.dateArchive >= filterDateDebut) && 
                      (!filterDateFin || a.dateArchive <= filterDateFin)
    
    const matchMontant = (!filterMontantMin || a.montant >= Number(filterMontantMin))

    return matchSearch && matchDate && matchMontant
  })

  const totalSoldesArchives = filteredArchives.reduce((sum, a) => sum + a.montant, 0)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Wallet className="h-8 w-8 text-orange-600" />
            Soldes Clients Archivés
          </h1>
          <p className="text-white/70 font-medium italic">Historique des dettes d'avant GestiCom (Sans impact financier)</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-600/20 transition-all uppercase tracking-widest text-sm"
        >
          <Plus className="h-5 w-5" />
          Enregistrer un Solde
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-emerald-100/50">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-900/30" />
            <input
              type="text"
              placeholder="Rechercher par nom de client..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-emerald-50/50 border-none focus:ring-2 focus:ring-orange-500 font-bold transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-2xl border border-emerald-100/50">
              <Calendar className="h-4 w-4 text-emerald-400 ml-2" />
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold text-emerald-950 focus:ring-0 w-full"
                value={filterDateDebut}
                onChange={e => setFilterDateDebut(e.target.value)}
                placeholder="Date début"
              />
              <span className="text-emerald-300">→</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold text-emerald-950 focus:ring-0 w-full"
                value={filterDateFin}
                onChange={e => setFilterDateFin(e.target.value)}
                placeholder="Date fin"
              />
            </div>
            <div className="flex items-center gap-2 bg-emerald-50/50 p-2 rounded-2xl border border-emerald-100/50">
              <Wallet className="h-4 w-4 text-emerald-400 ml-2" />
              <input 
                type="number" 
                placeholder="Montant Min (CFA)"
                className="bg-transparent border-none text-xs font-bold text-emerald-950 focus:ring-0 w-full"
                value={filterMontantMin}
                onChange={e => setFilterMontantMin(e.target.value)}
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                setSearch('')
                setFilterDateDebut('')
                setFilterDateFin('')
                setFilterMontantMin('')
              }}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40 hover:text-orange-600 transition-colors text-left"
            >
              Réinitialiser les filtres
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
              <p className="font-black text-emerald-900/40 uppercase tracking-widest text-sm">Chargement...</p>
            </div>
          ) : filteredArchives.length === 0 ? (
            <div className="text-center py-20 bg-emerald-50/30 rounded-3xl border-2 border-dashed border-emerald-100">
              <Wallet className="h-16 w-16 text-emerald-900/10 mx-auto mb-4" />
              <p className="text-emerald-900/40 font-black uppercase tracking-widest text-xs">Aucun solde archivé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em] text-left">
                    <th className="px-4 py-2">Date d'arrêt</th>
                    <th className="px-4 py-2">Client</th>
                    <th className="px-4 py-2 text-right">Montant archivé</th>
                    <th className="px-4 py-2 text-center">Réf. Saisie</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredArchives.map((a) => (
                    <tr key={a.id} className="group hover:bg-emerald-50/50 transition-colors">
                      <td className="bg-emerald-50/20 rounded-l-2xl px-4 py-4 font-bold text-emerald-950">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-600/50" />
                          {formatDate(a.dateArchive)}
                        </div>
                      </td>
                      <td className="bg-emerald-50/20 px-4 py-4">
                        <div className="font-black text-emerald-950 uppercase text-xs">
                          {a.client?.nom || a.clientLibre}
                        </div>
                        {a.observation && <div className="text-[10px] text-emerald-600 font-medium italic truncate max-w-xs">{a.observation}</div>}
                      </td>
                      <td className="bg-emerald-50/20 px-4 py-4 text-right">
                        <span className="font-black text-lg text-orange-700">{a.montant.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-emerald-900/40 ml-1">CFA</span>
                      </td>
                      <td className="bg-emerald-50/20 rounded-r-2xl px-4 py-4 text-center">
                         <span className="text-[10px] font-bold text-emerald-900/30">Par {a.utilisateur.nom}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Total Dettes Archivées</p>
                <div className="text-3xl font-black flex items-baseline gap-2">
                  {totalSoldesArchives.toLocaleString()}
                  <span className="text-sm font-bold opacity-50">CFA</span>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 opacity-10">
                <History className="h-32 w-32" />
             </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-emerald-100 flex flex-col items-center text-center gap-4">
             <div className="p-4 bg-orange-50 rounded-2xl">
                <Printer className="h-8 w-8 text-orange-600" />
             </div>
             <div>
                <h3 className="font-black text-emerald-950 uppercase text-xs">État de l'Archive</h3>
                <p className="text-[10px] text-emerald-900/40 font-bold mt-1 uppercase tracking-tighter">Imprimer le récapitulatif des vieilles dettes</p>
             </div>
             <button className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors">
                Générer Rapport
             </button>
          </div>
        </div>
      </div>

      {/* Modal d'ajout */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <form onSubmit={handleAdd} className="relative bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-emerald-950 uppercase tracking-tighter">Nouvelle Archive Solde</h2>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full hover:bg-emerald-100 transition-colors"
              >
                <Plus className="h-6 w-6 rotate-45 text-emerald-900" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Client Existant (Facultatif)</label>
                  <select 
                    className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                    value={formData.clientId}
                    onChange={e => setFormData({...formData, clientId: e.target.value, clientLibre: ''})}
                  >
                    <option value="">-- Nouveau client ou Client Libre --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                {!formData.clientId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Nom Client Libre (D'époque)</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      placeholder="Ex: M. Kouadio (Dette 2023)"
                      value={formData.clientLibre}
                      onChange={e => setFormData({...formData, clientLibre: e.target.value})}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Montant dû</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      placeholder="0"
                      value={formData.montant}
                      onChange={e => setFormData({...formData, montant: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Date d'arrêt</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      value={formData.dateArchive}
                      onChange={e => setFormData({...formData, dateArchive: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Observation</label>
                  <textarea 
                    rows={2}
                    className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950 resize-none"
                    placeholder="Notes historiques..."
                    value={formData.observation}
                    onChange={e => setFormData({...formData, observation: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                 <History className="h-5 w-5 text-orange-600 mt-1 shrink-0" />
                 <p className="text-[10px] text-orange-900/60 font-bold uppercase leading-tight">
                    Attention : cet enregistrement est purement informatif. Il ne s'ajoutera pas au solde actuel du client dans le module Tiers.
                 </p>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full py-5 bg-orange-600 hover:bg-orange-700 disabled:bg-emerald-200 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all flex items-center justify-center gap-3"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Enregistrer le Solde Archivé
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
