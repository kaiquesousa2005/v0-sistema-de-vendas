import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { db } from '@/lib/db'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

const updateStoreSchema = z.object({
  store_name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('admin-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const adminId = verified.adminId as number

    if (!adminId) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    const store = await db`
      SELECT id, cpf, store_name, is_active, created_at
      FROM stores
      WHERE id = ${parseInt(id)} AND created_by = ${adminId}
    `

    if (store.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json(store[0])
  } catch (error) {
    console.error('[v0] GET store error:', error)
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('admin-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const adminId = verified.adminId as number

    if (!adminId) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    const body = await request.json()
    const data = updateStoreSchema.parse(body)

    const storeId = parseInt(id)

    // Fetch current store first
    const currentStore = await db`
      SELECT * FROM stores
      WHERE id = ${storeId} AND created_by = ${adminId}
    `

    if (currentStore.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const store = currentStore[0]
    const store_name = data.store_name || store.store_name
    const is_active = data.is_active !== undefined ? data.is_active : store.is_active

    const result = await db`
      UPDATE stores
      SET 
        store_name = ${store_name},
        is_active = ${is_active},
        updated_at = NOW()
      WHERE id = ${storeId} AND created_by = ${adminId}
      RETURNING id, cpf, store_name, is_active, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('[v0] PUT store error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = request.cookies.get('admin-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const adminId = verified.adminId as number

    if (!adminId) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    await db`
      DELETE FROM stores
      WHERE id = ${parseInt(id)} AND created_by = ${adminId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE store error:', error)
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 })
  }
}
