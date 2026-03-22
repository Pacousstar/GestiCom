'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, UserCheck, Loader2, X, Calendar, FileText, ChevronRight, PieChart } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface ClientData {
    clientId: number
    client: string
    caTotal: number
    nombreVentes: number
    soldeDu: number
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
            const res = await fetch(`/api/rapports/ventes/clients?dateDebut=${start}&dateFin=${end}`)
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

            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden transition-all hover:shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight uppercase italic">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <UserCheck className="h-8 w-8 text-green-400" />
                            </div>
                            Fidélité Clients
                        </h1>
                        <p className="text-white/70 text-base mt-2 max-w-xl font-medium italic">
                            Classement des clients par volume d'achat et rentabilité globale
                        </p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-inner">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-green-300 uppercase tracking-wider ml-1">Du</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-green-300 uppercase tracking-wider ml-1">Au</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                            />
                        </div>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-black hover:bg-green-500 flex items-center gap-2 h-[42px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-900/20">
                            <Filter className="h-5 w-5" /> RECHERCHER
                        </button>
                    </form>
                </div>
                {/* Décorations */}
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-green-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
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
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Solde Dû</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Moyenne</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row: any, idx) => (
                                <tr 
                                    key={idx} 
                                    className="hover:bg-white/5 transition-colors cursor-pointer group border-b border-white/5 last:border-0"
                                    onClick={() => fetchHistory(row.clientId, row.client)}
                                >
                                    <td className="px-6 py-4 font-bold text-white flex items-center justify-between">
                                        {row.client}
                                        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-green-400 transition-all opacity-0 group-hover:opacity-100 mr-2" />
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-400 font-black tracking-tighter text-lg">{formatCurrency(row.caTotal)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center justify-center bg-white/5 px-2 py-1 rounded text-xs font-black text-white/70">
                                            {row.nombreVentes}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-red-400 font-bold">{formatCurrency(row.soldeDu)}</td>
                                    <td className="px-6 py-4 text-right text-white/60 italic text-sm">
                                        {formatCurrency(row.nombreVentes > 0 ? row.caTotal / row.nombreVentes : 0)}
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
