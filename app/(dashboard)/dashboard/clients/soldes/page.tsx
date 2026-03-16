'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Download, Filter, Wallet, FileText, Landmark } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface SoldeClient {
  id: number
  code: string | null
  nom: string
  telephone: string | null
  ncc: string | null
  localisation: string | null
  factures: number
  paiements: number
  soldeInitial: number
  soldeClient: number
}

export default function SoldesClientsPage() {
  const [data, setData] = useState<SoldeClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { error: showError } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients/soldes')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      } else {
        showError('Impossible de charger les soldes.')
      }
    } catch (err) {
      console.error(err)
      showError('Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredData = data.filter(c => 
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
    (c.localisation && c.localisation.toLowerCase().includes(search.toLowerCase()))
  )

  const totals = filteredData.reduce((acc, c) => ({
    factures: acc.factures + c.factures,
    paiements: acc.paiements + c.paiements,
    soldeInitial: acc.soldeInitial + c.soldeInitial,
    soldeClient: acc.soldeClient + c.soldeClient
  }), { factures: 0, paiements: 0, soldeInitial: 0, soldeClient: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soldes Clients</h1>
          <p className="text-sm text-gray-500">Synthèse financière globale par client</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
        >
          <Download className="h-4 w-4" /> Imprimer / PDF
        </button>
      </div>

      {/* Cartes de Totaux */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Factures</p>
              <p className="text-xl font-bold text-gray-900">{totals.factures.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500 p-2 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Paiements</p>
              <p className="text-xl font-bold text-gray-900">{totals.paiements.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500 p-2 text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Total Solde Initial</p>
              <p className="text-xl font-bold text-gray-900">{totals.soldeInitial.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${totals.soldeClient > 0 ? 'border-red-100 bg-red-50/50' : 'border-emerald-100 bg-emerald-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 text-white ${totals.soldeClient > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${totals.soldeClient > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Solde Net Global
              </p>
              <p className="text-xl font-bold text-gray-900">{totals.soldeClient.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code ou localisation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-orange-500 focus:outline-none shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredData.length === 0 ? (
          <p className="py-12 text-center text-gray-500 italic">Aucun client trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Code / Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Localisation</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Total Factures</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Paiements</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Solde Déposé</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Solde Client</th>
                  <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredData.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-gray-400 uppercase">{c.code || 'SANS CODE'}</span>
                        <span className="font-semibold text-gray-900">{c.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 italic">
                      {c.localisation || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-600">
                      {c.factures.toLocaleString('fr-FR')} F
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-emerald-600">
                      {c.paiements.toLocaleString('fr-FR')} F
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-amber-600">
                      {c.soldeInitial.toLocaleString('fr-FR')} F
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-bold ${c.soldeClient > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {c.soldeClient.toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${c.soldeClient > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {c.soldeClient > 0 ? 'DOIT' : 'SOLDÉ'}
                      </span>
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
