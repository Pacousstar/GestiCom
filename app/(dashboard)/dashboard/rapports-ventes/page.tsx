'use client'

import RapportsNav from './RapportsNav'
import { Users, UserCheck, Package } from 'lucide-react'
import Link from 'next/link'

export default function RapportsVentesPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <RapportsNav />
            
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 text-white shadow-2xl">
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight">Rapports Commerciaux Avancés</h1>
                    <p className="mt-3 max-w-2xl text-lg text-gray-300">
                        Plongez dans l'analyse détaillée de vos performances. Identifiez vos forces, fidélisez vos clients et optimisez votre catalogue avec précision.
                    </p>
                </div>
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Link href="/dashboard/rapports-ventes/vendeurs" className="group relative">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
                    <div className="relative flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-md p-8 transition-all hover:bg-emerald-900/40 hover:border-emerald-500/50 shadow-xl group-hover:scale-[1.02] duration-300">
                        <div>
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <Users className="h-7 w-7" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Performance Vendeurs</h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/70">
                                Analysez le chiffre d'affaires et l'efficacité de chaque collaborateur pour booster la motivation.
                            </p>
                        </div>
                        <div className="mt-8 flex items-center text-sm font-semibold text-blue-400 group-hover:text-emerald-400 transition-colors">
                            Explorer les statistiques
                            <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/rapports-ventes/clients" className="group relative">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
                    <div className="relative flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-md p-8 transition-all hover:bg-emerald-900/40 hover:border-emerald-500/50 shadow-xl group-hover:scale-[1.02] duration-300">
                        <div>
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-green-50 text-green-600 shadow-inner group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                                <UserCheck className="h-7 w-7" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Analyse Clients</h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/70">
                                Identifiez vos clients les plus fidèles et comprenez leurs habitudes d'achat pour mieux les servir.
                            </p>
                        </div>
                        <div className="mt-8 flex items-center text-sm font-semibold text-green-400 group-hover:text-emerald-400 transition-colors">
                            Voir le TOP Clients
                            <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/rapports-ventes/produits" className="group relative">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 opacity-20 blur transition duration-500 group-hover:opacity-40"></div>
                    <div className="relative flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-md p-8 transition-all hover:bg-emerald-900/40 hover:border-emerald-500/50 shadow-xl group-hover:scale-[1.02] duration-300">
                        <div>
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-inner group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                                <Package className="h-7 w-7" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Rentabilité Produits</h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/70">
                                Prenez des décisions éclairées sur votre stock en identifiant vos meilleures marges et rotations.
                            </p>
                        </div>
                        <div className="mt-8 flex items-center text-sm font-semibold text-purple-400 group-hover:text-emerald-400 transition-colors">
                            Analyser le catalogue
                            <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    )
}
