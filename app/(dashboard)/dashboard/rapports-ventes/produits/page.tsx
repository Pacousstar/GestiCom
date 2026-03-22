'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, Package, Loader2 } from 'lucide-react'

interface ProduitData {
    produitId: number
    designation: string
    quantiteTotale: number
    caTotal: number
    nombreTransactions: number
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(val).replace('XOF', 'FCFA')
}

export default function ParProduitPage() {
    const [data, setData] = useState<ProduitData[]>([])
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
            const res = await fetch(`/api/rapports/ventes/produits?dateDebut=${start}&dateFin=${end}`)
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

    return (
        <div className="space-y-6">
            <RapportsNav />

            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden transition-all hover:shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 tracking-tight uppercase italic">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Package className="h-8 w-8 text-purple-400" />
                            </div>
                            Top Produits
                        </h1>
                        <p className="text-white/70 text-base mt-2 max-w-xl font-medium italic">
                            Analyse des rotations de stock et de la rentabilité par article
                        </p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-inner">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider ml-1">Début</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider ml-1">Au</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-gray-900/50 border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-black hover:bg-purple-500 flex items-center gap-2 h-[42px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/20">
                            <Filter className="h-5 w-5" /> ANALYSER
                        </button>
                    </form>
                </div>
                {/* Décorations */}
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl"></div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden mt-8">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-purple-400">
                        <Loader2 className="h-10 w-10 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-xs font-black text-purple-300 uppercase tracking-widest">Désignation</th>
                                <th className="px-6 py-4 text-xs font-black text-purple-300 uppercase tracking-widest">Catégorie</th>
                                <th className="px-6 py-4 text-xs font-black text-purple-300 uppercase tracking-widest text-right">Qté Vendue</th>
                                <th className="px-6 py-4 text-xs font-black text-purple-300 uppercase tracking-widest text-right">Chiffre d'Affaires</th>
                                <th className="px-6 py-4 text-xs font-black text-purple-300 uppercase tracking-widest text-right">Marge Dégagée</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                    <td className="px-6 py-4 font-bold text-white tracking-tight">{row.designation}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-white/5 text-white/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">PRODUIT</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-white">{row.quantiteTotale}</td>
                                    <td className="px-6 py-4 text-right text-purple-400 font-black tracking-tighter text-lg">{formatCurrency(row.caTotal)}</td>
                                    <td className="px-6 py-4 text-right text-white/40 italic text-sm">
                                        —
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
