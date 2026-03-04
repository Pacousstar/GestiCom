'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, AlertTriangle, TrendingUp, ArrowRightLeft, FileSpreadsheet, Trash2, Search, Filter, X } from 'lucide-react'
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

type Magasin = {
  id: number
  code: string
  nom: string
}

type Produit = {
  id: number
  code: string
  designation: string
}

type Comparaison = {
  periodeActuelle: { ca: number; achats: number; ventes: number }
  periodePrecedente: { ca: number; achats: number; ventes: number }
  evolution: { ca: number; achats: number; ventes: number }
  evolutionPourcent: { ca: number; achats: number; ventes: number }
}

export default function RapportsPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [topProduits, setTopProduits] = useState<Top[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [comparaison, setComparaison] = useState<Comparaison | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [userRole, setUserRole] = useState<string>('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [alertesPage, setAlertesPage] = useState(1)
  const [topPage, setTopPage] = useState(1)
  const [alertesPagination, setAlertesPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const [topPagination, setTopPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null)
  const { success: showSuccess, error: showError } = useToast()

  // Filtres avancés
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [filtreMagasin, setFiltreMagasin] = useState('')
  const [filtreProduit, setFiltreProduit] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('/api/auth/check')
      .then((r) => (r.ok ? r.json() : { role: '' }))
      .then((data: { role?: string }) => setUserRole(data.role || ''))
      .catch(() => { })

    // Charger magasins et produits pour les filtres
    Promise.all([
      fetch('/api/magasins').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/produits?complet=1').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) ? d : []),
    ]).then(([mags, prods]) => {
      setMagasins(Array.isArray(mags) ? mags : [])
      setProduits(Array.isArray(prods) ? prods : [])
    })
  }, [])

  const fetchRapports = (overrideDeb?: string, overrideFin?: string, overrideAlertesPage?: number, overrideTopPage?: number) => {
    setLoading(true)
    const deb = overrideDeb ?? dateDebut
    const fin = overrideFin ?? dateFin
    const alertesPg = overrideAlertesPage ?? alertesPage
    const topPg = overrideTopPage ?? topPage
    const params = new URLSearchParams()
    if (deb) params.set('dateDebut', deb)
    if (fin) params.set('dateFin', fin)
    if (filtreMagasin) params.set('magasinId', filtreMagasin)
    if (filtreProduit) params.set('produitId', filtreProduit)
    if (filtreCategorie) params.set('categorie', filtreCategorie)
    params.set('alertesPage', String(alertesPg))
    params.set('alertesLimit', '10')
    params.set('topPage', String(topPg))
    params.set('topLimit', '10')
    fetch('/api/rapports?' + params.toString())
      .then((r) => (r.ok ? r.json() : { alertes: [], topProduits: [], mouvements: [], alertesPagination: null, topPagination: null }))
      .then((d) => {
        setAlertes(Array.isArray(d.alertes) ? d.alertes : [])
        setTopProduits(Array.isArray(d.topProduits) ? d.topProduits : [])
        setMouvements(Array.isArray(d.mouvements) ? d.mouvements : [])
        setAlertesPagination(d.alertesPagination || null)
        setTopPagination(d.topPagination || null)
        setComparaison(d.comparaison || null)
      })
      .catch((e) => {
        console.error('Erreur fetch rapports:', e)
        setAlertes([])
        setTopProduits([])
        setMouvements([])
        setAlertesPagination(null)
        setTopPagination(null)
        setComparaison(null)
      })
      .finally(() => setLoading(false))
  }

  // Charger les données au premier rendu
  useEffect(() => {
    fetchRapports('', '', 1, 1)
  }, [])

  // Recharger quand les pages ou filtres changent
  useEffect(() => {
    fetchRapports(dateDebut, dateFin, alertesPage, topPage)
  }, [alertesPage, topPage, filtreMagasin, filtreProduit, filtreCategorie])

  const preset = (j: number) => {
    const f = new Date()
    const d = new Date(f)
    d.setDate(d.getDate() - j)
    const deb = d.toISOString().slice(0, 10)
    const fin = f.toISOString().slice(0, 10)
    setDateDebut(deb)
    setDateFin(fin)
    setAlertesPage(1)
    setTopPage(1)
    fetchRapports(deb, fin, 1, 1)
  }
  const presetMois = () => {
    const f = new Date()
    const deb = new Date(f.getFullYear(), f.getMonth(), 1).toISOString().slice(0, 10)
    const fin = f.toISOString().slice(0, 10)
    setDateDebut(deb)
    setDateFin(fin)
    setAlertesPage(1)
    setTopPage(1)
    fetchRapports(deb, fin, 1, 1)
  }
  const resetDates = () => {
    setDateDebut('')
    setDateFin('')
    setAlertesPage(1)
    setTopPage(1)
    fetchRapports('', '', 1, 1)
  }

  const handleDeleteMouvement = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ? Cette action est irréversible.')) {
      return
    }
    setDeletingId(id)
    try {
      const res = await fetch(`/api/mouvements/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showSuccess('Mouvement supprimé avec succès.')
        fetchRapports(dateDebut, dateFin, alertesPage, topPage)
      } else {
        const data = await res.json()
        showError(data.error || 'Erreur lors de la suppression.')
      }
    } catch (e) {
      showError('Erreur réseau lors de la suppression.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Rapports</h1>
        <p className="mt-1 text-white/90">Alertes stock, top produits, mouvements</p>
      </div>

      {/* Barre de recherche */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans les rapports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filtres avancés
          </button>
          {(filtreMagasin || filtreProduit || filtreCategorie) && (
            <button
              onClick={() => {
                setFiltreMagasin('')
                setFiltreProduit('')
                setFiltreCategorie('')
              }}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Réinitialiser filtres
            </button>
          )}
        </div>

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">Magasin</label>
              <select
                value={filtreMagasin}
                onChange={(e) => setFiltreMagasin(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Tous les magasins</option>
                {magasins.map((mag) => (
                  <option key={mag.id} value={mag.id}>
                    {mag.code} - {mag.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">Produit</label>
              <select
                value={filtreProduit}
                onChange={(e) => setFiltreProduit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Tous les produits</option>
                {produits.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.code} - {prod.designation}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-800 mb-1">Catégorie</label>
              <input
                type="text"
                value={filtreCategorie}
                onChange={(e) => setFiltreCategorie(e.target.value)}
                placeholder="Filtrer par catégorie"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-800">Du</label>
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-800">Au</label>
          <input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setAlertesPage(1)
            setTopPage(1)
            fetchRapports(dateDebut, dateFin, 1, 1)
          }}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Appliquer
        </button>
        <button type="button" onClick={() => { preset(7); }} className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
          7 jours
        </button>
        <button type="button" onClick={() => { preset(30); }} className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
          30 jours
        </button>
        <button type="button" onClick={presetMois} className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
          Ce mois
        </button>
        <button type="button" onClick={resetDates} className="rounded-lg bg-gradient-to-r from-slate-500 to-gray-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-105 transition-all">
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams()
            if (dateDebut) params.set('dateDebut', dateDebut)
            if (dateFin) params.set('dateFin', dateFin)
            window.open('/api/rapports/export?' + params.toString(), '_blank')
          }}
          className="rounded-lg border-2 border-green-500 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100 flex items-center gap-1.5"
          title="Exporter les rapports en Excel (alertes, top produits, mouvements)"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter Excel
        </button>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams()
            if (dateDebut) params.set('dateDebut', dateDebut)
            if (dateFin) params.set('dateFin', dateFin)
            window.open('/api/rapports/export-pdf?' + params.toString(), '_blank')
          }}
          className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 flex items-center gap-1.5"
          title="Exporter les rapports en PDF (alertes, top produits)"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter PDF
        </button>
      </div>

      {/* Section Comparaison Période vs Période */}
      {comparaison && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-900">Comparaison Période vs Période Précédente</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {/* CA */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
              <div className="mb-2 text-sm font-medium text-gray-600">Chiffre d'Affaires</div>
              <div className="mb-1 text-2xl font-bold text-gray-900">
                {comparaison.periodeActuelle.ca.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="text-xs text-gray-600">
                Période précédente : {comparaison.periodePrecedente.ca.toLocaleString('fr-FR')} FCFA
              </div>
              <div className={`mt-2 text-sm font-semibold ${comparaison.evolution.ca >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {comparaison.evolution.ca >= 0 ? '↑' : '↓'} {Math.abs(comparaison.evolution.ca).toLocaleString('fr-FR')} FCFA
                {' '}({comparaison.evolutionPourcent.ca >= 0 ? '+' : ''}{comparaison.evolutionPourcent.ca.toFixed(1)}%)
              </div>
            </div>

            {/* Achats */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4">
              <div className="mb-2 text-sm font-medium text-gray-600">Achats</div>
              <div className="mb-1 text-2xl font-bold text-gray-900">
                {comparaison.periodeActuelle.achats.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="text-xs text-gray-600">
                Période précédente : {comparaison.periodePrecedente.achats.toLocaleString('fr-FR')} FCFA
              </div>
              <div className={`mt-2 text-sm font-semibold ${comparaison.evolution.achats >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {comparaison.evolution.achats >= 0 ? '↑' : '↓'} {Math.abs(comparaison.evolution.achats).toLocaleString('fr-FR')} FCFA
                {' '}({comparaison.evolutionPourcent.achats >= 0 ? '+' : ''}{comparaison.evolutionPourcent.achats.toFixed(1)}%)
              </div>
            </div>

            {/* Ventes */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
              <div className="mb-2 text-sm font-medium text-gray-600">Nombre de Ventes</div>
              <div className="mb-1 text-2xl font-bold text-gray-900">
                {comparaison.periodeActuelle.ventes.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-600">
                Période précédente : {comparaison.periodePrecedente.ventes.toLocaleString('fr-FR')}
              </div>
              <div className={`mt-2 text-sm font-semibold ${comparaison.evolution.ventes >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                {comparaison.evolution.ventes >= 0 ? '↑' : '↓'} {Math.abs(comparaison.evolution.ventes).toLocaleString('fr-FR')}
                {' '}({comparaison.evolutionPourcent.ventes >= 0 ? '+' : ''}{comparaison.evolutionPourcent.ventes.toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Alertes stock</h2>
            </div>
            {alertesPagination && (
              <span className="text-sm text-gray-500">
                {alertesPagination.total} alerte{alertesPagination.total > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {alertes.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune alerte.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {alertes
                  .filter((a) => {
                    if (!searchTerm) return true
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      a.produit.code.toLowerCase().includes(searchLower) ||
                      a.produit.designation.toLowerCase().includes(searchLower) ||
                      a.magasin.code.toLowerCase().includes(searchLower) ||
                      a.magasin.nom.toLowerCase().includes(searchLower)
                    )
                  })
                  .map((a) => (
                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                      <div>
                        <p className="font-medium text-gray-900">{a.produit.designation}</p>
                        <p className="text-xs text-gray-600">{a.produit.code} · {a.magasin.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">{a.quantite} / {a.produit.seuilMin}</p>
                        <p className="text-xs text-gray-500">manque {a.manquant}</p>
                      </div>
                    </li>
                  ))}
              </ul>
              {alertesPagination && alertesPagination.total > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={alertesPagination.page}
                    totalPages={alertesPagination.totalPages}
                    totalItems={alertesPagination.total}
                    itemsPerPage={alertesPagination.limit}
                    onPageChange={(page) => {
                      setAlertesPage(page)
                      fetchRapports(dateDebut, dateFin, page, topPage)
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">Top produits (qté vendue)</h2>
            </div>
            {topPagination && (
              <span className="text-sm text-gray-500">
                {topPagination.total} produit{topPagination.total > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {topProduits.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune vente enregistrée.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {topProduits
                  .filter((t) => {
                    if (!searchTerm) return true
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      t.code.toLowerCase().includes(searchLower) ||
                      t.designation.toLowerCase().includes(searchLower)
                    )
                  })
                  .map((t, i) => {
                    const globalIndex = topPagination ? (topPagination.page - 1) * topPagination.limit + i : i
                    return (
                      <li key={t.produitId} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
                        <span className="text-sm font-medium text-gray-500">#{globalIndex + 1}</span>
                        <span className="flex-1 truncate px-2 text-sm text-gray-900">{t.designation}</span>
                        <span className="font-semibold text-gray-900">{t.quantiteVendue} unités</span>
                      </li>
                    )
                  })}
              </ul>
              {topPagination && topPagination.total > 0 && (
                <div className="mt-4 border-t pt-4">
                  <Pagination
                    currentPage={topPagination.page}
                    totalPages={topPagination.totalPages}
                    totalItems={topPagination.total}
                    itemsPerPage={topPagination.limit}
                    onPageChange={(page) => {
                      setTopPage(page)
                      fetchRapports(dateDebut, dateFin, alertesPage, page)
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-bold text-gray-900">Mouvements récents</h2>
        </div>
        {mouvements.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun mouvement. Les mouvements sont créés lors des entrées/sorties de stock.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Produit</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-600">Magasin</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-600">Qté</th>
                  {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mouvements
                  .filter((m) => {
                    if (!searchTerm) return true
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      m.produit.code.toLowerCase().includes(searchLower) ||
                      m.produit.designation.toLowerCase().includes(searchLower) ||
                      m.magasin.code.toLowerCase().includes(searchLower) ||
                      m.magasin.nom.toLowerCase().includes(searchLower)
                    )
                  })
                  .map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(m.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${m.type === 'ENTREE' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{m.produit.designation}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{m.magasin.code}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{m.quantite}</td>
                      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleDeleteMouvement(m.id)}
                            disabled={deletingId === m.id}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deletingId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
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
