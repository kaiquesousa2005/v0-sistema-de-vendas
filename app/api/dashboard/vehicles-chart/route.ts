import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
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

    const result = await db`
      SELECT
        status,
        COUNT(*) as count
      FROM vehicles
      WHERE store_id = ${storeId}
      GROUP BY status
    `

    const colors: { [key: string]: string } = {
      em_estoque: 'hsl(142 71% 45%)',
      vendido: 'hsl(221 83% 53%)',
    }

    const chartData = result.map((row: any) => ({
      name: row.status === 'em_estoque' ? 'Em Estoque' : 'Vendidos',
      value: parseInt(row.count),
      color: colors[row.status] || 'hsl(0 0% 50%)',
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
