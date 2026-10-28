'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Cake, Car, CheckCircle2, Circle, Edit, Loader2, MessageCircle, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { whatsappLink } from '@/components/dashboard/birthday-banner'

type ReminderStatus = 'aberto' | 'finalizado'
type StatusFilter = 'todos' | ReminderStatus

interface Reminder {
  id: number
  description: string
  status: ReminderStatus
  created_at: string
  finished_at: string | null
  vehicle_name: string
  vehicle_plate: string
}

interface UpcomingBirthday {
  id: number
  full_name: string
  phone: string | null
  next_birthday: string
  days_until: number
  turning_age: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados')
  return data
}

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function birthdayLabel(days: number) {
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `Em ${days} dias`
}

export function RemindersPage() {
  const [filter, setFilter] = useState<StatusFilter>('aberto')
  const remindersKey = `/api/reminders${filter === 'todos' ? '' : `?status=${filter}`}`
  const { data, isLoading, mutate } = useSWR<{ reminders: Reminder[] }>(remindersKey, fetcher)
  const { data: bdays, isLoading: loadingBdays } = useSWR<{ birthdays: UpcomingBirthday[] }>(
    '/api/customers/upcoming-birthdays?limit=3',
    fetcher,
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Reminder | null>(null)
  const [vehicleName, setVehicleName] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const reminders = data?.reminders ?? []

  const openNew = () => {
    setEditing(null)
    setVehicleName('')
    setVehiclePlate('')
    setDescription('')
    setDialogOpen(true)
  }

  const openEdit = (r: Reminder) => {
    setEditing(r)
    setVehicleName(r.vehicle_name)
    setVehiclePlate(r.vehicle_plate)
    setDescription(r.description)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleName.trim()) return toast.error('Informe o nome do veículo')
    if (!vehiclePlate.trim()) return toast.error('Informe a placa')
    if (!description.trim()) return toast.error('Descreva o lembrete')

    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/reminders/${editing.id}` : '/api/reminders', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleName: vehicleName.trim(),
          vehiclePlate: vehiclePlate.trim(),
          description: description.trim(),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao salvar lembrete')
      toast.success(editing ? 'Lembrete atualizado' : 'Lembrete criado')
      setDialogOpen(false)
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar lembrete')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (r: Reminder) => {
    const next: ReminderStatus = r.status === 'aberto' ? 'finalizado' : 'aberto'
    try {
      const res = await fetch(`/api/reminders/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(next === 'finalizado' ? 'Tarefa finalizada' : 'Tarefa reaberta')
      mutate()
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'Erro ao atualizar lembrete')
    }
  }

  const handleDelete = async (r: Reminder) => {
    if (!confirm('Excluir este lembrete?')) return
    try {
      const res = await fetch(`/api/reminders/${r.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Lembrete excluído')
      mutate()
    } catch {
      toast.error('Erro ao excluir lembrete')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4" aria-labelledby="reminders-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filtrar lembretes" className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
            {([
              ['aberto', 'Em aberto'],
              ['finalizado', 'Finalizados'],
              ['todos', 'Todos'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={openNew} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo lembrete
          </Button>
        </div>

        <h2 id="reminders-title" className="sr-only">Lembretes de veículos</h2>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando lembretes...</span>
          </div>
        ) : reminders.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === 'aberto' ? 'Nenhuma tarefa em aberto.' : 'Nenhum lembrete encontrado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {reminders.map((r) => {
              const done = r.status === 'finalizado'
              return (
                <li key={r.id}>
                  <Card className={`gap-0 py-4 ${done ? 'opacity-70' : ''}`}>
                    <CardContent className="flex gap-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(r)}
                        aria-label={done ? 'Reabrir tarefa' : 'Finalizar tarefa'}
                        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <Car className="h-4 w-4" />
                            {r.vehicle_name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">{r.vehicle_plate}</span>
                          <Badge
                            variant="outline"
                            className={
                              done
                                ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
                                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }
                          >
                            {done ? 'Finalizada' : 'Em aberto'}
                          </Badge>
                        </div>
                        <p className={`whitespace-pre-wrap text-sm ${done ? 'text-muted-foreground line-through' : ''}`}>
                          {r.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {formatDate(r.created_at)}
                          {r.finished_at && ` • Finalizado em ${formatDate(r.finished_at)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleStatus(r)} aria-label={done ? 'Reabrir' : 'Finalizar'}>
                          {done ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)} aria-label="Editar lembrete">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(r)} aria-label="Excluir lembrete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <aside aria-labelledby="birthdays-title">
        <Card className="gap-4 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle id="birthdays-title" className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-primary" />
              Próximos aniversários
            </CardTitle>
            <CardDescription>Lembre de mandar os parabéns no WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingBdays ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : !bdays?.birthdays.length ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente com data de nascimento cadastrada.</p>
            ) : (
              bdays.birthdays.map((b) => {
                const link = whatsappLink(b.phone, b.full_name)
                const isToday = b.days_until === 0
                return (
                  <div
                    key={b.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${isToday ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center leading-none">
                      <span className="text-sm font-bold tabular-nums">{b.next_birthday.slice(8, 10)}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {new Date(`${b.next_birthday}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className={isToday ? 'font-semibold text-primary' : ''}>{birthdayLabel(b.days_until)}</span>
                        {' • '}
                        {b.turning_age} anos
                      </p>
                    </div>
                    {link ? (
                      <Button asChild size="icon" variant={isToday ? 'default' : 'outline'} className="h-8 w-8 shrink-0">
                        <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Enviar parabéns para ${b.full_name} no WhatsApp`}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </aside>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar lembrete' : 'Novo lembrete'}</DialogTitle>
            <DialogDescription>Informe o veículo e descreva o que precisa ser feito.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <label htmlFor="reminder-vehicle-name" className="text-sm font-medium">Veículo *</label>
                <Input
                  id="reminder-vehicle-name"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="Ex.: Honda Civic EXL"
                  maxLength={150}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reminder-vehicle-plate" className="text-sm font-medium">Placa *</label>
                <Input
                  id="reminder-vehicle-plate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="ABC1D23"
                  maxLength={20}
                  className="font-mono uppercase"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reminder-description" className="text-sm font-medium">Descrição *</label>
              <Textarea
                id="reminder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Levar para polimento, trocar pneus dianteiros, buscar documento no despachante..."
                rows={4}
                maxLength={2000}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
