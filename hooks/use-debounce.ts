'use client'

import { useEffect, useState } from 'react'

/**
 * Retorna o valor apenas depois que ele para de mudar por `delay` ms.
 * Evita disparar uma requisição por tecla digitada em buscas.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
