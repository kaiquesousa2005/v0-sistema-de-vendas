'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, TrendingUp, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Vehicle {
  id: number
  type: string
  plate: string
  brand: string
  model: string
  version?: string
  manufacture_year: number
  model_year: number
  purchase_value: number
  renavam: string
  chassis: string
  status: string
}

export function VehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    type: 'carro',
    plate: '',
    brand: '',
    model: '',
    version: '',
    manufacture_year: new Date().getFullYear(),
    model_year: new Date().getFullYear(),
    purchase_value: '',
    renavam: '',
    chassis: '',
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles')
      if (response.ok) {
        const data = await response.json()
        const normalized = data
          .filter((v: Vehicle) => v.status !== 'vendido')
          .map((v: Vehicle) => ({
            ...v,
            purchase_value: Number(v.purchase_value) || 0,
            manufacture_year: Number(v.manufacture_year),
            model_year: Number(v.model_year),
          }))
        setVehicles(normalized)
      } else {
        toast.error('Erro ao buscar veículos')
      }
    } catch (error) {
      console.error('[v0] Fetch vehicles error:', error)
      toast.error('Erro ao buscar veículos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingId(vehicle.id)
      setFormData({
        type: vehicle.type,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version || '',
        manufacture_year: vehicle.manufacture_year,
        model_year: vehicle.model_year,
        purchase_value: vehicle.purchase_value.toString(),
        renavam: vehicle.renavam,
        chassis: vehicle.chassis,
      })
    } else {
      setEditingId(null)
      setFormData({
        type: 'carro',
        plate: '',
        brand: '',
        model: '',
        version: '',
        manufacture_year: new Date().getFullYear(),
        model_year: new Date().getFullYear(),
        purchase_value: '',
        renavam: '',
        chassis: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        purchase_value: parseFloat(formData.purchase_value),
        manufacture_year: parseInt(formData.manufacture_year.toString()),
        model_year: parseInt(formData.model_year.toString()),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingId ? 'Veículo atualizado' : 'Veículo adicionado')
        setOpenDialog(false)
        fetchVehicles()
      } else {
        toast.error('Erro ao salvar veículo')
      }
    } catch (error) {
      console.error('[v0] Submit error:', error)
      toast.error('Erro ao salvar veículo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return

    try {
      const response = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Veículo excluído')
        fetchVehicles()
      } else {
        toast.error('Erro ao excluir veículo')
      }
    } catch (error) {
      console.error('[v0] Delete error:', error)
      toast.error('Erro ao excluir veículo')
    }
  }

  const handleMarkAsSold = async (id: number, purchaseValue: number) => {
    const saleValue = prompt('Qual foi o valor de venda?', purchaseValue.toString())
    if (!saleValue) return

    try {
      const response = await fetch('/api/vehicles/sold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: id, saleValue: parseFloat(saleValue) }),
      })

      if (response.ok) {
        toast.success('Veículo marcado como vendido')
        fetchVehicles()
      } else {
        toast.error('Erro ao marcar como vendido')
      }
    } catch (error) {
      console.error('[v0] Mark as sold error:', error)
      toast.error('Erro ao marcar como vendido')
    }
  }

  if (isLoading && vehicles.length === 0) {
    return <div className="text-center">Carregando veículos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()} gap-2>
          <Plus className="w-4 h-4" />
          Adicionar Veículo
        </Button>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Placa</label>
                <Input value={formData.plate} onChange={(e) => setFormData({...formData, plate: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Marca</label>
                <Input value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Modelo</label>
                <Input value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Versão</label>
                <Input value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Ano Fabricação</label>
                <Input type="number" value={formData.manufacture_year} onChange={(e) => setFormData({...formData, manufacture_year: parseInt(e.target.value)})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Ano Modelo</label>
                <Input type="number" value={formData.model_year} onChange={(e) => setFormData({...formData, model_year: parseInt(e.target.value)})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Valor Compra</label>
                <Input type="number" step="0.01" value={formData.purchase_value} onChange={(e) => setFormData({...formData, purchase_value: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium">RENAVAN</label>
                <Input value={formData.renavam} onChange={(e) => setFormData({...formData, renavam: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium">Chassis</label>
                <Input value={formData.chassis} onChange={(e) => setFormData({...formData, chassis: e.target.value})} required />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{vehicle.brand} {vehicle.model}</CardTitle>
                  <CardDescription>{vehicle.plate}</CardDescription>
                </div>
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {vehicle.type}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Versão:</span> {vehicle.version || 'N/A'}</p>
                <p><span className="font-medium">Anos:</span> {vehicle.manufacture_year}/{vehicle.model_year}</p>
                <p><span className="font-medium">Valor:</span> R$ {(Number(vehicle.purchase_value) || 0).toFixed(2)}</p>
                <p><span className="font-medium">RENAVAN:</span> {vehicle.renavam}</p>
                <p><span className="font-medium">Chassis:</span> {vehicle.chassis}</p>
              </div>
              <div className="flex gap-2 pt-3 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(vehicle)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Link href={`/veiculos/${vehicle.id}/gastos`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">
                    <FileText className="w-4 h-4 mr-1" />
                    Gastos
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => handleMarkAsSold(vehicle.id, Number(vehicle.purchase_value) || 0)}>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Vendido
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(vehicle.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Deletar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {vehicles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Nenhum veículo em estoque. Adicione um novo veículo para começar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
