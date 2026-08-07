'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationBarProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  label?: string
}

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  label = 'registros',
}: PaginationBarProps) {
  if (total === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}&ndash;{to} de {total} {label}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
          {page} / {Math.max(totalPages, 1)}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
