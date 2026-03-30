'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'

interface Expense {
  id: number
  description: string
  value: number
  date: string
}

interface Vehicle {
  id: number
  plate: string
  brand: string
  model: string
}

export function VehicleExpenses({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState<string>('')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    const init = async () => {
      const { id } = await params
      setVehicleId(id)
      await fetchVehicleAndExpenses(id)
    }
    init()
  }, [params])

  const fetchVehicleAndExpenses = async (id: string) => {
    try {
      const vehicleRes = await fetch(`/api/vehicles/${id}`)
      if (vehicleRes.ok) {
        setVehicle(await vehicleRes.json())
      }

      const expensesRes = await fetch(`/api/vehicles/${id}/expenses`)
      if (expensesRes.ok) {
        setExpenses(await expensesRes.json())
      }
    } catch (error) {
      console.error('[v0] Fetch error:', error)
      toast.error('Erro ao buscar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
        }),
      })

      if (response.ok) {
        toast.success('Gasto adicionado')
        setFormData({ description: '', value: '', date: new Date().toISOString().split('T')[0] })
        setOpenDialog(false)
        await fetchVehicleAndExpenses(vehicleId)
      } else {
        toast.error('Erro ao adicionar gasto')
      }
    } catch (error) {
      console.error('[v0] Submit error:', error)
      toast.error('Erro ao adicionar gasto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (expenseId: number) => {
    if (!confirm('Tem certeza que deseja deletar este gasto?')) return

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/expenses/${expenseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Gasto deletado')
        await fetchVehicleAndExpenses(vehicleId)
      } else {
        toast.error('Erro ao deletar gasto')
      }
    } catch (error) {
      console.error('[v0] Delete error:', error)
      toast.error('Erro ao deletar gasto')
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      {vehicle && (
        <Card>
          <CardHeader>
            <CardTitle>{vehicle.brand} {vehicle.model} - {vehicle.plate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Total de Gastos: <span className="text-primary">R$ {totalExpenses.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setOpenDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Gasto
        </Button>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Valor</label>
              <Input type="number" step="0.01" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-muted-foreground">{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold">R$ {expense.value.toFixed(2)}</div>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(expense.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Nenhum gasto registrado. Adicione um novo gasto.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
