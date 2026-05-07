import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jose'
import { hashPassword } from '@/lib/hash'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const createStoreSchema = z.object({
  cpf: z.string().min(11),
  store_name: z.string().min(1),
  password: z.string().min(6),
})

async function getAdminId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('admin-token')?.value
  if (!token) return null
  try {
    const verified = await verify(token, secret)
    return verified.adminId as number
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const stores = await sql`
      SELECT id, cpf, store_name, is_active, created_at
      FROM stores
      WHERE created_by = ${adminId}
      ORDER BY created_at DESC
    `
    return NextResponse.json(stores)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar lojas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const adminId = await getAdminId(request)
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const body = await request.json()
    const { cpf, store_name, password } = createStoreSchema.parse(body)

    const cleanCpf = cpf.replace(/\D/g, '')
    const existing = await sql`SELECT id FROM stores WHERE cpf = ${cleanCpf}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const result = await sql`
      INSERT INTO stores (cpf, store_name, password_hash, created_by)
      VALUES (${cleanCpf}, ${store_name}, ${hashedPassword}, ${adminId})
      RETURNING id, cpf, store_name, is_active, created_at
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar loja' }, { status: 500 })
  }
}
