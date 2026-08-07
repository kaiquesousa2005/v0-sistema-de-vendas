import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'autogest-secret-key')

const MAX_SIZE = 8 * 1024 * 1024 // 8MB

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

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // A CNH é sempre um PDF
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json(
        { error: 'A CNH deve ser um arquivo PDF.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 8MB.' },
        { status: 400 },
      )
    }

    const filename = `cnh/loja-${storeId}/${Date.now()}-${crypto.randomUUID()}.pdf`

    // O store do Blob é privado: o arquivo só é servido pela rota autenticada
    // /api/customers/[id]/cnh, nunca por URL pública.
    const blob = await put(filename, file, {
      access: 'private',
      contentType: 'application/pdf',
    })

    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error('[v0] CNH upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload da CNH' }, { status: 500 })
  }
}
