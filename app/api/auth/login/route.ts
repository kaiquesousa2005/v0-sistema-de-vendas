import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyPassword } from '@/lib/hash'
import { createJWT, setAuthCookie } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  cpf: z.string().min(11),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const body = await request.json()
    const { cpf, password } = loginSchema.parse(body)

    const result = await sql`
      SELECT id, cpf, store_name, password_hash, is_active
      FROM stores
      WHERE cpf = ${cpf} AND is_active = true
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'CPF ou senha inválida, ou loja inativa' },
        { status: 401 }
      )
    }

    const store = result[0]
    const isPasswordValid = await verifyPassword(password, store.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'CPF ou senha inválida' },
        { status: 401 }
      )
    }

    const token = await createJWT({
      storeId: store.id,
      cpf: store.cpf,
      storeName: store.store_name,
    })

    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      message: `Bem-vindo, ${store.store_name}!`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}
