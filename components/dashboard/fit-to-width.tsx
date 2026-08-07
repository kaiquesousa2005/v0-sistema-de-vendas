'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Largura de uma folha A4 a 96dpi (210mm), igual à do .contract-sheet. */
const SHEET_WIDTH_PX = 794

/**
 * Reduz o conteúdo para caber na largura disponível, sem cortar o documento.
 *
 * Usa `transform: scale` (em vez de `zoom`) por ter suporte consistente entre
 * navegadores, e reserva a altura real via `height` do wrapper — do contrário
 * o scale deixaria um vão em branco embaixo, já que o transform não afeta o
 * fluxo do layout. Nunca amplia: o limite superior da escala é 1.
 */
export function FitToWidth({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const update = () => {
      const available = outer.clientWidth
      const next = available > 0 ? Math.min(1, available / SHEET_WIDTH_PX) : 1
      setScale(next)
      setHeight(inner.offsetHeight * next)
    }

    update()

    // Reage ao redimensionar a janela e ao documento crescer (veículos a mais)
    const observer = new ResizeObserver(update)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outerRef} className="w-full" style={{ height }}>
      <div
        ref={innerRef}
        // Marcador usado pela geração do PDF para desligar o scale na captura
        data-fit-to-width=""
        style={{
          width: SHEET_WIDTH_PX,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
