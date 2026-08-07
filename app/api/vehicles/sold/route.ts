import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

// GET - Lista veículos vendidos com gastos e lucro calculado
export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const sp = request.nextUrl.searchParams

    const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1') || 1)
    const limit = Math.min(50, Math.max(1, Number.parseInt(sp.get('limit') ?? '12') || 12))
    const offset = (page - 1) * limit

    const search = (sp.get('search') ?? '').trim()
    const like = `%${search}%`

    // Os totais são calculados sobre TODAS as vendas (não apenas a página atual)
    const [summaryRows, countRows, vehicles] = await Promise.all([
      sql`
        SELECT
          COALESCE(SUM(v.sale_value), 0) AS total_sales,
          COALESCE(SUM(v.purchase_value), 0) AS total_invested,
          COALESCE((
            SELECT SUM(e.value) FROM vehicle_expenses e
            JOIN vehicles vv ON vv.id = e.vehicle_id
            WHERE vv.store_id = ${storeId} AND vv.status = 'vendido' AND e.is_deleted = false
          ), 0) AS total_expenses
        FROM vehicles v
        WHERE v.store_id = ${storeId} AND v.status = 'vendido'
      `,
      sql`
        SELECT COUNT(*)::int AS total
        FROM vehicles v
        WHERE v.store_id = ${storeId} AND v.status = 'vendido'
          AND (
            ${search} = ''
            OR v.plate ILIKE ${like}
            OR v.brand ILIKE ${like}
            OR v.model ILIKE ${like}
            OR COALESCE(v.version, '') ILIKE ${like}
          )
      `,
      sql`
        SELECT
          v.*,
          COALESCE(
            (SELECT SUM(e.value) FROM vehicle_expenses e
             WHERE e.vehicle_id = v.id AND e.is_deleted = false),
            0
          ) AS total_expenses
        FROM vehicles v
        WHERE v.store_id = ${storeId} AND v.status = 'vendido'
          AND (
            ${search} = ''
            OR v.plate ILIKE ${like}
            OR v.brand ILIKE ${like}
            OR v.model ILIKE ${like}
            OR COALESCE(v.version, '') ILIKE ${like}
          )
        ORDER BY v.sold_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    ])

    const normalized = vehicles.map((v) => ({
      ...v,
      purchase_value: Number(v.purchase_value) || 0,
      sale_value: Number(v.sale_value) || 0,
      total_expenses: Number(v.total_expenses) || 0,
      manufacture_year: Number(v.manufacture_year),
      model_year: Number(v.model_year),
    }))

    const s = summaryRows[0] ?? {}
    const totalSales = Number(s.total_sales) || 0
    const totalInvested = Number(s.total_invested) || 0
    const totalExpenses = Number(s.total_expenses) || 0
    const total = Number(countRows[0]?.total ?? 0)

    return NextResponse.json({
      vehicles: normalized,
      summary: {
        totalSales,
        totalInvested,
        totalExpenses,
        netProfit: totalSales - totalInvested - totalExpenses,
      },
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('[v0] GET sold error:', error)
    return NextResponse.json({ error: 'Erro ao buscar vendidos' }, { status: 500 })
  }
}

// POST - Marca um veículo como vendido
const soldSchema = z.object({
  vehicleId: z.number().int().positive(),
  saleValue: z.number().positive({ message: 'Valor de venda deve ser maior que zero' }),
})

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { vehicleId, saleValue } = soldSchema.parse(body)

    // Verificar se o veículo pertence à loja e está em estoque
    const check = await sql`
      SELECT id, status FROM vehicles
      WHERE id = ${vehicleId} AND store_id = ${storeId}
    `
    if (check.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    if (check[0].status === 'vendido') {
      return NextResponse.json({ error: 'Veículo já foi marcado como vendido' }, { status: 409 })
    }

    const result = await sql`
      UPDATE vehicles
      SET status = 'vendido', sale_value = ${saleValue}, sold_at = NOW(), updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST sold error:', error)
    return NextResponse.json({ error: 'Erro ao marcar como vendido' }, { status: 500 })
  }
}

// DELETE - Reverte um veículo vendido de volta ao estoque
export async function DELETE(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { vehicleId } = await request.json()

    if (!vehicleId || typeof vehicleId !== 'number') {
      return NextResponse.json({ error: 'ID do veículo inválido' }, { status: 400 })
    }

    const check = await sql`
      SELECT id, status FROM vehicles
      WHERE id = ${vehicleId} AND store_id = ${storeId}
    `
    if (check.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    if (check[0].status !== 'vendido') {
      return NextResponse.json({ error: 'Veículo não está marcado como vendido' }, { status: 409 })
    }

    const result = await sql`
      UPDATE vehicles
      SET status = 'em_estoque', sale_value = NULL, sold_at = NULL, updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[v0] DELETE sold error:', error)
    return NextResponse.json({ error: 'Erro ao reverter venda' }, { status: 500 })
  }
}
