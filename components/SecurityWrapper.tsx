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
                // Timeout de 10 secondes pour le fetch de licence
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)

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
                        router.push('/activation')
                    }
                }
            } catch (error) {
                console.error('License verification failed:', error)
                if (isMounted) {
                    setIsActivated(false)
                    router.push('/activation')
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        )
    }

    // Si on est sur la page d'activation, on laisse passer
    if (pathname === '/activation') {
        return <>{children}</>
    }

    // Sinon, on ne rend les enfants que si activé. 
    return isActivated ? <>{children}</> : (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center flex-col gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <div className="text-center">
                <p className="text-white font-medium">Vérification de la licence...</p>
                <p className="text-slate-500 text-xs mt-2">Si ce message persiste, veuillez redémarrer l'application.</p>
            </div>
        </div>
    )
}
