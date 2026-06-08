import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { hashPassword } from '@/lib/hash'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const storeSchema = z.object({
  cpf: z.string().min(11).max(14),
  store_name: z.string().min(1),
  password: z.string().min(6),
})

async function getAdminId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('admin-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.adminId as number
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = neon(process.env.DATABASE_URL!)
    const stores = await db`
      SELECT id, cpf, store_name, is_active, created_at
      FROM stores
      WHERE created_by = ${adminId}
      ORDER BY created_at DESC
    `

    return NextResponse.json(stores)
  } catch (error) {
    console.error('[v0] GET stores error:', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await getAdminId(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cpf, store_name, password } = storeSchema.parse(body)

    const cleanCpf = cpf.replace(/\D/g, '')
    const hashedPassword = await hashPassword(password)

    const db = neon(process.env.DATABASE_URL!)
    const result = await db`
      INSERT INTO stores (cpf, store_name, password_hash, created_by)
      VALUES (${cleanCpf}, ${store_name}, ${hashedPassword}, ${adminId})
      RETURNING id, cpf, store_name, is_active, created_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error: unknown) {
    console.error('[v0] POST store error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'CPF already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 })
  }
}
