'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Converte o valor salvo ("1234.56", 1234.56 ou "") para o texto exibido ("R$ 1.234,56"). */
export function formatBRL(value: string | number | null | undefined) {
  if (value === '' || value === null || value === undefined) return ''
  const n = Number(value)
  return Number.isFinite(n) ? brl.format(n) : ''
}

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  /** Valor numérico em formato decimal com ponto ("1234.56") ou vazio. */
  value: string | number | null | undefined
  /** Recebe o valor decimal com ponto ("1234.56"), ou "" quando o campo é apagado. */
  onValueChange: (value: string) => void
}

/**
 * Campo de valor com máscara BRL: os dígitos digitados entram pelos centavos,
 * então "12345" vira "R$ 123,45" enquanto o usuário digita.
 */
export function CurrencyInput({ value, onValueChange, placeholder = 'R$ 0,00', ...props }: CurrencyInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formatBRL(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '')
        onValueChange(digits ? (Number(digits) / 100).toFixed(2) : '')
      }}
    />
  )
}
