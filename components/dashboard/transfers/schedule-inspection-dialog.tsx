'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { todaySaoPaulo } from '@/lib/transfers'

function ScheduleForm({
  plate,
  initialValue,
  onCancel,
  onSave,
}: {
  plate: string
  initialValue: string | null
  onCancel: () => void
  onSave: (value: string | null) => void
}) {
  const [date, setDate] = useState(initialValue?.split('T')[0] ?? '')
  const [time, setTime] = useState(initialValue?.split('T')[1]?.slice(0, 5) ?? '')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Informe a data da vistoria')
    if (!/^\d{2}:\d{2}$/.test(time)) return setError('Informe o horário da vistoria')
    onSave(`${date}T${time}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Agendamento de vistoria</DialogTitle>
        <DialogDescription>Informe quando a vistoria do veículo {plate} foi agendada.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="inspection-date">Data</Label>
          <Input
            id="inspection-date"
            type="date"
            value={date}
            min={initialValue ? undefined : todaySaoPaulo()}
            onChange={(e) => {
              setDate(e.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error) && !date}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="inspection-time">Horário</Label>
          <Input
            id="inspection-time"
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value)
              setError('')
            }}
            aria-invalid={Boolean(error) && !time}
            required
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {initialValue ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => onSave(null)}>
            Remover agendamento
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </DialogFooter>
    </form>
  )
}

export function ScheduleInspectionDialog({
  open,
  onOpenChange,
  plate,
  initialValue,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plate: string
  initialValue: string | null
  onSave: (value: string | null) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ScheduleForm
            plate={plate}
            initialValue={initialValue}
            onCancel={() => onOpenChange(false)}
            onSave={(value) => {
              onOpenChange(false)
              onSave(value)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
