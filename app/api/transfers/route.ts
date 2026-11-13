import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import { getStoreId } from '@/lib/store-auth'

const STATUSES = ['nao_transferido', 'em_processo', 'concluido'] as const
const COMPLETED_PAGE_SIZE = 20
const ACTIVE_PAGE_SIZE = 100

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive('Selecione um veículo'),
})

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const statusParam = params.get('status') ?? ''
  if (!STATUSES.includes(statusParam as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }
  const status = statusParam
  const q = (params.get('q') ?? '').trim().slice(0, 50)
  const search = q ? `%${q}%` : ''
  const offset = Math.max(0, Math.min(Number.parseInt(params.get('offset') ?? '0', 10) || 0, 100000))
  const pageSize = status === 'concluido' ? COMPLETED_PAGE_SIZE : ACTIVE_PAGE_SIZE

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT t.id, t.vehicle_id, t.status, t.dut_done, t.notes,
        to_char(t.dut_done_at, 'YYYY-MM-DD"T"HH24:MI') AS dut_done_at,
        to_char(t.inspection_at, 'YYYY-MM-DD"T"HH24:MI') AS inspection_at,
        to_char(t.completed_at, 'YYYY-MM-DD"T"HH24:MI') AS completed_at,
        to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI') AS created_at,
        v.plate, v.brand, v.model, v.version, v.model_year, v.color,
        v.status AS vehicle_status
      FROM vehicle_transfers t
      JOIN vehicles v ON v.id = t.vehicle_id AND v.store_id = t.store_id
      WHERE t.store_id = ${storeId}
        AND t.status = ${status}
        AND (${search} = '' OR v.plate ILIKE ${search} OR v.brand ILIKE ${search} OR v.model ILIKE ${search})
      ORDER BY
        CASE WHEN ${status} = 'concluido' THEN t.completed_at END DESC NULLS LAST,
        t.inspection_at ASC NULLS LAST,
        t.created_at DESC
      LIMIT ${pageSize + 1} OFFSET ${offset}
    `
    const hasMore = rows.length > pageSize
    return NextResponse.json({ items: hasMore ? rows.slice(0, pageSize) : rows, hasMore })
  } catch (error) {
    console.error('[v0] GET transfers error:', error)
    return NextResponse.json({ error: 'Erro ao buscar transferências' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const inserted = await sql`
      INSERT INTO vehicle_transfers (store_id, vehicle_id)
      SELECT ${storeId}, v.id FROM vehicles v
      WHERE v.id = ${parsed.data.vehicleId} AND v.store_id = ${storeId}
      ON CONFLICT (vehicle_id) DO NOTHING
      RETURNING id
    `
    if (inserted.length === 0) {
      const exists = await sql`
        SELECT 1 FROM vehicle_transfers WHERE vehicle_id = ${parsed.data.vehicleId} AND store_id = ${storeId}
      `
      return exists.length > 0
        ? NextResponse.json({ error: 'Este veículo já está na lista de transferências' }, { status: 409 })
        : NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ id: inserted[0].id }, { status: 201 })
  } catch (error) {
    console.error('[v0] POST transfers error:', error)
    return NextResponse.json({ error: 'Erro ao adicionar transferência' }, { status: 500 })
  }
}
