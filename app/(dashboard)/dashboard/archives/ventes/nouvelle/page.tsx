'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Trash2, Printer, X, Search, CreditCard, Plus, Minus, AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { formatApiError } from '@/lib/validation-helpers'

type Produit = { id: number; code: string; designation: string; prixVente: number | null; prixAchat?: number | null }
type Ligne = { produitId: number; designation: string; quantite: number; prixUnitaire: number; montant: number }

export default function VenteHistoriqueArchivePage() {
  const [produits, setProduits] = useState<Produit[]>([])
  const [magasins, setMagasins] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [magasinId, setMagasinId] = useState('')
  const [clientId, setClientId] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Ligne[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [modePaiement, setModePaiement] = useState('ESPECES')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0])
  const [numeroFactureOrigine, setNumeroFactureOrigine] = useState('')
  const { success: showSuccess, error: showError } = useToast()
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paymentButtonRef = useRef<HTMLButtonElement>(null)

  // Chargement initial
  useEffect(() => {
    Promise.all([
      fetch('/api/produits?complet=1').then(r => r.ok ? r.json() : []),
      fetch('/api/magasins').then(r => r.ok ? r.json() : []),
      fetch('/api/clients').then(r => r.ok ? r.json() : [])
    ]).then(([p, m, c]) => {
      setProduits(Array.isArray(p) ? p : [])
      setMagasins(Array.isArray(m) ? m : [])
      const clientData = c.data && Array.isArray(c.data) ? c.data : (Array.isArray(c) ? c : [])
      setClients(clientData)
      
      if (m.length > 0) setMagasinId(String(m[0].id))
      setLoading(false)
    })
  }, [])

  // Focus permanent sur la recherche
  useEffect(() => {
    if (!showPayment) {
      searchInputRef.current?.focus()
    }
  }, [showPayment])

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        if (cart.length > 0) setShowPayment(true)
      }
      if (e.key === 'F10' && showPayment) {
        e.preventDefault()
        handleValidate()
      }
      if (e.key === 'Escape') {
        setShowPayment(false)
        setSearch('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, showPayment])

  const total = cart.reduce((acc, l) => acc + l.montant, 0)

  const handleSearch = (val: string) => {
    setSearch(val)
    const p = produits.find(p => p.code.toLowerCase() === val.toLowerCase() || (p as any).codeBarres === val)
    if (p) {
      addToCart(p)
      setSearch('')
    }
  }

  const addToCart = (p: Produit) => {
    setCart(prev => {
      const existing = prev.find(l => l.produitId === p.id)
      if (existing) {
        return prev.map(l => l.produitId === p.id ? { ...l, quantite: l.quantite + 1, montant: (l.quantite + 1) * l.prixUnitaire } : l)
      }
      const pu = p.prixVente || p.prixAchat || 0
      return [...prev, { produitId: p.id, designation: p.designation, quantite: 1, prixUnitaire: pu, montant: pu }]
    })
    showSuccess(`Ajouté : ${p.designation}`)
  }

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(l => l.produitId === id ? { ...l, quantite: Math.max(1, l.quantite + delta), montant: Math.max(1, l.quantite + delta) * l.prixUnitaire } : l))
  }

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(l => l.produitId !== id))
  }

  const handleValidate = async () => {
    if (!magasinId || cart.length === 0 || !numeroFactureOrigine) {
      showError("Veuillez renseigner le N° de facture d'origine.")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
          magasinId: Number(magasinId),
          clientId: clientId ? Number(clientId) : null,
          modePaiement,
          numeroFactureOrigine,
          dateFacture,
          lignes: cart.map(l => ({
            produitId: l.produitId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire
          }))
      }
      const res = await fetch('/api/archives/ventes/nouvelle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showSuccess('Vente archivée avec succès ! (Aucun impact comptable/stock)')
        setCart([])
        setShowPayment(false)
        setSearch('')
        setNumeroFactureOrigine('')
      } else {
        const d = await res.json()
        showError(formatApiError(d.error))
      }
    } catch (e) {
      showError('Erreur lors de la validation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="h-10 w-10 animate-spin text-orange-500" /></div>

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-900 p-4 text-white">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <ShoppingCart className="h-8 w-8 text-indigo-500" />
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Ancienne Vente <span className="text-indigo-500 underline">ARCHIVE</span></h1>
          </div>
          <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase">Reproduction textuelle : aucun calcul de stock, saisie uniquement</p>
        </div>
        
        <div className="flex gap-4">
          <input 
            type="text"
            placeholder="N° Facture origine (Obligatoire)"
            value={numeroFactureOrigine}
            onChange={e => setNumeroFactureOrigine(e.target.value)}
            className="rounded-lg bg-slate-800 border-2 border-indigo-500 px-4 py-2 text-sm font-bold focus:border-indigo-400 outline-none w-64 placeholder:text-slate-500 text-white"
          />
          <input 
            type="date"
            value={dateFacture}
            onChange={e => setDateFacture(e.target.value)}
            className="rounded-lg bg-slate-800 border-2 border-slate-700 px-4 py-2 text-sm font-bold focus:border-indigo-500 outline-none"
          />
          <select 
            value={magasinId} 
            onChange={e => setMagasinId(e.target.value)}
            className="rounded-lg bg-slate-800 border-2 border-slate-700 px-4 py-2 text-sm font-bold focus:border-indigo-500 outline-none"
          >
            {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
          <select 
            value={clientId} 
            onChange={e => setClientId(e.target.value)}
            className="rounded-lg bg-slate-800 border-2 border-slate-700 px-4 py-2 text-sm font-bold focus:border-indigo-500 outline-none"
          >
            <option value="">Client de passage</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Cart Side */}
        <div className="flex flex-1 flex-col rounded-3xl bg-slate-800 p-6 shadow-2xl border border-slate-700">
          <div className="mb-4 flex items-center gap-3">
             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Scanner ou saisir code produit..."
                    className="w-full rounded-2xl bg-slate-900 border-2 border-slate-700 py-4 pl-12 pr-4 text-xl font-bold placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
                />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center opacity-20">
                    <ShoppingCart className="h-32 w-32 filter grayscale" />
                    <p className="mt-4 text-2xl font-bold uppercase tracking-widest text-indigo-200">Restauration d'Archive</p>
                </div>
            ) : (
                cart.map(l => (
                    <div key={l.produitId} className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 border border-slate-700/50 hover:border-slate-500 transition-colors">
                        <div className="flex-1">
                            <p className="text-xl font-bold">{l.designation}</p>
                            <p className="text-sm text-slate-400">{l.prixUnitaire.toLocaleString('fr-FR')} F / unité</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQty(l.produitId, -1)} className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 transition-colors"><Minus className="h-6 w-6" /></button>
                                <span className="w-12 text-center text-3xl font-black">{l.quantite}</span>
                                <button onClick={() => updateQty(l.produitId, 1)} className="rounded-xl bg-slate-800 p-2 hover:bg-slate-700 transition-colors"><Plus className="h-6 w-6" /></button>
                            </div>
                            <p className="w-32 text-right text-2xl font-black text-indigo-400">{l.montant.toLocaleString('fr-FR')} F</p>
                            <button onClick={() => removeItem(l.produitId)} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="h-6 w-6" /></button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </div>

        {/* Totals Side */}
        <div className="w-96 flex flex-col gap-6">
            <div className="rounded-3xl bg-indigo-600 p-8 shadow-2xl shadow-indigo-900/40 border-2 border-indigo-400">
                <p className="text-lg font-bold uppercase opacity-80">Total de l'archive</p>
                <p className="mt-2 text-5xl font-black tracking-tighter leading-none">{total.toLocaleString('fr-FR')} F</p>
                <div className="mt-6 border-t border-white/20 pt-4">
                    <p className="text-sm font-medium opacity-80">Articles : {cart.reduce((a, b) => a + b.quantite, 0)}</p>
                </div>
            </div>

            <div className="flex-1 rounded-3xl bg-slate-800 p-6 border border-slate-700 space-y-4">
                <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4">Raccourcis</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-medium text-sm">Archiver sans stock</span>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold border border-slate-700">F12</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-medium text-sm">Valider Vente</span>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold border border-slate-700">F10</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-medium text-sm">Annuler</span>
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold border border-slate-700">ESC</span>
                    </div>
                </div>

                <div className="mt-auto pt-4 space-y-3">
                    <button 
                        onClick={() => cart.length > 0 && setShowPayment(true)}
                        disabled={cart.length === 0}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-6 text-2xl font-black hover:bg-indigo-500 active:scale-95 transition-all shadow-xl disabled:opacity-30"
                    >
                        <CreditCard className="h-8 w-8" />
                        ARCHIVER (F12)
                    </button>
                    <button 
                        onClick={() => { if(confirm('Vider le panier de restauration ?')) setCart([]) }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-700 py-3 font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                    >
                        <X className="h-5 w-5" />
                        VIDER CARTE ARCHIVE
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
              <div className="w-full max-w-xl rounded-3xl bg-slate-900 p-8 shadow-2xl border-2 border-indigo-500 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-3xl font-black text-indigo-100">SAUVEGARDE ARCHIVE</h2>
                      <button onClick={() => setShowPayment(false)} className="rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition-colors"><X className="h-8 w-8" /></button>
                  </div>

                  <div className="mb-8 p-6 rounded-2xl bg-slate-800 border border-slate-700 text-center">
                      <p className="text-slate-400 font-bold uppercase text-sm mb-1">Ancien Montant</p>
                      <p className="text-5xl font-black text-indigo-400 tracking-tighter">{total.toLocaleString('fr-FR')} F</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                      {['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'VIREMENT', 'CREDIT'].map(m => (
                          <button 
                            key={m}
                            onClick={() => setModePaiement(m)}
                            className={`rounded-2xl border-2 py-4 text-lg font-black transition-all ${modePaiement === m ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-900/40 text-white' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                          >
                              {m.replace('_', ' ')}
                          </button>
                      ))}
                  </div>

                  <button 
                    onClick={handleValidate}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-4 rounded-2xl bg-indigo-600 py-8 text-3xl font-black shadow-2xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 text-white"
                  >
                      {submitting ? <Loader2 className="h-10 w-10 animate-spin" /> : (
                          <>
                            <Printer className="h-10 w-10" />
                            VALIDER L'ARCHIVE (F10)
                          </>
                      )}
                  </button>
                  <p className="mt-4 text-center text-slate-500 text-sm font-bold">Cette opération n'engendre aucune sortie de stock.</p>
              </div>
          </div>
      )}
    </div>
  )
}
