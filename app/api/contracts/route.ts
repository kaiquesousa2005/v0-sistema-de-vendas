import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { CONTRACT_TYPES, todayIso } from '@/lib/contracts'
import {
  buildSaleSnapshot,
  rememberStoreDefaults,
  saleDraftSchema,
  saleSchema,
} from '@/lib/contract-snapshot'

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

/**
 * Lista de contratos para a página, agrupada por mês no cliente.
 *
 * Não é paginada de propósito: a listagem agrupa por mês e uma página fixa
 * cortaria um mês no meio, deixando o total do cabeçalho errado. O escopo é
 * limitado por ano (`year`), o que mantém o volume por requisição pequeno
 * mesmo com centenas de contratos por ano.
 *
 * Com busca preenchida o ano é ignorado e a procura passa a ser em todo o
 * histórico — quem procura por um cliente raramente lembra o ano do contrato.
 */
const MAX_ROWS = 2000

export async function GET(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const sp = request.nextUrl.searchParams

    const search = (sp.get('search') ?? '').trim()
    const like = `%${search}%`

    const typeParam = (sp.get('type') ?? '').trim()
    const type = Object.prototype.hasOwnProperty.call(CONTRACT_TYPES, typeParam) ? typeParam : ''

    // 0 desliga o filtro de ano (usado quando há busca ativa)
    const parsedYear = Number.parseInt(sp.get('year') ?? '', 10)
    const year = search || !Number.isFinite(parsedYear) ? 0 : parsedYear

    const contracts = await sql`
      SELECT
        id, type, contract_number, customer_id, vehicle_id,
        customer_name, vehicle_label, total_value, contract_date, created_at
      FROM contracts
      WHERE store_id = ${storeId}
        AND (${type} = '' OR type = ${type})
        AND (${year} = 0 OR EXTRACT(YEAR FROM contract_date) = ${year})
        AND (
          ${search} = ''
          OR customer_name ILIKE ${like}
          OR vehicle_label ILIKE ${like}
          OR contract_number ILIKE ${like}
        )
      ORDER BY contract_date DESC, id DESC
      LIMIT ${MAX_ROWS}
    `

    return NextResponse.json({
      contracts: contracts.map((c) => ({
        ...c,
        total_value: Number(c.total_value) || 0,
      })),
      total: contracts.length,
    })
  } catch (error) {
    console.error('[v0] GET contracts error:', error)
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    if (body?.type && body.type !== 'venda') {
      const cfg = CONTRACT_TYPES[body.type as keyof typeof CONTRACT_TYPES]
      return NextResponse.json(
        { error: `${cfg?.label ?? 'Esse tipo de contrato'} ainda não está disponível.` },
        { status: 400 },
      )
    }

    // Rascunho: o usuário saiu do formulário no meio e optou por guardar o que
    // já preencheu. Aceita campos em branco; a validação estrita fica para
    // quando ele finalizar o contrato.
    const isDraft = body?.draft === true
    const data = isDraft ? saleDraftSchema.parse(body) : saleSchema.parse(body)
    const sql = neon(process.env.DATABASE_URL!)

    const { snapshot, customerName, vehicleLabel, vehicleIds } = await buildSaleSnapshot(
      sql,
      storeId,
      data,
    )

    if (!isDraft && !customerName) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }
    if (!isDraft && vehicleIds.length === 0) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    await rememberStoreDefaults(sql, storeId, snapshot.store)

    const prefix = CONTRACT_TYPES.venda.prefix

    // Numeração sequencial por loja/tipo. Em caso de corrida no índice único,
    // tenta novamente com o próximo número.
    let created: Record<string, unknown> | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const seqRows = await sql`
        SELECT COALESCE(MAX(NULLIF(regexp_replace(contract_number, '\\D', '', 'g'), '')::int), 0) AS last
        FROM contracts
        WHERE store_id = ${storeId} AND type = 'venda'
      `
      const next = Number(seqRows[0]?.last ?? 0) + 1 + attempt
      const contractNumber = `${prefix}-${String(next).padStart(4, '0')}`

      try {
        const rows = await sql`
          INSERT INTO contracts (
            store_id, type, contract_number, customer_id, vehicle_id,
            customer_name, vehicle_label, total_value, contract_date, data
          ) VALUES (
            ${storeId}, 'venda', ${contractNumber}, ${data.customer_id || null}, ${vehicleIds[0] ?? null},
            ${customerName}, ${vehicleLabel}, ${snapshot.negotiation.total_value},
            ${data.contract_date || todayIso()}, ${JSON.stringify(snapshot)}::jsonb
          )
          RETURNING id, type, contract_number, customer_name, vehicle_label, total_value, contract_date
        `
        created = rows[0]
        break
      } catch (err) {
        lastError = err
        const message = err instanceof Error ? err.message : ''
        if (!message.includes('idx_contracts_number_store')) throw err
      }
    }

    if (!created) {
      console.error('[v0] POST contract numbering failed:', lastError)
      return NextResponse.json({ error: 'Não foi possível gerar o número do contrato' }, { status: 500 })
    }

    return NextResponse.json(
      { ...created, total_value: Number(created.total_value) || 0 },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] POST contract error:', error)
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
