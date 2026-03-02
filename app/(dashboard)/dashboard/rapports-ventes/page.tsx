'use client'

import RapportsNav from './RapportsNav'
import { Users, UserCheck, Package } from 'lucide-react'
import Link from 'next/link'

export default function RapportsVentesPage() {
    return (
        <div className="space-y-6">
            <RapportsNav />
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Rapports Commerciaux Avancés</h1>
                <p className="mt-1 text-gray-900">Vue d'ensemble et filtrage des statistiques de vente (indépendant de la comptabilité)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/dashboard/rapports-ventes/vendeurs" className="group">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md hover:border-blue-300 transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Performance</p>
                            <h2 className="text-lg font-bold text-gray-900 mt-1">Par Vendeur</h2>
                            <p className="text-xs text-gray-900 mt-1">Analyser le CA par membre de l'équipe</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Users className="h-6 w-6" />
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/rapports-ventes/clients" className="group">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md hover:border-green-300 transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">Fidélité</p>
                            <h2 className="text-lg font-bold text-gray-900 mt-1">Par Client</h2>
                            <p className="text-xs text-gray-900 mt-1">Identifier les meilleurs clients (CRM)</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <UserCheck className="h-6 w-6" />
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/rapports-ventes/produits" className="group">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between hover:shadow-md hover:border-purple-300 transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">Catalogue</p>
                            <h2 className="text-lg font-bold text-gray-900 mt-1">Par Produit</h2>
                            <p className="text-xs text-gray-900 mt-1">Top produits et marges générées</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Package className="h-6 w-6" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    )
}
