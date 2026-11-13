'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationsBell } from '@/components/dashboard/notifications-bell'
import { useOpenReminders } from '@/hooks/use-open-reminders'
import { useStore } from '@/hooks/use-store'
import { cn } from '@/lib/utils'
import {
  Home,
  Car,
  CheckCircle,
  LogOut,
  Users,
  FileSignature,
  WalletCards,
  ListTodo,
  Menu,
  Store,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Veículos', href: '/veiculos', icon: Car },
  { label: 'Lembretes', href: '/lembretes', icon: ListTodo },
  { label: 'Contas', href: '/contas', icon: WalletCards },
  { label: 'Vendidos', href: '/vendidos', icon: CheckCircle },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Contratos', href: '/contratos', icon: FileSignature },
]

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        KM
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground">KM Gestão</span>
    </Link>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const openReminders = useOpenReminders()

  return (
    <nav aria-label="Navegação principal" className="grid grid-cols-2 gap-2">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        const showDot = item.href === '/lembretes' && openReminders > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <span className="relative inline-flex">
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {showDot && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"
                />
              )}
            </span>
            {item.label}
            {showDot && (
              <span className="sr-only">
                {` (${openReminders} ${openReminders === 1 ? 'lembrete em aberto' : 'lembretes em aberto'})`}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function Header() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const { storeName, isLoading } = useStore()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card print:hidden md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
      </aside>

      <header
        data-app-header
        className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur print:hidden"
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <div className="flex h-16 items-center border-b border-border px-4">
                  <Brand />
                </div>
                <div className="p-3">
                  <SidebarNav onNavigate={() => setMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
                <Store className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs leading-none text-muted-foreground">Loja</p>
                {isLoading ? (
                  <Skeleton className="mt-1.5 h-4 w-32" />
                ) : (
                  <p className="truncate text-base font-semibold leading-tight text-foreground">
                    {storeName || 'Minha loja'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationsBell />
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}
