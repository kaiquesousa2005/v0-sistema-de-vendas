'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export interface MonthlyPoint {
  month: string
  revenue: number
  expenses: number
  salesCount: number
  profit: number
}
export interface StatusPoint {
  key: string
  label: string
  count: number
}
export interface CategoryPoint {
  category: string
  total: number
}
export interface BrandPoint {
  brand: string
  count: number
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const brlCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

const STATUS_COLORS = ['var(--chart-2)', 'var(--chart-1)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-5)']

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

/** Faturamento x Gastos ao longo dos últimos 12 meses (área). */
export function RevenueExpensesChart({ data }: { data: MonthlyPoint[] }) {
  const config = {
    revenue: { label: 'Faturamento', color: 'var(--chart-2)' },
    expenses: { label: 'Gastos', color: 'var(--chart-5)' },
  } satisfies ChartConfig

  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Faturamento x Gastos</CardTitle>
        <CardDescription>Evolução mensal nos últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={config} className="h-[300px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                fontSize={12}
                tickFormatter={(v) => brlCompact(Number(v))}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value, name) => [brl(Number(value)), ' ' + (config[name as keyof typeof config]?.label ?? name)]} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
              <Area
                dataKey="expenses"
                type="monotone"
                fill="url(#fillExpenses)"
                stroke="var(--color-expenses)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyState label="Sem faturamento ou gastos nos últimos 12 meses" />
        )}
      </CardContent>
    </Card>
  )
}

/** Lucro líquido mês a mês (barras verdes/vermelhas conforme o sinal). */
export function MonthlyProfitChart({ data }: { data: MonthlyPoint[] }) {
  const config = { profit: { label: 'Lucro', color: 'var(--chart-2)' } } satisfies ChartConfig
  const hasData = data.some((d) => d.profit !== 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lucro mensal</CardTitle>
        <CardDescription>Faturamento menos custo de compra e gastos</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={config} className="h-[260px] w-full">
            <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                fontSize={12}
                tickFormatter={(v) => brlCompact(Number(v))}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [brl(Number(value)), ' Lucro']} />} />
              <Bar dataKey="profit" radius={4}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.profit >= 0 ? 'var(--chart-2)' : 'var(--chart-5)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState label="Sem dados de lucro" />
        )}
      </CardContent>
    </Card>
  )
}

/** Distribuição dos veículos por status (rosca). */
export function VehicleStatusChart({ data }: { data: StatusPoint[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.key, { label: d.label, color: STATUS_COLORS[i % STATUS_COLORS.length] }]),
  )
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Veículos por status</CardTitle>
        <CardDescription>Total de {total} veículos</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {total > 0 ? (
          <ChartContainer config={config} className="mx-auto aspect-square h-[260px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
              <Pie data={data} dataKey="count" nameKey="key" innerRadius={60} strokeWidth={4}>
                {data.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} className="flex-wrap gap-2" />
            </PieChart>
          </ChartContainer>
        ) : (
          <EmptyState label="Nenhum veículo cadastrado" />
        )}
      </CardContent>
    </Card>
  )
}

/** Gastos agrupados por categoria (barras horizontais). */
export function ExpenseCategoryChart({ data }: { data: CategoryPoint[] }) {
  const config = { total: { label: 'Gastos', color: 'var(--chart-1)' } } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
        <CardDescription>Onde o dinheiro está sendo investido</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={config} className="h-[260px] w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 12, right: 40 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="category"
                type="category"
                tickLine={false}
                axisLine={false}
                width={110}
                fontSize={12}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [brl(Number(value)), ' Gastos']} />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={4}>
                <LabelList
                  dataKey="total"
                  position="right"
                  fontSize={11}
                  formatter={(v: number) => brlCompact(v)}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState label="Nenhum gasto registrado" />
        )}
      </CardContent>
    </Card>
  )
}

/** Estoque atual por marca (barras). */
export function StockBrandChart({ data }: { data: BrandPoint[] }) {
  const config = { count: { label: 'Veículos', color: 'var(--chart-4)' } } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estoque por marca</CardTitle>
        <CardDescription>Veículos disponíveis em estoque</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={config} className="h-[260px] w-full">
            <BarChart data={data} margin={{ left: 4, right: 12, top: 16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="brand" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} width={32} fontSize={12} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [String(value), ' veículos']} />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                <LabelList dataKey="count" position="top" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyState label="Nenhum veículo em estoque" />
        )}
      </CardContent>
    </Card>
  )
}
