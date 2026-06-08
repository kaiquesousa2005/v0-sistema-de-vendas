'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react'

interface Store {
  id: number
  cpf: string
  store_name: string
  is_active: boolean
  created_at: string
}

export function AdminPanel() {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    cpf: '',
    store_name: '',
    password: '',
  })

  const [resetDialog, setResetDialog] = useState(false)
  const [resetStore, setResetStore] = useState<Store | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/admin/stores')
      if (response.ok) {
        const data = await response.json()
        setStores(data)
      } else {
        toast.error('Erro ao buscar lojas')
      }
    } catch (error) {
      console.error('[v0] Fetch stores error:', error)
      toast.error('Erro ao buscar lojas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (store?: Store) => {
    if (store) {
      setEditingId(store.id)
      setFormData({
        cpf: store.cpf,
        store_name: store.store_name,
        password: '',
      })
    } else {
      setEditingId(null)
      setFormData({
        cpf: '',
        store_name: '',
        password: '',
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = editingId ? `/api/admin/stores/${editingId}` : '/api/admin/stores'
      const method = editingId ? 'PUT' : 'POST'

      const payload = editingId 
        ? { store_name: formData.store_name }
        : { cpf: formData.cpf.replace(/\D/g, ''), store_name: formData.store_name, password: formData.password }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingId ? 'Loja atualizada' : 'Loja criada')
        setOpenDialog(false)
        fetchStores()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao salvar loja')
      }
    } catch (error) {
      console.error('[v0] Submit error:', error)
      toast.error('Erro ao salvar loja')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta loja?')) return

    try {
      const response = await fetch(`/api/admin/stores/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Loja deletada')
        fetchStores()
      } else {
        toast.error('Erro ao deletar loja')
      }
    } catch (error) {
      console.error('[v0] Delete error:', error)
      toast.error('Erro ao deletar loja')
    }
  }

  const handleOpenReset = (store: Store) => {
    setResetStore(store)
    setNewPassword('')
    setShowNewPassword(false)
    setResetDialog(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetStore) return
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setIsResetting(true)

    try {
      const response = await fetch(`/api/admin/stores/${resetStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      if (response.ok) {
        toast.success('Senha redefinida com sucesso')
        setResetDialog(false)
        setResetStore(null)
        setNewPassword('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao redefinir senha')
      }
    } catch (error) {
      console.error('[v0] Reset password error:', error)
      toast.error('Erro ao redefinir senha')
    } finally {
      setIsResetting(false)
    }
  }

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '')
    if (v.length <= 3) return v
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`
  }

  if (isLoading && stores.length === 0) {
    return <div className="text-center">Carregando lojas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Loja
        </Button>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div>
                <label className="text-sm font-medium">CPF</label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                  maxLength={14}
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Nome da Loja</label>
              <Input value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} required />
            </div>
            {!editingId && (
              <div>
                <label className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            {resetStore && (
              <p className="text-sm text-muted-foreground">
                Definindo uma nova senha para a loja <span className="font-medium text-foreground">{resetStore.store_name}</span>. Os dados e o histórico da conta serão mantidos.
              </p>
            )}
            <div>
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setResetDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Redefinir
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2">
        {stores.map((store) => (
          <Card key={store.id}>
            <CardHeader>
              <CardTitle className="text-lg">{store.store_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p><span className="font-medium">CPF:</span> {store.cpf}</p>
                <p><span className="font-medium">Status:</span> {store.is_active ? 'Ativa' : 'Inativa'}</p>
                <p><span className="font-medium">Criada:</span> {new Date(store.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(store)} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(store.id)} className="flex-1">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Deletar
                </Button>
              </div>
              {store.is_active && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenReset(store)}
                  className="w-full"
                >
                  <KeyRound className="w-4 h-4 mr-1" />
                  Redefinir Senha
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stores.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Nenhuma loja cadastrada. Crie uma nova loja para começar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
