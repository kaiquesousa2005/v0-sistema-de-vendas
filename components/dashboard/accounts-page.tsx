'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileDown, Loader2, Pencil, Plus, Printer, Trash2, Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Status = 'Pendente' | 'Pago' | 'Atrasado'
type Account = {
  id: number
  description: string
  category: string
  due_date: string
  amount: number | string
  status: Status
  payment_date: string | null
  notes: string | null
}
type Form = Omit<Account, 'id' | 'amount'> & { amount: string }
type CategoryGroup = { category: string; rows: Account[]; subtotal: number }

const categories = ['Veículos', 'Cartões', 'Casa', 'Loja', 'Impostos', 'Serviços', 'Pessoal', 'Outros']
const statuses: Status[] = ['Pendente', 'Pago', 'Atrasado']

const money = (value: number | string) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Formata "YYYY-MM-DD" (ou ISO completo) como "DD/MM/YYYY" sem depender de fuso horário. */
function formatDate(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—'
}

const monthName = (date: Date) =>
  format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^./, (c) => c.toUpperCase())

const firstDayOf = (month: number, year: number) => `${year}-${String(month).padStart(2, '0')}-01`

function groupByCategory(accounts: Account[]): CategoryGroup[] {
  const map = new Map<string, Account[]>()
  for (const account of accounts) {
    const key = account.category || 'Outros'
    map.set(key, [...(map.get(key) ?? []), account])
  }
  const order = (c: string) => {
    const index = categories.indexOf(c)
    return index === -1 ? categories.length : index
  }
  return [...map.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([category, rows]) => ({
      category,
      rows,
      subtotal: rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    }))
}

async function fetchAccounts(month: number, year: number) {
  const response = await fetch(`/api/accounts?month=${month}&year=${year}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar contas')
  return data as { accounts: Account[]; totals: { total: number; paid: number; pending: number } }
}

function AccountsSheet({ groups, month, year, total }: { groups: CategoryGroup[]; month: number; year: number; total: number }) {
  return (
    <div className="accounts-sheet w-[794px] bg-white p-10 text-slate-900">
      <img src="/images/contract-header.png" alt="MCar Veículos" className="mb-7 h-auto w-full" />
      <h1 className="text-center text-xl font-bold uppercase">Contas a pagar</h1>
      <p className="mb-6 text-center text-sm">Demonstrativo de {monthName(new Date(year, month - 1, 1))}</p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">Descrição</th>
            <th className="border p-2 text-left">Vencimento</th>
            <th className="border p-2 text-left">Situação</th>
            <th className="border p-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.category}>
              <tr className="bg-slate-200">
                <td colSpan={3} className="border p-2 font-bold uppercase">{group.category}</td>
                <td className="border p-2 text-right font-bold">{money(group.subtotal)}</td>
              </tr>
              {group.rows.map((a) => (
                <tr key={a.id}>
                  <td className="border p-2">{a.description}</td>
                  <td className="border p-2">{formatDate(a.due_date)}</td>
                  <td className="border p-2">{a.status}</td>
                  <td className="border p-2 text-right">{money(a.amount)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border p-3 text-right font-bold">TOTAL DO MÊS</td>
            <td className="border p-3 text-right font-bold">{money(total)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-24 grid grid-cols-2 gap-20 text-center text-xs">
        <div className="border-t pt-2">RESPONSÁVEL PELO PAGAMENTO</div>
        <div className="border-t pt-2">CONFERÊNCIA</div>
      </div>
    </div>
  )
}

function CopyPreviousMonthDialog({
  open, onOpenChange, month, year, onCopied,
}: { open: boolean; onOpenChange: (open: boolean) => void; month: number; year: number; onCopied: () => void }) {
  const previous = new Date(year, month - 2, 1)
  const prevMonth = previous.getMonth() + 1
  const prevYear = previous.getFullYear()
  const [items, setItems] = useState<Account[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchAccounts(prevMonth, prevYear)
      .then((data) => {
        if (cancelled) return
        setItems(data.accounts || [])
        setSelected(new Set((data.accounts || []).map((a) => a.id)))
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar mês anterior'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [open, prevMonth, prevYear])

  const groups = useMemo(() => groupByCategory(items), [items])
  const allSelected = items.length > 0 && selected.size === items.length
  const selectedTotal = items.filter((a) => selected.has(a.id)).reduce((s, a) => s + Number(a.amount || 0), 0)

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleCategory = (group: CategoryGroup, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      group.rows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)))
      return next
    })

  const copy = async () => {
    setCopying(true)
    try {
      const response = await fetch('/api/accounts/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], month, year }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      toast.success(
        `${data.copied} conta(s) importada(s)` + (data.skipped ? ` • ${data.skipped} já existiam neste mês` : ''),
      )
      onOpenChange(false)
      onCopied()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar contas')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar contas de {monthName(previous)}</DialogTitle>
          <DialogDescription>
            Selecione as contas que se repetem. Elas serão criadas em {monthName(new Date(year, month - 1, 1))} como
            &quot;Pendente&quot;, mantendo o dia do vencimento.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada no mês anterior.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => setSelected(checked ? new Set(items.map((a) => a.id)) : new Set())}
              />
              Selecionar todas ({items.length})
            </label>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
              {groups.map((group) => {
                const groupChecked = group.rows.every((r) => selected.has(r.id))
                return (
                  <div key={group.category} className="border-b last:border-b-0">
                    <label className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-2 text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        <Checkbox checked={groupChecked} onCheckedChange={(c) => toggleCategory(group, c === true)} />
                        {group.category}
                      </span>
                      <span>{money(group.subtotal)}</span>
                    </label>
                    {group.rows.map((a) => (
                      <label key={a.id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/30">
                        <span className="flex min-w-0 items-center gap-2 pl-4">
                          <Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                          <span className="truncate">{a.description}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">venc. {formatDate(a.due_date)}</span>
                        </span>
                        <span className="shrink-0 font-medium">{money(a.amount)}</span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size} selecionada(s) • {money(selectedTotal)}
          </span>
          <Button onClick={copy} disabled={copying || selected.size === 0}>
            {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Importar selecionadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AccountFormDialog({
  open, onOpenChange, editing, initial, onSaved,
}: { open: boolean; onOpenChange: (open: boolean) => void; editing: Account | null; initial: Form; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(initial) }, [open, initial])

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount), payment_date: form.payment_date || null }
      const response = await fetch(editing ? `/api/accounts/${editing.id}` : '/api/accounts', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      toast.success(editing ? 'Conta atualizada' : 'Conta cadastrada')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar conta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="acc-description">Descrição</Label>
            <Input id="acc-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Parcela Strada 2018" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-amount">Valor</Label>
              <CurrencyInput id="acc-amount" value={form.amount} onValueChange={(amount) => setForm({ ...form, amount })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="acc-due">Vencimento</Label>
              <Input id="acc-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(status: Status) => setForm({ ...form, status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acc-paid">Data de pagamento</Label>
            <Input id="acc-paid" type="date" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value || null })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="acc-notes">Observações</Label>
            <Textarea id="acc-notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button onClick={save} disabled={saving || !form.description || !form.amount || !form.due_date}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {editing ? 'Salvar alterações' : 'Cadastrar conta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AccountsPage() {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [accounts, setAccounts] = useState<Account[]>([])
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0 })
  const [editing, setEditing] = useState<Account | null>(null)
  const [initialForm, setInitialForm] = useState<Form | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'pdf' | 'print' | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const month = cursor.getMonth() + 1
  const year = cursor.getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAccounts(month, year)
      setAccounts(data.accounts || [])
      setTotals(data.totals || { total: 0, paid: 0, pending: 0 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const groups = useMemo(() => groupByCategory(accounts), [accounts])

  const openNew = () => {
    setEditing(null)
    setInitialForm({ description: '', category: 'Outros', due_date: firstDayOf(month, year), amount: '', status: 'Pendente', payment_date: null, notes: '' })
    setFormOpen(true)
  }

  const openEdit = (a: Account) => {
    setEditing(a)
    setInitialForm({
      description: a.description,
      category: a.category,
      due_date: a.due_date.slice(0, 10),
      amount: Number(a.amount || 0).toFixed(2),
      status: a.status,
      payment_date: a.payment_date?.slice(0, 10) || null,
      notes: a.notes || '',
    })
    setFormOpen(true)
  }

  const remove = async (a: Account) => {
    if (!confirm(`Excluir a conta "${a.description}"?`)) return
    const response = await fetch(`/api/accounts/${a.id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Conta excluída')
      load()
    } else toast.error('Não foi possível excluir')
  }

  const runSheet = async (mode: 'pdf' | 'print') => {
    const node = sheetRef.current?.querySelector<HTMLElement>('.accounts-sheet')
    if (!node) return
    setExporting(mode)
    try {
      const { downloadContractPdf, printContractPdf } = await import('@/lib/contract-pdf')
      if (mode === 'pdf') await downloadContractPdf(node, `Contas a pagar - ${monthName(cursor)}`)
      else await printContractPdf(node)
    } catch {
      toast.error('Não foi possível gerar o PDF')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-balance">Contas a pagar</h1>
          <p className="text-muted-foreground">Organize vencimentos, pagamentos e despesas do mês.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => runSheet('pdf')} disabled={!!exporting || !accounts.length}>
            {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Baixar PDF
          </Button>
          <Button variant="outline" onClick={() => runSheet('print')} disabled={!!exporting || !accounts.length}>
            {exporting === 'print' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimir
          </Button>
          <Button variant="outline" onClick={() => setCopyOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Importar mês anterior
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
        <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(year, month - 2, 1))} aria-label="Mês anterior">
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          {monthName(cursor)}
        </div>
        <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(year, month, 1))} aria-label="Próximo mês">
          <ChevronRight />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do mês</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(totals.total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pago</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">{money(totals.paid)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">{money(totals.pending)}</CardContent>
        </Card>
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Total por categoria">
          {groups.map((g) => (
            <div key={g.category} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">{g.category}</span>
              <span className="font-semibold">{money(g.subtotal)}</span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Wallet className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Nenhuma conta cadastrada neste mês.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setCopyOpen(true)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Importar do mês anterior
                </Button>
                <Button onClick={openNew}>Cadastrar conta</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-left">Vencimento</th>
                    <th className="p-3 text-left">Valor</th>
                    <th className="p-3 text-left">Situação</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.category}>
                      <tr className="border-t bg-primary/10">
                        <td colSpan={2} className="p-3 font-semibold">
                          {group.category}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{group.rows.length} conta(s)</span>
                        </td>
                        <td colSpan={3} className="p-3 font-semibold">{money(group.subtotal)}</td>
                      </tr>
                      {group.rows.map((a) => (
                        <tr key={a.id} className="border-t">
                          <td className="p-3 pl-6 font-medium">
                            {a.description}
                            {a.notes && <p className="text-xs font-normal text-muted-foreground">{a.notes}</p>}
                          </td>
                          <td className="p-3">{formatDate(a.due_date)}</td>
                          <td className="p-3 font-semibold">{money(a.amount)}</td>
                          <td className="p-3">
                            <Badge variant={a.status === 'Pago' ? 'default' : a.status === 'Atrasado' ? 'destructive' : 'secondary'}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(a)} aria-label={`Editar ${a.description}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(a)} aria-label={`Excluir ${a.description}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {initialForm && (
        <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} initial={initialForm} onSaved={load} />
      )}
      <CopyPreviousMonthDialog open={copyOpen} onOpenChange={setCopyOpen} month={month} year={year} onCopied={load} />

      <div ref={sheetRef} aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <AccountsSheet groups={groups} month={month} year={year} total={totals.total} />
      </div>
    </div>
  )
}
