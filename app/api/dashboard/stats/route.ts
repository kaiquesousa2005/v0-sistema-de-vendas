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
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN status = 'em_estoque' THEN 1 END) as vehicles_in_stock,
        COUNT(CASE WHEN status = 'vendido' THEN 1 END) as vehicles_sold,
        COALESCE(SUM(CASE WHEN status = 'vendido' THEN sale_value ELSE 0 END), 0) as total_revenue,
        COALESCE((SELECT SUM(value) FROM vehicle_expenses WHERE store_id = ${storeId}), 0) as total_expenses
      FROM vehicles
      WHERE store_id = ${storeId}
    `)

    const stats = result[0]

    return NextResponse.json({
      totalVehicles: parseInt(stats.total_vehicles),
      vehiclesInStock: parseInt(stats.vehicles_in_stock),
      vehiclesSold: parseInt(stats.vehicles_sold),
      totalRevenue: parseFloat(stats.total_revenue),
      totalExpenses: parseFloat(stats.total_expenses),
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
