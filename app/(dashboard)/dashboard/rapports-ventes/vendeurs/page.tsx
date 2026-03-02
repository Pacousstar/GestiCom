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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-blue-600" />
                        Performance par Vendeur
                    </h1>
                    <p className="text-gray-900 text-sm mt-1">Chiffre d'affaires généré par membre de l'équipe</p>
                </div>

                <form onSubmit={handleFilter} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Du</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Au</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 h-[34px]">
                        <Filter className="h-4 w-4" /> Filtrer
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-900 font-medium">CA Total de l'équipe</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalCA)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-900 font-medium">Nombre de ventes total</p>
                    <p className="text-2xl font-bold text-gray-900">{totalVentes}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center text-blue-600">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase">Vendeur</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">CA Généré</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Ventes</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">Panier Moyen</th>
                                <th className="px-6 py-3 text-sm font-bold text-gray-900 uppercase text-right">% du CA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{row.vendeur}</td>
                                    <td className="px-6 py-4 text-right text-blue-700 font-bold">{formatCurrency(row.chiffreAffaires)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{row.nombreVentes}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(row.panierMoyen)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {totalCA > 0 ? ((row.chiffreAffaires / totalCA) * 100).toFixed(1) : 0}%
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
