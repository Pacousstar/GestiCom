'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, Users, Loader2 } from 'lucide-react'

interface VendeurData {
    vendeur: string
    chiffreAffaires: number
    nombreVentes: number
    panierMoyen: number
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(val).replace('XOF', 'FCFA')
}

export default function ParVendeurPage() {
    const [data, setData] = useState<VendeurData[]>([])
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

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
            const res = await fetch(`/api/rapports/ventes/vendeurs?start=${start}&end=${end}`)
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

    const totalCA = data.reduce((acc, curr) => acc + curr.chiffreAffaires, 0)
    const totalVentes = data.reduce((acc, curr) => acc + curr.nombreVentes, 0)

    return (
        <div className="space-y-6">
            <RapportsNav />

            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden transition-all hover:shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Users className="h-8 w-8 text-blue-400" />
                            </div>
                            Performance par Vendeur
                        </h1>
                        <p className="text-white/70 text-base mt-2 max-w-xl font-medium italic">
                            Analyse détaillée du chiffre d'affaires et de l'efficacité de votre force de vente
                        </p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-inner">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">Début</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">Fin</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-black hover:bg-blue-500 flex items-center gap-2 h-[42px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20">
                            <Filter className="h-5 w-5" /> ACTUALISER
                        </button>
                    </form>
                </div>
                {/* Décorations */}
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">CA Total de l'équipe</p>
                        <p className="text-3xl font-black">{formatCurrency(totalCA)}</p>
                    </div>
                    <Users className="absolute -right-4 -bottom-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                </div>
                <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 p-6 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Nombre de ventes total</p>
                        <p className="text-3xl font-black">{totalVentes}</p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-blue-400">
                        <Loader2 className="h-10 w-10 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-xs font-black text-blue-300 uppercase tracking-widest">Vendeur</th>
                                <th className="px-6 py-4 text-xs font-black text-blue-300 uppercase tracking-widest text-right">CA Généré</th>
                                <th className="px-6 py-4 text-xs font-black text-blue-300 uppercase tracking-widest text-right">Ventes</th>
                                <th className="px-6 py-4 text-xs font-black text-blue-300 uppercase tracking-widest text-right">Panier Moyen</th>
                                <th className="px-6 py-4 text-xs font-black text-blue-300 uppercase tracking-widest text-right">% du CA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                    <td className="px-6 py-4 font-bold text-white">{row.vendeur}</td>
                                    <td className="px-6 py-4 text-right text-blue-400 font-black tracking-tighter text-lg">{formatCurrency(row.chiffreAffaires)}</td>
                                    <td className="px-6 py-4 text-right text-white/80 font-medium">{row.nombreVentes}</td>
                                    <td className="px-6 py-4 text-right text-white/80 font-medium">{formatCurrency(row.panierMoyen)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-bold">
                                            {totalCA > 0 ? ((row.chiffreAffaires / totalCA) * 100).toFixed(1) : 0}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-900">Aucune donnée sur cette période</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
