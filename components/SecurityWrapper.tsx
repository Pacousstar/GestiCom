'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [isActivated, setIsActivated] = useState(false)
    const [hwid, setHwid] = useState('')
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        let isMounted = true

        async function checkLicense() {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const res = await fetch('/api/license/check', { 
                    cache: 'no-store',
                    signal: controller.signal 
                })
                clearTimeout(timeoutId)
                
                const data = await res.json()
                
                if (isMounted) {
                    setHwid(data.hwid || '')
                    if (data.activated) {
                        setIsActivated(true)
                        localStorage.setItem('gesticom_activated', 'true')
                    } else {
                        setIsActivated(false)
                        localStorage.removeItem('gesticom_activated')
                    }
                }
            } catch (error) {
                console.error('License verification failed:', error)
                if (isMounted && !localStorage.getItem('gesticom_activated')) {
                    setIsActivated(false)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        if (pathname === '/activation') {
            setLoading(false)
        } else {
            checkLicense()
        }

        return () => {
            isMounted = false
        }
    }, [pathname])

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f172a]">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        )
    }

    // Écran de blocage Premium
    if (!isActivated && pathname !== '/activation') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0f172a] p-4 overflow-hidden">
                {/* Effets de fond animés */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                
                <div className="relative w-full max-w-lg">
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-orange-500/10 mb-6 border border-orange-500/20 backdrop-blur-sm">
                            <KeyIcon className="h-10 w-10 text-orange-500" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Activation Requise</h1>
                        <p className="text-slate-400 font-medium">GestiCom Pro — Licence Non Détectée</p>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="space-y-6">
                            <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Identifiant de cette machine</label>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-mono font-black text-white tracking-tighter">{hwid || 'Récupération...'}</span>
                                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed text-center px-4">
                                Votre logiciel doit être activé pour cette machine avant de pouvoir accéder à vos données.
                            </p>

                            <button
                                onClick={() => router.push('/activation')}
                                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Lock className="h-5 w-5" />
                                ACTIVER MAINTENANT
                            </button>
                        </div>
                    </div>
                    
                    <p className="mt-8 text-center text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">
                        GestiCom par GSN EXPERTISES GROUP
                    </p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

import { Lock, Key as KeyIcon } from 'lucide-react'
