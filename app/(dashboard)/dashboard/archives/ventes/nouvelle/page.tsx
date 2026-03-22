'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  History, ArrowLeft, Save, Loader2, Plus, Trash2, 
  ShoppingCart, Calendar, User, FileText, Search, CreditCard
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Link from 'next/link'

type Produit = { 
  id: number; 
  code: string; 
  designation: string; 
  prixVente: number | null 
}

type Ligne = {
  id: string
  designation: string
  quantite: number
  prixUnitaire: number
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
    recherche: '',
    designation: '',
    quantite: '1',
    prixUnitaire: ''
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
      setProduits(pData)
      setMagasins(mData)
      setClients(cData)
      if (mData.length > 0) setFormData(prev => ({ ...prev, magasinId: String(mData[0].id) }))
    } catch (e) {
      console.error(e)
    }
  }

  const ajouterLigne = () => {
    if (!ajout.designation || !ajout.quantite || !ajout.prixUnitaire) {
      error('Veuillez remplir désignation, quantité et prix.')
      return
    }

    const nouvelleLigne: Ligne = {
      id: Math.random().toString(36).substr(2, 9),
      designation: ajout.designation,
      quantite: Number(ajout.quantite),
      prixUnitaire: Number(ajout.prixUnitaire),
      montant: Number(ajout.quantite) * Number(ajout.prixUnitaire)
    }

    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, nouvelleLigne]
    }))

    setAjout({ recherche: '', designation: '', quantite: '1', prixUnitaire: '' })
  }

  const supprimerLigne = (id: string) => {
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.filter(l => l.id !== id)
    }))
  }

  const montantTotal = formData.lignes.reduce((sum, l) => sum + l.montant, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.numeroFactureOrigine) return error('N° Facture original obligatoire')
    if (formData.lignes.length === 0) return error('Veuillez ajouter au moins un article')

    setLoading(true)
    try {
      const res = await fetch('/api/archives/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, montantTotal })
      })

      if (res.ok) {
        success('Archive enregistrée avec succès !')
        router.push('/dashboard/archives/ventes')
      } else {
        error('Erreur lors de l\'enregistrement')
      }
    } catch (e) {
      error('Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/archives/ventes" className="p-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 transition-all shadow-sm">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-emerald-950 uppercase tracking-tight flex items-center gap-3">
              <History className="h-8 w-8 text-orange-600" />
              Saisie d'Ancienne Vente
            </h1>
            <p className="text-emerald-800/60 font-medium">Historique pré-GestiCom (Sans impact stock/finance)</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche : Infos Facture */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-emerald-100/50 space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <FileText className="h-20 w-20" />
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">N° Facture Originale</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: FAC-2023-001"
                  className="w-full px-5 py-4 rounded-2xl bg-emerald-50/50 border-2 border-transparent focus:border-orange-500 focus:bg-white font-bold transition-all text-orange-700 placeholder:text-emerald-900/20"
                  value={formData.numeroFactureOrigine}
                  onChange={e => setFormData(prev => ({ ...prev, numeroFactureOrigine: e.target.value }))}
                />
             </div>

             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Date d'origine</label>
                    <input
                      required
                      type="date"
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Magasin</label>
                    <select
                      required
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      value={formData.magasinId}
                      onChange={e => setFormData(prev => ({ ...prev, magasinId: e.target.value }))}
                    >
                      {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Client (Si identifié)</label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                    value={formData.clientId}
                    onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value, clientLibre: '' }))}
                  >
                    <option value="">-- Client Divers / Passager --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                {!formData.clientId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Nom Client Libre</label>
                    <input
                      type="text"
                      placeholder="Nom du client de l'époque..."
                      className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950"
                      value={formData.clientLibre}
                      onChange={e => setFormData(prev => ({ ...prev, clientLibre: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-emerald-900/40 tracking-widest ml-1">Observation</label>
                  <textarea
                    rows={3}
                    className="w-full px-5 py-4 rounded-2xl bg-emerald-50/50 border-none font-bold text-emerald-950 resize-none"
                    placeholder="Notes historiques..."
                    value={formData.observation}
                    onChange={e => setFormData(prev => ({ ...prev, observation: e.target.value }))}
                  />
                </div>
             </div>
          </div>

          <div className="bg-emerald-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Total de l'Archive</p>
                <div className="text-4xl font-black flex items-baseline gap-2">
                  {montantTotal.toLocaleString()}
                  <span className="text-sm font-bold opacity-50">CFA</span>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 opacity-10">
                <CreditCard className="h-32 w-32" />
             </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-orange-600 hover:bg-orange-700 disabled:bg-emerald-200 text-white py-5 rounded-[24px] font-black shadow-xl shadow-orange-600/30 transition-all uppercase tracking-widest"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
            Enregistrer l'Archive
          </button>
        </div>

        {/* Colonne Droite : Articles */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] p-8 shadow-xl border border-emerald-100/50">
            <h3 className="text-[11px] font-black uppercase text-emerald-900/40 tracking-[0.2em] mb-6 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              Saisie des Articles de la Facture
            </h3>

            {/* Zone d'ajout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-emerald-50/30 p-6 rounded-[32px] border border-emerald-50">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-900/30">Désignation de l'article</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Chercher ou saisir le nom..."
                    className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-white border-2 border-transparent focus:border-orange-400 font-bold transition-all shadow-sm"
                    value={ajout.designation}
                    onChange={e => setAjout(prev => ({ ...prev, designation: e.target.value }))}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Search className="h-5 w-5 text-emerald-200" />
                  </div>
                  
                  {/* Suggestions simples basées sur les produits actifs */}
                  {ajout.designation.length > 2 && produits.filter(p => p.designation.toLowerCase().includes(ajout.designation.toLowerCase())).length > 0 && (
                     <div className="absolute z-50 top-full left-0 w-full bg-white mt-1 rounded-2xl shadow-2xl border border-emerald-100 max-h-48 overflow-y-auto p-2">
                        {produits.filter(p => p.designation.toLowerCase().includes(ajout.designation.toLowerCase())).slice(0, 5).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left p-3 hover:bg-emerald-50 rounded-xl font-bold text-sm text-emerald-900 transition-colors"
                            onClick={() => setAjout({ ...ajout, designation: p.designation, prixUnitaire: String(p.prixVente || '') })}
                          >
                            {p.designation}
                          </button>
                        ))}
                     </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-900/30">Qté</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-transparent focus:border-orange-400 font-bold shadow-sm"
                  value={ajout.quantite}
                  onChange={e => setAjout(prev => ({ ...prev, quantite: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-900/30">P.U Archive</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full px-5 py-3.5 rounded-2xl bg-white border-2 border-transparent focus:border-orange-400 font-bold shadow-sm"
                    value={ajout.prixUnitaire}
                    onChange={e => setAjout(prev => ({ ...prev, prixUnitaire: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={ajouterLigne}
                    className="p-3.5 bg-emerald-950 text-white rounded-2xl hover:bg-black transition-all shadow-lg"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des lignes */}
            <div className="space-y-3">
              {formData.lignes.length === 0 ? (
                <div className="text-center py-10 opacity-20 flex flex-col items-center">
                  <ShoppingCart className="h-12 w-12 mb-2" />
                  <p className="font-black uppercase tracking-widest text-xs">Aucun article dans cette archive</p>
                </div>
              ) : (
                formData.lignes.map((l) => (
                  <div key={l.id} className="flex items-center gap-4 bg-emerald-50/20 p-4 rounded-3xl border border-emerald-50 transition-all group hover:bg-white hover:border-orange-100 hover:shadow-md">
                    <div className="flex-1">
                      <h4 className="font-black text-emerald-950 uppercase text-xs">{l.designation}</h4>
                      <p className="text-[10px] font-bold text-emerald-600/70">
                        Saisie historique : {l.quantite} x {l.prixUnitaire.toLocaleString()} CFA
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-950">{l.montant.toLocaleString()} <span className="text-[9px] opacity-40">CFA</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => supprimerLigne(l.id)}
                      className="p-2 text-emerald-900/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
