'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, TrendingUp, FileText, Loader2, Car, Bike } from 'lucide-react'
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

const emptyForm = {
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
}

export function VehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Dialog de criar/editar
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  // Dialog de marcar como vendido
  const [soldDialog, setSoldDialog] = useState(false)
  const [soldVehicle, setSoldVehicle] = useState<Vehicle | null>(null)
  const [saleValue, setSaleValue] = useState('')
  const [isMarkingSold, setIsMarkingSold] = useState(false)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/vehicles')
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao buscar veículos')
        return
      }
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
    } catch (error) {
      console.error('[v0] fetchVehicles error:', error)
      toast.error('Erro de conexão ao buscar veículos')
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
      setFormData(emptyForm)
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const purchaseVal = parseFloat(formData.purchase_value)
    if (isNaN(purchaseVal) || purchaseVal <= 0) {
      toast.error('Valor de compra deve ser maior que zero')
      return
    }

    setIsSaving(true)
    try {
      const url = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles'
      const method = editingId ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        purchase_value: purchaseVal,
        manufacture_year: parseInt(formData.manufacture_year.toString()),
        model_year: parseInt(formData.model_year.toString()),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar veículo')
        return
      }

      toast.success(editingId ? 'Veículo atualizado com sucesso' : 'Veículo adicionado com sucesso')
      setOpenDialog(false)
      fetchVehicles()
    } catch (error) {
      console.error('[v0] handleSubmit error:', error)
      toast.error('Erro de conexão ao salvar veículo')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`Tem certeza que deseja excluir o veículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`)) return

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir veículo')
        return
      }
      toast.success('Veículo excluído com sucesso')
      fetchVehicles()
    } catch (error) {
      console.error('[v0] handleDelete error:', error)
      toast.error('Erro de conexão ao excluir veículo')
    }
  }

  const handleOpenSoldDialog = (vehicle: Vehicle) => {
    setSoldVehicle(vehicle)
    setSaleValue(vehicle.purchase_value.toString())
    setSoldDialog(true)
  }

  const handleMarkAsSold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!soldVehicle) return

    const saleVal = parseFloat(saleValue)
    if (isNaN(saleVal) || saleVal <= 0) {
      toast.error('Informe um valor de venda válido maior que zero')
      return
    }

    setIsMarkingSold(true)
    try {
      const response = await fetch('/api/vehicles/sold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: soldVehicle.id, saleValue: saleVal }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao marcar como vendido')
        return
      }

      toast.success(`${soldVehicle.brand} ${soldVehicle.model} marcado como vendido`)
      setSoldDialog(false)
      setSoldVehicle(null)
      setSaleValue('')
      fetchVehicles()
    } catch (error) {
      console.error('[v0] handleMarkAsSold error:', error)
      toast.error('Erro de conexão ao marcar como vendido')
    } finally {
      setIsMarkingSold(false)
    }
  }

  if (isLoading && vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Veículo
        </Button>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Placa *</label>
                <Input
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Marca *</label>
                <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Modelo *</label>
                <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Versão</label>
                <Input value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="Opcional" />
              </div>
              <div>
                <label className="text-sm font-medium">Ano Fabricação *</label>
                <Input
                  type="number"
                  value={formData.manufacture_year}
                  onChange={(e) => setFormData({ ...formData, manufacture_year: parseInt(e.target.value) })}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ano Modelo *</label>
                <Input
                  type="number"
                  value={formData.model_year}
                  onChange={(e) => setFormData({ ...formData, model_year: parseInt(e.target.value) })}
                  min={1900}
                  max={new Date().getFullYear() + 2}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valor de Compra (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.purchase_value}
                  onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">RENAVAN *</label>
                <Input value={formData.renavam} onChange={(e) => setFormData({ ...formData, renavam: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Chassis *</label>
                <Input value={formData.chassis} onChange={(e) => setFormData({ ...formData, chassis: e.target.value })} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Marcar como Vendido */}
      <Dialog open={soldDialog} onOpenChange={setSoldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Vendido</DialogTitle>
          </DialogHeader>
          {soldVehicle && (
            <form onSubmit={handleMarkAsSold} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o valor de venda do veículo{' '}
                <span className="font-semibold text-foreground">
                  {soldVehicle.brand} {soldVehicle.model} ({soldVehicle.plate})
                </span>.
              </p>
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Valor de compra:</span> R$ {soldVehicle.purchase_value.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Valor de Venda (R$) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  placeholder="0,00"
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSoldDialog(false)}>Cancelar</Button>
                <Button type="submit" disabled={isMarkingSold}>
                  {isMarkingSold && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar Venda
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Lista de Veículos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{vehicle.brand} {vehicle.model}</CardTitle>
                  <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1">
                  {vehicle.type === 'carro' ? <Car className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                  {vehicle.type === 'carro' ? 'Carro' : 'Moto'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="text-sm space-y-1 text-muted-foreground">
                {vehicle.version && <p><span className="font-medium text-foreground">Versão:</span> {vehicle.version}</p>}
                <p><span className="font-medium text-foreground">Anos:</span> {vehicle.manufacture_year}/{vehicle.model_year}</p>
                <p><span className="font-medium text-foreground">Compra:</span> R$ {(Number(vehicle.purchase_value) || 0).toFixed(2)}</p>
                <p><span className="font-medium text-foreground">RENAVAN:</span> {vehicle.renavam}</p>
                <p><span className="font-medium text-foreground">Chassis:</span> <span className="font-mono text-xs">{vehicle.chassis}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(vehicle)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Link href={`/veiculos/${vehicle.id}/gastos`}>
                  <Button size="sm" variant="outline" className="w-full">
                    <FileText className="w-3 h-3 mr-1" />
                    Gastos
                  </Button>
                </Link>
                <Button size="sm" className="col-span-2" onClick={() => handleOpenSoldDialog(vehicle)}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Marcar como Vendido
                </Button>
                <Button size="sm" variant="destructive" className="col-span-2" onClick={() => handleDelete(vehicle)}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && vehicles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum veículo em estoque. Clique em &quot;Adicionar Veículo&quot; para começar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
