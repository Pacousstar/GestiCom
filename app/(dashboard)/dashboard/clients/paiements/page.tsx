'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Calendar, User, CreditCard, Hash, Coins, Download } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface Paiement {
  id: number
  date: string
  clientCode: string | null
  clientNom: string
  modePaiement: string
  venteNumero: string
  montant: number
  observation: string | null
}

export default function PaiementsClientsPage() {
  const [data, setData] = useState<Paiement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { error: showError } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients/paiements')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      } else {
        showError('Impossible de charger les paiements.')
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

  const filteredData = data.filter(p => 
    p.clientNom.toLowerCase().includes(search.toLowerCase()) || 
    p.venteNumero.toLowerCase().includes(search.toLowerCase()) ||
    (p.clientCode && p.clientCode.toLowerCase().includes(search.toLowerCase()))
  )

  const total = filteredData.reduce((acc, p) => acc + p.montant, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Récapitulatif des Paiements</h1>
          <p className="text-sm text-gray-500">Historique chronologique des encaissements clients</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <Download className="h-4 w-4" /> Imprimer Rapport
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un client ou une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-orange-500 focus:outline-none shadow-sm"
          />
        </div>
        
        <div className="rounded-lg bg-orange-50 px-4 py-2 border border-orange-100">
          <p className="text-sm text-orange-600 font-medium">Cumul sélectionné</p>
          <p className="text-lg font-bold text-orange-700">{total.toLocaleString('fr-FR')} F</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredData.length === 0 ? (
          <p className="py-12 text-center text-gray-500 italic">Aucun paiement enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Date</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2"><User className="h-3 w-3" /> Client</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2"><CreditCard className="h-3 w-3" /> Mode</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2"><Hash className="h-3 w-3" /> Référence</div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2 justify-end"><Coins className="h-3 w-3" /> Montant</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredData.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {new Date(p.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{p.clientNom}</span>
                        <span className="text-xs text-gray-400 uppercase">{p.clientCode || '—'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                        {p.modePaiement}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-500">
                      {p.venteNumero}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {p.montant.toLocaleString('fr-FR')} F
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
