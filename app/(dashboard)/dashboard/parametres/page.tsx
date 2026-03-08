'use client'

import { useState, useEffect } from 'react'
import { Settings, Loader2, Store, Pencil, Plus, X, Database, Download, RotateCcw, Trash2, Building2, Printer, Upload } from 'lucide-react'
import Link from 'next/link'

type Magasin = { id: number; code: string; nom: string; localisation: string; actif: boolean; createdAt?: string; updatedAt?: string }

type Entite = { id: number; code: string; nom: string; type: string; localisation: string; active: boolean }

type Parametre = {
  id: number
  nomEntreprise: string
  slogan: string | null
  contact: string
  email: string | null
  siteWeb: string | null
  localisation: string
  devise: string
  tvaParDefaut: number
  typeCommerce: string
  logo: string | null
  piedDePage: string | null
  numNCC: string | null
}

export default function ParametresPage() {
  const [data, setData] = useState<Parametre | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ nomEntreprise: '', slogan: '', contact: '', email: '', siteWeb: '', localisation: '', numNCC: '', devise: 'FCFA', tvaParDefaut: '0', typeCommerce: 'GENERAL', logo: '', piedDePage: '', smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', backupAuto: false, backupFrequence: 'QUOTIDIEN', backupDestination: 'LOCAL', backupEmailDest: '' })
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [magasinsLoading, setMagasinsLoading] = useState(true)
  const [magasinsErr, setMagasinsErr] = useState('')
  const [magasinForm, setMagasinForm] = useState({ code: '', nom: '', localisation: '' })
  const [magasinEdit, setMagasinEdit] = useState<Magasin | null>(null)
  const [magasinEditForm, setMagasinEditForm] = useState({ code: '', nom: '', localisation: '', actif: true })
  const [magasinSaving, setMagasinSaving] = useState(false)
  const [ajoutDefautLoading, setAjoutDefautLoading] = useState(false)

  const [backups, setBackups] = useState<Array<{ name: string; size: number; date: string }>>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [backupCreating, setBackupCreating] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [sauvegardeErr, setSauvegardeErr] = useState('')

  const [entites, setEntites] = useState<Entite[]>([])
  const [entitesLoading, setEntitesLoading] = useState(true)
  const [entitesErr, setEntitesErr] = useState('')
  const [entiteForm, setEntiteForm] = useState({ code: '', nom: '', type: 'MAISON_MERE', localisation: '' })
  const [entiteEdit, setEntiteEdit] = useState<Entite | null>(null)
  const [entiteEditForm, setEntiteEditForm] = useState({ code: '', nom: '', type: 'MAISON_MERE', localisation: '', active: true })
  const [entiteSaving, setEntiteSaving] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/check')
      .then((r) => (r.ok ? r.json() : { role: '' }))
      .then((data: { role?: string }) => setUserRole(data.role || ''))
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch('/api/parametres')
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true)
          return null
        }
        return r.ok ? r.json() : null
      })
      .then((p) => {
        setData(p)
        if (p) setForm({
          nomEntreprise: p.nomEntreprise ?? '',
          slogan: p.slogan ?? '',
          contact: p.contact ?? '',
          email: p.email ?? '',
          siteWeb: p.siteWeb ?? '',
          localisation: p.localisation ?? '',
          numNCC: p.numNCC ?? '',
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
        })
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const fetchMagasins = () => {
    setMagasinsLoading(true)
    fetch('/api/magasins?tous=1')
      .then((r) => (r.ok ? r.json() : []))
      .then(setMagasins)
      .catch(() => setMagasins([]))
      .finally(() => setMagasinsLoading(false))
  }
  useEffect(() => { fetchMagasins() }, [])

  const fetchEntites = () => {
    setEntitesLoading(true)
    fetch('/api/entites?tous=1')
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntites)
      .catch(() => setEntites([]))
      .finally(() => setEntitesLoading(false))
  }
  useEffect(() => { fetchEntites() }, [])

  const fetchBackups = () => {
    setBackupsLoading(true)
    fetch('/api/sauvegarde')
      .then((r) => (r.ok ? r.json() : { backups: [] }))
      .then((d) => setBackups(d.backups || []))
      .catch(() => setBackups([]))
      .finally(() => setBackupsLoading(false))
  }
  useEffect(() => { fetchBackups() }, [])

  const handleCreateBackup = async () => {
    setSauvegardeErr('')
    setBackupCreating(true)
    try {
      const res = await fetch('/api/sauvegarde/backup', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        fetchBackups()
        const sizeKo = Math.round((d.size || 0) / 1024)
        alert(`Sauvegarde créée avec succès : ${d.name} (${sizeKo} Ko).`)
      } else {
        const errorMsg = d.error || 'Erreur'
        const details = d.details ? `\n\nDétails: ${d.details}` : ''
        setSauvegardeErr(errorMsg + details)
        alert(errorMsg + details)
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur de connexion'
      setSauvegardeErr(errorMsg)
      alert(`Erreur: ${errorMsg}`)
    } finally {
      setBackupCreating(false)
    }
  }

  const handleRestore = async (name: string) => {
    if (!confirm(`Restaurer la base à partir de « ${name} » ? La base actuelle sera remplacée. Redémarrez l'application après restauration.`)) return
    setSauvegardeErr('')
    setRestoreLoading(name)
    try {
      const res = await fetch('/api/sauvegarde/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await res.json()
      if (res.ok) {
        alert(d.message || 'Base restaurée. Redémarrez l\'application.')
        fetchBackups()
      } else setSauvegardeErr(d.error || 'Erreur')
    } catch (e) {
      setSauvegardeErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setRestoreLoading(null)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer définitivement la sauvegarde « ${name} » ? Cette action est irréversible.`)) return
    setSauvegardeErr('')
    setDeleteLoading(name)
    try {
      const res = await fetch(`/api/sauvegarde/delete?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      const d = await res.json()
      if (res.ok) {
        alert(d.message || 'Sauvegarde supprimée avec succès.')
        fetchBackups()
      } else setSauvegardeErr(d.error || 'Erreur')
    } catch (e) {
      setSauvegardeErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setDeleteLoading(null)
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
          nomEntreprise: form.nomEntreprise.trim(),
          slogan: form.slogan.trim() || null,
          contact: form.contact.trim(),
          email: form.email.trim() || null,
          siteWeb: form.siteWeb.trim() || null,
          localisation: form.localisation.trim(),
          numNCC: form.numNCC.trim() || null,
          devise: form.devise.trim() || 'FCFA',
          tvaParDefaut: Math.max(0, Number(form.tvaParDefaut) || 0),
          typeCommerce: form.typeCommerce || 'GENERAL',
          logo: form.logo || null,
          piedDePage: form.piedDePage.trim() || null,
          smtpHost: form.smtpHost.trim() || null,
          smtpPort: form.smtpPort ? Number(form.smtpPort) : null,
          smtpUser: form.smtpUser.trim() || null,
          smtpPass: form.smtpPass.trim() || null,
          backupAuto: form.backupAuto,
          backupFrequence: form.backupFrequence,
          backupDestination: form.backupDestination,
          backupEmailDest: form.backupEmailDest.trim() || null,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setData(d)
        setForm({
          nomEntreprise: d.nomEntreprise ?? '',
          slogan: d.slogan ?? '',
          contact: d.contact ?? '',
          email: d.email ?? '',
          siteWeb: d.siteWeb ?? '',
          localisation: d.localisation ?? '',
          numNCC: d.numNCC ?? '',
          devise: d.devise ?? 'FCFA',
          tvaParDefaut: String(d.tvaParDefaut ?? 0),
          typeCommerce: d.typeCommerce ?? 'GENERAL',
          logo: d.logo ?? '',
          piedDePage: d.piedDePage ?? '',
          smtpHost: d.smtpHost ?? '',
          smtpPort: d.smtpPort !== null ? String(d.smtpPort) : '',
          smtpUser: d.smtpUser ?? '',
          smtpPass: d.smtpPass ?? '',
          backupAuto: d.backupAuto ?? false,
          backupFrequence: d.backupFrequence ?? 'QUOTIDIEN',
          backupDestination: d.backupDestination ?? 'LOCAL',
          backupEmailDest: d.backupEmailDest ?? '',
        })
      } else setErr(d.error || 'Erreur')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleMagasinAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagasinsErr('')
    if (!magasinForm.code.trim() || !magasinForm.nom.trim()) { setMagasinsErr('Code et nom requis.'); return }
    setMagasinSaving(true)
    try {
      const res = await fetch('/api/magasins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: magasinForm.code.trim(), nom: magasinForm.nom.trim(), localisation: magasinForm.localisation.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setMagasinForm({ code: '', nom: '', localisation: '' })
        fetchMagasins()
      } else setMagasinsErr(d.error || 'Erreur')
    } catch (e) {
      setMagasinsErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setMagasinSaving(false)
    }
  }

  const openMagasinEdit = (m: Magasin) => {
    setMagasinEdit(m)
    setMagasinEditForm({ code: m.code, nom: m.nom, localisation: m.localisation, actif: m.actif })
    setMagasinsErr('')
  }

  const handleMagasinEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!magasinEdit) return
    setMagasinsErr('')
    if (!magasinEditForm.code.trim() || !magasinEditForm.nom.trim()) { setMagasinsErr('Code et nom requis.'); return }
    setMagasinSaving(true)
    try {
      const res = await fetch(`/api/magasins/${magasinEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: magasinEditForm.code.trim(), nom: magasinEditForm.nom.trim(), localisation: magasinEditForm.localisation.trim(), actif: magasinEditForm.actif }),
      })
      const d = await res.json()
      if (res.ok) {
        setMagasinEdit(null)
        fetchMagasins()
      } else setMagasinsErr(d.error || 'Erreur')
    } catch (e) {
      setMagasinsErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setMagasinSaving(false)
    }
  }

  const handleMagasinDesactiver = async (m: Magasin) => {
    if (!confirm(`Désactiver le magasin ${m.code} – ${m.nom} ? Il ne sera plus proposé dans les listes.`)) return
    const res = await fetch(`/api/magasins/${m.id}`, { method: 'DELETE' })
    if (res.ok) fetchMagasins()
    else { const d = await res.json(); setMagasinsErr(d.error || 'Erreur') }
  }

  const handleMagasinReactiver = async (m: Magasin) => {
    const res = await fetch(`/api/magasins/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actif: true }) })
    if (res.ok) { setMagasinEdit(null); fetchMagasins() }
    else { const d = await res.json(); setMagasinsErr(d.error || 'Erreur') }
  }

  const handleAjoutDefaut = async () => {
    setMagasinsErr('')
    setAjoutDefautLoading(true)
    try {
      const res = await fetch('/api/magasins/ajout-defaut', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        fetchMagasins()
        const msg = d.created > 0 ? `${d.created} point(s) de vente créé(s).` : ''
        const skip = d.skipped > 0 ? `${d.skipped} déjà existant(s).` : ''
        setMagasinsErr('') // on success we could show a green message; we don't have state for that, so we could use a temporary. For now we just clear err. User sees the new list.
        if (d.created > 0 || d.skipped > 0) alert([msg, skip].filter(Boolean).join(' '))
      } else setMagasinsErr(d.error || 'Erreur')
    } catch (e) {
      setMagasinsErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setAjoutDefautLoading(false)
    }
  }

  const handleEntiteAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntitesErr('')
    if (!entiteForm.code.trim() || !entiteForm.nom.trim()) {
      setEntitesErr('Code et nom requis.')
      return
    }
    setEntiteSaving(true)
    try {
      const res = await fetch('/api/entites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entiteForm),
      })
      const d = await res.json()
      if (res.ok) {
        setEntiteForm({ code: '', nom: '', type: 'MAISON_MERE', localisation: '' })
        fetchEntites()
      } else setEntitesErr(d.error || 'Erreur')
    } catch (e) {
      setEntitesErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setEntiteSaving(false)
    }
  }

  const openEntiteEdit = (e: Entite) => {
    setEntiteEdit(e)
    setEntiteEditForm({ code: e.code, nom: e.nom, type: e.type, localisation: e.localisation, active: e.active })
    setEntitesErr('')
  }

  const handleEntiteEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entiteEdit) return
    setEntitesErr('')
    if (!entiteEditForm.code.trim() || !entiteEditForm.nom.trim()) {
      setEntitesErr('Code et nom requis.')
      return
    }
    setEntiteSaving(true)
    try {
      const res = await fetch(`/api/entites/${entiteEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entiteEditForm),
      })
      const d = await res.json()
      if (res.ok) {
        setEntiteEdit(null)
        fetchEntites()
      } else setEntitesErr(d.error || 'Erreur')
    } catch (e) {
      setEntitesErr(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setEntiteSaving(false)
    }
  }

  const handleEntiteDelete = async (e: Entite) => {
    if (!confirm(`Supprimer l'entité ${e.code} – ${e.nom} ? Cette action est irréversible et nécessite qu'aucun utilisateur ou magasin ne soit lié à cette entité.`)) {
      return
    }
    setEntitesErr('')
    try {
      const res = await fetch(`/api/entites/${e.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) {
        fetchEntites()
      } else setEntitesErr(d.error || 'Erreur')
    } catch (err) {
      setEntitesErr(err instanceof Error ? err.message : 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-amber-800">Droits insuffisants</h1>
        <p className="mt-2 text-sm text-amber-700">Cette section est réservée au Super Administrateur ou à l&apos;administrateur.</p>
        <p className="mt-1 text-xs text-amber-600">Vous n&apos;avez pas les droits pour accéder aux paramètres.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Paramètres</h1>
          <p className="mt-1 text-white/90">Informations entreprise, devise, TVA</p>
        </div>
        <Link
          href="/dashboard/parametres/impression"
          className="flex items-center gap-2 rounded-lg border-2 border-orange-400 bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
        >
          <Printer className="h-4 w-4" />
          Modèles d'Impression
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <div className="space-y-4">
          {/* Ligne 1 : Nom + Slogan */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom de l&apos;entreprise</label>
              <input
                value={form.nomEntreprise}
                onChange={(e) => setForm((f) => ({ ...f, nomEntreprise: e.target.value }))}
                placeholder="Ex : GSN Expetises Group"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slogan / Description courte</label>
              <input
                value={form.slogan}
                onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
                placeholder="Ex : Votre partenaire informatique de confiance"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {/* Ligne 2 : Type de Commerce + Devise + TVA */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type de commerce</label>
              <select
                value={form.typeCommerce}
                onChange={(e) => setForm((f) => ({ ...f, typeCommerce: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="GENERAL">Commerce Général</option>
                <option value="INFORMATIQUE">Informatique / High-Tech</option>
                <option value="PHARMACIE">Pharmacie / Santé</option>
                <option value="ALIMENTAIRE">Commerce Alimentaire / Épicerie</option>
                <option value="RESTAURATION">Restauration / Hôtellerie</option>
                <option value="TEXTILE">Textile / Vêtements</option>
                <option value="BTP">BTP / Matériaux de construction</option>
                <option value="AUTOMOBILE">Automobile / Pièces détachées</option>
                <option value="SERVICES">Services / Prestations</option>
                <option value="IMPORT_EXPORT">Import / Export</option>
                <option value="AGRICULTURE">Agriculture / Élevage</option>
                <option value="AUTRE">Autre</option>
              </select>
              <p className="mt-0.5 text-xs text-gray-500">Identifie le secteur d'activité de votre commerce</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Devise</label>
              <input
                value={form.devise}
                onChange={(e) => setForm((f) => ({ ...f, devise: e.target.value }))}
                placeholder="FCFA"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">TVA par défaut (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tvaParDefaut}
                onChange={(e) => setForm((f) => ({ ...f, tvaParDefaut: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {/* Ligne 3 : Contact + Email + Site Web + NCC */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone / Contact</label>
              <input
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                placeholder="+225 0X XX XX XX XX"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email professionnel</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@moncommerce.com"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Numéro NCC</label>
              <input
                value={form.numNCC}
                onChange={(e) => setForm((f) => ({ ...f, numNCC: e.target.value }))}
                placeholder="Numéro de Compte Contribuable"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Site web</label>
              <input
                type="url"
                value={form.siteWeb}
                onChange={(e) => setForm((f) => ({ ...f, siteWeb: e.target.value }))}
                placeholder="https://www.moncommerce.com"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>

          {/* Ligne 4 : Localisation */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Localisation</label>
            <input
              value={form.localisation}
              onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))}
              placeholder="Adresse complète, quartier, ville, pays"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          {/* Ligne 5 : Pied de page */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Pied de page des documents (Factures, Reçus...)</label>
            <textarea
              value={form.piedDePage}
              onChange={(e) => setForm((f) => ({ ...f, piedDePage: e.target.value }))}
              placeholder="Ex: RCCM: XXXX - NIU: YYYY - Compte Bancaire: ZZZZ"
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <p className="mt-0.5 text-xs text-gray-500">Ces informations apparaîtront en bas de chaque reçu ou facture imprimée.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo de l'entreprise</label>
            <div className="mt-1 flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (!file.type.startsWith('image/')) {
                    alert('Le fichier doit être une image.')
                    return
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    alert('L\'image ne doit pas dépasser 2 Mo.')
                    return
                  }
                  setUploadingLogo(true)
                  try {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string
                      setForm((f) => ({ ...f, logo: base64 }))
                      setUploadingLogo(false)
                    }
                    reader.onerror = () => {
                      alert('Erreur lors de la lecture du fichier.')
                      setUploadingLogo(false)
                    }
                    reader.readAsDataURL(file)
                  } catch (e) {
                    alert('Erreur lors de l\'upload.')
                    setUploadingLogo(false)
                  }
                }}
                className="hidden"
                id="logo-upload"
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-upload"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.logo ? 'Modifier le logo' : 'Ajouter un logo'}
              </label>
              {form.logo && (
                <div className="flex items-center gap-2">
                  <img src={form.logo} alt="Logo" className="h-16 w-auto object-contain rounded border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    title="Supprimer le logo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Format accepté : JPG, PNG, GIF, WebP (max 2 Mo)</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Devise</label>
              <input
                value={form.devise}
                onChange={(e) => setForm((f) => ({ ...f, devise: e.target.value }))}
                placeholder="FCFA"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">TVA par défaut (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tvaParDefaut}
                onChange={(e) => setForm((f) => ({ ...f, tvaParDefaut: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        <hr className="my-8 border-gray-200" />
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Configuration Email (SMTP)</h2>
          <p className="text-sm text-gray-500">Configurez votre messagerie pour envoyer directement les factures par email. Exemple avec Gmail: Hôte <code>smtp.gmail.com</code> - Port <code>465</code> (SSL).</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Serveur SMTP (Hôte)</label>
              <input
                value={form.smtpHost}
                onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Port SMTP</label>
              <input
                type="number"
                value={form.smtpPort}
                onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
                placeholder="465 (SSL) ou 587 (TLS)"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Utilisateur (Email)</label>
              <input
                value={form.smtpUser}
                onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
                placeholder="votre.email@gmail.com"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe (ou App Password)</label>
              <input
                type="password"
                value={form.smtpPass}
                onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        <hr className="my-8 border-gray-200" />
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Sauvegardes Automatiques</h2>
          <p className="text-sm text-gray-500">Configurez la sauvegarde automatique de vos données pour prévenir toute perte en cas de problème matériel.</p>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <label className="flex items-center gap-3 font-medium text-orange-900 cursor-pointer">
              <input
                type="checkbox"
                checked={form.backupAuto}
                onChange={(e) => setForm((f) => ({ ...f, backupAuto: e.target.checked }))}
                className="h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-600"
              />
              Activer la sauvegarde automatique
            </label>

            {form.backupAuto && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fréquence</label>
                  <select
                    value={form.backupFrequence}
                    onChange={(e) => setForm((f) => ({ ...f, backupFrequence: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="QUOTIDIEN">Quotidienne</option>
                    <option value="HEBDOMADAIRE">Hebdomadaire</option>
                    <option value="MENSUEL">Mensuelle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination</label>
                  <select
                    value={form.backupDestination}
                    onChange={(e) => setForm((f) => ({ ...f, backupDestination: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="LOCAL">Local uniquement (C:\\gesticom\\backups)</option>
                    <option value="EMAIL">Envoyer par Email (Nécessite SMTP)</option>
                    <option value="GDRIVE" disabled>Google Drive (Bientôt)</option>
                  </select>
                </div>
                {form.backupDestination === 'EMAIL' && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Email destinataire des sauvegardes</label>
                    <input
                      type="email"
                      value={form.backupEmailDest}
                      onChange={(e) => setForm((f) => ({ ...f, backupEmailDest: e.target.value }))}
                      placeholder="admin@moncommerce.com"
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        <div className="mt-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Store className="h-5 w-5" /> Magasins</h2>
        <p className="mt-1 text-sm text-gray-500">Gestion des points de vente.</p>

        <form onSubmit={handleMagasinAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">Code</label>
            <input value={magasinForm.code} onChange={(e) => setMagasinForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ex. MAG02" className="mt-1 w-28 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Nom</label>
            <input value={magasinForm.nom} onChange={(e) => setMagasinForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Nom du magasin" className="mt-1 w-48 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Localisation</label>
            <input value={magasinForm.localisation} onChange={(e) => setMagasinForm((f) => ({ ...f, localisation: e.target.value }))} placeholder="Ville, adresse" className="mt-1 w-48 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={magasinSaving} className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-60">
            {magasinSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
          </button>
          <button
            type="button"
            onClick={handleAjoutDefaut}
            disabled={ajoutDefautLoading}
            className="flex items-center gap-1 rounded-lg border-2 border-orange-400 bg-white px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-60"
          >
            {ajoutDefautLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            Ajouter les points de vente par défaut
          </button>
        </form>
        {magasinsErr && <p className="mt-2 text-sm text-red-600">{magasinsErr}</p>}

        <div className="mt-4 overflow-x-auto">
          {magasinsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
          ) : magasins.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">Aucun magasin.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-gray-300 bg-gray-100 text-left text-gray-800"><th className="px-3 py-2">Code</th><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Localisation</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Modifié</th><th className="px-3 py-2"></th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {magasins.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{m.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{m.nom}</td>
                    <td className="px-3 py-2 text-gray-900">{m.localisation}</td>
                    <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs font-medium ${m.actif ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{m.actif ? 'Actif' : 'Inactif'}</span></td>
                    <td className="px-3 py-2 text-xs text-gray-700">{m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => openMagasinEdit(m)} className="rounded p-1.5 text-gray-600 hover:bg-gray-100" title="Modifier"><Pencil className="h-4 w-4" /></button>
                      {m.actif ? (
                        <button type="button" onClick={() => handleMagasinDesactiver(m)} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Désactiver">Désact.</button>
                      ) : (
                        <button type="button" onClick={() => handleMagasinReactiver(m)} className="rounded p-1.5 text-green-600 hover:bg-green-50" title="Réactiver">Réactiver</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Building2 className="h-5 w-5" /> Entités</h2>
        <p className="mt-1 text-sm text-gray-500">Gestion des entités (maison mère, succursales).</p>

        <form onSubmit={handleEntiteAdd} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">Code</label>
            <input
              value={entiteForm.code}
              onChange={(e) => setEntiteForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="ex. MM01"
              className="mt-1 w-28 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Nom</label>
            <input
              value={entiteForm.nom}
              onChange={(e) => setEntiteForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Nom de l'entité"
              className="mt-1 w-48 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Type</label>
            <select
              value={entiteForm.type}
              onChange={(e) => setEntiteForm((f) => ({ ...f, type: e.target.value }))}
              className="mt-1 w-40 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="MAISON_MERE">Maison Mère</option>
              <option value="SUCCURSALE">Succursale</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Localisation</label>
            <input
              value={entiteForm.localisation}
              onChange={(e) => setEntiteForm((f) => ({ ...f, localisation: e.target.value }))}
              placeholder="Ville, adresse"
              className="mt-1 w-48 rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={entiteSaving}
            className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {entiteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
          </button>
        </form>
        {entitesErr && <p className="mt-2 text-sm text-red-600">{entitesErr}</p>}

        <div className="mt-4 overflow-x-auto">
          {entitesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : entites.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">Aucune entité.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100 text-left text-gray-800">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Localisation</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {entites.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{e.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{e.nom}</td>
                    <td className="px-3 py-2 text-gray-900">{e.type === 'MAISON_MERE' ? 'Maison Mère' : 'Succursale'}</td>
                    <td className="px-3 py-2 text-gray-900">{e.localisation}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${e.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {e.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEntiteEdit(e)}
                        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {userRole === 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleEntiteDelete(e)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {entiteEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEntiteEdit(null)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-semibold text-gray-900">Modifier l&apos;entité</h3>
              <button onClick={() => setEntiteEdit(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <form onSubmit={handleEntiteEditSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    value={entiteEditForm.code}
                    onChange={(e) => setEntiteEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input
                    value={entiteEditForm.nom}
                    onChange={(e) => setEntiteEditForm((f) => ({ ...f, nom: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={entiteEditForm.type}
                    onChange={(e) => setEntiteEditForm((f) => ({ ...f, type: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="MAISON_MERE">Maison Mère</option>
                    <option value="SUCCURSALE">Succursale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Localisation</label>
                  <input
                    value={entiteEditForm.localisation}
                    onChange={(e) => setEntiteEditForm((f) => ({ ...f, localisation: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={entiteEditForm.active}
                    onChange={(e) => setEntiteEditForm((f) => ({ ...f, active: e.target.checked }))}
                  />{' '}
                  Active
                </label>
                {entitesErr && <p className="text-sm text-red-600">{entitesErr}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={entiteSaving}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntiteEdit(null)}
                    className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Database className="h-5 w-5" /> Sauvegarde de la base</h2>
        <p className="mt-1 text-sm text-gray-500">Créer une copie de la base ou restaurer à partir d&apos;une sauvegarde. Après restauration, redémarrez l&apos;application.</p>
        {sauvegardeErr && <p className="mt-2 text-sm text-red-600">{sauvegardeErr}</p>}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCreateBackup}
            disabled={backupCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {backupCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Créer une sauvegarde
          </button>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Sauvegardes disponibles</p>
          {backupsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>
          ) : backups.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">Aucune sauvegarde.</p>
          ) : (
            <table className="mt-2 min-w-full text-sm">
              <thead><tr className="border-b border-gray-300 bg-gray-100 text-left text-gray-800"><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Taille</th><th className="px-3 py-2">Date</th><th className="px-3 py-2"></th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {backups.map((b) => (
                  <tr key={b.name} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-900">{b.name}</td>
                    <td className="px-3 py-2 text-gray-600">{(b.size / 1024).toFixed(1)} Ko</td>
                    <td className="px-3 py-2 text-gray-600">{new Date(b.date).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2">
                      <a
                        href={`/api/sauvegarde/download?name=${encodeURIComponent(b.name)}`}
                        download={b.name}
                        className="mr-2 inline-flex items-center gap-1 rounded p-1.5 text-blue-600 hover:bg-blue-50"
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRestore(b.name)}
                        disabled={restoreLoading !== null || deleteLoading !== null}
                        className="inline-flex items-center gap-1 rounded p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                        title="Restaurer cette sauvegarde"
                      >
                        {restoreLoading === b.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.name)}
                        disabled={restoreLoading !== null || deleteLoading !== null}
                        className="inline-flex items-center gap-1 rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Supprimer cette sauvegarde"
                      >
                        {deleteLoading === b.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {magasinEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setMagasinEdit(null)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-semibold text-gray-900">Modifier le magasin</h3>
              <button onClick={() => setMagasinEdit(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <form onSubmit={handleMagasinEditSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input value={magasinEditForm.code} onChange={(e) => setMagasinEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom</label>
                  <input value={magasinEditForm.nom} onChange={(e) => setMagasinEditForm((f) => ({ ...f, nom: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Localisation</label>
                  <input value={magasinEditForm.localisation} onChange={(e) => setMagasinEditForm((f) => ({ ...f, localisation: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-orange-500 focus:outline-none" />
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={magasinEditForm.actif} onChange={(e) => setMagasinEditForm((f) => ({ ...f, actif: e.target.checked }))} /> Actif</label>
                {magasinsErr && <p className="text-sm text-red-600">{magasinsErr}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={magasinSaving} className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-60">Enregistrer</button>
                  <button type="button" onClick={() => setMagasinEdit(null)} className="rounded-lg border-2 border-gray-400 bg-gray-200 px-4 py-2 font-medium text-gray-900 hover:bg-gray-300">Annuler</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
