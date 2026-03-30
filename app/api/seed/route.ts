import { NextResponse } from 'next/server'
import { sql } from '@neondatabase/serverless'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/hash'

export async function GET() {
  try {
    const adminEmail = 'kaique.freire@hotmail.com'
    
    const existingAdmin = await db(sql`
      SELECT id FROM admins WHERE email = ${adminEmail}
    `)
    
    if (existingAdmin.length > 0) {
      return NextResponse.json({ message: 'Admin already exists' }, { status: 200 })
    }

    const password = 'Kaique1020*'
    const hashedPassword = await hashPassword(password)

    await db(sql`
      INSERT INTO admins (email, password_hash, name)
      VALUES (${adminEmail}, ${hashedPassword}, 'Kaique Freire')
    `)

    return NextResponse.json({ message: 'Seed completed' }, { status: 200 })
  } catch (error) {
    console.error('[v0] Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
