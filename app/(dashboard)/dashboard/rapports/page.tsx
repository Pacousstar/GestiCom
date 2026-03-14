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
type Produit = { id: number; code: string; designation: string }

type Comparaison = {
  periodeActuelle: { ca: number; achats: number; ventes: number }
  periodePrecedente: { ca: number; achats: number; ventes: number }
  evolution: { ca: number; achats: number; ventes: number }
  evolutionPourcent: { ca: number; achats: number; ventes: number }
}

type RapportClient = {
  clientId: number | null
  client: string
  chiffreAffaires: number
  frequenceAchat: number
}

type RapportPaiement = {
  clientId?: number | null
  fournisseurId?: number | null
  client?: string
  fournisseur?: string
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

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState('logistique')
  const [loading, setLoading] = useState(true)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [userRole, setUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const { success: showSuccess, error: showError } = useToast()

  // Data State
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [topProduits, setTopProduits] = useState<Top[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [comparaison, setComparaison] = useState<Comparaison | null>(null)
  const [caClients, setCaClients] = useState<RapportClient[]>([])
  const [etatPaiementVentes, setEtatPaiementVentes] = useState<RapportPaiement[]>([])
  const [etatPaiementAchats, setEtatPaiementAchats] = useState<RapportPaiement[]>([])
  const [facturesVentes, setFacturesVentes] = useState<RapportFacture[]>([])
  const [produitsParClient, setProduitsParClient] = useState<RapportProduitClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  // Filter Data
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [clients, setClients] = useState<{ id: number; nom: string }[]>([])
  const [filtreMagasin, setFiltreMagasin] = useState('')
  const [filtreProduit, setFiltreProduit] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Pagination
  const [alertesPage, setAlertesPage] = useState(1)
  const [topPage, setTopPage] = useState(1)
  const [facturesPage, setFacturesPage] = useState(1)
  const [paginationFactures, setPaginationFactures] = useState<{ totalPages: number; total: number } | null>(null)

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(data => setUserRole(data.role || ''))
    fetch('/api/magasins').then(r => r.json()).then(setMagasins)
    fetch('/api/produits?complet=1').then(r => r.json()).then(d => setProduits(Array.isArray(d) ? d : []))
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []))
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      start: dateDebut,
      end: dateFin,
      magasinId: filtreMagasin,
      produitId: filtreProduit,
      categorie: filtreCategorie,
      alertesPage: String(alertesPage),
      topPage: String(topPage)
    })

    try {
      // 1. Rapports Généraux (Logistique)
      const resG = await fetch(`/api/rapports?${params.toString()}`)
      const dataG = await resG.json()
      setAlertes(dataG.alertes || [])
      setTopProduits(dataG.topProduits || [])
      setMouvements(dataG.mouvements || [])
      setComparaison(dataG.comparaison || null)

      // 2. CA par Client
      const resC = await fetch(`/api/rapports/ventes/clients?start=${dateDebut}&end=${dateFin}`)
      setCaClients(await resC.json())

      // 3. Etat Paiement Ventes
      const resPV = await fetch(`/api/rapports/ventes/etat-paiement?start=${dateDebut}&end=${dateFin}`)
      setEtatPaiementVentes(await resPV.json())

      // 4. Etat Paiement Achats
      const resPA = await fetch(`/api/rapports/achats/fournisseurs?start=${dateDebut}&end=${dateFin}`)
      setEtatPaiementAchats(await resPA.json())

      // 5. Factures (avec pagination spécifique)
      const resF = await fetch(`/api/rapports/ventes/factures?start=${dateDebut}&end=${dateFin}&page=${facturesPage}`)
      const dataF = await resF.json()
      setFacturesVentes(dataF.data || [])
      setPaginationFactures(dataF.pagination)

    } catch (e) {
      console.error(e)
      showError('Erreur lors du chargement des rapports')
    } finally {
      setLoading(false)
    }
  }

  // Fetch produits pour un client spécifique
  const fetchProduitsClient = async (clientId: number) => {
    setSelectedClientId(clientId)
    try {
      const res = await fetch(`/api/rapports/ventes/clients/produits?clientId=${clientId}&start=${dateDebut}&end=${dateFin}`)
      setProduitsParClient(await res.json())
    } catch (e) {
      showError('Erreur chargement produits client')
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [dateDebut, dateFin, filtreMagasin, filtreProduit, filtreCategorie, alertesPage, topPage, facturesPage])

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
      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${activeTab === id
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
          <h1 className="text-3xl font-bold text-white drop-shadow-sm">Centre de Rapports</h1>
          <p className="mt-1 text-white/80">Analyses commerciales, stocks et finances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/rapports/export?start=${dateDebut}&end=${dateFin}`, '_blank')}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-md border border-white/20 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filtres Globaux */}
      <div className="rounded-2xl border border-white/20 bg-white/95 p-5 shadow-xl backdrop-blur-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-sm focus:outline-none"
            />
            <span className="text-gray-400">à</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 30].map(d => (
              <button key={d} onClick={() => preset(d)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-orange-500 hover:text-white transition-all">
                {d} derniers jours
              </button>
            ))}
            <button onClick={() => { setDateDebut(''); setDateFin('') }} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              Toute la période
            </button>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden md:block" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrer les résultats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="flex overflow-x-auto rounded-xl bg-white/90 border border-white/20 shadow-lg backdrop-blur-md">
        <TabButton id="logistique" label="Stock & Logistique" icon={Package} />
        <TabButton id="ventes" label="Analyse Ventes" icon={ShoppingBag} />
        <TabButton id="achats" label="Analyse Achats" icon={ArrowRightLeft} />
        <TabButton id="finances" label="Finances & Créances" icon={DollarSign} />
      </div>

      {/* Contenu de l'onglet */}
      <div className="mt-6">
        {activeTab === 'logistique' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {comparaison && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Chiffre d'Affaires" value={comparaison.periodeActuelle.ca} prev={comparaison.periodePrecedente.ca} evol={comparaison.evolutionPourcent.ca} unit="FCFA" color="blue" />
                <StatCard label="Total Achats" value={comparaison.periodeActuelle.achats} prev={comparaison.periodePrecedente.achats} evol={comparaison.evolutionPourcent.achats} unit="FCFA" color="orange" />
                <StatCard label="Volume Ventes" value={comparaison.periodeActuelle.ventes} prev={comparaison.periodePrecedente.ventes} evol={comparaison.evolutionPourcent.ventes} unit="unités" color="green" />
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <LogistiqueAlertes alertes={alertes} searchTerm={searchTerm} />
              <LogistiqueTop top={topProduits} searchTerm={searchTerm} />
            </div>
            <LogistiqueMouvements mouvements={mouvements} searchTerm={searchTerm} userRole={userRole} />
          </div>
        )}

        {activeTab === 'ventes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 border border-gray-200 bg-white p-5 rounded-2xl shadow-sm h-fit">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  CA par Client
                </h3>
                <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                  {caClients.filter(c => c.client.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <button
                      key={c.clientId || c.client}
                      onClick={() => c.clientId && fetchProduitsClient(c.clientId)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${selectedClientId === c.clientId ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-transparent'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800 truncate">{c.client}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{c.frequenceAchat} vts</span>
                      </div>
                      <div className="mt-1 text-blue-600 font-bold">
                        {c.chiffreAffaires.toLocaleString()} <span className="text-[10px] font-normal">FCFA</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Produits achetés par {caClients.find(c => c.clientId === selectedClientId)?.client || 'le client'}
                </h3>
                {selectedClientId ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="border-b">
                        <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Produit</th>
                          <th className="px-4 py-3 text-right">Qté</th>
                          <th className="px-4 py-3 text-right">Montant (CA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {produitsParClient.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.produit}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-600">{p.quantiteVendue}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">{p.chiffreAffaires.toLocaleString()} FCFA</td>
                          </tr>
                        ))}
                        {produitsParClient.length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">Aucune donnée sur cette période</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <PieChart className="h-12 w-12 mb-4 opacity-20" />
                    <p>Sélectionnez un client à gauche pour voir le détail de ses produits</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achats' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <PaiementTable
              title="État de Paiement des Achats"
              data={etatPaiementAchats}
              type="achats"
              searchTerm={searchTerm}
            />
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <PaiementTable
              title="Créances Clients (Ventes)"
              data={etatPaiementVentes}
              type="ventes"
              searchTerm={searchTerm}
            />
            
            <div className="border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        Factures Clients Détaillées
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50/50">
                            <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">N° Facture</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-right">Réglé</th>
                                <th className="px-4 py-3 text-right">Solde</th>
                                <th className="px-4 py-3 text-center">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {facturesVentes.filter(f => f.client.toLowerCase().includes(searchTerm.toLowerCase()) || f.numero.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
                                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-mono font-bold text-blue-600">{f.numero}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(f.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{f.client}</td>
                                    <td className="px-4 py-3 text-sm text-right font-bold">{f.montantTotal.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">{f.montantPaye.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">{f.resteAPayer.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-center">
                                        <StatutBadge statut={f.statutPaiement} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {paginationFactures && (
                    <div className="mt-4">
                        <Pagination 
                            currentPage={facturesPage} 
                            totalPages={paginationFactures.totalPages} 
                            onPageChange={setFacturesPage}
                            totalItems={paginationFactures.total}
                            itemsPerPage={10}
                        />
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sous-composants
function StatCard({ label, value, prev, evol, unit, color }: any) {
  const isUp = evol >= 0
  const colors: any = {
    blue: 'from-blue-500 to-indigo-600 text-blue-600',
    orange: 'from-orange-500 to-amber-600 text-orange-600',
    green: 'from-emerald-500 to-green-600 text-green-600'
  }
  return (
    <div className="relative group overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute top-0 right-0 h-16 w-16 -mr-8 -mt-8 rounded-full bg-gradient-to-br ${colors[color].split(' text')[0]} opacity-5 group-hover:scale-150 transition-transform`} />
      <p className="text-sm font-medium text-gray-500 uppercase tracking-tight">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-black text-gray-900">{value.toLocaleString()}</span>
        <span className="text-xs text-gray-400">{unit}</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-[10px] text-gray-400">Précédent: {prev.toLocaleString()}</span>
        <span className={`flex items-center text-xs font-bold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(evol).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const styles: any = {
    PAYE: 'bg-green-100 text-green-700 border-green-200',
    PARTIEL: 'bg-orange-100 text-orange-700 border-orange-200',
    CREDIT: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[statut] || 'bg-gray-100 text-gray-600'}`}>
      {statut}
    </span>
  )
}

function LogistiqueAlertes({ alertes, searchTerm }: any) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        Alertes Stock
      </h3>
      <div className="space-y-3">
        {alertes.filter((a: any) => !searchTerm || a.produit.designation.toLowerCase().includes(searchTerm.toLowerCase())).map((a: any) => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-red-50 bg-red-50/30">
            <div>
              <p className="font-bold text-gray-900 text-sm">{a.produit.designation}</p>
              <p className="text-[10px] text-gray-500 uppercase">{a.produit.code} • {a.magasin.nom}</p>
            </div>
            <div className="text-right">
              <span className="text-red-600 font-black">{a.quantite}</span>
              <span className="text-gray-400 text-xs"> / {a.produit.seuilMin}</span>
              <p className="text-[10px] text-red-400 italic">manque {a.manquant}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogistiqueTop({ top, searchTerm }: any) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Top Ventes (Volume)
      </h3>
      <div className="space-y-3">
        {top.filter((t: any) => !searchTerm || t.designation.toLowerCase().includes(searchTerm.toLowerCase())).map((t: any, i: number) => (
          <div key={t.produitId} className="flex items-center gap-3">
            <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-gray-100 text-[10px] font-black text-gray-500">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{t.designation}</p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (t.quantiteVendue / top[0]?.quantiteVendue) * 100)}%` }} />
              </div>
            </div>
            <span className="text-xs font-bold text-gray-700">{t.quantiteVendue}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogistiqueMouvements({ mouvements, searchTerm, userRole }: any) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Derniers Mouvements</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Magasin</th>
              <th className="px-4 py-3 text-right">Qté</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mouvements.filter((m: any) => !searchTerm || m.produit.designation.toLowerCase().includes(searchTerm.toLowerCase())).map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.date).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`px-2 py-0.5 rounded uppercase font-bold text-[9px] ${m.type === 'ENTREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.type}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{m.produit.designation}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.magasin.nom}</td>
                <td className="px-4 py-3 text-right font-black text-gray-900">{m.quantite}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaiementTable({ title, data, type, searchTerm }: any) {
  return (
    <div className="border border-gray-200 bg-white p-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-gray-900">{title}</h3>
        <div className="h-2 w-24 bg-gradient-to-r from-orange-400 to-red-500 rounded-full" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50/50">
            <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">{type === 'achats' ? 'Fournisseur' : 'Client'}</th>
              <th className="px-6 py-4 text-center">Transactions</th>
              <th className="px-6 py-4 text-right">Montant Total</th>
              <th className="px-6 py-4 text-right">Déjà Payé</th>
              <th className="px-6 py-4 text-right">Reste à Payer</th>
              <th className="px-6 py-4 px-10">Progression</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.filter((d: any) => (d.client || d.fournisseur).toLowerCase().includes(searchTerm.toLowerCase())).map((d: any, i: number) => {
              const solde = d.resteAPayer
              const pourcentage = d.montantTotal > 0 ? (d.montantPaye / d.montantTotal) * 100 : 0
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{d.client || d.fournisseur}</div>
                    <div className="text-[10px] text-gray-400">ID: {d.clientId || d.fournisseurId || '---'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                      {d.nbVentes || d.nbAchats}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-600">{d.montantTotal.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">{d.montantPaye.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-black ${solde > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{solde.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${pourcentage >= 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pourcentage}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{pourcentage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {data.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-gray-400 italic">Aucune donnée trouvée sur cette période</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
