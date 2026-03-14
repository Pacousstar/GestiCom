'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [isActivated, setIsActivated] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Ne pas bloquer la page d'activation elle-même
        if (pathname === '/activation') {
            setLoading(false)
            return
        }

        let isMounted = true

        async function checkLicense() {
            try {
                // Timeout de 3 secondes pour le fetch de licence (Démarrage éclair)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                const res = await fetch('/api/license/check', { 
                    cache: 'no-store',
                    signal: controller.signal 
                })
                clearTimeout(timeoutId)
                
                const data = await res.json()
                
                if (isMounted) {
                    if (data.activated) {
                        setIsActivated(true)
                    } else {
                        setIsActivated(false)
                    }
                }
            } catch (error) {
                console.error('License verification failed:', error)
                if (isMounted) {
                    setIsActivated(false)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        checkLicense()

        return () => {
            isMounted = false
        }
    }, [pathname, router])

    // Rendu immédiat de l'application (Plus de blocage !)
    return (
        <>
            {children}
            {/* Bannière discrète uniquement si non activé et pas sur la page d'activation */}
            {!loading && !isActivated && pathname !== '/activation' && (
                <div className="fixed bottom-0 left-0 right-0 bg-red-600/90 text-white text-[10px] py-1 px-4 flex justify-between items-center z-[9999] backdrop-blur-sm">
                    <span className="font-medium">GESTICOM — MODE ÉVALUATION (Activation requise)</span>
                    <button 
                        onClick={() => router.push('/activation')}
                        className="bg-white text-red-600 px-2 py-0.5 rounded-sm font-bold hover:bg-slate-100 transition-colors"
                    >
                        ACTIVER MAINTENANT
                    </button>
                </div>
            )}
        </>
    )
}
