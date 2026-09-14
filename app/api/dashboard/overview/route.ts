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

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Constrói a série dos últimos 12 meses (mais antigo -> atual) com chave YYYY-MM. */
function buildMonthBuckets() {
  const now = new Date()
  const buckets: { key: string; label: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
    buckets.push({ key, label })
  }
  return buckets
}

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const [kpiRows, expenseRows, customerRows, statusRows, categoryRows, soldMonthly, expenseMonthly, brandRows] =
      await Promise.all([
        sql`
          SELECT
            COUNT(*)::int AS total_vehicles,
            COUNT(*) FILTER (WHERE status = 'em_estoque')::int AS in_stock,
            COUNT(*) FILTER (WHERE status = 'vendido')::int AS sold,
            COALESCE(SUM(sale_value) FILTER (WHERE status = 'vendido'), 0) AS revenue,
            COALESCE(SUM(purchase_value) FILTER (WHERE status = 'vendido'), 0) AS cost_sold,
            COALESCE(SUM(purchase_value) FILTER (WHERE status = 'em_estoque'), 0) AS stock_value
          FROM vehicles
          WHERE store_id = ${storeId}
        `,
        sql`
          SELECT COALESCE(SUM(value), 0) AS total
          FROM vehicle_expenses
          WHERE store_id = ${storeId} AND is_deleted = false
        `,
        sql`SELECT COUNT(*)::int AS total FROM customers WHERE store_id = ${storeId}`,
        sql`
          SELECT status, COUNT(*)::int AS count
          FROM vehicles WHERE store_id = ${storeId}
          GROUP BY status
        `,
        sql`
          SELECT COALESCE(NULLIF(category, ''), 'Outros') AS category, COALESCE(SUM(value), 0) AS total
          FROM vehicle_expenses
          WHERE store_id = ${storeId} AND is_deleted = false
          GROUP BY 1
          ORDER BY total DESC
        `,
        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', sold_at), 'YYYY-MM') AS ym,
            COALESCE(SUM(sale_value), 0) AS revenue,
            COALESCE(SUM(purchase_value), 0) AS cost,
            COUNT(*)::int AS sales_count
          FROM vehicles
          WHERE store_id = ${storeId} AND status = 'vendido' AND sold_at IS NOT NULL
            AND sold_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          GROUP BY 1
        `,
        sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS ym,
            COALESCE(SUM(value), 0) AS expenses
          FROM vehicle_expenses
          WHERE store_id = ${storeId} AND is_deleted = false
            AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          GROUP BY 1
        `,
        sql`
          SELECT brand, COUNT(*)::int AS count
          FROM vehicles
          WHERE store_id = ${storeId} AND status = 'em_estoque'
          GROUP BY brand
          ORDER BY count DESC
          LIMIT 6
        `,
      ])

    const kpi = kpiRows[0] ?? {}
    const revenue = Number(kpi.revenue) || 0
    const costSold = Number(kpi.cost_sold) || 0
    const totalExpenses = Number(expenseRows[0]?.total) || 0
    const grossProfit = revenue - costSold
    const netProfit = grossProfit - totalExpenses

    // Monta a série mensal combinando vendas (faturamento/custo) e gastos.
    const soldMap = new Map(soldMonthly.map((r) => [String(r.ym), r]))
    const expMap = new Map(expenseMonthly.map((r) => [String(r.ym), r]))
    const monthly = buildMonthBuckets().map(({ key, label }) => {
      const s = soldMap.get(key)
      const rev = Number(s?.revenue) || 0
      const cost = Number(s?.cost) || 0
      const salesCount = Number(s?.sales_count) || 0
      const expenses = Number(expMap.get(key)?.expenses) || 0
      return {
        month: label,
        revenue: rev,
        expenses,
        salesCount,
        profit: rev - cost - expenses,
      }
    })

    const statusLabels: Record<string, string> = {
      em_estoque: 'Em estoque',
      vendido: 'Vendidos',
      reservado: 'Reservados',
    }
    const vehiclesByStatus = statusRows.map((r) => ({
      key: String(r.status),
      label: statusLabels[String(r.status)] ?? String(r.status),
      count: Number(r.count) || 0,
    }))

    const expensesByCategory = categoryRows.map((r) => ({
      category: String(r.category),
      total: Number(r.total) || 0,
    }))

    const stockByBrand = brandRows.map((r) => ({
      brand: String(r.brand),
      count: Number(r.count) || 0,
    }))

    return NextResponse.json({
      kpis: {
        totalVehicles: Number(kpi.total_vehicles) || 0,
        vehiclesInStock: Number(kpi.in_stock) || 0,
        vehiclesSold: Number(kpi.sold) || 0,
        totalRevenue: revenue,
        totalExpenses,
        grossProfit,
        netProfit,
        stockValue: Number(kpi.stock_value) || 0,
        totalCustomers: Number(customerRows[0]?.total) || 0,
      },
      monthly,
      vehiclesByStatus,
      expensesByCategory,
      stockByBrand,
    })
  } catch (error) {
    console.error('[v0] GET dashboard overview error:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados do dashboard' }, { status: 500 })
  }
}
