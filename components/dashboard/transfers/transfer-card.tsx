'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, CalendarClock, FileCheck2, Flag, MoreVertical, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  formatDateTime,
  revalidateTransfers,
  sendJson,
  todaySaoPaulo,
  vehicleTitle,
  type Transfer,
} from '@/lib/transfers'
import { ScheduleInspectionDialog } from './schedule-inspection-dialog'

type StepState = 'done' | 'current' | 'pending'

function Step({
  index,
  title,
  description,
  state,
  icon: Icon,
  children,
  last = false,
}: {
  index: number
  title: string
  description?: React.ReactNode
  state: StepState
  icon: typeof Check
  children?: React.ReactNode
  last?: boolean
}) {
  return (
    <li className="relative flex gap-3">
      {!last && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px',
            state === 'done' ? 'bg-emerald-500/60' : 'bg-border',
          )}
        />
      )}
      <span
        className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
          state === 'done' && 'border-emerald-500 bg-emerald-500 text-white',
          state === 'current' && 'border-primary bg-primary/10 text-primary',
          state === 'pending' && 'border-border bg-muted text-muted-foreground',
        )}
      >
        {state === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
        <span className="sr-only">
          {`Etapa ${index}: ${state === 'done' ? 'concluída' : state === 'current' ? 'atual' : 'pendente'}`}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pb-5">
        <div>
          <p className={cn('text-sm font-medium', state === 'pending' ? 'text-muted-foreground' : 'text-foreground')}>
            {title}
          </p>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        {children}
      </div>
    </li>
  )
}

export function TransferCard({ transfer: t }: { transfer: Transfer }) {
  const [pending, setPending] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const run = async (key: string, body: unknown, success: string) => {
    if (pending) return
    setPending(key)
    try {
      await sendJson(`/api/transfers/${t.id}`, 'PATCH', body)
      toast.success(success)
      await revalidateTransfers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setPending(null)
    }
  }

  const handleDelete = async () => {
    setPending('delete')
    try {
      await sendJson(`/api/transfers/${t.id}`, 'DELETE')
      toast.success('Veículo removido das transferências')
      await revalidateTransfers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
      setPending(null)
    }
  }

  const scheduled = Boolean(t.inspection_at)
  const canComplete = t.dut_done && scheduled
  const today = todaySaoPaulo()
  const inspectionDay = t.inspection_at?.split('T')[0]
  const inspectionToday = inspectionDay === today
  const inspectionPast = Boolean(inspectionDay && inspectionDay < today)
  const busy = pending !== null

  return (
    <article
      aria-label={`Transferência ${t.plate}`}
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-opacity',
        pending === 'delete' && 'opacity-50',
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              {t.plate}
            </span>
            <Badge variant={t.vehicle_status === 'vendido' ? 'secondary' : 'outline'} className="text-[10px]">
              {t.vehicle_status === 'vendido' ? 'Vendido' : 'Em estoque'}
            </Badge>
          </div>
          <h3 className="mt-1.5 truncate font-semibold text-foreground">{vehicleTitle(t)}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {[t.version, t.model_year, t.color].filter(Boolean).join(' · ') || 'Sem detalhes'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={busy}>
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Mais ações para {t.plate}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remover das transferências
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <ol className="flex-1">
        <Step
          index={1}
          title="DUT realizado"
          icon={FileCheck2}
          state={t.dut_done ? 'done' : 'current'}
          description={t.dut_done && t.dut_done_at ? `Marcado em ${formatDateTime(t.dut_done_at)}` : 'Assinatura e reconhecimento do DUT'}
        >
          <Button
            size="sm"
            variant={t.dut_done ? 'ghost' : 'default'}
            className={cn('h-8 w-fit gap-1.5', t.dut_done && 'text-muted-foreground')}
            disabled={busy}
            onClick={() =>
              run('dut', { action: 'dut', done: !t.dut_done }, t.dut_done ? 'DUT desmarcado' : 'DUT marcado como realizado')
            }
          >
            {pending === 'dut' ? <Spinner /> : t.dut_done ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {t.dut_done ? 'Desfazer' : 'Marcar DUT realizado'}
          </Button>
        </Step>

        <Step
          index={2}
          title="Agendamento de vistoria"
          icon={CalendarClock}
          state={scheduled ? 'done' : t.dut_done ? 'current' : 'pending'}
          description={
            scheduled ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">{formatDateTime(t.inspection_at)}</span>
                {inspectionToday && <Badge className="h-5 bg-amber-500 text-[10px] text-white hover:bg-amber-500">Hoje</Badge>}
                {inspectionPast && <Badge variant="outline" className="h-5 text-[10px]">Já passou</Badge>}
              </span>
            ) : (
              'Defina a data e o horário da vistoria'
            )
          }
        >
          <Button
            size="sm"
            variant={scheduled ? 'ghost' : t.dut_done ? 'default' : 'outline'}
            className={cn('h-8 w-fit gap-1.5', scheduled && 'text-muted-foreground')}
            disabled={busy}
            onClick={() => setScheduleOpen(true)}
          >
            {pending === 'schedule' ? <Spinner /> : <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
            {scheduled ? 'Alterar agendamento' : 'Agendar vistoria'}
          </Button>
        </Step>

        <Step
          index={3}
          last
          title="Concluir transferência"
          icon={Flag}
          state={canComplete ? 'current' : 'pending'}
          description={canComplete ? 'Tudo pronto para finalizar' : 'Disponível após o DUT e a vistoria'}
        />
      </ol>

      <Button
        className="mt-1 w-full gap-2"
        disabled={!canComplete || busy}
        onClick={() => run('complete', { action: 'complete' }, `Transferência de ${t.plate} concluída`)}
      >
        {pending === 'complete' ? <Spinner /> : <Flag className="h-4 w-4" aria-hidden="true" />}
        Marcar como concluída
      </Button>

      <ScheduleInspectionDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        plate={t.plate}
        initialValue={t.inspection_at}
        onSave={(inspectionAt) =>
          run(
            'schedule',
            { action: 'schedule', inspectionAt },
            inspectionAt ? 'Vistoria agendada' : 'Agendamento removido',
          )
        }
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {t.plate} das transferências?</AlertDialogTitle>
            <AlertDialogDescription>
              As etapas registradas serão apagadas. O veículo continua cadastrado normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
