'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  ShoppingBag,
  Users,
  Truck,
  FileText,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
  Search,
  Calculator,
  DollarSign,
  Wallet,
  TrendingUp,
  Activity,
  UserPlus,
  AlertTriangle,
  ShoppingBag as ShoppingBagIcon,
  Building2,
  ChevronDown,
  Loader2,
  CreditCard,
  FileBarChart,
} from 'lucide-react'
import type { Session } from '@/lib/auth'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

// Diagnostic DB banner
type DbInfo = { nodeEnv?: string; databaseUrl?: string }

const navigation: Array<{
  name: string
  href: string
  icon: typeof LayoutDashboard
  roles?: string[]
  permission?: string // si défini : visible si l'utilisateur a cette permission (ex. parametres:view)
}> = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    { name: 'Produits', href: '/dashboard/produits', icon: Package, permission: 'produits:view' },
    { name: 'Stock', href: '/dashboard/stock', icon: Warehouse, permission: 'stocks:view' },
    { name: 'Ventes', href: '/dashboard/ventes', icon: ShoppingCart, permission: 'ventes:view' },
    { name: 'Clients', href: '/dashboard/clients', icon: Users, permission: 'clients:view' },
    { name: 'Soldes Clients', href: '/dashboard/clients/soldes', icon: FileText, permission: 'clients:view' },
    { name: 'Paiements Clients', href: '/dashboard/clients/paiements', icon: Wallet, permission: 'clients:view' },
    { name: 'Fournisseurs', href: '/dashboard/fournisseurs', icon: Truck, permission: 'fournisseurs:view' },
    { name: 'Achats', href: '/dashboard/achats', icon: ShoppingBag, permission: 'achats:view' },
    { name: 'Caisse', href: '/dashboard/caisse', icon: Wallet, permission: 'caisse:view' },
    { name: 'Banque', href: '/dashboard/banque', icon: CreditCard, permission: 'banque:view' },
    { name: 'Dépenses', href: '/dashboard/depenses', icon: DollarSign, permission: 'depenses:view' },
    { name: 'Charges', href: '/dashboard/charges', icon: TrendingUp, permission: 'charges:view' },
    { name: 'Rapports', href: '/dashboard/rapports', icon: FileBarChart, permission: 'rapports:view' },
    { name: 'Rapports Vente', href: '/dashboard/rapports-ventes', icon: TrendingUp, permission: 'rapports:view' },
    { name: 'Suivi Fournisseurs', href: '/dashboard/rapports-fournisseurs', icon: Truck, permission: 'rapports:view' },
    { name: 'Inventaire Global', href: '/dashboard/rapports-inventaire', icon: FileText, permission: 'rapports:view' },
    { name: 'Rentabilité Produits', href: '/dashboard/rapports/rentabilite', icon: TrendingUp, permission: 'rapports:view' },
    { name: 'Comptabilité', href: '/dashboard/comptabilite', icon: Calculator, permission: 'comptabilite:view' },
    { name: 'Utilisateurs', href: '/dashboard/utilisateurs', icon: UserPlus, permission: 'users:view' },
    { name: 'Journal d\'audit', href: '/dashboard/audit', icon: Activity, permission: 'audit:view' },
    { name: 'Paramètres', href: '/dashboard/parametres', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'], permission: 'parametres:view' },
  ]

function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (nom.slice(0, 2) || '??').toUpperCase()
}

type Notification = {
  id: string
  type: 'STOCK_FAIBLE' | 'VENTE_RECENTE' | 'ALERTE'
  titre: string
  message: string
  date: string
  lien?: string
  lu: boolean
}

type UserWithPermissions = Session & { permissions?: string[] }

export default function DashboardLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode
  user: UserWithPermissions
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [nonLues, setNonLues] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [entites, setEntites] = useState<Array<{ id: number; code: string; nom: string; type: string }>>([])
  const [entiteActuelle, setEntiteActuelle] = useState<{ id: number; code: string; nom: string } | null>(null)
  const [entiteSelectOpen, setEntiteSelectOpen] = useState(false)
  const [switchingEntite, setSwitchingEntite] = useState(false)
  const entiteSelectRef = useRef<HTMLDivElement>(null)
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast()
  const pathname = usePathname()
  const router = useRouter()
  const [isServerConnected, setIsServerConnected] = useState(true)
  const [syncQueueLength, setSyncQueueLength] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [toutesLues, setToutesLues] = useState(false)

  // Charger les notifications et entités
  useEffect(() => {
    loadNotifications()
    loadEntites()
    // Rafraîchir toutes les 5 minutes unqiuement si l'onglet est actif
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadNotifications()
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Surveiller le statut du serveur local (Heartbeat)
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/auth/check', { method: 'GET' });
        setIsServerConnected(res.ok);
      } catch (e) {
        setIsServerConnected(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000); // Toutes les 10 secondes

    return () => clearInterval(interval);
  }, [])

  // Vérifier la file d'attente au chargement
  useEffect(() => {
    checkSyncQueue();
  }, []);

  // Vérifier la file d'attente toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      checkSyncQueue();
      if (isServerConnected) {
        syncPendingOperations();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isServerConnected]);

  function checkSyncQueue() {
    if (typeof window === 'undefined') return
    try {
      const queue = JSON.parse(localStorage.getItem('gesticom_sync_queue') || '[]')
      setSyncQueueLength(queue.length)
    } catch (e) {
      setSyncQueueLength(0)
    }
  }

  async function syncPendingOperations() {
    if (typeof window === 'undefined' || !isServerConnected || syncing) return

    try {
      const queueStr = localStorage.getItem('gesticom_sync_queue')
      if (!queueStr || queueStr === '[]') return

      setSyncing(true)
      const { syncAll } = await import('@/lib/offline-sync')

      const { success, failed, errors } = await syncAll()

      if (success > 0) {
        showSuccess(`${success} élément(s) synchronisé(s) avec succès.`)
        checkSyncQueue()
      }

      if (failed > 0) {
        showError(`${failed} élément(s) en échec de synchronisation. Vérifiez votre connexion.`)
        if (errors.length > 0) {
          console.error('Détail erreurs sync:', errors)
        }
      }

      // Mettre à jour le compteur quoi qu'il arrive
      checkSyncQueue()

    } catch (e) {
      console.error('Erreur synchronisation:', e)
    } finally {
      setSyncing(false)
    }
  }

  // Charger l'entité actuelle depuis la session
  useEffect(() => {
    if (user.entiteId) {
      fetch(`/api/entites`)
        .then((r) => (r.ok ? r.json() : []))
        .then((entitesList) => {
          const entite = entitesList.find((e: { id: number }) => e.id === user.entiteId)
          if (entite) {
            setEntiteActuelle({ id: entite.id, code: entite.code, nom: entite.nom })
          }
        })
    }
  }, [user.entiteId])
  // Protection des routes clientes (Route Guard global)
  useEffect(() => {
    if (!pathname || pathname === '/dashboard') return

    const targetRoute = navigation.find(item =>
      item.href !== '/dashboard' && pathname.startsWith(item.href)
    )

    if (targetRoute) {
      const authorized = !targetRoute.permission || (user.permissions && user.permissions.includes(targetRoute.permission))
      const roleAuthorized = !targetRoute.roles || targetRoute.roles.includes(user.role)

      if (!authorized || !roleAuthorized) {
        showError("Vous n'avez pas l'autorisation d'accéder à cette page.")
        router.push('/dashboard?error=permission_denied')
      }
    }
  }, [pathname, user.permissions, user.role, router, showError])

  async function loadEntites() {
    try {
      const res = await fetch('/api/entites')
      if (res.ok) {
        const data = await res.json()
        setEntites(data || [])
      }
    } catch (e) {
      console.error('Erreur chargement entités:', e)
    }
  }

  async function switchEntite(entiteId: number) {
    setSwitchingEntite(true)
    try {
      const res = await fetch('/api/auth/switch-entite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entiteId }),
      })
      if (res.ok) {
        const data = await res.json()
        setEntiteActuelle(data.entite)
        setEntiteSelectOpen(false)
        // Recharger la page pour mettre à jour toutes les données
        router.refresh()
        window.location.reload()
      } else {
        const error = await res.json()
        alert(error.error || 'Erreur lors du changement d\'entité')
      }
    } catch (e) {
      console.error('Erreur changement entité:', e)
      alert('Erreur lors du changement d\'entité')
    } finally {
      setSwitchingEntite(false)
    }
  }

  // Fermer les dropdowns si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (entiteSelectRef.current && !entiteSelectRef.current.contains(event.target as Node)) {
        setEntiteSelectOpen(false)
      }
    }
    if (notificationsOpen || entiteSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen, entiteSelectOpen])

  async function loadNotifications() {
    setLoadingNotifications(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setNonLues(data.nonLues || 0)
        setToutesLues(false) // Réinitialiser à chaque rechargement
      }
    } catch (e) {
      console.error('Erreur chargement notifications:', e)
    } finally {
      setLoadingNotifications(false)
    }
  }

  async function marquerToutesLues() {
    try {
      await fetch('/api/notifications/marquer-lues', { method: 'PATCH' })
    } catch (e) {
      // Silencieux
    } finally {
      setToutesLues(true)
      setNonLues(0)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'STOCK_FAIBLE':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'VENTE_RECENTE':
        return <ShoppingBagIcon className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700">
      {/* Animations de fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-400/30 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-400/30 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/30 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grille animée */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite',
        }}></div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-[100] h-full w-64 transform bg-white/95 backdrop-blur-xl shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 pointer-events-auto no-print ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <Image src="/logo.png" alt="GestiCom" width={140} height={36} className="h-9 w-auto object-contain" style={{ width: 'auto' }} priority />
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navigation
              .filter((item) => {
                if (!item.roles && !item.permission) return true
                if (item.roles && item.roles.includes(user.role)) return true
                if (item.permission && user.permissions?.includes(item.permission)) return true
                return false
              })
              .map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all text-left ${isActive
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                )
              })}
          </nav>

          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-sm font-semibold text-white">
                {initials(user.nom)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user.nom}</p>
                <p className="text-xs text-gray-500 truncate">{user.login}</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST" className="mt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl shadow-sm no-print">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <Link href="/dashboard" className="hidden sm:block">
                <Image src="/logo.png" alt="GestiCom" width={120} height={30} className="h-8 w-auto object-contain" style={{ width: 'auto' }} />
              </Link>
              <form
                action="/dashboard/recherche"
                method="GET"
                className="relative hidden sm:flex sm:items-center sm:gap-1"
                role="search"
              >
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="q"
                  type="search"
                  placeholder="Rechercher produits, clients, fournisseurs, ventes…"
                  aria-label="Recherche"
                  className="w-56 rounded-l-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="submit"
                  className="rounded-r-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
                  title="Rechercher"
                >
                  Rechercher
                </button>
              </form>
            </div>
            <div className="flex items-center gap-2">
              {/* Indicateur de statut du serveur local */}
              {!isServerConnected && (
                <div className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-800">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                  <span>Serveur Déconnecté</span>
                </div>
              )}
              {isServerConnected && syncQueueLength > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm text-blue-800">
                  {syncing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Synchronisation...</span>
                    </>
                  ) : (
                    <>
                      <span>{syncQueueLength} en attente</span>
                      <button
                        onClick={syncPendingOperations}
                        className="ml-1 rounded px-2 py-0.5 text-xs hover:bg-blue-200"
                      >
                        Sync
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Sélecteur d'entité (visible si SUPER_ADMIN ou plusieurs entités) */}
              {(user.role === 'SUPER_ADMIN' || entites.length > 1) && (
                <div className="relative" ref={entiteSelectRef}>
                  <button
                    onClick={() => {
                      setEntiteSelectOpen(!entiteSelectOpen)
                      if (!entiteSelectOpen) {
                        loadEntites()
                      }
                    }}
                    disabled={switchingEntite}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Changer d'entité"
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {entiteActuelle ? `${entiteActuelle.code} - ${entiteActuelle.nom}` : 'Entité...'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Entités */}
                  {entiteSelectOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl z-50 max-h-96 overflow-hidden">
                      <div className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3">
                        <h3 className="font-semibold text-gray-900">Sélectionner une entité</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {entites.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Aucune entité disponible</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {entites.map((entite) => {
                              const isActive = entiteActuelle?.id === entite.id
                              return (
                                <button
                                  key={entite.id}
                                  onClick={() => {
                                    if (!isActive) {
                                      switchEntite(entite.id)
                                    } else {
                                      setEntiteSelectOpen(false)
                                    }
                                  }}
                                  disabled={switchingEntite || isActive}
                                  className={`w-full px-4 py-3 text-left transition-colors ${isActive
                                    ? 'bg-orange-50 text-orange-900 font-medium'
                                    : 'hover:bg-gray-50 text-gray-900'
                                    } disabled:opacity-50`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">{entite.nom}</p>
                                      <p className="text-xs text-gray-500">{entite.code} · {entite.type}</p>
                                    </div>
                                    {isActive && (
                                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen)
                    if (!notificationsOpen) {
                      loadNotifications()
                    }
                  }}
                  className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                  {nonLues > 0 && !toutesLues && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {nonLues > 9 ? '9+' : nonLues}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifications */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-2xl z-50 max-h-96 overflow-hidden">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {nonLues > 0 && !toutesLues && (
                            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">
                              {nonLues} nouvelle{nonLues > 1 ? 's' : ''}
                            </span>
                          )}
                          {notifications.length > 0 && !toutesLues && (
                            <button
                              onClick={marquerToutesLues}
                              className="text-xs text-orange-600 hover:text-orange-800 font-medium underline"
                              title="Marquer toutes comme lues"
                            >
                              Tout lire
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => {
                                if (notif.lien) {
                                  router.push(notif.lien)
                                  setNotificationsOpen(false)
                                }
                              }}
                              className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${!notif.lu ? 'bg-orange-50/50' : ''
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                  {getNotificationIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{notif.titre}</p>
                                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                                  <p className="mt-1 text-xs text-gray-400">{formatDate(notif.date)}</p>
                                </div>
                                {!notif.lu && (
                                  <div className="mt-1 flex-shrink-0">
                                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
                        <button
                          onClick={() => {
                            router.push('/dashboard')
                            setNotificationsOpen(false)
                          }}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          Voir toutes les notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paramètres */}
              <button
                onClick={() => {
                  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
                    router.push('/dashboard/parametres')
                  }
                }}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                title="Paramètres"
                disabled={user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN'}
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:px-8 relative z-10 w-full overflow-y-auto">
          {children}
        </main>

        {/* Footer GestiCom App - Affiché uniquement sur Dashboard et Paramètres */}
        {pathname === '/dashboard' && (
          <footer className="h-10 border-t border-gray-200 bg-white flex items-center justify-center relative z-10 w-full shrink-0 no-print">
            <p className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="text-orange-500">GestiCom — tous droits réservés</span>
              <span className="text-gray-300 mx-1">—</span>
              <span className="text-emerald-600">Pacousstar 05 44 81 49 24</span>
            </p>
          </footer>
        )}
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
