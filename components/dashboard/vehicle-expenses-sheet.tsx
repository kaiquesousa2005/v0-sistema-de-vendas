import { longDatePt } from '@/lib/contracts'

/** Uma linha da tabela: um gasto registrado no veículo. */
export interface ExpenseRow {
  id: number
  date: string
  category: string
  description: string
  value: number
}

/** Cabeçalho do veículo exibido no relatório. */
export interface VehicleHeader {
  brand: string
  model: string
  version?: string
  plate: string
  manufacture_year: number
  model_year: number
  renavam?: string
  chassis?: string
}

/**
 * Dados fixos da empresa, no mesmo padrão do demonstrativo de faturamento
 * (revenue-statement-sheet). Papel timbrado imutável da MCar.
 */
const COMPANY = {
  legalName: 'M CAR VEICULOS - ARLENE FREIRE SOUSA ME',
  cnpj: 'CNPJ: 23.760.314/0001-98',
  municipal: 'Inscrição Municipal: 458281-0',
  estadual: 'Inscrição Estadual: 064.787.494',
  address: 'Av. Américo Barreira, 536 - Demócrito Rocha - Fortaleza/CE - CEP: 60.440-092',
}

/** Número em pt-BR sem "R$" (ex.: 1.250,00). */
function formatAmount(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Data curta pt-BR a partir de "YYYY-MM-DD" sem deixar o fuso recuar o dia. */
function shortDate(value: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

/**
 * Folha A4 do Relatório de Gastos do veículo, rasterizada em PDF pela mesma
 * rotina dos contratos (`downloadContractPdf`, que procura o nó
 * `.contract-sheet`). Preto sobre branco, Arial e largura fixa de 210mm.
 */
export function VehicleExpensesSheet({
  vehicle,
  rows,
  generatedDate,
}: {
  vehicle: VehicleHeader | null
  rows: ExpenseRow[]
  generatedDate?: string
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  const count = rows.length
  const today = generatedDate ?? new Date().toISOString().slice(0, 10)

  return (
    <div
      className="contract-sheet mx-auto w-full max-w-[210mm] bg-white px-[16mm] py-[12mm] text-[11px] leading-[1.4] text-black"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Banner da loja */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/contract-header.png"
        alt="MCar Veículos"
        className="mx-auto mb-4 block w-[70%]"
        loading="eager"
      />

      {/* Dados cadastrais da empresa */}
      <div className="mb-6 text-center leading-[1.5]">
        <p className="font-bold">{COMPANY.legalName}</p>
        <p>{COMPANY.cnpj}</p>
        <p>
          {COMPANY.municipal} &nbsp;|&nbsp; {COMPANY.estadual}
        </p>
        <p>{COMPANY.address}</p>
      </div>

      <h1 className="mb-4 text-center text-[15px] font-bold uppercase tracking-tight">
        Relatório de Gastos do Veículo
      </h1>

      {/* Identificação do veículo */}
      {vehicle && (
        <div className="mb-4 border border-black/70">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3">
            <p>
              <span className="font-bold uppercase">Veículo: </span>
              {vehicle.brand} {vehicle.model}
              {vehicle.version ? ` — ${vehicle.version}` : ''}
            </p>
            <p>
              <span className="font-bold uppercase">Placa: </span>
              {vehicle.plate}
            </p>
            <p>
              <span className="font-bold uppercase">Ano: </span>
              {vehicle.manufacture_year}/{vehicle.model_year}
            </p>
            {vehicle.renavam && (
              <p>
                <span className="font-bold uppercase">RENAVAM: </span>
                {vehicle.renavam}
              </p>
            )}
            {vehicle.chassis && (
              <p className="col-span-2">
                <span className="font-bold uppercase">Chassis: </span>
                {vehicle.chassis}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabela de gastos */}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-left font-bold uppercase">
              Data
            </th>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-left font-bold uppercase">
              Categoria
            </th>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-left font-bold uppercase">
              Descrição
            </th>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-right font-bold uppercase">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="border border-black/70 px-3 py-4 text-center italic"
              >
                Nenhum gasto registrado para este veículo.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-black/70 px-3 py-1.5 whitespace-nowrap tabular-nums">
                  {shortDate(row.date)}
                </td>
                <td className="border border-black/70 px-3 py-1.5">{row.category}</td>
                <td className="border border-black/70 px-3 py-1.5">{row.description}</td>
                <td className="border border-black/70 px-3 py-1.5 text-right tabular-nums">
                  {formatAmount(row.value)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={3}
              className="border border-black/70 bg-black/[0.06] px-3 py-1.5 font-bold uppercase"
            >
              Total de gastos ({count} {count === 1 ? 'item' : 'itens'})
            </td>
            <td className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-right font-bold tabular-nums">
              {formatAmount(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Local e data */}
      <p className="mt-8 text-center font-semibold uppercase">
        Fortaleza, {longDatePt(today)}
      </p>
    </div>
  )
}
