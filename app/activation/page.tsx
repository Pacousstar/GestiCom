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
                setMessage('Logiciel activé avec succès ! Redirection vers la connexion...')
                setTimeout(() => router.push('/login'), 2000)
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
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Arrière-plan stylisé */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-orange-500/10 mb-6 border border-white/5 backdrop-blur-sm shadow-2xl">
                        <ShieldAlert className="h-12 w-12 text-orange-500" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Activation Royale</h1>
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-px w-8 bg-orange-500/50"></div>
                        <p className="text-orange-500 font-bold uppercase tracking-[0.3em] text-[10px]">GestiCom Pro</p>
                        <div className="h-px w-8 bg-orange-500/50"></div>
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative group">
                    {/* Glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-400 rounded-[3rem] opacity-0 group-hover:opacity-10 transition duration-1000"></div>

                    <div className="relative space-y-8">
                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">Identifiant matériel unique (HWID)</label>
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-3xl font-mono font-black text-white tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">{hwid}</span>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(hwid)
                                        alert('Identifiant copié !')
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Copier l'identifiant</span>
                                    <Smartphone className="h-3 w-3 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleActivate} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-2">Clé de Licence Professionnelle</label>
                                <div className="relative group/input">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within/input:text-orange-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={key}
                                        onChange={(e) => setKey(e.target.value.toUpperCase())}
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        className="w-full bg-black/40 border border-white/10 text-white rounded-[1.5rem] py-5 pl-14 pr-6 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-mono text-lg tracking-widest placeholder:text-slate-800 uppercase"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={activating || status === 'success'}
                                className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 group/btn hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {activating ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : status === 'success' ? (
                                    <ShieldCheck className="h-6 w-6" />
                                ) : (
                                    <>
                                        <span className="text-lg uppercase tracking-wider">Activer le logiciel</span>
                                        <ArrowRight className="h-5 w-5 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                                    </>
                                )}
                            </button>
                        </form>

                        {message && (
                            <div className={`p-5 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${
                                status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                    status === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                }`}>
                                    {status === 'success' ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                                </div>
                                <p className="text-sm font-bold leading-tight">{message}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center space-y-6 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        Pour obtenir votre clé, contactez la Direction <br/>
                        <span className="text-orange-500/80">GSN EXPERTISES GROUP</span>
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-px w-4 bg-white/10"></div>
                        <Building className="h-4 w-4 text-white/20" />
                        <div className="h-px w-4 bg-white/10"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

import { ArrowRight } from 'lucide-react'
