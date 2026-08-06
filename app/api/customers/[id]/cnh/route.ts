import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { get } from '@vercel/blob'
import { jwtVerify } from 'jose'

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

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'cliente'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const customerId = Number(id)
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT full_name, cnh_pathname
      FROM customers
      WHERE id = ${customerId} AND store_id = ${storeId}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const pathname = rows[0].cnh_pathname as string | null
    if (!pathname) {
      return NextResponse.json({ error: 'Este cliente não possui CNH anexada' }, { status: 404 })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return NextResponse.json({ error: 'Arquivo da CNH não encontrado' }, { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    // ?download=1 força o download; sem o parâmetro abre no visualizador do navegador
    const isDownload = request.nextUrl.searchParams.get('download') === '1'
    const filename = `CNH-${slugify(String(rows[0].full_name))}.pdf`

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[v0] GET CNH error:', error)
    return NextResponse.json({ error: 'Erro ao carregar a CNH' }, { status: 500 })
  }
}
