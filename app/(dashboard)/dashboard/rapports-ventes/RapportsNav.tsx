'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, UserCheck, Package } from 'lucide-react'

export default function RapportsNav() {
    const pathname = usePathname()

    const tabs = [
        { name: 'Vue Globale', href: '/dashboard/rapports-ventes', icon: LayoutDashboard },
        { name: 'Par Vendeur', href: '/dashboard/rapports-ventes/vendeurs', icon: Users },
        { name: 'Par Client', href: '/dashboard/rapports-ventes/clients', icon: UserCheck },
        { name: 'Par Produit', href: '/dashboard/rapports-ventes/produits', icon: Package },
    ]

    return (
        <div className="mb-6 flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href
                const Icon = tab.icon
                return (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${isActive
                                ? 'bg-orange-600 text-white'
                                : 'text-gray-900 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {tab.name}
                    </Link>
                )
            })}
        </div>
    )
}
