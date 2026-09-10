import { longDatePt } from '@/lib/contracts'

/**
 * Uma linha da tabela do demonstrativo: um mês selecionado e o faturamento
 * líquido daquele mês (vendas + repasses − devoluções).
 */
export interface StatementRow {
  key: string
  monthName: string
  year: number
  amount: number
}

/**
 * Dados fixos da empresa, no mesmo padrão do cabeçalho dos contratos
 * (SIGNAL_BANK_INFO em contract-document). Ficam aqui porque são imutáveis e
 * específicos do papel timbrado da MCar.
 */
const COMPANY = {
  legalName: 'M CAR VEICULOS - ARLENE FREIRE SOUSA ME',
  cnpj: 'CNPJ: 23.760.314/0001-98',
  municipal: 'Inscrição Municipal: 458281-0',
  estadual: 'Inscrição Estadual: 064.787.494',
  address: 'Av. Américo Barreira, 536 - Demócrito Rocha - Fortaleza/CE - CEP: 60.440-092',
  owner: 'Arlene Freire Sousa',
}

/** Número em pt-BR sem "R$", como no demonstrativo em papel (ex.: 965.700,00). */
function formatAmount(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Folha A4 do Demonstrativo de Faturamento, montada para ser rasterizada em PDF
 * pela mesma rotina dos contratos (`downloadContractPdf`), que procura o nó
 * `.contract-sheet`. Preto sobre branco, fonte Arial e largura fixa de 210mm
 * para o PDF sair idêntico independente da janela.
 */
export function RevenueStatementSheet({
  rows,
  generatedDate,
}: {
  rows: StatementRow[]
  generatedDate?: string
}) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  const count = rows.length
  const monthWord = count === 1 ? 'mês' : 'meses'
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
        Demonstrativo de Faturamento
      </h1>

      <p className="mb-3 text-center">
        Faturamento de vendas do período de {count} {monthWord}.
      </p>

      {/* Tabela mês / ano / faturamento */}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-left font-bold uppercase">
              Mês
            </th>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-center font-bold uppercase">
              Ano
            </th>
            <th className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-right font-bold uppercase">
              Faturamento
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="border border-black/70 px-3 py-1.5 uppercase">{row.monthName}</td>
              <td className="border border-black/70 px-3 py-1.5 text-center tabular-nums">
                {row.year}
              </td>
              <td className="border border-black/70 px-3 py-1.5 text-right tabular-nums">
                {formatAmount(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={2}
              className="border border-black/70 bg-black/[0.06] px-3 py-1.5 font-bold uppercase"
            >
              Total do período dos {count} {monthWord}
            </td>
            <td className="border border-black/70 bg-black/[0.06] px-3 py-1.5 text-right font-bold tabular-nums">
              {formatAmount(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Local e data */}
      <p className="mb-16 mt-8 text-center font-semibold uppercase">
        Fortaleza, {longDatePt(today)}
      </p>

      {/* Duas assinaturas: proprietária e contador */}
      <section className="grid grid-cols-2 gap-x-16">
        <div className="text-center">
          <div className="mb-1 border-t border-black/80" />
          <p className="font-bold uppercase">{COMPANY.legalName}</p>
          <p>{COMPANY.cnpj}</p>
          <p className="mt-1">{COMPANY.owner}</p>
          <p className="font-semibold uppercase">Proprietária</p>
        </div>
        <div className="text-center">
          <div className="mb-1 border-t border-black/80" />
          <p className="mt-1 font-semibold uppercase">Contador</p>
        </div>
      </section>
    </div>
  )
}
