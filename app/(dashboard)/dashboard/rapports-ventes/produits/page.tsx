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

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl mb-8 relative overflow-hidden transition-all hover:shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase italic">
                            <div className="p-3 bg-orange-50 rounded-2xl shadow-sm">
                                <Package className="h-8 w-8 text-orange-600" />
                            </div>
                            Rentabilité Produits
                        </h1>
                        <p className="text-slate-500 text-sm mt-3 max-w-xl font-bold uppercase tracking-widest opacity-80">
                            Analyse des rotations de stock et de la performance par article
                        </p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Date de début</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Date de fin</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button type="submit" className="bg-orange-600 text-white px-8 py-2 rounded-xl text-xs font-black hover:bg-orange-700 flex items-center gap-2 h-[42px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20 uppercase tracking-widest">
                            <Filter className="h-4 w-4" /> Analyser
                        </button>
                    </form>
                </div>
                {/* Décorations Light */}
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-orange-500/5 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl"></div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden mb-12">
                {loading ? (
                    <div className="p-24 flex flex-col justify-center items-center text-orange-600 gap-6">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Analyse en cours...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 italic">
                                    <th className="px-8 py-6">Désignation Article</th>
                                    <th className="px-8 py-6">Catégorie</th>
                                    <th className="px-8 py-6 text-right">Qté Vendue</th>
                                    <th className="px-8 py-6 text-right">Valeur Ventes</th>
                                    <th className="px-8 py-6 text-right">Masse CA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-orange-50/30 transition-all duration-300 group">
                                        <td className="px-8 py-7 font-black text-slate-900 uppercase tracking-tighter italic group-hover:text-orange-600 transition-colors">
                                            {row.designation}
                                        </td>
                                        <td className="px-8 py-7">
                                            <span className="bg-white text-slate-400 px-3 py-1 rounded-full text-[10px] font-black tracking-[0.1em] border border-gray-100 shadow-sm uppercase italic">
                                                Article
                                            </span>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-sm font-black tabular-nums border border-orange-100 shadow-sm italic">
                                                {row.quantiteTotale}
                                            </span>
                                        </td>
                                        <td className="px-8 py-7 text-right text-blue-600 font-black tracking-tighter text-xl tabular-nums">
                                            {formatCurrency(row.caTotal)}
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-xl text-[10px] font-black border border-orange-100 tracking-tight">
                                                {data.reduce((acc, c) => acc + c.caTotal, 0) > 0 ? ((row.caTotal / data.reduce((acc, c) => acc + c.caTotal, 0)) * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center text-slate-200 font-black uppercase italic tracking-[0.5em] text-xs">
                                            Aucune transaction enregistrée
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
