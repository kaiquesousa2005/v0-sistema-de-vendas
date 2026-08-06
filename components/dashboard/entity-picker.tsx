'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react'

export interface PickerItem {
  id: number
  primary: string
  secondary?: string
}

interface EntityPickerProps {
  value: PickerItem | null
  onChange: (item: PickerItem) => void
  /** Busca no servidor — recebe o termo já debounced. */
  fetcher: (search: string) => Promise<PickerItem[]>
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
}

export function EntityPicker({
  value,
  onChange,
  fetcher,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [items, setItems] = useState<PickerItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    setIsLoading(true)
    fetcher(debouncedSearch)
      .then((result) => {
        if (!cancelled) setItems(result)
      })
      .catch((error) => {
        console.error('[v0] EntityPicker fetch error:', error)
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, debouncedSearch, fetcher])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal h-auto min-h-10 py-2"
        >
          {value ? (
            <span className="flex flex-col items-start text-left">
              <span className="font-medium leading-tight">{value.primary}</span>
              {value.secondary && (
                <span className="text-xs text-muted-foreground leading-tight">{value.secondary}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-0 pl-9 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            items.map((item) => {
              const isSelected = value?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium leading-tight">{item.primary}</span>
                    {item.secondary && (
                      <span className="truncate text-xs text-muted-foreground leading-tight">
                        {item.secondary}
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
