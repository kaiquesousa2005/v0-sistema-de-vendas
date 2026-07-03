import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
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

const customerSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento obrigatória'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  rg: z.string().min(1, 'RG obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  address_street: z.string().min(1, 'Rua obrigatória'),
  address_number: z.string().min(1, 'Número obrigatório'),
  address_complement: z.string().optional().or(z.literal('')),
  address_neighborhood: z.string().min(1, 'Bairro obrigatório'),
  address_city: z.string().min(1, 'Cidade obrigatória'),
  address_state: z.string().length(2, 'UF inválida'),
  address_zip: z.string().min(8, 'CEP inválido'),
  cnh_pathname: z.string().optional().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const customers = await sql`
      SELECT * FROM customers
      WHERE store_id = ${storeId}
      ORDER BY full_name ASC
    `
    return NextResponse.json(customers)
  } catch (error) {
    console.error('[v0] GET customers error:', error)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = customerSchema.parse(body)
    const sql = neon(process.env.DATABASE_URL!)

    const cleanCpf = data.cpf.replace(/\D/g, '')

    const existing = await sql`
      SELECT id FROM customers WHERE store_id = ${storeId} AND cpf = ${cleanCpf}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Já existe um cliente com esse CPF cadastrado.' }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO customers (
        store_id, full_name, birth_date, phone, email, rg, cpf,
        address_street, address_number, address_complement,
        address_neighborhood, address_city, address_state, address_zip,
        cnh_pathname
      ) VALUES (
        ${storeId}, ${data.full_name}, ${data.birth_date},
        ${data.phone}, ${data.email || null}, ${data.rg}, ${cleanCpf},
        ${data.address_street}, ${data.address_number}, ${data.address_complement || null},
        ${data.address_neighborhood}, ${data.address_city}, ${data.address_state.toUpperCase()},
        ${data.address_zip.replace(/\D/g, '')}, ${data.cnh_pathname || null}
      )
      RETURNING *
    `
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST customer error:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar cliente' }, { status: 500 })
  }
}
