'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  UserPlus, Search, Edit, Trash2, Loader2, Users,
  FileCheck2, FileX2, Upload, Download, ChevronDown, X,
} from 'lucide-react'
import { Header } from '@/components/dashboard/header'
import { PaginationBar } from '@/components/dashboard/pagination-bar'
import { useDebounce } from '@/hooks/use-debounce'

const PAGE_SIZE = 20

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
  has_cnh: boolean
  created_at: string
}

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
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
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

type InputFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string
  value: string
  onChange: (v: string) => void
}

function InputField({ label, value, onChange, ...props }: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const [dialog, setDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cnhFile, setCnhFile] = useState<File | null>(null)
  const [editingHasCnh, setEditingHasCnh] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchCustomers = useCallback(async (targetPage: number, term: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      })
      if (term.trim()) params.set('search', term.trim())

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao buscar clientes')
        return
      }
      setCustomers(data.customers ?? [])
      setTotal(Number(data.total) || 0)
      setTotalPages(Number(data.totalPages) || 1)
    } catch (error) {
      console.error('[v0] fetchCustomers error:', error)
      toast.error('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Volta para a primeira página sempre que o termo de busca muda
  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    fetchCustomers(page, debouncedSearch)
  }, [page, debouncedSearch, fetchCustomers])

  const reload = () => fetchCustomers(page, debouncedSearch)

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id)
      setEditingHasCnh(customer.has_cnh)
      setForm({
        full_name: customer.full_name,
        birth_date: customer.birth_date?.slice(0, 10) ?? '',
        phone: customer.phone,
        email: customer.email ?? '',
        rg: customer.rg,
        cpf: formatCPF(customer.cpf),
        address_street: customer.address_street,
        address_number: customer.address_number,
        address_complement: customer.address_complement ?? '',
        address_neighborhood: customer.address_neighborhood,
        address_city: customer.address_city,
        address_state: customer.address_state,
        address_zip: formatZip(customer.address_zip),
      })
    } else {
      setEditingId(null)
      setEditingHasCnh(false)
      setForm(emptyForm)
    }
    setCnhFile(null)
    setDialog(true)
  }

  const handlePickCnh = (file: File | null) => {
    if (!file) { setCnhFile(null); return }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      toast.error('A CNH deve ser um arquivo PDF')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 8MB.')
      return
    }
    setCnhFile(file)
  }

  const uploadCnh = async (): Promise<string | null> => {
    if (!cnhFile) return null
    const fd = new FormData()
    fd.append('file', cnhFile)
    const res = await fetch('/api/customers/cnh-upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erro no upload da CNH')
      return null
    }
    return data.pathname as string
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let cnhPathname: string | null = null
      if (cnhFile) {
        cnhPathname = await uploadCnh()
        if (!cnhPathname) return
      }

      const payload: Record<string, string> = { ...form }
      if (cnhPathname) payload.cnh_pathname = cnhPathname

      const url = editingId ? `/api/customers/${editingId}` : '/api/customers'
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar cliente')
        return
      }

      toast.success(editingId ? 'Cliente atualizado' : 'Cliente cadastrado')
      setDialog(false)
      reload()
    } catch (error) {
      console.error('[v0] handleSubmit customer error:', error)
      toast.error('Erro de conexão')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao excluir')
        return
      }
      toast.success('Cliente excluído')
      setDeleteTarget(null)
      // Se era o último item da página, recua uma página
      if (customers.length === 1 && page > 1) setPage(page - 1)
      else reload()
    } catch (error) {
      console.error('[v0] handleDelete customer error:', error)
      toast.error('Erro de conexão')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-5xl px-4 py-6">
        {/* Cabeçalho */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {total} cadastrado{total === 1 ? '' : 's'}
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Busca */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando clientes...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">
              {debouncedSearch ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch ? 'Tente outro termo de busca.' : 'Cadastre o primeiro cliente para começar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {customers.map((c) => {
                const isOpen = expandedId === c.id
                return (
                  <li key={c.id} className="bg-card">
                    {/* Linha compacta */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50"
                      aria-expanded={isOpen}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(c.full_name)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{c.full_name}</span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {formatCPF(c.cpf)} &middot; {formatPhone(c.phone)}
                        </span>
                      </span>

                      {c.has_cnh ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
                          <FileCheck2 className="h-3 w-3" />
                          <span className="hidden sm:inline">CNH salva</span>
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <FileX2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Sem CNH</span>
                        </span>
                      )}

                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Detalhes */}
                    {isOpen && (
                      <div className="border-t border-border bg-muted/30 px-3 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <DetailRow label="Nascimento" value={formatDate(c.birth_date)} />
                          <DetailRow label="RG" value={c.rg} />
                          <DetailRow label="E-mail" value={c.email ?? ''} />
                          <DetailRow
                            label="Endereço"
                            value={`${c.address_street}, ${c.address_number}${c.address_complement ? ` - ${c.address_complement}` : ''}`}
                          />
                          <DetailRow label="Bairro" value={c.address_neighborhood} />
                          <DetailRow
                            label="Cidade / UF"
                            value={`${c.address_city} / ${c.address_state}`}
                          />
                          <DetailRow label="CEP" value={formatZip(c.address_zip)} />
                          <DetailRow label="Cadastrado em" value={formatDate(c.created_at)} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleOpenDialog(c)}>
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>

                          {c.has_cnh && (
                            <Button asChild size="sm" variant="secondary" className="gap-1.5">
                              <a href={`/api/customers/${c.id}/cnh?download=1`}>
                                <Download className="h-3.5 w-3.5" />
                                Baixar CNH
                              </a>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              label="clientes"
            />
          </div>
        )}
      </main>

      {/* Dialog de cadastro/edição */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados pessoais */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dados pessoais
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <InputField
                    label="Nome completo *"
                    value={form.full_name}
                    onChange={(v) => setForm({ ...form, full_name: v })}
                    placeholder="João da Silva"
                    required
                  />
                </div>
                <InputField
                  label="Data de nascimento *"
                  type="date"
                  value={form.birth_date}
                  onChange={(v) => setForm({ ...form, birth_date: v })}
                  required
                />
                <InputField
                  label="Telefone *"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: formatPhone(v) })}
                  placeholder="(11) 99999-9999"
                  required
                />
                <InputField
                  label="CPF *"
                  value={form.cpf}
                  onChange={(v) => setForm({ ...form, cpf: formatCPF(v) })}
                  placeholder="000.000.000-00"
                  disabled={!!editingId}
                  required
                />
                <InputField
                  label="RG *"
                  value={form.rg}
                  onChange={(v) => setForm({ ...form, rg: v })}
                  placeholder="00.000.000-0"
                  required
                />
                <div className="sm:col-span-2">
                  <InputField
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Endereço
              </h3>
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <InputField
                    label="Rua *"
                    value={form.address_street}
                    onChange={(v) => setForm({ ...form, address_street: v })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputField
                    label="Número *"
                    value={form.address_number}
                    onChange={(v) => setForm({ ...form, address_number: v })}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <InputField
                    label="Complemento"
                    value={form.address_complement}
                    onChange={(v) => setForm({ ...form, address_complement: v })}
                    placeholder="Apto 12"
                  />
                </div>
                <div className="sm:col-span-3">
                  <InputField
                    label="Bairro *"
                    value={form.address_neighborhood}
                    onChange={(v) => setForm({ ...form, address_neighborhood: v })}
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <InputField
                    label="Cidade *"
                    value={form.address_city}
                    onChange={(v) => setForm({ ...form, address_city: v })}
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">UF *</label>
                    <select
                      value={form.address_state}
                      onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                      required
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">—</option>
                      {ESTADOS.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <InputField
                    label="CEP *"
                    value={form.address_zip}
                    onChange={(v) => setForm({ ...form, address_zip: formatZip(v) })}
                    placeholder="00000-000"
                    required
                  />
                </div>
              </div>
            </section>

            {/* CNH */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                CNH (arquivo PDF)
              </h3>

              {editingId && editingHasCnh && !cnhFile && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                    <FileCheck2 className="h-4 w-4" />
                    CNH já anexada
                  </span>
                  <Button asChild size="sm" variant="ghost" className="h-7 gap-1.5">
                    <a href={`/api/customers/${editingId}/cnh?download=1`}>
                      <Download className="h-3.5 w-3.5" />
                      Baixar
                    </a>
                  </Button>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input px-3 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 text-sm">
                  {cnhFile ? (
                    <span className="block truncate font-medium text-foreground">{cnhFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {editingHasCnh ? 'Substituir PDF da CNH' : 'Anexar PDF da CNH'}
                    </span>
                  )}
                  <span className="mt-0.5 block text-xs text-muted-foreground">Somente PDF, até 8MB</span>
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => handlePickCnh(e.target.files?.[0] ?? null)}
                />
              </label>

              {cnhFile && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-muted-foreground"
                  onClick={() => setCnhFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                  Remover arquivo selecionado
                </Button>
              )}
            </section>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Os dados de "${deleteTarget.full_name}" e o PDF da CNH serão removidos permanentemente.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
