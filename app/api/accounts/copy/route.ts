import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

const copySchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Selecione ao menos uma conta').max(500),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

/**
 * Copia contas selecionadas para o mês de destino como "Pendente", mantendo o
 * dia do vencimento (limitado ao último dia do mês). Contas com a mesma
 * descrição e categoria já existentes no mês de destino são ignoradas.
 */
export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ids, month, year } = copySchema.parse(await request.json())
    const sql = neon(process.env.DATABASE_URL!)
    const inserted = await sql`
      INSERT INTO accounts_payable (store_id, description, category, due_date, amount, status, payment_date, notes)
      SELECT src.store_id, src.description, src.category,
        make_date(${year}::int, ${month}::int, LEAST(
          EXTRACT(DAY FROM src.due_date)::int,
          EXTRACT(DAY FROM (make_date(${year}::int, ${month}::int, 1) + INTERVAL '1 month - 1 day'))::int
        )),
        src.amount, 'Pendente', NULL, src.notes
      FROM accounts_payable src
      WHERE src.store_id = ${storeId}
        AND src.id = ANY(${ids}::int[])
        AND NOT EXISTS (
          SELECT 1 FROM accounts_payable dst
          WHERE dst.store_id = src.store_id
            AND dst.description = src.description
            AND dst.category = src.category
            AND EXTRACT(MONTH FROM dst.due_date) = ${month}
            AND EXTRACT(YEAR FROM dst.due_date) = ${year}
        )
      RETURNING id
    `
    return NextResponse.json({ copied: inserted.length, skipped: ids.length - inserted.length })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    console.error('[v0] COPY accounts error:', error)
    return NextResponse.json({ error: 'Erro ao copiar contas' }, { status: 500 })
  }
}
