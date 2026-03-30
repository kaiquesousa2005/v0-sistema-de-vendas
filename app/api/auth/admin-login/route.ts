import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@neondatabase/serverless'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { createAdminJWT } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = adminLoginSchema.parse(body)

    const result = await db(sql`
      SELECT id, email, password_hash, name
      FROM admins
      WHERE email = ${email}
    `)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Email ou senha inválida' },
        { status: 401 }
      )
    }

    const admin = result[0]
    const isPasswordValid = await verifyPassword(password, admin.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha inválida' },
        { status: 401 }
      )
    }

    const token = await createAdminJWT(admin.email, admin.id)
    
    const cookieStore = await cookies()
    cookieStore.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
    })
  } catch (error) {
    console.error('[v0] Admin login error:', error)
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
