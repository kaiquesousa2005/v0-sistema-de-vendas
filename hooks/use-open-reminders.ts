import useSWR from 'swr'

export const OPEN_REMINDERS_KEY = '/api/reminders/open-count'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao carregar lembretes')
  return response.json() as Promise<{ count: number }>
}

export function useOpenReminders() {
  const { data } = useSWR(OPEN_REMINDERS_KEY, fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  return data?.count ?? 0
}
