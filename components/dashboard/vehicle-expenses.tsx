'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, AlertTriangle, History,
} from 'lucide-react'
import Header from '@/components/dashboard/header'

const CATEGORIES = [
  'Bancos',
  'Peças/Acessorio',
  'Serviço Mecanico',
  'Serviço Eletrico',
  'Pintura',
  'Polimento',
  'IPVA',
  'Documentação',
  'Combustivel',
  'Outros',
] as const

type Category = typeof CATEGORIES[number]

interface Expense {
  id: number
  description: string
  category: Category
  value: number
  date: string
}

interface DeletedExpense extends Expense {
  deleted_at: string
  deleted_reason: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Bancos':            'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  'Peças/Acessorio':   'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  'Serviço Mecanico':  'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-800',
  'Serviço Eletrico':  'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  'Pintura':           'bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800',
  'Polimento':         'bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800',
  'IPVA':              'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  'Documentação':      'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800',
  'Combustivel':       'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  'Outros':            'bg-gray-500/10 text-gray-500 border-gray-200 dark:border-gray-700',
}

const emptyForm = { description: '', category: 'Outros' as Category, value: '', date: '' }

export function VehicleExpenses({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState<string>('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [deletedExpenses, setDeletedExpenses] = useState<DeletedExpense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add dialog
  const [addDialog, setAddDialog] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  // Deleted history modal
  const [historyDialog, setHistoryDialog] = useState(false)

  const fetchExpenses = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles/${id}/expenses`)
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.map((e: Expense) => ({ ...e, value: Number(e.value) })))
      }
    } catch (e) {
      console.error('[v0] fetch expenses error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDeleted = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles/${id}/expenses/deleted`)
      if (res.ok) {
        const data = await res.json()
        setDeletedExpenses(data.map((e: DeletedExpense) => ({ ...e, value: Number(e.value) })))
      }
    } catch (e) {
      console.error('[v0] fetch deleted error:', e)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { id } = await params
      setVehicleId(id)
      fetchExpenses(id)
      fetchDeleted(id)
    }
    init()
  }, [params, fetchExpenses, fetchDeleted])

  // --- ADD ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.value || !form.category) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          value: parseFloat(form.value),
          date: form.date || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Gasto adicionado com sucesso')
        setAddDialog(false)
        setForm(emptyForm)
        fetchExpenses(vehicleId)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao adicionar gasto')
      }
    } catch {
      toast.error('Erro ao adicionar gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- EDIT ---
  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditForm({
      description: expense.description,
      category: expense.category,
      value: String(expense.value),
      date: expense.date ? expense.date.split('T')[0] : '',
    })
    setEditDialog(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          category: editForm.category,
          value: parseFloat(editForm.value),
          date: editForm.date || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Gasto atualizado com sucesso')
        setEditDialog(false)
        setEditingExpense(null)
        fetchExpenses(vehicleId)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao editar gasto')
      }
    } catch {
      toast.error('Erro ao editar gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- DELETE ---
  const handleOpenDelete = (expense: Expense) => {
    setDeletingExpense(expense)
    setDeleteReason('')
    setDeleteDialog(true)
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deletingExpense) return
    if (!deleteReason.trim()) {
      toast.error('Informe o motivo da exclusão')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      })
      if (res.ok) {
        toast.success('Gasto excluído com sucesso')
        setDeleteDialog(false)
        setDeletingExpense(null)
        setDeleteReason('')
        fetchExpenses(vehicleId)
        fetchDeleted(vehicleId)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao excluir gasto')
      }
    } catch {
      toast.error('Erro ao excluir gasto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.value), 0)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  const formatCurrency = (val: number) =>
    `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-4xl">

        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gastos do Veículo</h1>
            <p className="text-sm text-muted-foreground">Gerencie os gastos deste veículo</p>
          </div>
        </div>

        {/* Summary bar */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Gastos</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(total)}</p>
            </div>
            <Button onClick={() => setAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Gasto
            </Button>
          </CardContent>
        </Card>

        {/* Expense list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="font-medium">Nenhum gasto cadastrado</p>
            <p className="text-sm mt-1">Clique em "Adicionar Gasto" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS['Outros']}`}>
                          {expense.category}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                      </div>
                      <p className="font-medium truncate">{expense.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-destructive whitespace-nowrap">
                        {formatCurrency(Number(expense.value))}
                      </span>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => handleOpenEdit(expense)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleOpenDelete(expense)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Deleted history trigger */}
        {deletedExpenses.length > 0 && (
          <button
            onClick={() => setHistoryDialog(true)}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-destructive/40 text-sm text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <History className="w-4 h-4" />
            {deletedExpenses.length} item{deletedExpenses.length > 1 ? 's' : ''} excluído{deletedExpenses.length > 1 ? 's' : ''} — clique para visualizar
          </button>
        )}
      </main>

      {/* ADD DIALOG */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria *</label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <Input
                placeholder="Ex: Troca de óleo"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$) *</label>
              <Input
                type="number" step="0.01" min="0.01" placeholder="0,00"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data</label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria *</label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v as Category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição *</label>
              <Input
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$) *</label>
              <Input
                type="number" step="0.01" min="0.01"
                value={editForm.value}
                onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data</label>
              <Input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir Gasto
            </DialogTitle>
          </DialogHeader>
          {deletingExpense && (
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Categoria:</span> {deletingExpense.category}</p>
                <p><span className="font-medium">Descrição:</span> {deletingExpense.description}</p>
                <p><span className="font-medium">Valor:</span> {formatCurrency(Number(deletingExpense.value))}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Motivo da exclusão *</label>
                <Input
                  placeholder="Informe o motivo..."
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Excluir
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* HISTORY DIALOG */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Itens Excluídos ({deletedExpenses.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {deletedExpenses.map((exp) => (
              <div key={exp.id} className="rounded-lg border border-destructive/20 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[exp.category] ?? CATEGORY_COLORS['Outros']}`}>
                    {exp.category}
                  </span>
                  <span className="text-sm font-bold text-destructive">{formatCurrency(Number(exp.value))}</span>
                </div>
                <p className="text-sm font-medium">{exp.description}</p>
                <div className="rounded bg-muted px-3 py-2 text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Motivo: </span>{exp.deleted_reason}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Excluído em: </span>
                    {new Date(exp.deleted_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
