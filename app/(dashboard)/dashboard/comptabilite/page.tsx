import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  Banknote,
  ShoppingCart,
  Users,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  FileText,
  DollarSign,
  Receipt,
  ShoppingBag,
  Download,
  Share2,
  FileSpreadsheet
} from 'lucide-react'
import InitButton from './InitButton'
import DiagnosticButton from './DiagnosticButton'

function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

const MOIS: { v: number; l: string }[] = [
  { v: 1, l: 'Janvier' }, { v: 2, l: 'Février' }, { v: 3, l: 'Mars' }, { v: 4, l: 'Avril' },
  { v: 5, l: 'Mai' }, { v: 6, l: 'Juin' }, { v: 7, l: 'Juillet' }, { v: 8, l: 'Août' },
  { v: 9, l: 'Septembre' }, { v: 10, l: 'Octobre' }, { v: 11, l: 'Novembre' }, { v: 12, l: 'Décembre' },
]

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; annee?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const canAccess = session.role === 'SUPER_ADMIN' || session.role === 'COMPTABLE'
  if (!canAccess) {
    redirect('/dashboard?error=compta_denied')
  }

  const sp = await searchParams
  const now = new Date()
  const annee = Math.min(2030, Math.max(2020, parseInt(sp.annee || '', 10) || now.getFullYear()))
  const mois = Math.min(12, Math.max(1, parseInt(sp.mois || '', 10) || now.getMonth() + 1))

  const debMois = new Date(annee, mois - 1, 1)
  const finMois = new Date(annee, mois, 0, 23, 59, 59)
  const debMoisPrec = new Date(annee, mois - 2, 1)
  const finMoisPrec = new Date(annee, mois - 1, 0, 23, 59, 59)

  // CA du mois (ventes validées), achats — Client: $queryRaw car conflit de nom prisma.client
  const [
    caMois, caMoisPrec, nbVentesMois, nbVentesMoisPrec, rClient, rClientPrec,
    totalAchatsMois, totalAchatsMoisPrec, ventesMois, achatsMois,
  ] = await Promise.all([
    prisma.vente.aggregate({
      where: { date: { gte: debMois, lte: finMois }, statut: 'VALIDEE' },
      _sum: { montantTotal: true },
    }),
    prisma.vente.aggregate({
      where: { date: { gte: debMoisPrec, lte: finMoisPrec }, statut: 'VALIDEE' },
      _sum: { montantTotal: true },
    }),
    prisma.vente.count({ where: { date: { gte: debMois, lte: finMois }, statut: 'VALIDEE' } }),
    prisma.vente.count({ where: { date: { gte: debMoisPrec, lte: finMoisPrec }, statut: 'VALIDEE' } }),
    prisma.$queryRaw<[{ n: number }]>`SELECT COUNT(*) as n FROM "Client"`,
    prisma.$queryRaw<[{ n: number }]>(Prisma.sql`SELECT COUNT(*) as n FROM "Client" WHERE "createdAt" <= ${finMoisPrec}`),
    prisma.achat.aggregate({
      where: { date: { gte: debMois, lte: finMois } },
      _sum: { montantTotal: true },
    }),
    prisma.achat.aggregate({
      where: { date: { gte: debMoisPrec, lte: finMoisPrec } },
      _sum: { montantTotal: true },
    }),
    prisma.vente.findMany({
      where: { date: { gte: debMois, lte: finMois }, statut: 'VALIDEE' },
      take: 15,
      orderBy: { date: 'desc' },
      select: { id: true, numero: true, date: true, montantTotal: true, magasin: { select: { code: true } } },
    }),
    prisma.achat.findMany({
      where: { date: { gte: debMois, lte: finMois } },
      take: 15,
      orderBy: { date: 'desc' },
      select: { id: true, numero: true, date: true, montantTotal: true, magasin: { select: { code: true } } },
    }),
  ])

  // Dépenses : tolérant si la table n'existe pas
  let totalDepensesMois = { _sum: { montant: null as number | null } }
  let depensesMois: Array<{ id: number; date: Date; libelle: string; montant: number; categorie: string; magasin: { code: string } | null }> = []
  try {
    const [agg, list] = await Promise.all([
      prisma.depense.aggregate({
        where: { date: { gte: debMois, lte: finMois } },
        _sum: { montant: true },
      }),
      prisma.depense.findMany({
        where: { date: { gte: debMois, lte: finMois } },
        take: 15,
        orderBy: { date: 'desc' },
        select: { id: true, date: true, libelle: true, montant: true, categorie: true, magasin: { select: { code: true } } },
      }),
    ])
    totalDepensesMois = agg
    depensesMois = list
  } catch {
    // Table Depense absente : on garde 0 et []
  }

  // Charges : tolérant si la table n'existe pas
  let totalChargesMois = { _sum: { montant: null as number | null } }
  let chargesMois: Array<{ id: number; date: Date; rubrique: string; montant: number; type: string; observation: string | null }> = []
  try {
    const [agg, list] = await Promise.all([
      prisma.charge.aggregate({
        where: { date: { gte: debMois, lte: finMois } },
        _sum: { montant: true },
      }),
      prisma.charge.findMany({
        where: { date: { gte: debMois, lte: finMois } },
        take: 15,
        orderBy: { date: 'desc' },
        select: { id: true, date: true, rubrique: true, montant: true, type: true, observation: true },
      }),
    ])
    totalChargesMois = agg
    chargesMois = list
  } catch {
    // Table Charge absente : on garde 0 et []
  }

  const totalClients = Number(rClient[0]?.n ?? 0)
  const nbClientsMoisPrec = Number(rClientPrec[0]?.n ?? 0)

  const ca = caMois._sum.montantTotal ?? 0
  const caPrec = caMoisPrec._sum.montantTotal ?? 0
  const totalAchats = totalAchatsMois._sum.montantTotal ?? 0
  const totalAchatsPrec = totalAchatsMoisPrec._sum.montantTotal ?? 0
  const totalDepenses = totalDepensesMois._sum.montant ?? 0
  const evolCa = caPrec > 0 ? ((ca - caPrec) / caPrec) * 100 : (ca > 0 ? 100 : 0)
  const evolVentes =
    nbVentesMoisPrec > 0
      ? ((nbVentesMois - nbVentesMoisPrec) / nbVentesMoisPrec) * 100
      : (nbVentesMois > 0 ? 100 : 0)
  const evolClients =
    nbClientsMoisPrec > 0
      ? ((totalClients - nbClientsMoisPrec) / nbClientsMoisPrec) * 100
      : (totalClients > 0 ? 100 : 0)
  const evolAchats =
    totalAchatsPrec > 0
      ? ((totalAchats - totalAchatsPrec) / totalAchatsPrec) * 100
      : (totalAchats > 0 ? 100 : 0)

  const cards = [
    {
      title: "Chiffre d'affaires",
      value: formatFcfa(ca),
      sub: 'Ce mois',
      change: evolCa,
      icon: Banknote,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Ventes',
      value: String(nbVentesMois),
      sub: 'Transactions ce mois',
      change: evolVentes,
      icon: ShoppingCart,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Clients',
      value: String(totalClients),
      sub: 'Fiches actives',
      change: evolClients,
      icon: Users,
      color: 'from-violet-500 to-violet-600',
    },
    {
      title: 'Achats',
      value: formatFcfa(totalAchats),
      sub: 'Total ce mois',
      change: evolAchats,
      icon: ShoppingBag,
      color: 'from-amber-500 to-orange-600',
    },
  ]

  const moisLabel = debMois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Comptabilité</h1>
          <p className="mt-2 text-white/90">
            Chiffres de GestiCom — CA, ventes, clients et évolution. Accès réservé au Super Administrateur et au Comptable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <InitButton />
          <DiagnosticButton />
          <a
            href="/dashboard/comptabilite/plan-comptes"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Plan de Comptes
          </a>
          <a
            href="/dashboard/comptabilite/journaux"
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Journaux
          </a>
          <a
            href="/dashboard/comptabilite/ecritures"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Écritures
          </a>
          <a
            href="/dashboard/comptabilite/grand-livre"
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Grand Livre
          </a>
          <a
            href="/dashboard/comptabilite/balance"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Balance
          </a>
        </div>
      </div>

      <form action="/dashboard/comptabilite" method="GET" className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Mois</label>
          <select name="mois" defaultValue={mois} className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {MOIS.map((m) => (
              <option key={m.v} value={m.v}>{m.l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Année</label>
          <select name="annee" defaultValue={annee} className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
          Appliquer
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-blue-900">Exports Experts (GestiCom Pro)</h2>
          <p className="text-sm text-blue-700">Générez vos fichiers pour votre expert-comptable (Format Sage SAS ou Excel).</p>
        </div>
        <div className="flex gap-3">
          <a
            href={`/api/comptabilite/export-pro?type=SAGE&mois=${mois}&annee=${annee}&dateDebut=${annee}-${String(mois).padStart(2, '0')}-01&dateFin=${annee}-${String(mois).padStart(2, '0')}-${new Date(annee, mois, 0).getDate()}`}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 shadow-md transition-all transform active:scale-95"
          >
            <Share2 className="h-5 w-5" />
            Export Sage (.txt)
          </a>
          <a
            href={`/api/comptabilite/export-pro?type=EXCEL&mois=${mois}&annee=${annee}&dateDebut=${annee}-${String(mois).padStart(2, '0')}-01&dateFin=${annee}-${String(mois).padStart(2, '0')}-${new Date(annee, mois, 0).getDate()}`}
            className="flex items-center gap-2 rounded-xl border-2 border-green-600 bg-white px-6 py-3 font-bold text-green-700 hover:bg-green-50 shadow-md transition-all transform active:scale-95"
          >
            <FileSpreadsheet className="h-5 w-5" />
            Synthèse Excel
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <p className="text-sm font-medium">
          Résumé du mois de <span className="font-bold capitalize">{moisLabel}</span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon
          const isPos = c.change > 0
          const isZero = c.change === 0
          return (
            <div
              key={i}
              className={`overflow-hidden rounded-xl bg-gradient-to-br ${c.color} p-6 shadow-lg transition-all hover:shadow-xl hover:scale-105`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/90">{c.title}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{c.value}</p>
                  <p className="text-xs text-white/80">{c.sub}</p>
                  {!isZero && (
                    <div className="mt-2 flex items-center gap-1">
                      {isPos ? (
                        <ArrowUp className="h-4 w-4 text-white/90" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-white/90" />
                      )}
                      <span className="text-sm font-medium text-white/90">
                        {Math.abs(c.change).toFixed(1)}%
                      </span>
                      <span className="text-sm text-white/70">vs mois dernier</span>
                    </div>
                  )}
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                  <Icon className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-white" />
          <h2 className="text-2xl font-bold text-white">Synthèse du mois</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CA */}
          <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100 mb-1">CA</p>
                <p className="text-2xl font-bold">{formatFcfa(ca)}</p>
                <p className="text-xs text-green-100 mt-1">Ventes validées</p>
              </div>
              <Banknote className="h-10 w-10 text-green-200" />
            </div>
          </div>

          {/* Achats */}
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100 mb-1">Achats</p>
                <p className="text-2xl font-bold">{formatFcfa(totalAchats)}</p>
                <p className="text-xs text-blue-100 mt-1">Total des achats</p>
              </div>
              <ShoppingCart className="h-10 w-10 text-blue-200" />
            </div>
          </div>

          {/* Dépenses */}
          <div className="rounded-xl bg-gradient-to-br from-red-500 to-pink-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-100 mb-1">Dépenses</p>
                <p className="text-2xl font-bold">{formatFcfa(totalDepenses)}</p>
                <p className="text-xs text-red-100 mt-1">Total des dépenses</p>
              </div>
              <DollarSign className="h-10 w-10 text-red-200" />
            </div>
          </div>

          {/* Marge brute */}
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100 mb-1">Marge brute</p>
                <p className="text-2xl font-bold">{formatFcfa(Math.max(0, ca - totalAchats))}</p>
                <p className="text-xs text-purple-100 mt-1">CA - Achats</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </div>

          {/* Résultat net */}
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100 mb-1">Résultat net</p>
                <p className="text-2xl font-bold">{formatFcfa(Math.max(0, ca - totalAchats - totalDepenses))}</p>
                <p className="text-xs text-orange-100 mt-1">CA - Achats - Dépenses</p>
              </div>
              <FileText className="h-10 w-10 text-orange-200" />
            </div>
          </div>

          {/* Nombre de ventes */}
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-green-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-100 mb-1">Nombre de ventes</p>
                <p className="text-2xl font-bold">{nbVentesMois}</p>
                <p className="text-xs text-teal-100 mt-1">Ventes ce mois</p>
              </div>
              <ShoppingCart className="h-10 w-10 text-teal-200" />
            </div>
          </div>

          {/* Clients actifs */}
          <div className="rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-pink-100 mb-1">Clients actifs</p>
                <p className="text-2xl font-bold">{totalClients}</p>
                <p className="text-xs text-pink-100 mt-1">Clients ayant acheté</p>
              </div>
              <Users className="h-10 w-10 text-pink-200" />
            </div>
          </div>

          {/* Évolution CA */}
          <div className={`rounded-xl bg-gradient-to-br ${evolCa >= 0 ? 'from-blue-500 to-indigo-600' : 'from-red-500 to-orange-600'} p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: evolCa >= 0 ? 'rgb(219 234 254)' : 'rgb(254 226 226)' }}>Évolution CA</p>
                <p className="text-2xl font-bold">{evolCa >= 0 ? '+' : ''}{evolCa.toFixed(1)} %</p>
                <p className="text-xs mt-1" style={{ color: evolCa >= 0 ? 'rgb(219 234 254)' : 'rgb(254 226 226)' }}>Vs mois dernier</p>
              </div>
              {evolCa >= 0 ? (
                <ArrowUp className="h-10 w-10" style={{ color: 'rgb(191 219 254)' }} />
              ) : (
                <ArrowDown className="h-10 w-10" style={{ color: 'rgb(254 202 202)' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-white" />
                <h2 className="text-xl font-bold text-white">Ventes du mois</h2>
              </div>
              <a href="/dashboard/ventes" className="text-sm font-medium text-white/90 hover:text-white underline">Voir tout</a>
            </div>
          </div>
          <div className="p-6">
          {ventesMois.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune vente ce mois.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-gray-600"><th className="py-2">N°</th><th className="py-2">Date</th><th className="py-2 text-right">Montant</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {ventesMois.map((v) => (
                    <tr key={v.id}><td className="py-1.5 font-mono text-gray-900">{v.numero}</td><td className="py-1.5 text-gray-700">{new Date(v.date).toLocaleDateString('fr-FR')}</td><td className="py-1.5 text-right font-medium text-gray-900">{formatFcfa(Number(v.montantTotal))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-white" />
                <h2 className="text-xl font-bold text-white">Achats du mois</h2>
              </div>
              <a href="/dashboard/achats" className="text-sm font-medium text-white/90 hover:text-white underline">Voir tout</a>
            </div>
          </div>
          <div className="p-6">
          {achatsMois.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun achat ce mois.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-gray-600"><th className="py-2">N°</th><th className="py-2">Date</th><th className="py-2 text-right">Montant</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {achatsMois.map((a) => (
                    <tr key={a.id}><td className="py-1.5 font-mono text-gray-900">{a.numero}</td><td className="py-1.5 text-gray-700">{new Date(a.date).toLocaleDateString('fr-FR')}</td><td className="py-1.5 text-right font-medium text-gray-900">{formatFcfa(Number(a.montantTotal))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-white" />
                <h2 className="text-xl font-bold text-white">Dépenses du mois</h2>
              </div>
              <a href="/dashboard/depenses" className="text-sm font-medium text-white/90 hover:text-white underline">Voir tout</a>
            </div>
          </div>
          <div className="p-6">
          {depensesMois.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune dépense ce mois.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-gray-600"><th className="py-2">Date</th><th className="py-2">Libellé</th><th className="py-2 text-right">Montant</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {depensesMois.map((d) => (
                    <tr key={d.id}><td className="py-1.5 text-gray-700">{new Date(d.date).toLocaleDateString('fr-FR')}</td><td className="py-1.5 text-gray-900">{d.libelle}</td><td className="py-1.5 text-right font-medium text-gray-900">{formatFcfa(Number(d.montant))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
        <div className="rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-white" />
                <h2 className="text-xl font-bold text-white">Charges du mois</h2>
              </div>
              <a href="/dashboard/charges" className="text-sm font-medium text-white/90 hover:text-white underline">Voir tout</a>
            </div>
          </div>
          <div className="p-6">
          {chargesMois.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune charge ce mois.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-gray-600"><th className="py-2">Date</th><th className="py-2">Rubrique</th><th className="py-2 text-right">Montant</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {chargesMois.map((c) => (
                    <tr key={c.id}>
                      <td className="py-1.5 text-gray-700">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-1.5 text-gray-900">{c.rubrique}</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">{formatFcfa(Number(c.montant))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
