'use client'

import { useActivation } from '@/contexts/ActivationContext'
import { useRouter } from 'next/navigation'
import { Lock, Smartphone, ShieldAlert, X } from 'lucide-react'

export default function ActivationModal() {
    const { isModalOpen, closeActivationModal, hwid } = useActivation()
    const router = useRouter()

    if (!isModalOpen) return null

    return (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={closeActivationModal}
            ></div>
            
            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/5 rounded-[2.5rem] shadow-2xl shadow-orange-500/10 overflow-hidden animate-in zoom-in-95 duration-300">
                <button 
                    onClick={closeActivationModal}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-orange-500/10 mb-6 border border-orange-500/20">
                            <ShieldAlert className="h-10 w-10 text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-2">Activation Requise</h2>
                        <p className="text-slate-400 font-medium">L'enregistrement de données nécessite une licence valide.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block text-center">Identifiant de votre machine</label>
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-2xl font-mono font-black text-white tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent italic">{hwid || 'Récupération...'}</span>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(hwid)
                                        alert('ID copié ! Communiquez-le à GSN EXPERTISES GROUP.')
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliquer pour copier l'ID</span>
                                    <Smartphone className="h-3 w-3 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={closeActivationModal}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl transition-all border border-white/5"
                            >
                                CONTINUER LECTURE
                            </button>
                            <button
                                onClick={() => {
                                    closeActivationModal()
                                    router.push('/activation')
                                }}
                                className="flex-[1.5] bg-orange-500 hover:bg-orange-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Lock className="h-5 w-5" />
                                ACTIVER GESTICOM
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
