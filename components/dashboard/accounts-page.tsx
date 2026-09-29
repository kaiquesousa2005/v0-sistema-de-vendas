'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FileDown, Loader2, Pencil, Plus, Printer, Trash2, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Account = { id:number; description:string; category:string; due_date:string; amount:number|string; status:'Pendente'|'Pago'|'Atrasado'; payment_date:string|null; notes:string|null }
type Form = Omit<Account, 'id'|'amount'> & { amount:string }
const categories = ['Veículos', 'Cartões', 'Casa', 'Loja', 'Impostos', 'Serviços', 'Pessoal', 'Outros']
const emptyForm: Form = { description:'', category:'Outros', due_date:new Date().toISOString().slice(0,10), amount:'', status:'Pendente', payment_date:null, notes:'' }
const money = (value:number|string) => Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const monthName = (date:Date) => format(date, 'MMMM yyyy', { locale: ptBR }).replace(/^./, (c) => c.toUpperCase())

function AccountsSheet({ accounts, month, year, total }: { accounts:Account[]; month:number; year:number; total:number }) {
  return <div className="accounts-sheet w-[794px] bg-white p-10 text-slate-900">
    <img src="/images/contract-header.png" alt="MCar Veículos" className="mb-7 h-auto w-full" />
    <h1 className="text-center text-xl font-bold uppercase">Contas a pagar</h1>
    <p className="mb-6 text-center text-sm">Demonstrativo de {monthName(new Date(year, month-1, 1))}</p>
    <table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">Descrição</th><th className="border p-2 text-left">Categoria</th><th className="border p-2 text-left">Vencimento</th><th className="border p-2 text-left">Situação</th><th className="border p-2 text-right">Valor</th></tr></thead><tbody>{accounts.map((a)=><tr key={a.id}><td className="border p-2">{a.description}</td><td className="border p-2">{a.category}</td><td className="border p-2">{new Date(`${a.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="border p-2">{a.status}</td><td className="border p-2 text-right">{money(a.amount)}</td></tr>)}</tbody><tfoot><tr><td colSpan={4} className="border p-3 text-right font-bold">TOTAL DO MÊS</td><td className="border p-3 text-right font-bold">{money(total)}</td></tr></tfoot></table>
    <div className="mt-24 grid grid-cols-2 gap-20 text-center text-xs"><div className="border-t pt-2">RESPONSÁVEL PELO PAGAMENTO</div><div className="border-t pt-2">CONFERÊNCIA</div></div>
  </div>
}

export function AccountsPage() {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [accounts, setAccounts] = useState<Account[]>([])
  const [totals, setTotals] = useState({ total:0, paid:0, pending:0 })
  const [form, setForm] = useState<Form>(emptyForm)
  const [editing, setEditing] = useState<Account|null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const month = cursor.getMonth()+1, year = cursor.getFullYear()

  const load = useCallback(async () => { setLoading(true); try { const r=await fetch(`/api/accounts?month=${month}&year=${year}`); const d=await r.json(); if(!r.ok) throw new Error(d.error); setAccounts(d.accounts||[]); setTotals(d.totals||{total:0,paid:0,pending:0}) } catch(e) { toast.error(e instanceof Error?e.message:'Erro ao carregar contas') } finally { setLoading(false) } }, [month,year])
  useEffect(()=>{load()},[load])
  const openNew = () => { setEditing(null); setForm({ ...emptyForm, due_date:`${year}-${String(month).padStart(2,'0')}-01` }); setOpen(true) }
  const openEdit = (a:Account) => { setEditing(a); setForm({ ...a, amount:String(a.amount), payment_date:a.payment_date?.slice(0,10)||null, notes:a.notes||'' }); setOpen(true) }
  const save = async () => { setSaving(true); try { const payload={...form,amount:Number(form.amount.replace(',','.'))}; const r=await fetch(editing?`/api/accounts/${editing.id}`:'/api/accounts',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const d=await r.json(); if(!r.ok) throw new Error(d.error); toast.success(editing?'Conta atualizada':'Conta cadastrada'); setOpen(false); load() } catch(e) { toast.error(e instanceof Error?e.message:'Erro ao salvar conta') } finally { setSaving(false) } }
  const remove = async (a:Account) => { if(!confirm(`Excluir a conta "${a.description}"?`)) return; const r=await fetch(`/api/accounts/${a.id}`,{method:'DELETE'}); if(r.ok){toast.success('Conta excluída');load()}else toast.error('Não foi possível excluir') }
  const exportPdf = async () => { const node=sheetRef.current?.querySelector<HTMLElement>('.accounts-sheet'); if(!node)return; setExporting(true); try { const { downloadContractPdf } = await import('@/lib/contract-pdf'); await downloadContractPdf(node,`Contas a pagar - ${monthName(cursor)}`) } finally { setExporting(false) } }
  const grouped = useMemo(()=>accounts.reduce<Record<string,Account[]>>((acc,a)=>{(acc[a.category]??=[]).push(a);return acc},{}),[accounts])

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Contas a pagar</h1><p className="text-muted-foreground">Organize vencimentos, pagamentos e despesas do mês.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportPdf} disabled={exporting||!accounts.length}>{exporting?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<FileDown className="mr-2 h-4 w-4"/>}Baixar PDF</Button><Button variant="outline" onClick={()=>window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button><Button onClick={openNew}><Plus className="mr-2 h-4 w-4"/>Nova conta</Button></div></div>
    <div className="flex items-center justify-between rounded-xl border bg-card p-3"><Button size="icon" variant="ghost" onClick={()=>setCursor(new Date(year,month-2,1))}><ChevronLeft/></Button><div className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary"/>{monthName(cursor)}</div><Button size="icon" variant="ghost" onClick={()=>setCursor(new Date(year,month,1))}><ChevronRight/></Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do mês</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(totals.total)}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pago</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-emerald-600">{money(totals.paid)}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendente</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{money(totals.pending)}</CardContent></Card></div>
    <Card><CardContent className="p-0">{loading?<div className="flex justify-center p-12"><Loader2 className="animate-spin"/></div>:accounts.length===0?<div className="p-12 text-center text-muted-foreground"><Wallet className="mx-auto mb-3 h-10 w-10 opacity-50"/><p>Nenhuma conta cadastrada neste mês.</p><Button className="mt-4" onClick={openNew}>Cadastrar primeira conta</Button></div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Categoria</th><th className="p-3 text-left">Vencimento</th><th className="p-3 text-left">Valor</th><th className="p-3 text-left">Situação</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{Object.entries(grouped).map(([category,rows])=><>{rows.map(a=><tr key={a.id} className="border-t"><td className="p-3 font-medium">{a.description}{a.notes&&<p className="text-xs text-muted-foreground">{a.notes}</p>}</td><td className="p-3"><Badge variant="outline">{category}</Badge></td><td className="p-3">{new Date(`${a.due_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="p-3 font-semibold">{money(a.amount)}</td><td className="p-3"><Badge variant={a.status==='Pago'?'default':a.status==='Atrasado'?'destructive':'secondary'}>{a.status}</Badge></td><td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={()=>openEdit(a)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" onClick={()=>remove(a)}><Trash2 className="h-4 w-4 text-destructive"/></Button></td></tr>)}</>)}</tbody></table></div>}</CardContent></Card>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editing?'Editar conta':'Nova conta'}</DialogTitle></DialogHeader><div className="grid gap-4 py-2"><div className="grid gap-2"><Label>Descrição</Label><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ex.: Parcela Strada 2018"/></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label>Categoria</Label><Select value={form.category} onValueChange={category=>setForm({...form,category})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Valor</Label><Input inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0,00"/></div></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div><div className="grid gap-2"><Label>Situação</Label><Select value={form.status} onValueChange={(status:Form['status'])=>setForm({...form,status})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Pendente','Pago','Atrasado'].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2"><Label>Data de pagamento</Label><Input type="date" value={form.payment_date||''} onChange={e=>setForm({...form,payment_date:e.target.value||null})}/></div><div className="grid gap-2"><Label>Observações</Label><Textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div><Button onClick={save} disabled={saving||!form.description||!form.amount}>{saving?<Loader2 className="mr-2 animate-spin"/>:<CheckCircle2 className="mr-2"/>}{editing?'Salvar alterações':'Cadastrar conta'}</Button></div></DialogContent></Dialog>
    <div ref={sheetRef} aria-hidden className="pointer-events-none fixed left-[-10000px] top-0"><AccountsSheet accounts={accounts} month={month} year={year} total={totals.total}/></div>
  </div>
}
