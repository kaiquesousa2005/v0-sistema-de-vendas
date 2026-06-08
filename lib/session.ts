import { jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'autogest-secret-key'
)

export async function getStoreIdFromRequest(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.storeId as number
  } catch {
    return null
  }
}

export async function getAdminIdFromRequest(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get('admin-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.adminId as number
  } catch {
    return null
  }
}
