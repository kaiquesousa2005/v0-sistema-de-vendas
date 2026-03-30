import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jose'
import { db } from '@/lib/db'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verified = await verify(token, secret)
    const storeId = verified.storeId as number

    await db`
      DELETE FROM vehicle_expenses
      WHERE id = ${parseInt(expenseId)} AND vehicle_id = ${parseInt(id)} AND store_id = ${storeId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE expense error:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
