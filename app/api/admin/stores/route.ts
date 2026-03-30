import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { sql } from '@neondatabase/serverless'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/hash'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

const createStoreSchema = z.object({
  cpf: z.string().length(11),
  store_name: z.string().min(1),
  password: z.string().min(8),
})

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const adminId = verified.adminId as number

    if (!adminId) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    const stores = await db(sql`
      SELECT id, cpf, store_name, is_active, created_at
      FROM stores
      WHERE created_by = ${adminId}
      ORDER BY created_at DESC
    `)

    return NextResponse.json(stores)
  } catch (error) {
    console.error('[v0] GET stores error:', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { cpf, store_name, password } = createStoreSchema.parse(body)

    const hashedPassword = await hashPassword(password)

    const result = await db(sql`
      INSERT INTO stores (cpf, store_name, password_hash, created_by)
      VALUES (${cpf}, ${store_name}, ${hashedPassword}, ${adminId})
      RETURNING id, cpf, store_name, is_active, created_at
    `)

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('[v0] POST store error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }
}
