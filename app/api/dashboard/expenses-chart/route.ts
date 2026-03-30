import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { sql } from '@neondatabase/serverless'
import { db } from '@/lib/db'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    if (!storeId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const result = await db(sql`
      SELECT
        TO_CHAR(date, 'MM/YYYY') as month,
        SUM(value) as expenses
      FROM vehicle_expenses
      WHERE store_id = ${storeId}
      AND date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(date, 'MM/YYYY')
      ORDER BY date DESC
      LIMIT 12
    `)

    const chartData = result.reverse().map((row: any) => ({
      month: row.month,
      expenses: parseFloat(row.expenses),
    }))

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}
