'use client'

import { useState, useEffect } from 'react'
import {
  FileText, Loader2, AlertTriangle, TrendingUp, ArrowRightLeft,
  FileSpreadsheet, Trash2, Search, Filter, X,
  Users, ShoppingBag, CreditCard, PieChart,
  Package, DollarSign
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Pagination from '@/components/ui/Pagination'

// --- TYPES ---

type Alerte = {
  id: number
  quantite: number
  produit: { code: string; designation: string; seuilMin: number }
  magasin: { code: string; nom: string }
  manquant: number
}

type Top = { produitId: number; code: string; designation: string; quantiteVendue: number }

type Mouvement = {
  id: number
  date: string
  type: string
  quantite: number
  produit: { code: string; designation: string }
  magasin: { code: string; nom: string }
}

type Magasin = { id: number; code: string; nom: string }
type Produit = { id: number; code: string; designation: string; categorie?: string }

type Comparaison = {
  periodeActuelle: { ca: number; achats: number; ventes: number }
  periodePrecedente: { ca: number; achats: number; ventes: number }
  evolution: { ca: number; achats: number; ventes: number }
  evolutionPourcent: { ca: number; achats: number; ventes: number }
}

type RapportClient = {
  clientId: number | null
  client: string
  code: string | null
  chiffreAffaires: number
  frequenceAchat: number
}

type RapportPaiement = {
  clientId?: number | null
  fournisseurId?: number | null
  client?: string
  fournisseur?: string
  code?: string | null
  montantTotal: number
  montantPaye: number
  resteAPayer: number
  nbVentes?: number
  nbAchats?: number
}

type RapportFacture = {
  id: number
  numero: string
  date: string
  client: string
  clientCode: string | null
  montantTotal: number
  montantPaye: number
  resteAPayer: number
  statutPaiement: string
}

type RapportProduitClient = {
  produit: string
  quantiteVendue: number
  chiffreAffaires: number
}

// --- NOUVEAUX TYPES PHASE 2 ---

type NouveauMouvement = {
  id: number
  date: string
  type: string
  produitId: number
  produit: { code: string; designation: string; prixAchat: number }
  magasin: { nom: string }
  utilisateur: { nom: string }
  quantite: number
  observation?: string
}

type SoldeTiers = {
  id: number
  code: string | null
  nom: string
  type?: string
  totalDu: number
  totalPaye: number
  solde: number
}

type PaiementDetail = {
  modePaiement: string
  _sum: { montantPaye: number }
  _count: { id: number }
}

type ValeurStock = {
  id: number
  code: string
  designation: string
  categorie: string
  quantite: number
  prixAchat: number
  valeur: number
}

type RapportCategorie = {
  nom: string
  nbProduits: number
  quantiteTotale: number
  valeurAchatStock: number
  valeurVenteStock: number
}

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState('logistique')
  const [loading, setLoading] = useState(true)
  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateFin, setDateFin] = useState(() => new Date().toISOString().split('T')[0])
  const [userRole, setUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const { success: showSuccess, error: showError } = useToast()

  // Data State
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [topProduits, setTopProduits] = useState<Top[]>([])
  const [comparaison, setComparaison] = useState<Comparaison | null>(null)
  const [caClients, setCaClients] = useState<RapportClient[]>([])
  const [etatPaiementVentes, setEtatPaiementVentes] = useState<RapportPaiement[]>([])
  const [etatPaiementAchats, setEtatPaiementAchats] = useState<RapportPaiement[]>([])
  const [facturesVentes, setFacturesVentes] = useState<RapportFacture[]>([])
  const [produitsParClient, setProduitsParClient] = useState<RapportProduitClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  // New Data State Phase 2
  const [mouvementsDetailles, setMouvementsDetailles] = useState<NouveauMouvement[]>([])
  const [soldesClients, setSoldesClients] = useState<SoldeTiers[]>([])
  const [soldesFournisseurs, setSoldesFournisseurs] = useState<SoldeTiers[]>([])
  const [paiementsByMode, setPaiementsByMode] = useState<PaiementDetail[]>([])
  const [valeurStock, setValeurStock] = useState<{ data: ValeurStock[], totalValeur: number } | null>(null)
  const [mouvementTotals, setMouvementTotals] = useState<{ entree: number; sortie: number } | null>(null)
  const [categoriesData, setCategoriesData] = useState<RapportCategorie[]>([])
  const [movPage, setMovPage] = useState(1)
  const [paginationMov, setPaginationMov] = useState<{ totalPages: number; total: number; limit: number } | null>(null)

  // Filter Data
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [clients, setClients] = useState<{ id: number; nom: string }[]>([])
  const [filtreMagasin, setFiltreMagasin] = useState('')

  // Pagination
  const [alertesPage, setAlertesPage] = useState(1)
  const [topPage, setTopPage] = useState(1)
  const [facturesPage, setFacturesPage] = useState(1)
  const [paginationFactures, setPaginationFactures] = useState<{ totalPages: number; total: number } | null>(null)
  const [selectedCatFilter, setSelectedCatFilter] = useState('')
  const [selectedProdFilter, setSelectedProdFilter] = useState('')

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(data => setUserRole(data.role || ''))
    fetch('/api/magasins').then(r => r.json()).then(setMagasins)
    fetch('/api/produits?complet=1').then(r => r.json()).then(d => setProduits(Array.isArray(d) ? d : []))
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []))
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      dateDebut,
      dateFin,
      magasinId: filtreMagasin,
    })

    try {
      // 1. Rapports Généraux
      const resG = await fetch(`/api/rapports?start=${dateDebut}&end=${dateFin}&magasinId=${filtreMagasin}`)
      const dataG = await resG.json()
      setAlertes(dataG.alertes || [])
      setTopProduits(dataG.topProduits || [])
      setComparaison(dataG.comparaison || null)

      // 2. CA par Client
      const resC = await fetch(`/api/rapports/ventes/clients?start=${dateDebut}&end=${dateFin}`)
      setCaClients(await resC.json())

      // 3. Etat Paiement Ventes & Achats
      const resPV = await fetch(`/api/rapports/ventes/etat-paiement?start=${dateDebut}&end=${dateFin}`)
      const dataPV = await resPV.json()
      setEtatPaiementVentes(Array.isArray(dataPV) ? dataPV : [])

      const resPA = await fetch(`/api/rapports/achats/fournisseurs?start=${dateDebut}&end=${dateFin}`)
      const dataPA = await resPA.json()
      setEtatPaiementAchats(Array.isArray(dataPA) ? dataPA : [])

      // 4. Factures
      const resF = await fetch(`/api/rapports/ventes/factures?start=${dateDebut}&end=${dateFin}&page=${facturesPage}`)
      const dataF = await resF.json()
      setFacturesVentes(Array.isArray(dataF.data) ? dataF.data : [])
      setPaginationFactures(dataF.pagination)

      // --- NEW RAPPORTS PHASE 2 ---
      // 216. Mouvements avec pagination
      const resMov = await fetch(`/api/rapports/stocks/mouvements?${params.toString()}&page=${movPage}`)
      const dataMov = await resMov.json()
      setMouvementsDetailles(dataMov.mouvements || [])
      setMouvementTotals(dataMov.totals || null)
      setPaginationMov(dataMov.pagination || null)

      const resSC = await fetch(`/api/rapports/finances/soldes?type=CLIENT`)
      const dataSC = await resSC.json()
      setSoldesClients(Array.isArray(dataSC) ? dataSC : [])

      const resSF = await fetch(`/api/rapports/finances/soldes?type=FOURNISSEUR`)
      const dataSF = await resSF.json()
      setSoldesFournisseurs(Array.isArray(dataSF) ? dataSF : [])

      const resPM = await fetch(`/api/rapports/finances/paiements?type=CLIENT&dateDebut=${dateDebut}&dateFin=${dateFin}`)
      const dataPM = await resPM.json()
      setPaiementsByMode(dataPM.summary || [])

      const resVal = await fetch(`/api/rapports/stocks/valeur?dateFin=${dateFin}&magasinId=${filtreMagasin}`)
      const dataVal = await resVal.json()
      setValeurStock(dataVal && typeof dataVal === 'object' && !dataVal.error ? dataVal : { data: [], totalValeur: 0 })

      const resCat = await fetch(`/api/rapports/categories`)
      const dataCat = await resCat.json()
      setCategoriesData(dataCat.data || [])

    } catch (e) {
      console.error(e)
      showError('Erreur lors du chargement des rapports')
    } finally {
      setLoading(false)
    }
  }

  const fetchProduitsClient = async (clientId: number) => {
    setSelectedClientId(clientId)
    try {
      const res = await fetch(`/api/rapports/ventes/clients/produits?clientId=${clientId}&start=${dateDebut}&end=${dateFin}`)
      const data = await res.json()
      setProduitsParClient(Array.isArray(data) ? data : [])
    } catch (e) {
      showError('Erreur chargement produits client')
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [dateDebut, dateFin, filtreMagasin, facturesPage, movPage])

  const preset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setDateDebut(start.toISOString().split('T')[0])
    setDateFin(end.toISOString().split('T')[0])
  }

  if (loading && !alertes.length && !caClients.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  const TabButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold tracking-tight transition-all border-b-2 ${activeTab === id
          ? 'border-orange-500 text-orange-600 bg-orange-50/50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white drop-shadow-md font-mono tracking-tighter uppercase">PILOTAGE & RAPPORTS</h1>
          <p className="mt-1 text-white/90 font-bold">Analyses approfondies des stocks, flux financiers et tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/rapports/export?start=${dateDebut}&end=${dateFin}`, '_blank')}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-lg transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exporter Tout
          </button>
        </div>
      </div>

      {/* Filtres Globaux Premium */}
      <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 bg-gray-100/50 p-2 rounded-2xl border border-gray-200/50">
            <div className="flex flex-col px-3">
                <label className="text-[10px] font-black text-gray-400 uppercase">Début</label>
                <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="bg-transparent text-sm font-bold focus:outline-none"
                />
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col px-3">
                <label className="text-[10px] font-black text-gray-400 uppercase">Fin</label>
                <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="bg-transparent text-sm font-bold focus:outline-none"
                />
            </div>
          </div>

          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Magasin</label>
             <select 
                value={filtreMagasin} 
                onChange={e => setFiltreMagasin(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
             >
                <option value="">Tous les points de vente</option>
                {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
             </select>
          </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block" />

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Rechercher un produit, client, facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm font-medium shadow-sm focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="flex overflow-x-auto rounded-2xl bg-white/90 border border-white/20 shadow-xl backdrop-blur-md sticky top-0 z-10 p-1">
        <TabButton id="logistique" label="Stocks & Logistique" icon={Package} />
        <TabButton id="categories" label="Catégories" icon={PieChart} />
        <TabButton id="ventes" label="Analyse Tiers" icon={Users} />
        <TabButton id="finances" label="Paiements & Trésorerie" icon={DollarSign} />
      </div>

      {/* Contenu de l'onglet */}
      <div className="mt-6">
        {activeTab === 'logistique' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Package className="h-32 w-32" />
                    </div>
                    <p className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em]">Valeur Globale du Stock</p>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-5xl font-black tabular-nums tracking-tighter">
                            {(valeurStock?.totalValeur || 0).toLocaleString()}
                        </span>
                        <span className="text-xl font-bold opacity-60 uppercase">FCFA</span>
                    </div>
                    <p className="mt-4 text-indigo-100/60 text-[10px] font-bold italic uppercase">
                        Estimation basée sur les prix d'achat au {dateFin ? new Date(dateFin).toLocaleDateString() : 'jour-j'}
                    </p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-between">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Alertes de Rupture</p>
                        <div className="mt-2 text-4xl font-black text-orange-600">{alertes.length}</div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 group cursor-help">
                        <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(100, (alertes.length / 50) * 100)}%` }} />
                        </div>
                        <AlertTriangle className="h-5 w-5 text-orange-400 animate-pulse" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col justify-between">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Mouvements de la période</p>
                        <div className="mt-2 text-4xl font-black text-blue-600">{mouvementsDetailles.length}</div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-blue-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Flux logistiques</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <LogistiqueAlertes alertes={alertes} searchTerm={searchTerm} />
              <LogistiqueTop top={topProduits} searchTerm={searchTerm} />
            </div>

            {/* Journal des Mouvements Détaillés */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 tracking-tight uppercase">
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                        Mouvements de Stock
                    </h3>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
                        {mouvementsDetailles.length} entrées trouvées
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50/50">
                            <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                                <th className="px-6 py-4">Horodatage</th>
                                <th className="px-6 py-4">Type de flux</th>
                                <th className="px-6 py-4">Désignation Produit</th>
                                <th className="px-6 py-4">Magasin</th>
                                <th className="px-6 py-4 text-right">Volume</th>
                                <th className="px-6 py-4">Agent Responsable</th>
                                <th className="px-6 py-4">Référence/Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {mouvementsDetailles.filter(m => m.produit.designation.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs text-gray-400 font-mono italic">
                                        {new Date(m.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter border ${
                                            m.type === 'ENTREE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                            {m.type === 'ENTREE' ? '+ Entrée' : '- Sortie'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-gray-900 truncate max-w-[200px]">{m.produit.designation}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{m.produit.code}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-tighter">{m.magasin.nom}</td>
                                    <td className={`px-6 py-4 text-right font-black tabular-nums text-sm ${m.type === 'ENTREE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {m.type === 'ENTREE' ? '+' : '-'}{m.quantite}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400">
                                                {m.utilisateur.nom.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{m.utilisateur.nom}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-400 italic max-w-[150px] truncate group-hover:whitespace-normal group-hover:max-w-none transition-all">
                                        {m.observation || '---'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {mouvementTotals && (
                            <tfoot className="bg-blue-50/50 font-black border-t border-blue-100">
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 uppercase text-[10px] tracking-widest text-gray-500 italic">Total Mouvements Période</td>
                                    <td className="px-6 py-4 text-right tabular-nums">
                                        <div className="text-emerald-600">+{(mouvementTotals.entree || 0).toLocaleString()}</div>
                                        <div className="text-rose-600">-{(mouvementTotals.sortie || 0).toLocaleString()}</div>
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                {paginationMov && (
                    <div className="p-4 border-t border-gray-100">
                        <Pagination 
                            currentPage={movPage}
                            totalPages={paginationMov.totalPages}
                            totalItems={paginationMov.total}
                            itemsPerPage={paginationMov.limit}
                            onPageChange={(p) => setMovPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* Valorisation du Stock Détaillée */}
            {/* Valorisation du Stock Détaillée (Paginée) */}
            <LogistiqueValorisationTable 
               valeurStock={valeurStock} 
               searchTerm={searchTerm} 
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filtres spécifiques Catégories/Produits */}
            <div className="flex flex-wrap gap-4 bg-white/10 p-4 rounded-3xl border border-white/20 backdrop-blur-md">
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-white uppercase ml-1">Filtrer par Catégorie</label>
                    <select 
                        value={selectedCatFilter} 
                        onChange={e => { setSelectedCatFilter(e.target.value); setSelectedProdFilter(''); }}
                        className="rounded-xl border border-white/20 bg-white/90 px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        <option value="">Toutes les catégories</option>
                        {Array.from(new Set(categoriesData.map(c => c.nom))).sort().map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-white uppercase ml-1">Filtrer par Produit</label>
                    <select 
                        value={selectedProdFilter} 
                        onChange={e => setSelectedProdFilter(e.target.value)}
                        className="rounded-xl border border-white/20 bg-white/90 px-4 py-2 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        <option value="">Tous les produits</option>
                        {produits
                            .filter(p => !selectedCatFilter || p.categorie === selectedCatFilter)
                            .map(p => (
                                <option key={p.id} value={p.designation}>{p.designation}</option>
                            ))
                        }
                    </select>
                </div>
                <button 
                  onClick={() => { setSelectedCatFilter(''); setSelectedProdFilter(''); }}
                  className="mt-auto px-4 py-2 rounded-xl bg-orange-500 text-white font-black text-xs uppercase hover:bg-orange-600 transition-all"
                >
                  RAZ
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
               {/* 1. Totaux Catégories - EMERALD */}
               <div className="bg-emerald-600 p-5 rounded-3xl border border-emerald-500 shadow-2xl text-white">
                  <p className="text-emerald-100 text-[9px] font-black uppercase tracking-widest whitespace-nowrap opacity-80">Totaux Catégories</p>
                  <div className="mt-1 text-4xl font-black tracking-tighter">
                    {selectedCatFilter ? '1' : categoriesData.length}
                  </div>
               </div>
               {/* 2. Nombre Articles - INDIGO */}
               <div className="bg-indigo-600 p-5 rounded-3xl border border-indigo-500 shadow-2xl text-white">
                  <p className="text-indigo-100 text-[9px] font-black uppercase tracking-widest opacity-80">Nombre Articles</p>
                  <div className="mt-1 text-4xl font-black tracking-tighter">
                    {categoriesData
                        .filter(c => !selectedCatFilter || c.nom === selectedCatFilter)
                        .reduce((acc, c) => acc + (selectedProdFilter ? 1 : c.nbProduits), 0)}
                  </div>
               </div>
               {/* 3. Quantité Totale - AMBER */}
               <div className="bg-amber-500 p-5 rounded-3xl border border-amber-400 shadow-2xl text-white">
                  <p className="text-amber-50 text-[9px] font-black uppercase tracking-widest opacity-80">Quantité Totale</p>
                  <div className="mt-1 text-4xl font-black tracking-tighter">
                    {categoriesData
                        .filter(c => !selectedCatFilter || c.nom === selectedCatFilter)
                        .reduce((acc, c) => acc + c.quantiteTotale, 0).toLocaleString()}
                  </div>
               </div>
               {/* 4. Valeur Achat - ROSE */}
               <div className="bg-rose-600 p-5 rounded-3xl border border-rose-500 shadow-2xl text-white">
                  <p className="text-rose-100 text-[9px] font-black uppercase tracking-widest opacity-80">Valeur Achat</p>
                  <div className="mt-1 text-2xl font-black tracking-tight truncate">
                    {categoriesData
                        .filter(c => !selectedCatFilter || c.nom === selectedCatFilter)
                        .reduce((acc, c) => acc + c.valeurAchatStock, 0).toLocaleString()} F
                  </div>
               </div>
               {/* 5. Valeur Vente - CYAN */}
               <div className="bg-cyan-600 p-5 rounded-3xl border border-cyan-500 shadow-2xl text-white">
                  <p className="text-cyan-100 text-[9px] font-black uppercase tracking-widest opacity-80">Valeur Vente</p>
                  <div className="mt-1 text-2xl font-black tracking-tight truncate">
                    {categoriesData
                        .filter(c => !selectedCatFilter || c.nom === selectedCatFilter)
                        .reduce((acc, c) => acc + c.valeurVenteStock, 0).toLocaleString()} F
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {categoriesData
                    .filter(c => (!selectedCatFilter || c.nom === selectedCatFilter))
                    .filter(c => c.nom.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((c, i) => {
                        const totalPV = categoriesData.reduce((acc, cat) => acc + cat.valeurVenteStock, 0) || 1
                        const ratio = (c.valeurVenteStock / totalPV) * 100

                        return (
                            <div key={i} className="group relative bg-white rounded-[2rem] border border-gray-100 p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <PieChart className="h-24 w-24 text-gray-900" />
                                </div>

                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{c.nom}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Catégorie Analystics
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-emerald-600">{ratio.toFixed(1)}%</div>
                                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">du Stock Global</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Métriques */}
                                    <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package className="h-3 w-3 text-indigo-500" />
                                            <span className="text-[9px] font-black text-indigo-600 uppercase">Articles</span>
                                        </div>
                                        <div className="text-lg font-black text-indigo-900 tracking-tighter">{c.nbProduits}</div>
                                    </div>

                                    <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="h-3 w-3 text-amber-500" />
                                            <span className="text-[9px] font-black text-amber-600 uppercase">Quantité</span>
                                        </div>
                                        <div className="text-lg font-black text-amber-900 tracking-tighter">{c.quantiteTotale.toLocaleString()}</div>
                                    </div>

                                    <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="h-3 w-3 text-rose-500" />
                                            <span className="text-[9px] font-black text-rose-600 uppercase">Achat</span>
                                        </div>
                                        <div className="text-sm font-black text-rose-900 tracking-tight whitespace-nowrap">{c.valeurAchatStock.toLocaleString()} F</div>
                                    </div>

                                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <DollarSign className="h-3 w-3 text-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase">Vente</span>
                                        </div>
                                        <div className="text-sm font-black text-emerald-900 tracking-tight whitespace-nowrap">{c.valeurVenteStock.toLocaleString()} F</div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-dashed border-gray-100">
                                    <button 
                                        onClick={() => setSelectedCatFilter(c.nom)}
                                        className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-lg active:scale-95"
                                    >
                                        Analyser cette catégorie
                                    </button>
                                </div>
                            </div>
                        )
                    })}
            </div>
          </div>
        )}

        {activeTab === 'ventes' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Grille de Soldes Tiers */}
             <div className="grid lg:grid-cols-2 gap-8">
                 <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                        <Users className="h-40 w-40 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-3 uppercase tracking-tight"><Users className="h-4 w-4 text-red-500" /> Créances Clients</span>
                        <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full">{soldesClients.length} dossiers</span>
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                        {soldesClients.filter(s => (s.nom || '').toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                            <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border ${s.solde > 0 ? 'border-red-50 bg-red-50/30 border-l-red-500' : 'border-green-50 bg-green-50/30 border-l-green-500'} hover:bg-white hover:shadow-lg transition-all border-l-4`}>
                                <div>
                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                                        {s.nom}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold">{s.type} • {s.code || 'SANS CODE'}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-black tabular-nums ${s.solde > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {Math.abs(s.solde).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {s.solde > 0 ? 'Dette' : 'Avoir'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-40 w-40 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between">
                        <span className="flex items-center gap-3 uppercase tracking-tight"><ShoppingBag className="h-4 w-4 text-orange-500" /> Dettes Fournisseurs</span>
                        <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{soldesFournisseurs.length} dossiers</span>
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                        {soldesFournisseurs.filter(s => (s.nom || '').toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                            <div key={s.id} className={`flex items-center justify-between p-4 rounded-2xl border ${s.solde > 0 ? 'border-orange-50 bg-orange-50/30 border-l-orange-500' : 'border-green-50 bg-green-50/30 border-l-green-500'} hover:bg-white hover:shadow-lg transition-all border-l-4`}>
                                <div>
                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                                        {s.nom}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold">{s.code || 'FOURNISSEUR'}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-black tabular-nums ${s.solde > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {Math.abs(s.solde).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {s.solde > 0 ? 'Dû (Dette)' : 'Crédit (Avoir)'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
             </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border border-white/20 bg-white/10 p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Performance CA Clients
                </h3>
                <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                  {(Array.isArray(caClients) ? caClients : []).filter(c => (c.client || '').toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <button
                      key={c.clientId || c.client}
                      onClick={() => c.clientId && fetchProduitsClient(c.clientId)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${selectedClientId === c.clientId ? 'bg-blue-50 border-blue-400 shadow-lg scale-105' : 'hover:bg-gray-50 border-transparent'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                            <span className="font-black text-gray-800 text-sm italic uppercase tracking-tighter">{c.client}</span>
                            <div className="text-[9px] text-gray-400 font-mono">{c.code || '---'}</div>
                        </div>
                        <span className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded-full font-black text-gray-400">{c.frequenceAchat} Ventes</span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-xl font-black text-blue-700 tabular-nums">{c.chiffreAffaires.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-400">FCFA</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 border border-white/20 bg-white/10 p-6 rounded-3xl shadow-xl">
                <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-500" />
                    Détail des Achats par Produit
                </h3>
                {selectedClientId ? (
                  <div className="overflow-x-auto rounded-3xl border border-gray-50 shadow-inner">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 border-b">
                          <th className="px-6 py-4">Article</th>
                          <th className="px-6 py-4 text-right">Quantité Totalisée</th>
                          <th className="px-6 py-4 text-right">Apport au Chiffre d'Affaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {produitsParClient.map((p, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="px-6 py-4 text-sm font-black text-gray-900 italic">{p.produit || 'Article inconnu'}</td>
                            <td className="px-6 py-4 text-sm text-right font-black text-gray-500 tabular-nums">{p.quantiteVendue}</td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-lg font-black text-blue-600 tabular-nums">{p.chiffreAffaires.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-gray-400 ml-1">FCFA</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                    <PieChart className="h-24 w-24 mb-6 opacity-5 animate-bounce-slow" />
                    <p className="text-lg font-black uppercase tracking-widest text-gray-200">En attente de sélection</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tableau de bord Trésorerie Rapide */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <DollarSign className="h-40 w-40 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest border-b border-gray-100 pb-4">
                    Répartition des Flux par Mode de Règlement
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {paiementsByMode.map((p, i) => (
                        <div key={i} className="group/card relative h-32 rounded-3xl border border-gray-100 bg-gray-50/50 p-5 hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute top-5">{p.modePaiement}</p>
                            <div className="mt-8 flex flex-col">
                                <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tighter">
                                    {p._sum.montantPaye.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-emerald-500 tracking-[0.2em]">{p._count.id} ACTES</span>
                            </div>
                        </div>
                    ))}
                    {paiementsByMode.length === 0 && <div className="col-span-4 py-16 text-center text-gray-300 font-black uppercase tracking-widest text-sm italic">Aucun flux financier détecté sur cette période</div>}
                </div>
            </div>

            <PaiementTable
              title="État de Paiement des Factures (Récapitulatif)"
              data={etatPaiementVentes}
              type="ventes"
              searchTerm={searchTerm}
            />
            
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Grand Journal des Factures Ventes</h3>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Période du {dateDebut} au {dateFin}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase italic">Solde Cumulé Période</p>
                            <p className="text-2xl font-black text-red-600 tabular-nums">
                                {facturesVentes.reduce((acc, f) => acc + f.resteAPayer, 0).toLocaleString()} <span className="text-xs">FCFA</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50/30">
                            <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">
                                <th className="px-6 py-5">Réf. Facture</th>
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5">Client</th>
                                <th className="px-6 py-5 text-right">Montant TTC</th>
                                <th className="px-6 py-5 text-right">Reste A Recouvrer</th>
                                <th className="px-6 py-5 text-center">Gestion Risque</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {facturesVentes.filter(f => (f.client || '').toLowerCase().includes(searchTerm.toLowerCase()) || (f.numero || '').toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                                <tr key={f.id} className="hover:bg-blue-50/20 transition-all duration-300 group">
                                    <td className="px-6 py-5 text-sm font-black text-blue-600 font-mono tracking-tighter group-hover:scale-110 origin-left transition-transform">{f.numero}</td>
                                    <td className="px-6 py-5 text-[10px] text-gray-400 font-bold uppercase">{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase italic">{f.client}</div>
                                        <div className="text-[9px] text-gray-400 font-mono">{f.clientCode || '---'}</div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-right font-black text-gray-400 tabular-nums">{f.montantTotal.toLocaleString()}</td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="text-lg font-black text-red-600 tabular-nums">{f.resteAPayer.toLocaleString()}</div>
                                        <div className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">Solde Ouvert</div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center">
                                            <StatutBadge statut={f.statutPaiement} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100/50">
                            <tr className="font-black text-gray-900 text-sm">
                                <td colSpan={3} className="px-6 py-8 italic tracking-[0.3em] uppercase">Bilan Financier du Journal</td>
                                <td className="px-6 py-8 text-right tabular-nums text-xl">
                                    {facturesVentes.reduce((acc, f) => acc + f.montantTotal, 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-8 text-right text-3xl tabular-nums text-red-600 tracking-tighter shadow-orange-500/20 shadow-2xl bg-white border-4 border-red-50 rounded-3xl">
                                    {facturesVentes.reduce((acc, f) => acc + f.resteAPayer, 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-8 text-center text-[10px] text-gray-400 font-black italic">FCFA TOTAL</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {paginationFactures && paginationFactures.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    <Pagination 
                        currentPage={facturesPage} 
                        totalPages={paginationFactures.totalPages} 
                        onPageChange={setFacturesPage}
                        totalItems={paginationFactures.total}
                        itemsPerPage={facturesVentes.length}
                    />
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- SOUS-COMPOSANTS DESIGN FIXES ---

function StatCard({ label, value, prev, evol, unit, color }: any) {
  const isUp = evol >= 0
  const colors: any = {
    blue: 'from-blue-500 to-indigo-600 text-blue-600',
    orange: 'from-orange-500 to-amber-600 text-orange-600',
    green: 'from-emerald-500 to-green-600 text-green-600'
  }
  return (
    <div className="relative group overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl hover:shadow-2xl transition-all duration-500">
      <div className={`absolute top-0 right-0 h-24 w-24 -mr-12 -mt-12 rounded-full bg-gradient-to-br ${colors[color].split(' text')[0]} opacity-5 group-hover:scale-150 transition-transform duration-1000`} />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums">{value.toLocaleString()}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase opacity-60">{unit}</span>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
        <span className="text-[9px] font-black text-gray-300 uppercase italic">Précédent: {prev.toLocaleString()}</span>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${isUp ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(evol).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: any = {
    PAYE: 'bg-emerald-500 text-white shadow-emerald-500/20',
    PARTIEL: 'bg-orange-500 text-white shadow-orange-500/20',
    CREDIT: 'bg-red-500 text-white shadow-red-500/20',
  }
  return (
    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${styles[statut] || 'bg-gray-500 text-white'}`}>
      {statut}
    </span>
  )
}

function LogistiqueAlertes({ alertes, searchTerm }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl">
      <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        Articles en Rupture Critique
      </h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {alertes.filter((a: any) => !searchTerm || a.produit.designation.toLowerCase().includes(searchTerm.toLowerCase())).map((a: any) => (
          <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-orange-50 bg-gradient-to-r from-orange-50/20 to-transparent hover:border-orange-200 transition-all">
            <div>
              <p className="font-black text-gray-900 text-sm uppercase tracking-tighter">{a.produit.designation}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{a.magasin.nom}</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-orange-600 tabular-nums">{a.quantite}</span>
              <span className="text-gray-400 text-xs font-black"> / {a.produit.seuilMin}</span>
              <p className="text-[10px] text-red-500 font-black uppercase italic mt-1">− {a.manquant} manquants</p>
            </div>
          </div>
        ))}
        {alertes.length === 0 && <div className="py-10 text-center text-gray-400 font-black uppercase tracking-widest">Aucune alerte de stock</div>}
      </div>
    </div>
  )
}

function LogistiqueTop({ top, searchTerm }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl">
      <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
        <TrendingUp className="h-5 w-5 text-indigo-500" />
        Meilleures Ventes (Période)
      </h3>
      <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {top.filter((t: any) => !searchTerm || t.designation.toLowerCase().includes(searchTerm.toLowerCase())).map((t: any, i: number) => (
          <div key={t.produitId} className="flex items-center gap-5 group">
            <span className="flex items-center justify-center h-8 w-8 rounded-2xl bg-indigo-50 text-indigo-500 text-xs font-black shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-all">
                {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-800 uppercase tracking-tighter truncate">{t.designation}</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (t.quantiteVendue / (top[0]?.quantiteVendue || 1)) * 100)}%` }} />
              </div>
            </div>
            <div className="text-right">
                <span className="text-lg font-black text-indigo-600 tabular-nums">{t.quantiteVendue}</span>
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sorties</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogistiqueValorisationTable({ valeurStock, searchTerm }: any) {
  const [page, setPage] = require('react').useState(1)
  const itemsPerPage = 20
  const filteredData = (valeurStock?.data || []).filter((v: any) => (v.designation || '').toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden mt-6">
      <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
              <DollarSign className="h-5 w-5 text-indigo-500" />
              Valorisation Analytique du Stock
          </h3>
      </div>
      <div className="overflow-x-auto">
          <table className="min-w-full">
              <thead className="bg-gray-50/50">
                  <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                      <th className="px-6 py-4">Article</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4 text-right">Qté en Stock</th>
                      <th className="px-6 py-4 text-right">Prix Achat Estimé</th>
                      <th className="px-6 py-4 text-right">Valeur Actuelle</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {paginatedData.map((v: any) => (
                      <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-6 py-4">
                              <div className="text-sm font-black text-gray-900">{v.designation}</div>
                              <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{v.code}</div>
                          </td>
                          <td className="px-6 py-4">
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-lg uppercase">
                                  {v.categorie}
                              </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-gray-600 tabular-nums">{v.quantite}</td>
                          <td className="px-6 py-4 text-right text-gray-400 font-mono text-xs tabular-nums">{v.prixAchat.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-indigo-600 tabular-nums text-lg">
                              {v.valeur.toLocaleString()}
                          </td>
                      </tr>
                  ))}
              </tbody>
              <tfoot className="bg-indigo-600 text-white shadow-inner">
                  <tr className="font-black">
                      <td colSpan={3} className="px-6 py-6 italic text-sm tracking-widest uppercase">Total Valorisation Stock</td>
                      <td colSpan={2} className="px-6 py-6 text-right text-3xl tracking-tighter whitespace-nowrap">
                          {(valeurStock?.totalValeur || 0).toLocaleString()} <span className="text-sm font-bold opacity-70">FCFA</span>
                      </td>
                  </tr>
              </tfoot>
          </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 flex justify-center border-t border-gray-100 pb-6 mt-4">
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            itemsPerPage={itemsPerPage} 
            totalItems={filteredData.length} 
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  )
}

function PaiementTable({ title, data, type, searchTerm }: any) {
  const [page, setPage] = require('react').useState(1)
  const itemsPerPage = 20
  const filteredData = data.filter((d: any) => ((d.client || d.fournisseur) || '').toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
        <div className="h-1 w-24 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/50" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50/50">
            <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">
              <th className="px-8 py-5">{type === 'achats' ? 'Partenaire Fournisseur' : 'Bénéficiaire Client'}</th>
              <th className="px-6 py-5 text-center">Actes</th>
              <th className="px-6 py-5 text-right">Total Engagé</th>
              <th className="px-6 py-5 text-right">Montant Encaissé</th>
              <th className="px-6 py-5 text-right">Balance Ouverte</th>
              <th className="px-8 py-5">Recouvrement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((d: any, i: number) => {
              const solde = d.resteAPayer
              const pourcentage = d.montantTotal > 0 ? (d.montantPaye / d.montantTotal) * 100 : 0
              return (
                <tr key={i} className="hover:bg-gray-50/80 transition-all duration-500 group">
                  <td className="px-8 py-6">
                    <div className="font-black text-gray-900 uppercase group-hover:text-blue-600 transition-colors tracking-tighter">{d.client || d.fournisseur}</div>
                    <div className="text-[10px] text-gray-400 font-bold italic">CODE: {d.code || '---'}</div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-2xl bg-indigo-50 text-[10px] font-black text-indigo-500 border border-indigo-100 shadow-sm">
                      {d.nbVentes || d.nbAchats} Op
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right font-bold text-gray-500 tabular-nums">{d.montantTotal.toLocaleString()}</td>
                  <td className="px-6 py-6 text-right font-black text-emerald-600 tabular-nums italic">{d.montantPaye.toLocaleString()}</td>
                  <td className="px-6 py-6 text-right">
                    <span className={`text-xl font-black tabular-nums tracking-tighter ${solde > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{solde.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full transition-all duration-[2000ms] ${pourcentage >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pourcentage}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 tabular-nums">{pourcentage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 flex justify-center border-t border-gray-100 pb-6 mt-4">
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            itemsPerPage={itemsPerPage} 
            totalItems={filteredData.length} 
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  )
}
