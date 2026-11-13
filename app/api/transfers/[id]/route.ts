import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import { getStoreId } from '@/lib/store-auth'

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dut'), done: z.boolean() }),
  z.object({
    action: z.literal('schedule'),
    inspectionAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Informe data e horário válidos')
      .nullable(),
  }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('reopen') }),
  z.object({ action: z.literal('notes'), notes: z.string().trim().max(1000) }),
])

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string) {
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const body = parsed.data

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const current = await sql`
      SELECT dut_done, inspection_at, status FROM vehicle_transfers WHERE id = ${id} AND store_id = ${storeId}
    `
    if (current.length === 0) return NextResponse.json({ error: 'Transferência não encontrada' }, { status: 404 })
    const row = current[0]

    if (body.action === 'complete' && (!row.dut_done || !row.inspection_at)) {
      return NextResponse.json(
        { error: 'Conclua o DUT e agende a vistoria antes de finalizar' },
        { status: 422 },
      )
    }
    if (row.status === 'concluido' && body.action !== 'reopen' && body.action !== 'notes') {
      return NextResponse.json({ error: 'Reabra a transferência para alterar as etapas' }, { status: 422 })
    }

    let updated
    switch (body.action) {
      case 'dut':
        updated = await sql`
          UPDATE vehicle_transfers SET
            dut_done = ${body.done},
            dut_done_at = CASE WHEN ${body.done} THEN NOW() ELSE NULL END,
            status = CASE WHEN ${body.done} OR inspection_at IS NOT NULL THEN 'em_processo' ELSE 'nao_transferido' END,
            updated_at = NOW()
          WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
        break
      case 'schedule':
        updated = await sql`
          UPDATE vehicle_transfers SET
            inspection_at = ${body.inspectionAt}::timestamp,
            status = CASE WHEN dut_done OR ${body.inspectionAt}::timestamp IS NOT NULL THEN 'em_processo' ELSE 'nao_transferido' END,
            updated_at = NOW()
          WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
        break
      case 'complete':
        updated = await sql`
          UPDATE vehicle_transfers SET status = 'concluido', completed_at = NOW(), updated_at = NOW()
          WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
        break
      case 'reopen':
        updated = await sql`
          UPDATE vehicle_transfers SET
            completed_at = NULL,
            status = CASE WHEN dut_done OR inspection_at IS NOT NULL THEN 'em_processo' ELSE 'nao_transferido' END,
            updated_at = NOW()
          WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
        break
      case 'notes':
        updated = await sql`
          UPDATE vehicle_transfers SET notes = ${body.notes || null}, updated_at = NOW()
          WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
        break
    }
    return NextResponse.json({ id: updated?.[0]?.id ?? id })
  } catch (error) {
    console.error('[v0] PATCH transfer error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar transferência' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const storeId = await getStoreId(request)
  if (!storeId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const deleted = await sql`DELETE FROM vehicle_transfers WHERE id = ${id} AND store_id = ${storeId} RETURNING id`
    if (deleted.length === 0) return NextResponse.json({ error: 'Transferência não encontrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] DELETE transfer error:', error)
    return NextResponse.json({ error: 'Erro ao remover transferência' }, { status: 500 })
  }
}
