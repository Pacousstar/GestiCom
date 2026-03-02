'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  ClipboardList,
  Loader2,
  TrendingUp,
  Wallet,
  CreditCard,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import KpiCard from '@/components/dashboard/KpiCard'
import RecentActivity from '@/components/dashboard/RecentActivity'

const AUTO_REFRESH_INTERVAL = 120 // secondes (augmenté pour performance)

type Widget = {
  id: string
  name: string
  visible: boolean
  order: number
}

type DashboardData = {
  transactionsJour: number
  transactionsHier: number
  produitsEnStock: number
  totalProduitsCatalogue?: number
  mouvementsJour: number
  clientsActifs: number
  caJour: number
  caHier: number
  soldeCaisse: number
  soldeBanque: number
  achatsJour: number
  lowStock: Array<{ name: string; stock: number; min: number; category: string }>
  recentSales: Array<{ id: string; client: string; montant: number; time: string }>
  repartition: Array<{ name: string; percent: number }>
  _timeout?: boolean
}

function calcTrend(current: number, previous: number): { trend: 'up' | 'down' | 'neutral'; value: number } {
  if (previous === 0) return { trend: 'neutral', value: 0 }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral', value: Math.abs(pct) }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [statsGraphiques, setStatsGraphiques] = useState<{
    caParPeriode: Array<{ date: string; ca: number; achats: number }>
    evolutionStock: Array<{ date: string; entrees: number; sorties: number }>
    topProduits: Array<{ produitId: number; code: string; designation: string; quantite: number; montant: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingGraphiques, setLoadingGraphiques] = useState(true)
  const [periodeGraphique, setPeriodeGraphique] = useState<'7' | '30' | '90' | 'mois'>('30')
  const [err, setErr] = useState<string | null>(null)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Charger les préférences utilisateur
  useEffect(() => {
    setLoadingPreferences(true)
    fetch('/api/dashboard/preferences')
      .then((r) => (r.ok ? r.json() : { widgets: null, periode: '30' }))
      .then((prefs) => {
        if (prefs.widgets && Array.isArray(prefs.widgets)) {
          setWidgets(prefs.widgets)
        }
        if (prefs.periode) {
          setPeriodeGraphique(prefs.periode as '7' | '30' | '90' | 'mois')
        }
      })
      .catch(() => { })
      .finally(() => setLoadingPreferences(false))
  }, [])

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setErr(null)

    const timeoutMs = 20000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const r = await fetch('/api/dashboard', { signal: controller.signal })
      clearTimeout(timeout)
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setData(d)
        if (d._timeout) {
          setErr('Réponse partielle (timeout). Fermez le portable puis rechargez.')
        }
      } else {
        setData(null)
        setErr(d?.error || 'Erreur serveur')
      }
    } catch (e: any) {
      clearTimeout(timeout)
      if (e?.name !== 'AbortError') {
        setData(null)
        setErr('Erreur de connexion: ' + (e.message || 'Erreur serveur'))
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLastRefresh(new Date())
      setSecondsSinceRefresh(0)
    }
  }, [])

  // Chargement initial
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Auto-refresh toutes les 60 secondes
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(() => {
      fetchDashboard()
    }, AUTO_REFRESH_INTERVAL * 1000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [fetchDashboard])

  // Compteur "il y a X sec"
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setSecondsSinceRefresh((s) => s + 1)
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [lastRefresh])

  // Charger les données graphiques
  useEffect(() => {
    if (loadingPreferences) return
    setLoadingGraphiques(true)
    fetch(`/api/rapports/stats?periode=${periodeGraphique}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.ok) setStatsGraphiques(d)
        else setStatsGraphiques(null)
      })
      .catch(() => setStatsGraphiques(null))
      .finally(() => setLoadingGraphiques(false))
  }, [periodeGraphique, loadingPreferences])

  const isWidgetVisible = (widgetId: string): boolean => {
    if (widgets.length === 0) return true
    const widget = widgets.find((w) => w.id === widgetId)
    return widget ? widget.visible : true
  }

  const getWidgetOrder = (widgetId: string): number => {
    if (widgets.length === 0) return 999
    const widget = widgets.find((w) => w.id === widgetId)
    return widget ? widget.order : 999
  }

  const handlePeriodeChange = (periode: '7' | '30' | '90' | 'mois') => {
    setPeriodeGraphique(periode)
    fetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: widgets.length > 0 ? widgets : null, periode }),
    }).catch(() => { })
  }

  // KPIs financiers
  const caJour = data?.caJour ?? 0
  const caHier = data?.caHier ?? 0
  const caTrend = calcTrend(caJour, caHier)
  const txJour = data?.transactionsJour ?? 0
  const txHier = data?.transactionsHier ?? 0
  const txTrend = calcTrend(txJour, txHier)

  const lowStock = data?.lowStock ?? []
  const recentSales = data?.recentSales ?? []
  const repartition = data?.repartition?.length ? data.repartition : [{ name: '—', percent: 100 }]

  // Activité récente (ventes uniquement pour l'instant)
  const activityItems = recentSales.map((s) => ({
    id: s.id,
    type: 'vente' as const,
    label: s.client,
    montant: s.montant,
    time: s.time,
  }))

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {err}
        </div>
      )}

      {/* En-tête avec bouton actualiser */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-white/80 text-sm">
            Vue d&apos;ensemble opérationnelle — stocks, alertes, activité
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <p className="text-xs text-white/60">
            {secondsSinceRefresh < 5
              ? 'Mis à jour à l\'instant'
              : `Mis à jour il y a ${secondsSinceRefresh}s`}
          </p>
        </div>
      </div>

      {/* KPIs financiers (ligne 1) - Supprimés à la demande */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Les cartes "CA du Jour", "Solde Caisse", "Solde Banque" ont été retirées */}
      </div>

      {/* KPIs opérationnels (ligne 2) */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {[
          {
            widgetId: 'transactions',
            title: 'Transactions du jour',
            value: txJour,
            icon: ClipboardList,
            color: 'from-yellow-400 to-yellow-500' as const,
            trend: txTrend.trend,
            trendValue: txTrend.value,
          },
          {
            widgetId: 'produits',
            title: 'Produits (catalogue)',
            value: data?.totalProduitsCatalogue ?? data?.produitsEnStock ?? 0,
            icon: Package,
            color: 'from-indigo-500 to-purple-600' as const,
          },
          {
            widgetId: 'produits',
            title: 'Produits en stock',
            value: data?.produitsEnStock ?? 0,
            icon: ShoppingBag,
            color: 'from-emerald-500 to-teal-600' as const,
          },
          {
            widgetId: 'mouvements',
            title: 'Mouvements du jour',
            value: data?.mouvementsJour ?? 0,
            icon: LayoutGrid,
            color: 'from-pink-500 to-rose-600' as const,
          },
          {
            widgetId: 'clients',
            title: 'Clients actifs',
            value: data?.clientsActifs ?? 0,
            icon: Users,
            color: 'from-cyan-500 to-emerald-600' as const,
          },
        ]
          .filter((s) => isWidgetVisible(s.widgetId))
          .map((s, i) => (
            <KpiCard
              key={i}
              title={s.title}
              value={s.value}
              icon={s.icon}
              color={s.color}
              trend={s.trend as any}
              trendValue={s.trendValue}
              loading={refreshing}
            />
          ))}
      </div>

      {/* Activité récente + Alertes stock */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activité récente */}
        <div className="rounded-xl bg-white p-6 shadow-lg border border-orange-100">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Activité récente</h2>
            </div>
            <Link href="/dashboard/ventes" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Voir tout
            </Link>
          </div>
          <RecentActivity items={activityItems} loading={refreshing} />
        </div>

        {/* Alertes stock faible */}
        <div className="rounded-xl bg-white p-6 shadow-lg border border-orange-100">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Stock faible</h2>
            </div>
            {lowStock.length > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
                {lowStock.length} produit(s)
              </span>
            )}
          </div>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">✅ Aucune alerte de stock.</p>
            ) : (
              lowStock.map((p, i) => {
                const pct = Math.min(100, Math.round((p.stock / p.min) * 100))
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-sm font-bold text-red-600">{p.stock} / {p.min}</p>
                        <p className="text-xs text-gray-400">unités</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <Link
            href="/dashboard/stock"
            className="mt-4 block w-full rounded-lg bg-orange-500 py-2 text-center text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Voir le stock
          </Link>
        </div>
      </div>

      {/* Graphiques */}
      {(isWidgetVisible('ca') || isWidgetVisible('stock')) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Évolution CA */}
          {isWidgetVisible('ca') && (
            <div className="rounded-xl bg-white p-6 shadow-lg border border-orange-100" style={{ order: getWidgetOrder('ca') }}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-bold text-gray-900">Évolution CA et Achats</h2>
                </div>
                <select
                  value={periodeGraphique}
                  onChange={(e) => handlePeriodeChange(e.target.value as '7' | '30' | '90' | 'mois')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="mois">12 mois</option>
                </select>
              </div>
              {loadingGraphiques ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : statsGraphiques?.caParPeriode && statsGraphiques.caParPeriode.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={statsGraphiques.caParPeriode}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#1f2937"
                      fontSize={13}
                      fontWeight={600}
                      tickFormatter={(value) => {
                        if (periodeGraphique === 'mois') return value
                        const date = new Date(value)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis stroke="#1f2937" fontSize={13} fontWeight={600} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ca" name="Chiffre d'affaires" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} />
                    <Line type="monotone" dataKey="achats" name="Achats" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  <p>Aucune donnée disponible pour cette période.</p>
                </div>
              )}
            </div>
          )}

          {/* Mouvements de stock */}
          {isWidgetVisible('stock') && (
            <div className="rounded-xl bg-white p-6 shadow-lg border border-orange-100" style={{ order: getWidgetOrder('stock') }}>
              <div className="mb-4 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">Mouvements de stock</h2>
              </div>
              {loadingGraphiques ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : statsGraphiques?.evolutionStock && statsGraphiques.evolutionStock.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsGraphiques.evolutionStock}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#1f2937"
                      fontSize={13}
                      fontWeight={600}
                      tickFormatter={(value) => {
                        if (periodeGraphique === 'mois') return value
                        const date = new Date(value)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis stroke="#1f2937" fontSize={13} fontWeight={600} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="entrees" name="Entrées" fill="#10b981" />
                    <Bar dataKey="sorties" name="Sorties" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  <p>Aucune donnée disponible pour cette période.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Répartition + Top produits + Actions rapides */}
      {(isWidgetVisible('repartition') || isWidgetVisible('actions') || isWidgetVisible('topProduits')) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Répartition par catégorie */}
          {isWidgetVisible('repartition') && (
            <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden" style={{ order: getWidgetOrder('repartition') }}>
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-4">
                <h2 className="text-xl font-bold text-white">Répartition par catégorie</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {repartition.map((c, i) => {
                    const colors = [
                      'from-blue-500 to-cyan-600',
                      'from-purple-500 to-pink-600',
                      'from-emerald-500 to-green-600',
                      'from-orange-500 to-amber-600',
                      'from-indigo-500 to-blue-600',
                      'from-rose-500 to-pink-600',
                      'from-violet-500 to-purple-600',
                      'from-teal-500 to-emerald-600',
                    ]
                    return (
                      <div key={i}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="font-semibold text-gray-800">{c.name}</span>
                          <span className="font-bold text-gray-600">{c.percent}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all duration-700`}
                            style={{ width: `${c.percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top produits */}
          {isWidgetVisible('topProduits') && (
            <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden" style={{ order: getWidgetOrder('topProduits') }}>
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                    <h2 className="text-xl font-bold text-white">Top produits</h2>
                  </div>
                  <Link href="/dashboard/rapports" className="text-xs font-medium text-white/90 hover:text-white underline">
                    Voir tout
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {loadingGraphiques ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : statsGraphiques?.topProduits && statsGraphiques.topProduits.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {statsGraphiques.topProduits.map((p, i) => (
                      <div key={p.produitId} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-bold text-white">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{p.designation}</p>
                            <p className="text-xs text-gray-500">{p.code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{p.quantite} unités</p>
                          <p className="text-xs text-gray-500">{Number(p.montant).toLocaleString('fr-FR')} F</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">Aucune vente enregistrée.</p>
                )}
              </div>
            </div>
          )}

          {/* Actions rapides */}
          {isWidgetVisible('actions') && (
            <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden" style={{ order: getWidgetOrder('actions') }}>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4">
                <h2 className="text-xl font-bold text-white">Actions rapides</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[
                    { href: '/dashboard/produits', color: 'from-blue-500 to-cyan-600', icon: Package, label: 'Nouveau produit', sub: 'Ajouter au catalogue' },
                    { href: '/dashboard/ventes', color: 'from-emerald-500 to-green-600', icon: ShoppingCart, label: 'Nouvelle vente', sub: 'Ouvrir la caisse' },
                    { href: '/dashboard/clients', color: 'from-purple-500 to-pink-600', icon: Users, label: 'Nouveau client', sub: 'Créer un compte' },
                    { href: '/dashboard/achats', color: 'from-orange-500 to-amber-600', icon: ShoppingBag, label: 'Nouvel achat', sub: 'Approvisionnement' },
                  ].map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`flex w-full items-center gap-3 rounded-lg bg-gradient-to-r ${action.color} p-3.5 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{action.label}</p>
                        <p className="text-xs text-white/80">{action.sub}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
