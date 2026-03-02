'use client'

import { useState, useEffect } from 'react'
import RapportsNav from '../RapportsNav'
import { Filter, UserCheck, Loader2 } from 'lucide-react'

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
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-green-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{row.client}</td>
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
        </div>
    )
}
