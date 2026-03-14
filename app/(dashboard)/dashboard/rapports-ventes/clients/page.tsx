'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, UserCheck, Loader2, X, Calendar, FileText, ChevronRight, PieChart } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface ClientData {
    client: string
    chiffreAffaires: number
    frequenceAchat: number
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(val).replace('XOF', 'FCFA')
}

export default function ParClientPage() {
    const [data, setData] = useState<ClientData[]>([])
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const { error: showError } = useToast()
    const [selectedHistory, setSelectedHistory] = useState<{ id: number | null; nom: string } | null>(null)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        setStartDate(start)
        setEndDate(end)
        fetchData(start, end)
    }, [])

    const fetchData = async (start: string, end: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/rapports/ventes/clients?start=${start}&end=${end}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault()
        fetchData(startDate, endDate)
    }

    const fetchHistory = async (id: number | null, nom: string) => {
        if (!id) return
        setSelectedHistory({ id, nom })
        setLoadingHistory(true)
        try {
            const res = await fetch(`/api/rapports/ventes/clients/${id}/history?start=${startDate}&end=${endDate}`)
            if (res.ok) {
                setHistoryData(await res.json())
            }
        } catch (e) {
            showError('Erreur chargement historique client')
        } finally {
            setLoadingHistory(false)
        }
    }

    return (
        <div className="space-y-6">
            <RapportsNav />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UserCheck className="h-6 w-6 text-green-600" />
                        Fidélité Clients
                    </h1>
                    <p className="text-gray-900 text-sm mt-1">Meilleurs clients par volume d'achat</p>
                </div>

                <form onSubmit={handleFilter} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Du</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Au</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2 h-[34px]">
                        <Filter className="h-4 w-4" /> Filtrer
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-green-600">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase">Client</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">CA Généré</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Nb Achats</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Moyenne par Achat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row: any, idx) => (
                                <tr 
                                    key={idx} 
                                    className="hover:bg-green-50/50 transition-colors cursor-pointer group"
                                    onClick={() => fetchHistory(row.clientId, row.client)}
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center justify-between">
                                        {row.client}
                                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 transition-all opacity-0 group-hover:opacity-100 mr-2" />
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-700 font-bold">{formatCurrency(row.chiffreAffaires)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        <span className="inline-flex items-center justify-center bg-gray-100 px-2 py-1 rounded text-xs font-semibold">
                                            {row.frequenceAchat}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {formatCurrency(row.frequenceAchat > 0 ? row.chiffreAffaires / row.frequenceAchat : 0)}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-900">Aucune donnée sur cette période</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedHistory && (
                <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-6 border-b flex items-center justify-between bg-green-700 text-white">
                        <div>
                            <h2 className="text-xl font-bold">{selectedHistory.nom}</h2>
                            <p className="text-green-100 text-xs">Mouvements & Historique</p>
                        </div>
                        <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {loadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                                <p className="text-gray-500 text-sm">Récupération des ventes...</p>
                            </div>
                        ) : historyData.length === 0 ? (
                            <div className="text-center py-20 text-gray-500">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                Aucune vente trouvée pour ce client sur cette période.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historyData.map((h, i) => (
                                    <div key={i} className="border rounded-xl p-4 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                                    <FileText className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                                                </div>
                                                <div>
                                                    <p className="font-mono text-sm font-bold text-gray-900">{h.numero}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                                                        {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900">{h.montantTotal.toLocaleString()} F</p>
                                                <div className="flex items-center justify-end gap-1">
                                                    {h.statutPaiement === 'PAYE' ? (
                                                        <span className="text-[10px] bg-green-100 text-green-800 px-1.5 rounded font-bold uppercase">Payé</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 rounded font-bold uppercase">Dette: {(h.montantTotal - h.montantPaye).toLocaleString()} F</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3 mt-3 border-gray-100 group-hover:border-green-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{h.modePaiement}</span>
                                                <span className="bg-gray-100 px-2 py-0.5 rounded italic opacity-70">Mag: {h.magasin?.nom}</span>
                                            </div>
                                            <button 
                                                className="text-green-700 font-bold flex items-center gap-0.5 hover:gap-1.5 transition-all"
                                                onClick={() => window.location.href = `/dashboard/ventes?numero=${h.numero}`}
                                            >
                                                Bon de vente <ChevronRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
