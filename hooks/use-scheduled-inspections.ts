import useSWR from 'swr'

export const SCHEDULED_INSPECTIONS_KEY = '/api/transfers/scheduled-count'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao carregar vistorias agendadas')
  return response.json() as Promise<{ count: number }>
}

export function useScheduledInspections() {
  const { data } = useSWR(SCHEDULED_INSPECTIONS_KEY, fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
  })
  return data?.count ?? 0
}
