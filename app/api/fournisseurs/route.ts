import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'

export async function GET(request: NextRequest) {
  const session = await getSession()
  const forbidden = requirePermission(session, 'fournisseurs:view')
  if (forbidden) return forbidden

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 20))
  const skip = (page - 1) * limit

  const q = String(request.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
  const list = await prisma.fournisseur.findMany({
    where: { actif: true },
    orderBy: { nom: 'asc' },
    select: { id: true, code: true, nom: true, telephone: true, email: true, ncc: true },
  })
  const filtered = q
    ? list.filter(
      (f) =>
        f.nom.toLowerCase().includes(q) ||
        (f.code || '').toLowerCase().includes(q) ||
        (f.telephone || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q)
    )
    : list

  const total = filtered.length
  const paginated = filtered.slice(skip, skip + limit)

  const fournisseurIds = paginated.map((f) => f.id)
  let detteByFournisseur: Record<number, number> = {}
  
  if (fournisseurIds.length > 0) {
    const sums = await prisma.achat.groupBy({
      by: ['fournisseurId'],
      where: {
        fournisseurId: { in: fournisseurIds },
      },
      _sum: { montantTotal: true, montantPaye: true },
    })
    for (const r of sums) {
      if (r.fournisseurId != null) {
        const totalA = r._sum?.montantTotal || 0
        const payeA = r._sum?.montantPaye || 0
        detteByFournisseur[r.fournisseurId] = totalA - payeA
      }
    }
  }

  const result = paginated.map((f) => ({
    ...f,
    dette: detteByFournisseur[f.id] ?? 0
  }))

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
  const forbidden = requirePermission(session, 'fournisseurs:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    let code = body?.code != null ? String(body.code).trim() || null : null
    const nom = String(body?.nom || '').trim()
    const telephone = body?.telephone != null ? String(body.telephone).trim() || null : null
    const email = body?.email != null ? String(body.email).trim() || null : null
    const ncc = body?.ncc != null ? String(body.ncc).trim() || null : null

    if (!nom) {
      return NextResponse.json({ error: 'Nom du fournisseur requis.' }, { status: 400 })
    }

    // Génération automatique du code si non fourni
    if (!code) {
      const count = await prisma.fournisseur.count()
      const prefix = nom.charAt(0).toUpperCase() || 'F'
      code = `${String(count + 1).padStart(6, '0')}${prefix}`
    }

    const f = await prisma.fournisseur.create({
      data: { code, nom, telephone, email, ncc, actif: true },
    })
    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/fournisseurs')
    revalidatePath('/api/fournisseurs')

    return NextResponse.json(f)
  } catch (e) {
    console.error('POST /api/fournisseurs:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
