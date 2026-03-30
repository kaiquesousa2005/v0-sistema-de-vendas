import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { createJWT, setAuthCookie } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  cpf: z.string().min(11),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf, password } = loginSchema.parse(body)

    const result = await db`
      SELECT id, cpf, store_name, password_hash, is_active
      FROM stores
      WHERE cpf = ${cpf} AND is_active = true
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const store = result[0]
    const isPasswordValid = await verifyPassword(password, store.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
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
      message: 'Login realizado com sucesso',
    })
  } catch (error) {
    console.error('[v0] Login error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
