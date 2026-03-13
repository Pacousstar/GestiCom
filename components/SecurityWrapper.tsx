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

        async function checkLicense() {
            try {
                // Utiliser un cache court ou s'assurer que l'appel n'est pas bloqué
                const res = await fetch('/api/license/check', { cache: 'no-store' })
                const data = await res.json()
                
                if (data.activated) {
                    setIsActivated(true)
                } else {
                    setIsActivated(false)
                    router.push('/activation')
                }
            } catch (error) {
                console.error('License verification failed:', error)
                router.push('/activation')
            } finally {
                setLoading(false)
            }
        }

        checkLicense()
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

    // Sinon, on ne rend les enfants que si activé
    return isActivated ? <>{children}</> : null
}
