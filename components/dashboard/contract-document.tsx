import {
  SALE_WARRANTY,
  formatCpf,
  formatCurrency,
  formatKm,
  formatPhone,
  longDatePt,
  normalizeSaleData,
  type ContractVehicle,
} from '@/lib/contracts'

interface ContractDocumentProps {
  title: string
  /** Snapshot do contrato. Aceita dados parciais (prévia) e o formato antigo. */
  data: unknown
  contractDate: string
}

const EMPTY_VEHICLE: ContractVehicle = {
  brand_model: '',
  renavam: '',
  plate: '',
  chassis: '',
  color: '',
  year: '',
  fuel: '',
  km: '',
}

/** Mostra "—" quando o campo ainda não foi preenchido, evitando linhas órfãs. */
function Val({ children }: { children?: string }) {
  const text = (children ?? '').trim()
  return <>{text || '—'}</>
}

/**
 * Larguras em colunas da grade de 4. Mapa fixo em vez de classe dinâmica
 * porque o Tailwind precisa ver a classe completa para gerá-la.
 */
const SPAN = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
} as const

/**
 * Par rótulo/valor posicionado numa grade de 4 colunas.
 *
 * A grade é o que garante o alinhamento: com `flex flex-wrap` cada valor ficava
 * com a largura do próprio texto e as colunas não casavam entre as linhas.
 */
function Field({
  label,
  value,
  span = 1,
}: {
  label: string
  value?: string
  span?: keyof typeof SPAN
}) {
  return (
    <div className={`${SPAN[span]} min-w-0`}>
      <span className="font-bold">{label}:</span>{' '}
      <span className="break-words">
        <Val>{value}</Val>
      </span>
    </div>
  )
}

/** Grade base dos blocos de dados: 4 colunas alinhadas em todo o documento. */
function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-x-3 gap-y-px">{children}</div>
}

function VehicleBlock({
  vehicle,
  index,
  total,
}: {
  vehicle: ContractVehicle
  index: number
  total: number
}) {
  return (
    <div className="break-inside-avoid border border-black/25 px-1.5 py-1">
      {total > 1 && <div className="mb-px font-bold">VEÍCULO {index + 1}</div>}
      <FieldGrid>
        <Field span={2} label="MARCA/MODELO" value={vehicle.brand_model} />
        <Field label="PLACA" value={vehicle.plate} />
        <Field label="ANO" value={vehicle.year} />
        <Field span={2} label="CHASSI" value={vehicle.chassis} />
        <Field label="RENAVAN" value={vehicle.renavam} />
        <Field label="COR" value={vehicle.color} />
        <Field span={2} label="COMBUSTÍVEL" value={vehicle.fuel} />
        <Field span={2} label="KM" value={formatKm(vehicle.km)} />
      </FieldGrid>
    </div>
  )
}

function SignatureLine({ name, caption, extra }: { name?: string; caption: string; extra?: string }) {
  return (
    <div className="break-inside-avoid">
      {/* Espaço em cima é onde a pessoa assina */}
      <div className="mt-5 border-t border-black" />
      {name && <div className="truncate font-semibold">{name}</div>}
      {extra && <div>{extra}</div>}
      <div>{caption}</div>
    </div>
  )
}

/** Assinatura de testemunha, com linhas para preencher à mão. */
function WitnessLine({ index }: { index: number }) {
  return (
    <div className="break-inside-avoid">
      <div className="mt-5 border-t border-black" />
      <div>TESTEMUNHA {index}</div>
      <div>NOME: ______________________</div>
      <div>CPF: _______________________</div>
    </div>
  )
}

/**
 * Fac-símile do contrato em papel: preto sobre branco em qualquer tema,
 * proporções A4 e quebras de página controladas para impressão/PDF.
 *
 * Tolera snapshots incompletos porque é o mesmo componente usado na prévia,
 * que roda com o formulário ainda pela metade.
 */
export function ContractDocument({ title, data, contractDate }: ContractDocumentProps) {
  const { buyer, vehicles, trade_ins, negotiation, delivery, store } = normalizeSaleData(data)
  const storeName = store.name || 'A LOJA'

  // Na prévia ainda pode não haver veículo escolhido: renderiza um bloco
  // vazio para o documento manter a estrutura em vez de "sumir".
  const soldList: ContractVehicle[] = vehicles.length > 0 ? vehicles : [EMPTY_VEHICLE]

  const isPlural = soldList.length > 1
  const kmLines = soldList.filter((v) => formatKm(v.km))

  return (
    <div
      className="contract-sheet mx-auto w-full max-w-[210mm] bg-white px-[11mm] py-[7mm] text-[9px] leading-[1.35] text-black shadow-sm print:max-w-none print:shadow-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Cabeçalho da loja. <img> puro para não depender de otimização/lazy
          loading na hora de imprimir. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/contract-header.png"
        alt="MCar Veículos"
        className="mb-1.5 block w-full"
        loading="eager"
      />

      <h1 className="mb-1.5 text-center text-[12px] font-bold tracking-tight">{title}</h1>

      {/* Comprador — mesma grade de 4 colunas dos veículos */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label="COMPRADOR" value={buyer.name} />
          <Field label="CPF" value={formatCpf(buyer.cpf)} />
          <Field label="TEL" value={formatPhone(buyer.phone)} />
          <Field span={3} label="ENDERECO" value={buyer.address} />
          <Field label="NASCIMENTO" value={longDatePt(buyer.birth_date)} />
        </FieldGrid>
      </section>

      {/* Cláusula 1ª — objeto */}
      <h2 className="font-bold">DO OBJETO DO CONTRATO</h2>
      <p className="mb-1">
        <strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO,{' '}
        {isPlural ? 'os veículos abaixo descriminados' : 'o veículo abaixo descriminado'}:
      </p>
      <section className="mb-1.5 space-y-1">
        {soldList.map((vehicle, i) => (
          <VehicleBlock key={i} vehicle={vehicle} index={i} total={soldList.length} />
        ))}
                {delivery.date && (
          <p className="font-semibold">
            VEÍCULO ENTREGUE NA DATA: {longDatePt(delivery.date)}
            {delivery.time ? ` ÀS ${delivery.time}` : ''}
          </p>
        )}
      </section>

      {/* Veículos recebidos na troca */}
      {trade_ins.length > 0 && (
        <section className="mb-1.5 space-y-1">
          <h3 className="font-bold">
            {trade_ins.length > 1 ? 'RECEBENDO OS VEICULOS:' : 'RECEBENDO O VEICULO:'}
          </h3>
          {trade_ins.map((vehicle, i) => (
            <VehicleBlock key={i} vehicle={vehicle} index={i} total={trade_ins.length} />
          ))}
        </section>
      )}

      {/* Cláusula 2ª — pagamento */}
      <p>
        <strong>Cláusula 2ª.</strong> O COMPRADOR pagará ao VENDEDOR, pela compra do veículo da
        seguinte forma.
      </p>
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <span className="font-bold">NEGOCIACAO:</span>{' '}
            <span className="break-words">
              <Val>{negotiation.summary}</Val>
            </span>
          </div>
          <div className="shrink-0 font-bold tabular-nums">
            VALOR DO VEÍCULO: {formatCurrency(negotiation.total_value)}
          </div>
        </div>
        {negotiation.observations && (
          <p className="whitespace-pre-wrap">
            <strong>OBS:</strong> {negotiation.observations}
          </p>
        )}
      </section>

      {/* Cláusulas fixas — o maior bloco de texto, em corpo menor */}
      <h2 className="font-bold">FICA COMBINADO ENTRE AS PARTES:</h2>
      <ol className="mb-2 space-y-0.5 text-justify text-[8px] leading-[1.3]">
        <li>
          A) A PARTIR DESTA DATA, TODO E QUALQUER DANO QUE DOS REFERIDOS VEÍCULO VENHA CAUSAR A
          TERCEIROS, FICARÁ DE RESPONSABILIDADE CIVIL E CRIMINAL DO COMPRADOR E TAMBÉM A PONTUAÇÃO
          JUNTO AO DETRAN.
        </li>
        <li>
          B) É DE RESPONSABILIDADE DO VENDEDOR NESSE ATO A QUITAÇÃO DE TODAS AS MULTAS DE TRÂNSITO,
          IPVA, LICENCIAMENTO E RESTRIÇÃO DE ALIENAÇÃO QUE O REFERIDO VEÍCULO VENHA TER NO DETRAN OU
          EM OUTROS ÓRGÃOS OU BLOQUEIOS JUDICIAIS ATÉ A DATA DA VENDA.
        </li>
        <li>
          C) O COMPRADOR RECEBE O VEÍCULO NO ESTADO QUE SE ENCONTRA EXAMINADO PELO O SEU MECÂNICO DE
          SUA CONFIANÇA NESTA DATA. NÃO ACEITAMOS RECLAMAÇÕES POSTERIORES.
        </li>
        <li>
          D) A TRANSFERÊNCIA DO VEÍCULO SERÁ ENTREGUE AO COMPRADOR MEDIANTE QUITAÇÃO TOTAL DO
          VEÍCULO.
        </li>
        <li>
          E) EM CASO DE VEÍCULOS DADOS DE ENTRADA A LOJA ASSUME O COMPROMISSO DE NOTIFICAR AO COMPRADOR PROPRIETARIO DO VEÍCULO ENTREGUE O VALOR DE MULTAS OU BLOQUEIOS ACONTECIDAS ANTERIORMENTE, PORÉM AINDA NÃO CADASTRADAS NAQUELA OCASIÃO PELO OS
          ÓRGÃO DE COMPETÊNCIA, AS QUAIS DEVERÃO SER PAGAS NO PRAZO DE 5 (CINCO) DIAS A CONTAR DO
          RECEBIMENTO DO AVISO, **EM CASO DE INADIMPLEMENTO, O COMPRADOR SERÁ CONSTITUÍDO EM MORA, FICANDO A LOJA AUTORIZADA A REALIZAR A COBRANÇA DO DÉBITO, INCLUSIVE POR MEIO DE BOLETO, BEM COMO A ADOTAR AS MEDIDAS JUDICIAIS E EXTRAJUDICIAIS CABÍVEIS, INCLUINDO, QUANDO LEGALMENTE ADMISSÍVEL, A INSCRIÇÃO DO DÉBITO NOS ÓRGÃOS DE PROTEÇÃO AO CRÉDITO.
        </li>
        <li>
          F) GARANTIA DO VEÍCULO USADO: DECLARA O COMPRADOR QUE CONCORDA E ACEITA A GARANTIA
          DECLARADA E ASSUMIDA PELA LOJA, NESTE INSTRUMENTO, QUAL SEJA DE {SALE_WARRANTY.days} (
          {SALE_WARRANTY.daysText}) DIAS OU {SALE_WARRANTY.km.toLocaleString('pt-BR')} KM (O QUE
          OCORRER PRIMEIRO), A PARTIR DA DATA DO RECEBIMENTO DO VEÍCULO, REFERENTE A MOTOR (BLOCO) E
          CAMBIO (CAIXA DE MARCHA), QUE EM SERVIÇO E USO NORMAL APRESENTA DEFEITO DE FUNCIONAMENTO
          POR LAUDO TÉCNICO EMITIDO PELA {storeName}; A GARANTIA ESTÁ AUTOMATICAMENTE CANCELADA SE O
          VEÍCULO FOR SUBMETIDO E SOBRECARGA OU ACIDENTES OU QUALQUER TIPO DE MAU USO, USADO PARA
          COMPETIÇÃO DIVERSAS, SE A MANUTENÇÃO FOR NEGLIGENCIADA, SE A ESTRUTURA TÉCNICA OU MECÂNICA
          FOR MODIFICADA, SE HOUVER MODIFICAÇÃO DO COMBUSTÍVEL DE PROPULSÃO DO SISTEMA DE MOTOR E SE
          OS SERVIÇOS COBERTOS PELA GARANTIA FOREM EXECUTADOS POR OFICINAS NÃO AUTORIZADA PRÉVIA E
          EXPRESSAMENTE (POR ESCRITO) PELA {storeName}.
        </li>
        {kmLines.length > 0 && (
          <li>
            G){' '}
            {kmLines.length === 1
              ? `VEICULO SAI DA LOJA O VEICULO COM ${formatKm(kmLines[0].km)} KM`
              : `VEICULOS SAEM DA LOJA COM A SEGUINTE QUILOMETRAGEM: ${kmLines
                  .map((v) => `${v.brand_model || 'VEÍCULO'} — ${formatKm(v.km)} KM`)
                  .join('; ')}`}
          </li>
        )}
      </ol>

      {/* Local e data */}
      <p className="mb-1 font-semibold">
        {store.city || 'FORTALEZA'}, {longDatePt(contractDate)}
      </p>

      {/* Assinaturas em 2x2. Sem prefixo responsivo (`sm:`) de propósito: a
          folha tem largura fixa de 210mm, então um breakpoint de viewport
          faria o PDF sair diferente conforme o tamanho da janela. */}
      <section className="grid grid-cols-2 gap-x-10 gap-y-1">
        <SignatureLine name={store.seller_name} caption="VENDEDOR" />
        <SignatureLine
          name={buyer.name}
          extra={buyer.cpf ? `CPF: ${formatCpf(buyer.cpf)}` : undefined}
          caption="COMPRADOR"
        />
        <WitnessLine index={1} />
        <WitnessLine index={2} />
      </section>
    </div>
  )
}
