'use client'

import { useState, useEffect } from 'react'
import { 
  Wallet, Plus, Loader2, Search, FileText, Save, 
  ArrowLeft, Calendar, User, History, Trash2, Printer, X, Info
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/format-date'
import Link from 'next/link'

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
    setLoading(true)
    try {
      const res = await fetch('/api/archives/clients')
      const data = await res.json()
      setArchives(Array.isArray(data) ? data : [])
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
      setClients(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.montant || !formData.clientId) {
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
    return matchSearch && matchDate
  })

  const totalSoldesArchives = filteredArchives.reduce((sum, a) => sum + a.montant, 0)

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <Link href="/dashboard/archives" className="p-4 rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all shadow-lg border border-white/10">
              <ArrowLeft className="h-6 w-6" />
           </Link>
           <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                <Wallet className="h-10 w-10 text-orange-500 drop-shadow-glow" />
                Soldes Clients Archivés
              </h1>
              <p className="text-white/60 font-medium text-sm tracking-wide">Coffre-fort historique : dettes pré-GestiCom sans impact sur le CA actuel</p>
           </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white px-8 py-5 rounded-[24px] font-black shadow-2xl shadow-orange-500/30 transition-all uppercase tracking-[0.2em] text-xs"
        >
          <Plus className="h-6 w-6" />
          Enregistrer un Solde
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters Bar Glassmorphism */}
          <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] p-6 shadow-xl border border-white/50 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input
                type="text"
                placeholder="Rechercher un client archivé..."
                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-orange-500 font-bold transition-all shadow-inner placeholder:text-gray-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
               <Calendar className="h-4 w-4 text-gray-400" />
               <input 
                 type="date" 
                 className="bg-transparent border-none text-xs font-bold text-gray-900 focus:ring-0"
                 value={filterDateDebut}
                 onChange={e => setFilterDateDebut(e.target.value)}
               />
               <span className="text-gray-300">→</span>
               <input 
                 type="date" 
                 className="bg-transparent border-none text-xs font-bold text-gray-900 focus:ring-0"
                 value={filterDateFin}
                 onChange={e => setFilterDateFin(e.target.value)}
               />
            </div>
            {(search || filterDateDebut || filterDateFin) && (
               <button 
                 onClick={() => { setSearch(''); setFilterDateDebut(''); setFilterDateFin(''); }} 
                 className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
               >
                 <X className="h-5 w-5" />
               </button>
            )}
          </div>

          {/* Table Container */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 shadow-2xl border border-white overflow-hidden min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <Loader2 className="h-16 w-16 text-orange-500 animate-spin" />
                <p className="font-black text-gray-300 uppercase tracking-[0.3em] text-xs">Synchronisation...</p>
              </div>
            ) : filteredArchives.length === 0 ? (
              <div className="text-center py-32 opacity-20 flex flex-col items-center">
                <History className="h-24 w-24 mb-6" />
                <p className="font-black uppercase tracking-[0.4em] text-sm">Aucun solde historisé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-left">
                      <th className="px-6 pb-2">Date d'arrêt</th>
                      <th className="px-6 pb-2">Client (Archivé)</th>
                      <th className="px-6 pb-2 text-right">Montant dû</th>
                      <th className="px-6 pb-2 text-center">Opérateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchives.map((a) => (
                      <tr key={a.id} className="group hover:bg-orange-50/30 transition-all">
                        <td className="bg-gray-50/50 group-hover:bg-white rounded-l-[24px] px-6 py-6 border-y border-l border-transparent group-hover:border-orange-100 transition-all font-black text-gray-950 tabular-nums">
                          {formatDate(a.dateArchive)}
                        </td>
                        <td className="bg-gray-50/50 group-hover:bg-white px-6 py-6 border-y border-transparent group-hover:border-orange-100 transition-all">
                          <div className="font-black text-gray-900 uppercase text-sm tracking-tight">
                            {a.client?.nom || a.clientLibre}
                          </div>
                          {a.observation && <p className="text-[10px] text-gray-400 font-bold italic mt-1 truncate max-w-xs uppercase tracking-tighter">{a.observation}</p>}
                        </td>
                        <td className="bg-gray-50/50 group-hover:bg-white px-6 py-6 border-y border-transparent group-hover:border-orange-100 transition-all text-right">
                          <div className="text-2xl font-black text-gray-900 tabular-nums">
                            {a.montant.toLocaleString()}
                            <span className="text-[10px] opacity-30 ml-2">FCFA</span>
                          </div>
                        </td>
                        <td className="bg-gray-50/50 group-hover:bg-white rounded-r-[24px] px-6 py-6 border-y border-r border-transparent group-hover:border-orange-100 transition-all text-center">
                           <div className="inline-flex items-center gap-2 px-3 py-1 bg-white shadow-sm rounded-full border border-gray-100">
                              <User className="h-3 w-3 text-orange-500" />
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{a.utilisateur.nom}</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-8">
          {/* Total Summary Card */}
          <div className="bg-gray-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">Encours Historique Total</p>
                  <div className="text-4xl font-black text-orange-500 tracking-tighter tabular-nums drop-shadow-md">
                    {totalSoldesArchives.toLocaleString()}
                    <span className="text-sm font-bold opacity-40 text-white ml-2">FCFA</span>
                  </div>
                </div>
                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
                   <Info className="h-5 w-5 text-orange-500 shrink-0" />
                   <p className="text-[9px] font-bold text-white/40 uppercase leading-relaxed tracking-widest">
                     Rappel : Ces montants sont à titre purement informatifs et ne sont pas intégrés dans les calculs de dettes actives de GestiCom Pro.
                   </p>
                </div>
             </div>
             <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                <History className="h-48 w-48" />
             </div>
          </div>

          {/* Quick Actions / Stats */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[40px] p-8 shadow-xl border border-white space-y-6">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                   <FileText className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                   <h3 className="font-black text-gray-900 uppercase text-xs">Exportation</h3>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Récapitulatif des soldes</p>
                </div>
             </div>
             <button className="w-full py-4 bg-gray-900 hover:bg-orange-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <Printer className="h-4 w-4" />
                Imprimer l'état
             </button>
          </div>
        </div>
      </div>

      {/* Modal d'ajout Premium Miroir Création Client */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => !saving && setShowAddModal(false)} />
          <form onSubmit={handleAdd} className="relative bg-white/95 backdrop-blur-3xl rounded-[50px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-white/50">
            {/* Modal Header */}
            <div className="p-10 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="h-16 w-16 bg-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                    <Wallet className="h-9 w-9 text-white" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Arrêt de Solde</h2>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">Saisie Historique (Passif)</p>
                 </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-4 rounded-3xl bg-white shadow-sm hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100 active:scale-90"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <div className="space-y-6">
                  {/* Sélection Client */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Sélectionner un client (Base de données)</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full px-8 py-5 rounded-[28px] bg-gray-50 border-4 border-transparent focus:border-orange-500/30 focus:bg-white font-black text-gray-900 shadow-inner appearance-none transition-all"
                        value={formData.clientId}
                        onChange={e => setFormData({...formData, clientId: e.target.value, clientLibre: ''})}
                      >
                        <option value="">-- Sélectionner un client --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-orange-500">
                         <Plus className="h-6 w-6 rotate-45" />
                      </div>
                    </div>
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Montant de la Dette</label>
                      <div className="relative">
                        <input 
                          required
                          type="number"
                          className="w-full px-8 py-5 rounded-[28px] bg-gray-50 border-4 border-transparent focus:border-orange-500/30 focus:bg-white font-black text-gray-900 shadow-inner text-xl tabular-nums"
                          placeholder="0"
                          value={formData.montant}
                          onChange={e => setFormData({...formData, montant: e.target.value})}
                        />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-200">FCFA</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Date de l'arrêté</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-8 py-5 rounded-[28px] bg-gray-50 border-4 border-transparent focus:border-orange-500/30 focus:bg-white font-black text-gray-900 shadow-inner transition-all"
                        value={formData.dateArchive}
                        onChange={e => setFormData({...formData, dateArchive: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Notes / Dénomination Archive</label>
                    <textarea 
                      rows={3}
                      className="w-full px-8 py-6 rounded-[32px] bg-gray-50 border-4 border-transparent focus:border-orange-500/30 focus:bg-white font-bold text-gray-900 shadow-inner resize-none transition-all"
                      placeholder="Ex: Facture d'ouverture de l'ancien logiciel / Inventaire initial..."
                      value={formData.observation}
                      onChange={e => setFormData({...formData, observation: e.target.value})}
                    />
                  </div>
                </div>

                {/* Final Button */}
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full py-7 bg-gray-950 hover:bg-orange-600 active:scale-95 disabled:bg-gray-200 text-white rounded-[40px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 mt-4"
                >
                  {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                  Valider l'Arrêt de Solde
                </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
