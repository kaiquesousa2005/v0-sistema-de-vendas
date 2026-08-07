import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

async function getStoreId(request: NextRequest): Promise<number | null> {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return payload.storeId as number
  } catch {
    return null
  }
}

/**
 * Totais da loja usados no topo da página de contratos.
 *
 * Os números por tipo e o total geral são de todo o histórico (não sofrem o
 * filtro de ano/tipo da listagem), para os chips de filtro mostrarem sempre a
 * mesma contagem. O agrupamento por mês é calculado no cliente a partir das
 * linhas já carregadas, evitando duas fontes de verdade para o mesmo número.
 */
export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const [byTypeRows, yearRows] = await Promise.all([
      sql`
        SELECT type, COUNT(*)::int AS count, COALESCE(SUM(total_value), 0) AS total_value
        FROM contracts
        WHERE store_id = ${storeId}
        GROUP BY type
      `,
      sql`
        SELECT DISTINCT EXTRACT(YEAR FROM contract_date)::int AS year
        FROM contracts
        WHERE store_id = ${storeId}
        ORDER BY year DESC
      `,
    ])

    const byType: Record<string, { count: number; totalValue: number }> = {}
    let total = 0
    let totalValue = 0

    for (const row of byTypeRows) {
      const count = Number(row.count) || 0
      const value = Number(row.total_value) || 0
      byType[String(row.type)] = { count, totalValue: value }
      total += count
      totalValue += value
    }

    return NextResponse.json({
      total,
      totalValue,
      byType,
      years: yearRows.map((r) => Number(r.year)).filter((y) => Number.isFinite(y)),
    })
  } catch (error) {
    console.error('[v0] GET contracts summary error:', error)
    return NextResponse.json({ error: 'Erro ao buscar resumo dos contratos' }, { status: 500 })
  }
}
