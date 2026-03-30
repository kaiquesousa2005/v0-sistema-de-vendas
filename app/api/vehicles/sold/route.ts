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

    const vehicles = await db(sql`
      SELECT * FROM vehicles
      WHERE store_id = ${storeId} AND status = 'vendido'
      ORDER BY sold_at DESC
    `)

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('[v0] GET sold vehicles error:', error)
    return NextResponse.json({ error: 'Failed to fetch sold vehicles' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    const body = await request.json()
    const { vehicleId, saleValue } = body

    const result = await db(sql`
      UPDATE vehicles
      SET status = 'vendido', sale_value = ${saleValue}, sold_at = NOW(), updated_at = NOW()
      WHERE id = ${vehicleId} AND store_id = ${storeId}
      RETURNING *
    `)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[v0] PUT sold vehicle error:', error)
    return NextResponse.json({ error: 'Failed to mark vehicle as sold' }, { status: 500 })
  }
}
