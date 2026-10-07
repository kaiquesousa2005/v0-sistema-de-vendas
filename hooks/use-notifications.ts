import useSWR from 'swr'

export type BirthdayNotification = {
  id: number
  full_name: string
  phone: string | null
  birth_date: string
  age: number
}

export type AccountNotification = {
  id: number
  description: string
  category: string
  amount: number | string | null
  status: string
  due_date: string
  days_until: number
}

export type NotificationsData = {
  birthdays: BirthdayNotification[]
  dueToday: AccountNotification[]
  overdue: AccountNotification[]
  upcoming: AccountNotification[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao carregar notificações')
  return response.json() as Promise<NotificationsData>
}

export function useNotifications() {
  const { data, mutate, isLoading } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  const count = data
    ? data.birthdays.length + data.dueToday.length + data.overdue.length
    : 0
  return { data, count, isLoading, refresh: mutate }
}
