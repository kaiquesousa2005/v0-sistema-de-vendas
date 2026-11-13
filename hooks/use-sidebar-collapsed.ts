'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'km-sidebar'
const EVENT = 'km-sidebar-change'

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}

const getSnapshot = () => document.documentElement.dataset.sidebar === 'collapsed'
const getServerSnapshot = () => false

export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setCollapsed = useCallback((value: boolean) => {
    const root = document.documentElement
    if (value) root.dataset.sidebar = 'collapsed'
    else delete root.dataset.sidebar
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'collapsed' : 'expanded')
    } catch {}
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const toggle = useCallback(() => setCollapsed(!getSnapshot()), [setCollapsed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b' && (event.ctrlKey || event.metaKey) && !event.altKey) {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return { collapsed, toggle }
}
