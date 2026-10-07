import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

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

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const [birthdays, accounts] = await Promise.all([
      sql`
        WITH today AS (SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
        SELECT c.id, c.full_name, c.phone, to_char(c.birth_date, 'YYYY-MM-DD') AS birth_date,
          (EXTRACT(YEAR FROM today.d) - EXTRACT(YEAR FROM c.birth_date))::int AS age
        FROM customers c, today
        WHERE c.store_id = ${storeId}
          AND c.birth_date IS NOT NULL
          AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM today.d)
          AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM today.d)
        ORDER BY c.full_name ASC
      `,
      sql`
        WITH today AS (SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS d)
        SELECT a.id, a.description, a.category, a.amount, a.status,
          to_char(a.due_date, 'YYYY-MM-DD') AS due_date,
          (a.due_date - today.d)::int AS days_until
        FROM accounts_payable a, today
        WHERE a.store_id = ${storeId}
          AND a.status <> 'Pago'
          AND a.due_date <= today.d + 3
        ORDER BY a.due_date ASC, a.description ASC
        LIMIT 50
      `,
    ])

    return NextResponse.json({
      birthdays,
      dueToday: accounts.filter((a) => a.days_until === 0),
      overdue: accounts.filter((a) => a.days_until < 0),
      upcoming: accounts.filter((a) => a.days_until > 0),
    })
  } catch (error) {
    console.error('[v0] GET notifications error:', error)
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}
