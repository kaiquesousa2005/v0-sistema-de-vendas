import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

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

/**
 * Próximos aniversários (incluindo hoje), no fuso de São Paulo.
 * Nascidos em 29/02 comemoram em 28/02 nos anos não bissextos.
 */
export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(20, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '3') || 3))

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const birthdays = await sql`
      WITH today AS (SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS d),
      base AS (
        SELECT c.id, c.full_name, c.phone, c.birth_date, today.d,
          (c.birth_date + make_interval(years => (EXTRACT(YEAR FROM today.d) - EXTRACT(YEAR FROM c.birth_date))::int))::date AS this_year
        FROM customers c, today
        WHERE c.store_id = ${storeId} AND c.birth_date IS NOT NULL
      ),
      next AS (
        SELECT *,
          CASE WHEN this_year >= d THEN this_year
               ELSE (birth_date + make_interval(years => (EXTRACT(YEAR FROM d) - EXTRACT(YEAR FROM birth_date))::int + 1))::date
          END AS next_birthday
        FROM base
      )
      SELECT id, full_name, phone,
        to_char(birth_date, 'YYYY-MM-DD') AS birth_date,
        to_char(next_birthday, 'YYYY-MM-DD') AS next_birthday,
        (next_birthday - d)::int AS days_until,
        (EXTRACT(YEAR FROM next_birthday) - EXTRACT(YEAR FROM birth_date))::int AS turning_age
      FROM next
      ORDER BY days_until ASC, full_name ASC
      LIMIT ${limit}
    `
    return NextResponse.json({ birthdays })
  } catch (error) {
    console.error('[v0] GET upcoming birthdays error:', error)
    return NextResponse.json({ error: 'Erro ao buscar aniversários' }, { status: 500 })
  }
}
