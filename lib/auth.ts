import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

export interface AuthPayload {
  storeId: number
  cpf: string
  storeName: string
}

export async function createJWT(payload: AuthPayload): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)
    return token
  } catch (error) {
    console.error('[v0] Error creating JWT:', error)
    throw error
  }
}

export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload as AuthPayload
  } catch (error) {
    console.error('[v0] Error verifying JWT:', error)
    return null
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('auth-token')?.value || null
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function createAdminJWT(email: string, id: number): Promise<string> {
  try {
    const token = await new SignJWT({ adminId: id, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)
    return token
  } catch (error) {
    console.error('[v0] Error creating Admin JWT:', error)
    throw error
  }
}
