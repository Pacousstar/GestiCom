'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, Package, Loader2 } from 'lucide-react'

interface ProduitData {
    produit: string
    categorie: string
    quantiteVendue: number
    chiffreAffaires: number
    marge: number
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
            const res = await fetch(`/api/rapports/ventes/produits?start=${start}&end=${end}`)
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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="h-6 w-6 text-purple-600" />
                        Top Produits
                    </h1>
                    <p className="text-gray-900 text-sm mt-1">Produits les plus vendus et marges générées</p>
                </div>

                <form onSubmit={handleFilter} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Du</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Au</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <button type="submit" className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-purple-700 flex items-center gap-2 h-[34px]">
                        <Filter className="h-4 w-4" /> Filtrer
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-purple-600">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase">Désignation</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase">Catégorie</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Qté Vendue</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Chiffre d'Affaires</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Marge Dégagée</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-purple-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{row.produit}</td>
                                    <td className="px-6 py-4 text-gray-900 text-sm">{row.categorie}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">{row.quantiteVendue}</td>
                                    <td className="px-6 py-4 text-right text-purple-700 font-medium">{formatCurrency(row.chiffreAffaires)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                        <span className={row.marge > 0 ? "text-green-600" : row.marge < 0 ? "text-red-500" : ""}>
                                            {formatCurrency(row.marge)}
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
