'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Loader2, Store, Plus, Trash2, Camera, Mail, Info, Clock, Shield, Globe, MapPin, Phone, CreditCard, User, Upload, Download, RotateCcw, X, Printer, Edit2 } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Image from 'next/image'
import Link from 'next/link'

type Magasin = {
  id: number
  code: string
  nom: string
  localisation: string
  actif: boolean
  creeLe: string
  misAjourLe: string
}

type Backup = {
  name: string
  size: number
  mtime: string
}

export default function ParametresPage() {
  const { success, error: showError } = useToast()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    nomEntreprise: '',
    slogan: '',
    contact: '',
    email: '',
    siteWeb: '',
    localisation: '',
    numNCC: '',
    registreCommerce: '',
    devise: 'FCFA',
    tvaParDefaut: '0',
    typeCommerce: 'GENERAL',
    logo: '',
    piedDePage: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    backupAuto: false,
    backupFrequence: 'QUOTIDIEN',
    backupDestination: 'LOCAL',
    backupEmailDest: '',
    fideliteActive: false,
    fideliteSeuilPoints: '100',
    fideliteTauxRemise: '5',
  })

  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [magasinsLoading, setMagasinsLoading] = useState(true)
  const [magasinsErr, setMagasinsErr] = useState('')
  const [magasinSaving, setMagasinSaving] = useState(false)
  const [magasinForm, setMagasinForm] = useState({ code: '', nom: '', localisation: '' })
  const [magasinEdit, setMagasinEdit] = useState<number | null>(null)
  const [magasinEditForm, setMagasinEditForm] = useState({ code: '', nom: '', localisation: '', actif: true })

  const [backups, setBackups] = useState<Backup[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [sauvegardeErr, setSauvegardeErr] = useState('')
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchMagasins()
    fetchBackups()
  }, [])

  const fetchData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch('/api/parametres'),
        fetch('/api/auth/check')
      ])
      const p = await pRes.json()
      const a = await aRes.json()
      
      setUserRole(a.role)
      setData(p)
      if (p) {
        setForm({
          nomEntreprise: p.nomEntreprise ?? '',
          slogan: p.slogan ?? '',
          contact: p.contact ?? '',
          email: p.email ?? '',
          siteWeb: p.siteWeb ?? '',
          localisation: p.localisation ?? '',
          numNCC: p.numNCC ?? '',
          registreCommerce: p.registreCommerce ?? '',
          devise: p.devise ?? 'FCFA',
          tvaParDefaut: String(p.tvaParDefaut ?? 0),
          typeCommerce: p.typeCommerce ?? 'GENERAL',
          logo: p.logo ?? '',
          piedDePage: p.piedDePage ?? '',
          smtpHost: p.smtpHost ?? '',
          smtpPort: p.smtpPort !== null ? String(p.smtpPort) : '',
          smtpUser: p.smtpUser ?? '',
          smtpPass: p.smtpPass ?? '',
          backupAuto: p.backupAuto ?? false,
          backupFrequence: p.backupFrequence ?? 'QUOTIDIEN',
          backupDestination: p.backupDestination ?? 'LOCAL',
          backupEmailDest: p.backupEmailDest ?? '',
          fideliteActive: p.fideliteActive ?? false,
          fideliteSeuilPoints: String(p.fideliteSeuilPoints ?? 100),
          fideliteTauxRemise: String(p.fideliteTauxRemise ?? 5),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchMagasins = async () => {
    setMagasinsLoading(true)
    try {
      const res = await fetch('/api/magasins')
      if (res.ok) setMagasins(await res.json())
    } catch (e) {
      setMagasinsErr('Erreur lors du chargement des magasins.')
    } finally {
      setMagasinsLoading(false)
    }
  }

  const fetchBackups = async () => {
    setBackupsLoading(true)
    try {
      const res = await fetch('/api/sauvegarde')
      if (res.ok) setBackups(await res.json())
    } catch (e) {
      setSauvegardeErr('Erreur lors du chargement des sauvegardes.')
    } finally {
      setBackupsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setSaving(true)
    try {
      const res = await fetch('/api/parametres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tvaParDefaut: Number(form.tvaParDefaut),
          smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
          fideliteSeuilPoints: Number(form.fideliteSeuilPoints),
          fideliteTauxRemise: Number(form.fideliteTauxRemise),
        }),
      })
      if (res.ok) {
        success('Paramètres enregistrés.')
        fetchData()
      } else {
        const d = await res.json()
        setErr(d.error || 'Erreur')
      }
    } catch (e) {
      setErr('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const handleMagasinAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagasinsErr('')
    if (!magasinForm.code || !magasinForm.nom) return
    setMagasinSaving(true)
    try {
      const res = await fetch('/api/magasins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(magasinForm),
      })
      if (res.ok) {
        setMagasinForm({ code: '', nom: '', localisation: '' })
        fetchMagasins()
      } else {
        const d = await res.json()
        setMagasinsErr(d.error || 'Erreur')
      }
    } catch (e) {
      setMagasinsErr('Erreur réseau')
    } finally {
      setMagasinSaving(false)
    }
  }

  const handleMagasinEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!magasinEdit) return
    setMagasinSaving(true)
    try {
      const res = await fetch(`/api/magasins/${magasinEdit}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(magasinEditForm),
      })
      if (res.ok) {
        setMagasinEdit(null)
        fetchMagasins()
      }
    } finally {
      setMagasinSaving(false)
    }
  }

  const handleRestore = async (name: string) => {
    if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return
    setRestoreLoading(name)
    try {
      const res = await fetch(`/api/sauvegarde/restore?name=${encodeURIComponent(name)}`, { method: 'POST' })
      if (res.ok) {
        alert('Restauration réussie ! Rechargement de la page...')
        window.location.reload()
      }
    } finally {
      setRestoreLoading(null)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm('Supprimer cette sauvegarde ?')) return
    setDeleteLoading(name)
    try {
      const res = await fetch(`/api/sauvegarde/delete?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (res.ok) fetchBackups()
    } finally {
      setDeleteLoading(null)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>

  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <Shield className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-xl font-bold text-amber-900">Accès restreint</h2>
        <p className="mt-2 text-sm text-amber-700">Cette section est réservée aux administrateurs.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Paramètres</h1>
          <p className="mt-1 text-white/90">Configuration globale de GestiCom</p>
        </div>
        <Link href="/dashboard/parametres/impression" className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50">
          <Printer className="h-4 w-4" /> Modèles d'Impression
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Informations Entreprise</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de l'entreprise</label>
              <input value={form.nomEntreprise} onChange={(e) => setForm({ ...form, nomEntreprise: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slogan</label>
              <input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Localisation</label>
              <input value={form.localisation} onChange={(e) => setForm({ ...form, localisation: e.target.value })} placeholder="Ex: Abidjan, Cocody..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Compte Contribuable (NCC)</label>
              <input value={form.numNCC} onChange={(e) => setForm({ ...form, numNCC: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registre de Commerce (RC)</label>
              <input value={form.registreCommerce} onChange={(e) => setForm({ ...form, registreCommerce: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">URL du Logo</label>
              <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              {form.logo && <img src={form.logo} alt="Logo Entreprise" className="mt-2 h-16 object-contain" />}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Fidélisation Client (Pro)</h2>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <label className="flex items-center gap-3 font-medium text-purple-900 cursor-pointer">
              <input type="checkbox" checked={form.fideliteActive} onChange={(e) => setForm({ ...form, fideliteActive: e.target.checked })} className="h-5 w-5 rounded border-purple-300 text-purple-600" />
              Activer le programme de fidélité
            </label>
            {form.fideliteActive && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seuil de points pour remise</label>
                  <input type="number" value={form.fideliteSeuilPoints} onChange={(e) => setForm({ ...form, fideliteSeuilPoints: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remise (%)</label>
                  <input type="number" step="0.1" value={form.fideliteTauxRemise} onChange={(e) => setForm({ ...form, fideliteTauxRemise: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Sauvegardes</h2>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <label className="flex items-center gap-3 font-medium text-orange-900 cursor-pointer">
              <input type="checkbox" checked={form.backupAuto} onChange={(e) => setForm({ ...form, backupAuto: e.target.checked })} className="h-5 w-5 rounded border-orange-300 text-orange-600" />
              Sauvegarde automatique
            </label>
            {form.backupAuto && (
               <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <select value={form.backupFrequence} onChange={(e) => setForm({ ...form, backupFrequence: e.target.value })} className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="QUOTIDIEN">Quotidienne</option>
                    <option value="HEBDOMADAIRE">Hebdomadaire</option>
                  </select>
                  <select value={form.backupDestination} onChange={(e) => setForm({ ...form, backupDestination: e.target.value })} className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="LOCAL">Local uniquement</option>
                    <option value="EMAIL">Email</option>
                  </select>
               </div>
            )}
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-white hover:bg-orange-600 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Store className="h-5 w-5" /> Magasins</h2>
        <form onSubmit={handleMagasinAdd} className="mt-4 flex gap-2">
          <input value={magasinForm.code} onChange={(e) => setMagasinForm({ ...magasinForm, code: e.target.value.toUpperCase() })} placeholder="Code" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={magasinForm.nom} onChange={(e) => setMagasinForm({ ...magasinForm, nom: e.target.value })} placeholder="Nom" className="rounded-lg border border-gray-200 px-3 py-2 text-sm flex-1" />
          <button type="submit" disabled={magasinSaving} className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">Ajouter</button>
        </form>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Nom</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider text-xs">Statut</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {magasins.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-700">{m.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.nom}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.actif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {m.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setMagasinEdit(m.id); setMagasinEditForm({ code: m.code, nom: m.nom, localisation: m.localisation, actif: m.actif }); }} className="text-orange-600 hover:text-orange-800 font-medium flex items-center justify-end gap-1 ml-auto">
                      <Edit2 className="h-4 w-4" /> Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
