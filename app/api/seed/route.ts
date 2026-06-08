import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { hashPassword } from '@/lib/hash'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const adminEmail = 'kaique.freire@hotmail.com'

    const existing = await sql`SELECT id FROM admins WHERE email = ${adminEmail}`
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Admin already exists' })
    }

    const hashed = await hashPassword('Kaique1020*')
    await sql`
      INSERT INTO admins (email, password_hash, name)
      VALUES (${adminEmail}, ${hashed}, 'Kaique Freire')
    `
    return NextResponse.json({ message: 'Admin criado com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar admin' }, { status: 500 })
  }
}
