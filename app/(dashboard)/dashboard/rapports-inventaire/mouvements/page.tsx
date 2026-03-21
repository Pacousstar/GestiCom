'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Download, Filter, Package, Warehouse, User, ArrowUpRight, ArrowDownLeft, RefreshCcw, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface Mouvement {
  id: number
  date: string
  type: string
  produit: string
  code: string | null
  unite: string
  magasin: string
  quantite: number
  utilisateur: string
  observation: string | null
}

export default function MouvementsStockPage() {
  const [data, setData] = useState<Mouvement[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [magasins, setMagasins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('TOUT')
  const [selectedMagasin, setSelectedMagasin] = useState('TOUT')
  const [selectedType, setSelectedType] = useState('TOUT')
  const [search, setSearch] = useState('')
  const { error: showError } = useToast()

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    setStartDate(start)
    setEndDate(end)
    
    loadFilters()
    fetchData(start, end, 'TOUT', 'TOUT', 'TOUT')
  }, [])

  const loadFilters = async () => {
    try {
      const [prodRes, magRes] = await Promise.all([
        fetch('/api/produits?limit=1000'),
        fetch('/api/magasins')
      ])
      if (prodRes.ok) {
        const prodData = await prodRes.json()
        // L'API produits retourne { data: [...], pagination: {...} } (paginé)
        setProducts(Array.isArray(prodData) ? prodData : (prodData.data || []))
      }
      if (magRes.ok) {
        const magData = await magRes.json()
        setMagasins(Array.isArray(magData) ? magData : (magData.data || []))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async (start: string, end: string, prod: string, mag: string, type: string) => {
    setLoading(true)
    try {
      let url = `/api/rapports/inventaire/mouvements?dateDebut=${start}&dateFin=${end}`
      if (prod !== 'TOUT') url += `&produitId=${prod}`
      if (mag !== 'TOUT') url += `&magasinId=${mag}`
      if (type !== 'TOUT') url += `&type=${type}`
      
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setData(Array.isArray(d) ? d : [])
      } else {
        showError('Impossible de charger les mouvements.')
      }
    } catch (err) {
      console.error(err)
      showError('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData(startDate, endDate, selectedProduct, selectedMagasin, selectedType)
  }

  const filteredData = Array.isArray(data) ? data.filter(m => 
    m.produit.toLowerCase().includes(search.toLowerCase()) || 
    (m.code && m.code.toLowerCase().includes(search.toLowerCase()))
  ) : []

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENTREE': return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
      case 'SORTIE': return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'TRANSFERT': return <RefreshCcw className="h-4 w-4 text-blue-500" />
      case 'AJUSTEMENT': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      default: return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ENTREE': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'SORTIE': return 'bg-red-50 text-red-700 border-red-100'
      case 'TRANSFERT': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'AJUSTEMENT': return 'bg-amber-50 text-amber-700 border-amber-100'
      default: return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Mouvements de Stock</h1>
          <p className="text-sm text-white/90 font-medium">Historique détaillé des flux de produits</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <Download className="h-4 w-4" /> Exporter Rapport
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Période du</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">au</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Produit</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TOUT">Tous les produits</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.designation}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Magasin</label>
            <select
              value={selectedMagasin}
              onChange={(e) => setSelectedMagasin(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TOUT">Tous les magasins</option>
              {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TOUT">Tous types</option>
              <option value="ENTREE">Entrées</option>
              <option value="SORTIE">Sorties</option>
              <option value="TRANSFERT">Transferts</option>
              <option value="AJUSTEMENT">Ajustements</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 flex items-center gap-2 transition-all">
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </form>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par désignation ou code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none shadow-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredData.length === 0 ? (
          <p className="py-12 text-center text-gray-500 italic">Aucun mouvement ne correspond aux critères.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Désignation</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Magasin</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Quantité</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Utilisateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredData.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {m.date ? new Date(m.date).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Date inconnue'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400 uppercase">{m.code || 'SANS CODE'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{m.produit || 'Produit inconnu'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-3 w-3 text-gray-400" /> {m.magasin || 'Magasin inconnu'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${getTypeStyle(m.type || '')}`}>
                        {getTypeIcon(m.type || '')}
                        {m.type || 'INCONNU'}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-black ${m.type === 'SORTIE' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {m.type === 'SORTIE' ? '-' : '+'}{(m.quantite || 0).toLocaleString()} {m.unite || 'u'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" /> {m.utilisateur || 'Système'}
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
  )
}
