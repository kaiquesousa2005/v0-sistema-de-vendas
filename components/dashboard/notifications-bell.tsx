'use client'

import Link from 'next/link'
import { Bell, Cake, CalendarClock, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications, type AccountNotification } from '@/hooks/use-notifications'

const money = (value: AccountNotification['amount']) =>
  value === null || value === undefined || value === ''
    ? 'Valor a definir'
    : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}` : value
}

function dueLabel(days: number) {
  if (days === 0) return 'Vence hoje'
  if (days < 0) return `Atrasada há ${Math.abs(days)} dia${days === -1 ? '' : 's'}`
  return days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`
}

function Section({ title, icon: Icon, tone, children }: {
  title: string
  icon: typeof Bell
  tone: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`flex items-center gap-1.5 px-3 pt-3 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  )
}

function AccountItem({ account }: { account: AccountNotification }) {
  return (
    <li>
      <Link href="/contas" className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted">
        <span className="min-w-0">
          <span className="block truncate font-medium">{account.description}</span>
          <span className="text-xs text-muted-foreground">
            {dueLabel(account.days_until)} · {formatDate(account.due_date)}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold">{money(account.amount)}</span>
      </Link>
    </li>
  )
}

export function NotificationsBell() {
  const { data, count } = useNotifications()
  const hasAny = !!data && (data.birthdays.length + data.dueToday.length + data.overdue.length + data.upcoming.length) > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificações${count ? ` (${count} novas)` : ''}`}>
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">Aniversários e vencimentos de contas</p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {!data ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : !hasAny ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum aviso por hoje.</p>
          ) : (
            <>
              {data.birthdays.length > 0 && (
                <Section title="Aniversariantes de hoje" icon={Cake} tone="text-pink-600 dark:text-pink-400">
                  {data.birthdays.map((b) => (
                    <li key={b.id}>
                      <Link href="/clientes" className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted">
                        <span className="min-w-0 truncate font-medium">{b.full_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{b.age} anos</span>
                      </Link>
                    </li>
                  ))}
                </Section>
              )}
              {data.overdue.length > 0 && (
                <Section title="Contas atrasadas" icon={AlertTriangle} tone="text-destructive">
                  {data.overdue.map((a) => <AccountItem key={a.id} account={a} />)}
                </Section>
              )}
              {data.dueToday.length > 0 && (
                <Section title="Vencem hoje" icon={CalendarClock} tone="text-amber-600 dark:text-amber-400">
                  {data.dueToday.map((a) => <AccountItem key={a.id} account={a} />)}
                </Section>
              )}
              {data.upcoming.length > 0 && (
                <Section title="Próximos dias" icon={Clock} tone="text-muted-foreground">
                  {data.upcoming.map((a) => <AccountItem key={a.id} account={a} />)}
                </Section>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
