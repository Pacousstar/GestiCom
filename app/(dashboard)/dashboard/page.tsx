'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
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
  RefreshCw,
} from 'lucide-react'
import KpiCard from '@/components/dashboard/KpiCard'
import RecentActivity from '@/components/dashboard/RecentActivity'
import SuggestionsAchat from '@/components/dashboard/SuggestionsAchat'



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
  _timeout?: boolean
}

function calcTrend(current: number, previous: number): { trend: 'up' | 'down' | 'neutral'; value: number } {
  if (previous === 0) return { trend: 'neutral', value: 0 }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral', value: Math.abs(pct) }
}

export default function DashboardPage() {

  // Fetcher personnalisé pour gérer le timeout et les erreurs spécifiques
  const fetcher = async (url: string) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const r = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        if (d._timeout) {
          throw new Error('Réponse partielle (timeout). Fermez le portable puis rechargez.')
        }
        return d as DashboardData
      } else {
        throw new Error(d?.error || 'Erreur serveur')
      }
    } catch (e: any) {
      clearTimeout(timeout)
      if (e?.name !== 'AbortError') {
        throw new Error('Erreur de connexion: ' + (e.message || 'Erreur serveur'))
      }
      throw e
    }
  }

  const { data, error, isLoading: loading, mutate, isValidating: refreshing } = useSWR<DashboardData>('/api/dashboard', fetcher, {
    revalidateOnFocus: true,     // Recharge quand l'onglet redevient actif
    revalidateIfStale: true,     // Recharge s'il y a plus récent
    keepPreviousData: true,      // Affiche les anciennes données pendant le chargement au lieu d'un spinner
    errorRetryCount: 2,
  })

  // Permet de mettre le message d'erreur SWR dans un format exploitable
  const err = error ? error.message : null





  const txJour = data?.transactionsJour ?? 0
  const txHier = data?.transactionsHier ?? 0
  const txTrend = calcTrend(txJour, txHier)

  const lowStock = data?.lowStock ?? []
  const recentSales = data?.recentSales ?? []
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
        <button
          onClick={() => mutate()}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
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
        ].map((s, i) => (
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

      {/* Activité récente + Alertes stock + Prédictions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activité récente */}
        <div className="flex flex-col rounded-xl bg-white p-6 shadow-lg border border-orange-100 h-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900">Activité récente</h2>
            </div>
            <Link href="/dashboard/ventes" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Voir tout
            </Link>
          </div>
          <div className="flex-1 overflow-auto">
            <RecentActivity items={activityItems} loading={refreshing} />
          </div>
        </div>

        {/* Alertes stock faible */}
        <div className="flex flex-col rounded-xl bg-white p-6 shadow-lg border border-orange-100 h-full">
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
            className="mt-4 block w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Voir le stock
          </Link>
        </div>

        {/* Suggestions / IA */}
        <SuggestionsAchat />
      </div>
    </div>
  )
}
