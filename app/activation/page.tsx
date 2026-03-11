'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Key, Loader2, CheckCircle, Smartphone, Building, ShieldCheck } from 'lucide-react'

export default function ActivationPage() {
    const [hwid, setHwid] = useState('')
    const [key, setKey] = useState('')
    const [loading, setLoading] = useState(true)
    const [activating, setActivating] = useState(false)
    const [message, setMessage] = useState('')
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const router = useRouter()

    useEffect(() => {
        async function fetchHwid() {
            try {
                const res = await fetch('/api/license/check')
                const data = await res.json()
                setHwid(data.hwid)
                if (data.activated) {
                    router.push('/dashboard')
                }
            } catch (error) {
                console.error('Failed to fetch HWID:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchHwid()
    }, [router])

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault()
        setActivating(true)
        setMessage('')
        setStatus('idle')

        try {
            const res = await fetch('/api/license/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            })
            const data = await res.json()

            if (data.success) {
                setStatus('success')
                setMessage('Logiciel activé avec succès ! Redirection...')
                setTimeout(() => router.push('/dashboard'), 2000)
            } else {
                setStatus('error')
                setMessage(data.error || 'Erreur lors de l\'activation')
            }
        } catch (error) {
            setStatus('error')
            setMessage('Une erreur réseau est survenue.')
        } finally {
            setActivating(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-orange-500/10 mb-6 border border-orange-500/20">
                        <ShieldAlert className="h-10 w-10 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Activation GestiCom</h1>
                    <p className="text-slate-400 font-medium italic">Logiciel de Gestion Commerciale Intégré</p>
                </div>

                {/* Content Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>

                    <div className="relative space-y-6">
                        <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Identifiant Machine (HWID)</label>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-mono font-black text-white tracking-tighter">{hwid}</span>
                                <Smartphone className="h-5 w-5 text-slate-700" />
                            </div>
                        </div>

                        <form onSubmit={handleActivate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1">Clé d'Activation</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Key className="h-4 w-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={key}
                                        onChange={(e) => setKey(e.target.value.toUpperCase())}
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-mono tracking-widest placeholder:text-slate-700 uppercase"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={activating || status === 'success'}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group"
                            >
                                {activating ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : status === 'success' ? (
                                    <ShieldCheck className="h-5 w-5" />
                                ) : (
                                    <>
                                        Activer le logiciel
                                        <CheckCircle className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </>
                                )}
                            </button>
                        </form>

                        {message && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                {status === 'success' ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
                                <p className="text-sm font-bold leading-tight">{message}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center space-y-4">
                    <p className="text-slate-500 text-xs font-medium max-w-[280px] mx-auto leading-relaxed">
                        Pour obtenir votre clé, veuillez contacter le **DG DIHI** en fournissant l'ID ci-dessus.
                    </p>
                    <div className="flex items-center justify-center gap-6 opacity-30 grayscale saturate-0 pointer-events-none grayscale-100">
                        <Building className="h-4 w-4 text-white" />
                        <span className="text-[10px] font-black text-white tracking-widest uppercase">GSN EXPERTISES GROUP</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
