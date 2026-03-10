import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'

type ClientDelegate = {
  findMany: (args: object) => Promise<Array<{ id: number; nom: string; telephone: string | null; type: string; plafondCredit: number | null; actif: boolean }>>
  create: (args: object) => Promise<{ id: number; nom: string; telephone: string | null; email: string | null; adresse: string | null; type: string; plafondCredit: number | null }>
}

const clientRepo = (prisma as unknown as { client: ClientDelegate }).client

export async function GET(request: NextRequest) {
  const session = await getSession()
  const forbidden = requirePermission(session, 'clients:view')
  if (forbidden) return forbidden

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 20))
  const skip = (page - 1) * limit

  const q = String(request.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
  const list = await clientRepo.findMany({
    where: { actif: true },
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, telephone: true, type: true, plafondCredit: true, ncc: true },
  })
  const filtered = q
    ? list.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.telephone || '').toLowerCase().includes(q)
    )
    : list

  const total = filtered.length
  const paginated = filtered.slice(skip, skip + limit)

  const creditIds = paginated.filter((c) => c.type === 'CREDIT').map((c) => c.id)
  let detteByClient: Record<number, number> = {}
  if (creditIds.length > 0) {
    const sums = await prisma.vente.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: creditIds },
        statut: 'VALIDEE',
        modePaiement: 'CREDIT',
      },
      _sum: { montantTotal: true },
    })
    for (const r of sums) {
      if (r.clientId != null) detteByClient[r.clientId] = r._sum.montantTotal ?? 0
    }
  }

  const result = paginated.map((c) => {
    const base = { ...c }
    if (c.type === 'CREDIT') (base as { dette?: number }).dette = detteByClient[c.id] ?? 0
    return base
  })

  const res = NextResponse.json({
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  const forbidden = requirePermission(session, 'clients:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const nom = String(body?.nom || '').trim()
    const telephone = body?.telephone != null ? String(body.telephone).trim() || null : null
    const email = body?.email != null ? String(body.email).trim() || null : null
    const adresse = body?.adresse != null ? String(body.adresse).trim() || null : null
    const type = String(body?.type || 'CASH').toUpperCase() === 'CREDIT' ? 'CREDIT' : 'CASH'
    const plafondCredit = type === 'CREDIT' && body?.plafondCredit != null
      ? Math.max(0, Number(body.plafondCredit))
      : null
    const ncc = body?.ncc != null ? String(body.ncc).trim() || null : null

    if (!nom) {
      return NextResponse.json({ error: 'Nom du client requis.' }, { status: 400 })
    }

    const c = await clientRepo.create({
      data: { nom, telephone, email, adresse, type, plafondCredit, ncc, actif: true },
    })

    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/clients')
    revalidatePath('/api/clients')

    return NextResponse.json(c)
  } catch (e) {
    console.error('POST /api/clients:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
