import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { del } from '@vercel/blob'
import { z } from 'zod'

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

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  birth_date: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().or(z.literal('')),
  rg: z.string().min(1).optional(),
  address_street: z.string().min(1).optional(),
  address_number: z.string().min(1).optional(),
  address_complement: z.string().optional().or(z.literal('')),
  address_neighborhood: z.string().min(1).optional(),
  address_city: z.string().min(1).optional(),
  address_state: z.string().length(2).optional(),
  address_zip: z.string().min(8).optional(),
  cnh_pathname: z.string().optional().or(z.literal('')),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const customerId = parseInt(id)

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)
    const sql = neon(process.env.DATABASE_URL!)

    const current = await sql`
      SELECT * FROM customers WHERE id = ${customerId} AND store_id = ${storeId}
    `
    if (current.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const c = current[0]
    const result = await sql`
      UPDATE customers SET
        full_name = ${data.full_name ?? c.full_name},
        birth_date = ${data.birth_date ?? c.birth_date},
        phone = ${data.phone ?? c.phone},
        email = ${data.email !== undefined ? (data.email || null) : c.email},
        rg = ${data.rg ?? c.rg},
        address_street = ${data.address_street ?? c.address_street},
        address_number = ${data.address_number ?? c.address_number},
        address_complement = ${data.address_complement !== undefined ? (data.address_complement || null) : c.address_complement},
        address_neighborhood = ${data.address_neighborhood ?? c.address_neighborhood},
        address_city = ${data.address_city ?? c.address_city},
        address_state = ${data.address_state ? data.address_state.toUpperCase() : c.address_state},
        address_zip = ${data.address_zip ? data.address_zip.replace(/\D/g, '') : c.address_zip},
        cnh_pathname = ${data.cnh_pathname !== undefined ? (data.cnh_pathname || null) : c.cnh_pathname},
        updated_at = NOW()
      WHERE id = ${customerId} AND store_id = ${storeId}
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] PUT customer error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const customerId = parseInt(id)

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const current = await sql`
      SELECT * FROM customers WHERE id = ${customerId} AND store_id = ${storeId}
    `
    if (current.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Remove CNH do Blob se existir
    if (current[0].cnh_pathname) {
      try {
        await del(current[0].cnh_pathname)
      } catch (e) {
        console.error('[v0] Failed to delete CNH blob:', e)
      }
    }

    await sql`DELETE FROM customers WHERE id = ${customerId} AND store_id = ${storeId}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE customer error:', error)
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
