'use client'

import { Cake, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/use-notifications'

function whatsappLink(phone: string | null, name: string) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  const number = digits.startsWith('55') ? digits : `55${digits}`
  const firstName = name.split(' ')[0]
  const text = `Olá, ${firstName}! A equipe MCar Veículos deseja um feliz aniversário! Muita saúde e conquistas.`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function BirthdayBanner() {
  const { data } = useNotifications()
  const birthdays = data?.birthdays ?? []
  if (!birthdays.length) return null

  return (
    <section
      aria-label="Aniversariantes de hoje"
      className="mb-5 rounded-xl border border-pink-500/30 bg-pink-500/10 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-400">
          <Cake className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            {birthdays.length === 1 ? 'Hoje tem aniversariante!' : `Hoje são ${birthdays.length} aniversariantes!`}
          </p>
          <p className="text-xs text-muted-foreground">Aproveite para enviar uma mensagem de parabéns.</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {birthdays.map((b) => {
          const link = whatsappLink(b.phone, b.full_name)
          return (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">{b.full_name}</span>
                <span className="text-muted-foreground"> · completa {b.age} anos</span>
              </span>
              {link && (
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    Parabenizar no WhatsApp
                  </a>
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
