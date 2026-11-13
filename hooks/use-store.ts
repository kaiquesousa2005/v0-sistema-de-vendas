import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Erro ao carregar loja')
  return response.json() as Promise<{ storeName: string }>
}

export function useStore() {
  const { data, isLoading } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  })
  return { storeName: data?.storeName ?? '', isLoading }
}
