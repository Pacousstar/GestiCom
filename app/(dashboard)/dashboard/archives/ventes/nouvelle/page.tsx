'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  History, ArrowLeft, Save, Loader2, Plus, Trash2, 
  ShoppingCart, Calendar, User, FileText, Search, CreditCard,
  AlertTriangle, Percent, Pencil, X
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Link from 'next/link'

type Produit = { 
  id: number; 
  code: string; 
  designation: string; 
  prixVente: number | null;
  categorie?: string;
}

type Ligne = {
  id: string
  produitId: number | null
  designation: string
  quantite: number
  prixUnitaire: number
  tvaPerc: number
  remise: number
  montant: number
}

export default function NouvelleArchiveVentePage() {
  const router = useRouter()
  const { success, error } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [produits, setProduits] = useState<Produit[]>([])
  const [magasins, setMagasins] = useState<Array<{id: number, nom: string}>>([])
  const [clients, setClients] = useState<Array<{id: number, nom: string}>>([])
  
  const [formData, setFormData] = useState({
    numeroFactureOrigine: '',
    date: new Date().toISOString().split('T')[0],
    magasinId: '',
    clientId: '',
    clientLibre: '',
    observation: '',
    lignes: [] as Ligne[]
  })

  const [ajout, setAjout] = useState({
    produitId: '',
    recherche: '',
    designation: '',
    quantite: '1',
    prixUnitaire: '',
    tvaPerc: '0',
    remise: '0',
    remiseType: 'MONTANT' as 'MONTANT' | 'POURCENT'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        fetch('/api/produits?actif=true'),
        fetch('/api/magasins'),
        fetch('/api/clients?actif=true')
      ])
      const [pData, mData, cData] = await Promise.all([pRes.json(), mRes.json(), cRes.json()])
      setProduits(Array.isArray(pData) ? pData : [])
      setMagasins(Array.isArray(mData) ? mData : [])
      setClients(Array.isArray(cData) ? cData : [])
      if (Array.isArray(mData) && mData.length > 0) setFormData(prev => ({ ...prev, magasinId: String(mData[0].id) }))
    } catch (e) {
      console.error(e)
    }
  }

  const ajouterLigne = () => {
    const desig = ajout.designation || (ajout.produitId ? produits.find(p => p.id === Number(ajout.produitId))?.designation : '')
    if (!desig || !ajout.quantite || !ajout.prixUnitaire) {
      error('Veuillez remplir désignation, quantité et prix.')
      return
    }

    const q = Number(ajout.quantite)
    const pu = Number(ajout.prixUnitaire)
    const r = Number(ajout.remise)
    const t = Number(ajout.tvaPerc)
    const ht = q * pu
    const rv = ajout.remiseType === 'MONTANT' ? r : ht * (r / 100)
    const montantLigne = Math.round((ht - rv) * (1 + t / 100))

    const nouvelleLigne: Ligne = {
      id: Math.random().toString(36).substr(2, 9),
      produitId: ajout.produitId ? Number(ajout.produitId) : null,
      designation: desig || '',
      quantite: q,
      prixUnitaire: pu,
      tvaPerc: t,
      remise: rv,
      montant: montantLigne
    }

    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, nouvelleLigne]
    }))

    setAjout({ produitId: '', recherche: '', designation: '', quantite: '1', prixUnitaire: '', tvaPerc: '0', remise: '0', remiseType: 'MONTANT' })
  }

  const supprimerLigne = (id: string) => {
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.filter(l => l.id !== id)
    }))
  }

  // Calculs totaux
  const totals = useMemo(() => {
    const totalHT = formData.lignes.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire), 0)
    const totalRemise = formData.lignes.reduce((acc, l) => acc + l.remise, 0)
    const totalTVA = formData.lignes.reduce((acc, l) => {
      const htNet = (l.quantite * l.prixUnitaire) - l.remise
      return acc + (htNet * (l.tvaPerc / 100))
    }, 0)
    const totalTTC = Math.round((totalHT - totalRemise) + totalTVA)
    return { totalHT, totalRemise, totalTVA, totalTTC }
  }, [formData.lignes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.numeroFactureOrigine) return error('N° Facture original obligatoire')
    if (formData.lignes.length === 0) return error('Veuillez ajouter au moins un article')

    setLoading(true)
    try {
      const res = await fetch('/api/archives/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, montantTotal: totals.totalTTC })
      })

      if (res.ok) {
        success('Archive enregistrée avec succès !')
        router.push('/dashboard/archives/ventes')
      } else {
        const d = await res.json()
        error(d.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (e) {
      error('Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/archives/ventes" className="p-4 rounded-2xl bg-white/80 backdrop-blur-md hover:bg-orange-50 text-orange-900 transition-all shadow-lg border border-white">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              <History className="h-10 w-10 text-orange-400 drop-shadow-glow" />
              Archives d'Anciennes Ventes
            </h1>
            <p className="text-white/60 font-medium text-sm tracking-wide">Coffre-fort historique : pas d'impact sur vos stocks ou CA actuel</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche : Infos Archive */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/90 backdrop-blur-2xl rounded-[40px] p-8 shadow-2xl border border-white/50 space-y-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                <FileText className="h-32 w-32" />
             </div>
             
             <div className="space-y-2 relative z-10">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">N° Facture Originale</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: FAC-2023-001"
                  className="w-full px-6 py-5 rounded-[24px] bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white font-black transition-all text-gray-900 placeholder:text-gray-300 shadow-inner"
                  value={formData.numeroFactureOrigine}
                  onChange={e => setFormData(prev => ({ ...prev, numeroFactureOrigine: e.target.value }))}
                />
             </div>

             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Date d'origine</label>
                    <input
                      required
                      type="date"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-gray-100 font-bold text-gray-950"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Magasin</label>
                    <select
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-gray-100 font-bold text-gray-950"
                      value={formData.magasinId}
                      onChange={e => setFormData(prev => ({ ...prev, magasinId: e.target.value }))}
                    >
                      {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Client (Réel ou Divers)</label>
                  <select
                    className="w-full px-6 py-4 rounded-[24px] bg-gray-50 border-2 border-transparent focus:border-orange-500 font-bold text-gray-900 appearance-none shadow-inner"
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value, clientLibre: '' }))}
                  >
                    <option value="">-- Client Divers / Passager --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                {!formData.clientId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nom Client Libre</label>
                    <input
                      type="text"
                      placeholder="Identité du client historique..."
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-gray-100 font-bold text-gray-900 shadow-inner"
                      value={formData.clientLibre}
                      onChange={e => setFormData(prev => ({ ...prev, clientLibre: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Observation</label>
                  <textarea
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-gray-100 font-bold text-gray-900 resize-none shadow-inner"
                    placeholder="Contexte de cette archive..."
                    value={formData.observation}
                    onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
                  />
                </div>
             </div>
          </div>

          {/* Résumé Financier */}
          <div className="bg-gray-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
             <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center opacity-60">
                   <span className="text-[10px] font-black uppercase tracking-widest">Total HT</span>
                   <span className="font-bold tabular-nums">{totals.totalHT.toLocaleString()} F</span>
                </div>
                {totals.totalRemise > 0 && (
                   <div className="flex justify-between items-center text-red-400">
                      <span className="text-[10px] font-black uppercase tracking-widest">Total Remises</span>
                      <span className="font-bold tabular-nums">-{totals.totalRemise.toLocaleString()} F</span>
                   </div>
                )}
                <div className="flex justify-between items-center opacity-60">
                   <span className="text-[10px] font-black uppercase tracking-widest">Total TVA</span>
                   <span className="font-bold tabular-nums">{Math.round(totals.totalTVA).toLocaleString()} F</span>
                </div>
                <div className="pt-4 border-t border-white/10 mt-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">TOTAL ARCHIVÉ</p>
                   <div className="text-4xl font-black flex items-baseline gap-2 text-emerald-400 tracking-tighter">
                     {totals.totalTTC.toLocaleString()}
                     <span className="text-sm font-bold opacity-50 text-white">FCFA</span>
                   </div>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 opacity-[0.05]">
                <CreditCard className="h-32 w-32" />
             </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:bg-gray-200 text-white py-6 rounded-[32px] font-black shadow-2xl shadow-orange-500/40 transition-all uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
            Enregistrer l'Archive
          </button>
        </div>

        {/* Colonne Droite : Lignes de l'Archive */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100 relative overflow-hidden">
            <h3 className="text-xs font-black uppercase text-gray-500 tracking-[0.3em] mb-8 flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
              Contenu de la Facture d'Origine
            </h3>

            {/* Zone d'ajout Miroir UX Ventes */}
            <div className="bg-gray-50/50 p-8 rounded-[40px] border border-gray-100 mb-8 space-y-6">
               {/* Recherche de produit réelle */}
               <div className="relative group">
                  <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-gray-400 mb-2 block">Chercher un produit réel ou saisir une désignation libre</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Commencez à taper le nom d'un produit..."
                      className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-white border-2 border-transparent focus:border-orange-500 font-bold transition-all shadow-sm placeholder:text-gray-300"
                      value={ajout.recherche}
                      onChange={e => setAjout(prev => ({ ...prev, recherche: e.target.value, designation: e.target.value }))}
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300">
                      <Search className="h-6 w-6" />
                    </div>
                  </div>
                  
                  {/* Suggestions de produits réels */}
                  {ajout.recherche.length > 1 && !ajout.produitId && produits.filter(p => p.designation.toLowerCase().includes(ajout.recherche.toLowerCase())).length > 0 && (
                     <div className="absolute z-50 top-full left-0 w-full bg-white mt-2 rounded-[24px] shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2 scrollbar-thin">
                        {produits.filter(p => p.designation.toLowerCase().includes(ajout.recherche.toLowerCase())).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left p-4 hover:bg-orange-50 rounded-2xl transition-colors flex justify-between items-center group/item"
                            onClick={() => setAjout({ 
                              ...ajout, 
                              produitId: String(p.id), 
                              recherche: p.designation, 
                              designation: p.designation, 
                              prixUnitaire: String(p.prixVente || '') 
                            })}
                          >
                            <div className="flex flex-col">
                              <span className="font-black text-gray-900 group-hover/item:text-orange-900">{p.designation}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.code}</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-xl group-hover/item:bg-white text-orange-600">
                               <Plus className="h-4 w-4" />
                            </div>
                          </button>
                        ))}
                     </div>
                  )}
                  {ajout.produitId && (
                     <button 
                       onClick={() => setAjout(a => ({ ...a, produitId: '', recherche: '', designation: '' }))}
                       className="absolute right-5 top-[3.2rem] p-2 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                     >
                       <X className="h-4 w-4" />
                     </button>
                  )}
               </div>

               {/* Détails de la ligne */}
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black text-center tabular-nums"
                      value={ajout.quantite}
                      onChange={e => setAjout(prev => ({ ...prev, quantite: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">P.U Archive</label>
                    <input
                      type="number"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black tabular-nums"
                      value={ajout.prixUnitaire}
                      onChange={e => setAjout(prev => ({ ...prev, prixUnitaire: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Remise</label>
                    <div className="flex">
                      <input
                        type="number"
                        className="w-full px-4 py-3.5 rounded-l-2xl bg-white border border-gray-100 border-r-0 font-black tabular-nums"
                        value={ajout.remise}
                        onChange={e => setAjout(prev => ({ ...prev, remise: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setAjout(a => ({ ...a, remiseType: a.remiseType === 'MONTANT' ? 'POURCENT' : 'MONTANT' }))}
                        className={`px-3 py-3.5 border-2 rounded-r-2xl font-black text-xs transition-colors ${
                          ajout.remiseType === 'POURCENT' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-100 text-gray-500 border-gray-100'
                        }`}
                      >
                        {ajout.remiseType === 'MONTANT' ? 'F' : '%'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">TVA %</label>
                    <input
                      type="number"
                      className="w-full px-5 py-3.5 rounded-2xl bg-white border border-gray-100 font-black tabular-nums"
                      value={ajout.tvaPerc}
                      onChange={e => setAjout(prev => ({ ...prev, tvaPerc: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={ajouterLigne}
                      className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Ajouter
                    </button>
                  </div>
               </div>
            </div>

            {/* Tableau des lignes Miroir UI Ventes */}
            <div className="space-y-4">
              {formData.lignes.length === 0 ? (
                <div className="text-center py-20 opacity-10 flex flex-col items-center">
                  <ShoppingCart className="h-20 w-20 mb-4" />
                  <p className="font-black uppercase tracking-[0.3em] text-sm">Prêt pour l'archivage</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-h-[300px]">
                  <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                       <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">
                          <th className="px-6 pb-2">Description</th>
                          <th className="px-4 pb-2 text-center">Qté</th>
                          <th className="px-4 pb-2 text-right">P.U</th>
                          <th className="px-4 pb-2 text-right">Remise/TVA</th>
                          <th className="px-6 pb-2 text-right">Montant TTC</th>
                          <th className="pb-2"></th>
                       </tr>
                    </thead>
                    <tbody>
                      {formData.lignes.map((l) => (
                        <tr key={l.id} className="bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all group">
                          <td className="px-6 py-5 rounded-l-[24px] border-y border-l border-transparent group-hover:border-orange-100">
                             <h4 className="font-black text-gray-900 uppercase text-xs tracking-tight">{l.designation}</h4>
                             {l.produitId && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produit Réf: {l.produitId}</p>}
                          </td>
                          <td className="px-4 py-5 border-y border-transparent group-hover:border-orange-100 text-center">
                             <span className="font-black text-gray-900 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">{l.quantite}</span>
                          </td>
                          <td className="px-4 py-5 border-y border-transparent group-hover:border-orange-100 text-right font-bold text-gray-600 tabular-nums">
                             {l.prixUnitaire.toLocaleString()}
                          </td>
                          <td className="px-4 py-5 border-y border-transparent group-hover:border-orange-100 text-right">
                             <div className="flex flex-col">
                                {l.remise > 0 && <span className="text-[10px] font-black text-red-500">-{l.remise.toLocaleString()} R.</span>}
                                {l.tvaPerc > 0 && <span className="text-[10px] font-black text-blue-500">+{l.tvaPerc}% TVA</span>}
                                {l.remise === 0 && l.tvaPerc === 0 && <span className="text-[10px] font-bold text-gray-300">0% / 0F</span>}
                             </div>
                          </td>
                          <td className="px-6 py-5 border-y border-transparent group-hover:border-orange-100 text-right font-black text-emerald-600 tabular-nums text-lg">
                             {l.montant.toLocaleString()}
                          </td>
                          <td className="px-4 py-5 rounded-r-[24px] border-y border-r border-transparent group-hover:border-orange-100 text-right">
                            <button
                              type="button"
                              onClick={() => supprimerLigne(l.id)}
                              className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
