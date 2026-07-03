'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  UserPlus, Search, Edit, Trash2, Loader2, User,
  Phone, Mail, FileText, Upload, CheckCircle2, XCircle,
  ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'

interface Customer {
  id: number
  full_name: string
  birth_date: string
  phone: string
  email: string | null
  rg: string
  cpf: string
  address_street: string
  address_number: string
  address_complement: string | null
  address_neighborhood: string
  address_city: string
  address_state: string
  address_zip: string
  cnh_pathname: string | null
  created_at: string
}

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO'
]

const emptyForm = {
  full_name: '',
  birth_date: '',
  phone: '',
  email: '',
  rg: '',
  cpf: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  cnh_pathname: '',
}

function formatCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function formatZip(v: string) {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cnhFile, setCnhFile] = useState<File | null>(null)
  const [isUploadingCnh, setIsUploadingCnh] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchCustomers() }, [])

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/customers')
      if (res.ok) setCustomers(await res.json())
      else toast.error('Erro ao buscar clientes')
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id)
      setForm({
        full_name: customer.full_name,
        birth_date: customer.birth_date?.slice(0, 10) ?? '',
        phone: customer.phone,
        email: customer.email ?? '',
        rg: customer.rg,
        cpf: customer.cpf,
        address_street: customer.address_street,
        address_number: customer.address_number,
        address_complement: customer.address_complement ?? '',
        address_neighborhood: customer.address_neighborhood,
        address_city: customer.address_city,
        address_state: customer.address_state,
        address_zip: customer.address_zip,
        cnh_pathname: customer.cnh_pathname ?? '',
      })
    } else {
      setEditingId(null)
      setForm(emptyForm)
    }
    setCnhFile(null)
    setDialog(true)
  }

  const handleCnhUpload = async (): Promise<string | null> => {
    if (!cnhFile) return form.cnh_pathname || null
    setIsUploadingCnh(true)
    try {
      const fd = new FormData()
      fd.append('file', cnhFile)
      const res = await fetch('/api/customers/cnh-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro no upload da CNH'); return null }
      return data.pathname
    } catch {
      toast.error('Erro ao fazer upload da CNH')
      return null
    } finally {
      setIsUploadingCnh(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const cnhPathname = await handleCnhUpload()
    if (cnhFile && !cnhPathname) { setIsSaving(false); return }

    const payload = {
      ...form,
      cnh_pathname: cnhPathname ?? form.cnh_pathname ?? '',
    }

    const url = editingId ? `/api/customers/${editingId}` : '/api/customers'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro ao salvar cliente'); return }
      toast.success(editingId ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      setDialog(false)
      fetchCustomers()
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro ao excluir'); return }
      toast.success('Cliente excluído')
      setDeleteId(null)
      fetchCustomers()
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setIsDeleting(false)
    }
  }

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search.replace(/\D/g, '')) ||
    c.phone.includes(search)
  )

  const InputField = ({ label, value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} {...props} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header da página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{customers.length} cliente{customers.length !== 1 ? 's' : ''} cadastrado{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-muted-foreground">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
          {!search && (
            <Button variant="outline" onClick={() => handleOpenDialog()}>
              Cadastrar primeiro cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(customer => {
            const isExpanded = expandedId === customer.id
            return (
              <div key={customer.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {/* Topo do card */}
                <div className="flex items-start justify-between p-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{customer.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={customer.cnh_pathname ? 'default' : 'secondary'}
                    className={`shrink-0 text-xs ${customer.cnh_pathname ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' : 'opacity-60'}`}
                  >
                    {customer.cnh_pathname ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />CNH Salva</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />Sem CNH</>
                    )}
                  </Badge>
                </div>

                {/* Info rápida */}
                <div className="px-4 pb-3 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Nascimento: {formatDate(customer.birth_date)}</span>
                  </div>
                </div>

                {/* Detalhes expansíveis */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-1 text-sm text-muted-foreground bg-muted/30">
                    <p><span className="font-medium text-foreground">RG:</span> {customer.rg}</p>
                    <p><span className="font-medium text-foreground">Endereço:</span> {customer.address_street}, {customer.address_number}{customer.address_complement ? ` — ${customer.address_complement}` : ''}</p>
                    <p><span className="font-medium text-foreground">Bairro:</span> {customer.address_neighborhood}</p>
                    <p><span className="font-medium text-foreground">Cidade:</span> {customer.address_city} — {customer.address_state}</p>
                    <p><span className="font-medium text-foreground">CEP:</span> {customer.address_zip.replace(/(\d{5})(\d{3})/, '$1-$2')}</p>
                    {customer.cnh_pathname && (
                      <a
                        href={customer.cnh_pathname}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver CNH
                      </a>
                    )}
                  </div>
                )}

                {/* Rodapé do card */}
                <div className="border-t p-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {isExpanded ? 'Menos' : 'Detalhes'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => setDeleteId(customer.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog cadastro/edição */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados pessoais */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <InputField label="Nome Completo *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Nome completo" required />
                </div>
                <InputField label="Data de Nascimento *" type="date" value={form.birth_date} onChange={v => setForm(f => ({ ...f, birth_date: v }))} required />
                <InputField label="Telefone *" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: formatPhone(v) }))} placeholder="(11) 99999-9999" required />
                <InputField label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@exemplo.com" />
                <InputField label="RG *" value={form.rg} onChange={v => setForm(f => ({ ...f, rg: v }))} placeholder="00.000.000-0" required />
                <div className="sm:col-span-2">
                  <InputField label="CPF *" value={form.cpf} onChange={v => setForm(f => ({ ...f, cpf: formatCPF(v) }))} placeholder="000.000.000-00" required disabled={!!editingId} />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <InputField label="Rua / Avenida *" value={form.address_street} onChange={v => setForm(f => ({ ...f, address_street: v }))} placeholder="Nome da rua" required />
                </div>
                <InputField label="Número *" value={form.address_number} onChange={v => setForm(f => ({ ...f, address_number: v }))} placeholder="123" required />
                <InputField label="Complemento" value={form.address_complement} onChange={v => setForm(f => ({ ...f, address_complement: v }))} placeholder="Apto, bloco..." />
                <InputField label="Bairro *" value={form.address_neighborhood} onChange={v => setForm(f => ({ ...f, address_neighborhood: v }))} placeholder="Bairro" required />
                <InputField label="Cidade *" value={form.address_city} onChange={v => setForm(f => ({ ...f, address_city: v }))} placeholder="Cidade" required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Estado *</label>
                  <select
                    value={form.address_state}
                    onChange={e => setForm(f => ({ ...f, address_state: e.target.value }))}
                    required
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">UF</option>
                    {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <InputField label="CEP *" value={form.address_zip} onChange={v => setForm(f => ({ ...f, address_zip: formatZip(v) }))} placeholder="00000-000" required />
              </div>
            </div>

            {/* CNH */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">CNH</h3>
              <div className="rounded-lg border border-dashed p-4 space-y-3">
                {form.cnh_pathname && !cnhFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">CNH já anexada</span>
                    </div>
                    <div className="flex gap-2">
                      <a href={form.cnh_pathname} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs">
                          <ExternalLink className="w-3.5 h-3.5" /> Ver
                        </Button>
                      </a>
                      <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setForm(f => ({ ...f, cnh_pathname: '' }))}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : cnhFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{cnhFile.name}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setCnhFile(null)}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Arraste ou clique para anexar a CNH</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, PDF — máximo 5MB</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => e.target.files?.[0] && setCnhFile(e.target.files[0])}
                  className={cnhFile || form.cnh_pathname ? 'hidden' : ''}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving || isUploadingCnh} className="gap-2">
                {(isSaving || isUploadingCnh) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente e sua CNH (se houver) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
