import {
  SALE_WARRANTY,
  contractRoles,
  formatCpf,
  formatCurrency,
  formatKm,
  formatPhone,
  longDatePt,
  normalizeSaleData,
  type ContractType,
  type ContractVehicle,
} from '@/lib/contracts'

interface ContractDocumentProps {
  title: string
  /** Snapshot do contrato. Aceita dados parciais (prévia) e o formato antigo. */
  data: unknown
  contractDate: string
  /** Define os papéis das partes e o conjunto de cláusulas. */
  type: ContractType
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
 * Cláusulas do contrato de venda (loja vende ao cliente).
 *
 * Retornadas em lista, sem a letra: quem renderiza numera conforme a posição,
 * então incluir ou remover uma cláusula não deixa buraco na sequência.
 */
function saleClauses(storeName: string): React.ReactNode[] {
  return [
    <>
      A PARTIR DESTA DATA, TODO E QUALQUER DANO QUE DOS REFERIDOS VEÍCULO VENHA CAUSAR A TERCEIROS,
      FICARÁ DE RESPONSABILIDADE CIVIL E CRIMINAL DO COMPRADOR E TAMBÉM A PONTUAÇÃO JUNTO AO DETRAN.
    </>,
    <>
      É DE RESPONSABILIDADE DO VENDEDOR NESSE ATO A QUITAÇÃO DE TODAS AS MULTAS DE TRÂNSITO, IPVA,
      LICENCIAMENTO E RESTRIÇÃO DE ALIENAÇÃO QUE O REFERIDO VEÍCULO VENHA TER NO DETRAN OU EM OUTROS
      ÓRGÃOS OU BLOQUEIOS JUDICIAIS ATÉ A DATA DA VENDA.
    </>,
    <>
      O COMPRADOR RECEBE O VEÍCULO NO ESTADO QUE SE ENCONTRA EXAMINADO PELO O SEU MECÂNICO DE SUA
      CONFIANÇA NESTA DATA. NÃO ACEITAMOS RECLAMAÇÕES POSTERIORES.
    </>,
    <>A TRANSFERÊNCIA DO VEÍCULO SERÁ ENTREGUE AO COMPRADOR MEDIANTE QUITAÇÃO TOTAL DO VEÍCULO.</>,
    <>
      EM CASO DE VEÍCULOS DADOS DE ENTRADA A LOJA ASSUME O COMPROMISSO DE NOTIFICAR AO COMPRADOR
      PROPRIETARIO DO VEÍCULO ENTREGUE O VALOR DE MULTAS OU BLOQUEIOS ACONTECIDAS ANTERIORMENTE,
      PORÉM AINDA NÃO CADASTRADAS NAQUELA OCASIÃO PELO OS ÓRGÃO DE COMPETÊNCIA, AS QUAIS DEVERÃO SER
      PAGAS NO PRAZO DE 5 (CINCO) DIAS A CONTAR DO RECEBIMENTO DO AVISO, EM CASO DE INADIMPLEMENTO, O
      COMPRADOR SERÁ CONSTITUÍDO EM MORA, FICANDO A LOJA AUTORIZADA A REALIZAR A COBRANÇA DO DÉBITO,
      INCLUSIVE POR MEIO DE BOLETO, BEM COMO A ADOTAR AS MEDIDAS JUDICIAIS E EXTRAJUDICIAIS CABÍVEIS,
      INCLUINDO, QUANDO LEGALMENTE ADMISSÍVEL, A INSCRIÇÃO DO DÉBITO NOS ÓRGÃOS DE PROTEÇÃO AO
      CRÉDITO.
    </>,
    <>
      GARANTIA DO VEÍCULO USADO: DECLARA O COMPRADOR QUE CONCORDA E ACEITA A GARANTIA DECLARADA E
      ASSUMIDA PELA LOJA, NESTE INSTRUMENTO, QUAL SEJA DE {SALE_WARRANTY.days} (
      {SALE_WARRANTY.daysText}) DIAS OU {SALE_WARRANTY.km.toLocaleString('pt-BR')} KM (O QUE OCORRER
      PRIMEIRO), A PARTIR DA DATA DO RECEBIMENTO DO VEÍCULO, REFERENTE A MOTOR (BLOCO) E CAMBIO
      (CAIXA DE MARCHA), QUE EM SERVIÇO E USO NORMAL APRESENTA DEFEITO DE FUNCIONAMENTO POR LAUDO
      TÉCNICO EMITIDO PELA {storeName}; A GARANTIA ESTÁ AUTOMATICAMENTE CANCELADA SE O VEÍCULO FOR
      SUBMETIDO E SOBRECARGA OU ACIDENTES OU QUALQUER TIPO DE MAU USO, USADO PARA COMPETIÇÃO
      DIVERSAS, SE A MANUTENÇÃO FOR NEGLIGENCIADA, SE A ESTRUTURA TÉCNICA OU MECÂNICA FOR MODIFICADA,
      SE HOUVER MODIFICAÇÃO DO COMBUSTÍVEL DE PROPULSÃO DO SISTEMA DE MOTOR E SE OS SERVIÇOS COBERTOS
      PELA GARANTIA FOREM EXECUTADOS POR OFICINAS NÃO AUTORIZADA PRÉVIA E EXPRESSAMENTE (POR ESCRITO)
      PELA {storeName}.
    </>,
  ]
}

/**
 * Cláusulas do contrato de compra (loja compra do cliente).
 *
 * Sem cláusula de garantia de propósito: quem vende aqui é o cliente, pessoa
 * física, que não assume garantia de motor e câmbio. Em troca entra a cláusula
 * de regularização de numeração de motor/chassi, que na compra é risco da loja.
 */
function purchaseClauses(): React.ReactNode[] {
  return [
    <>
      A PARTIR DESTA DATA, TODO E QUALQUER DANO QUE DOS REFERIDOS VEÍCULO VENHA CAUSAR A TERCEIROS,
      FICARÁ DE RESPONSABILIDADE CIVIL E CRIMINAL DO COMPRADOR E TAMBÉM A PONTUAÇÃO JUNTO AO DETRAN.
    </>,
    <>
      É DE RESPONSABILIDADE DO VENDEDOR NESSE ATO A QUITAÇÃO DE TODAS AS MULTAS DE TRÂNSITO, IPVA,
      LICENCIAMENTO E RESTRIÇÃO DE ALIENAÇÃO QUE O REFERIDO VEÍCULO VENHA TER NO DETRAN E EM OUTROS
      ÓRGÃOS OU BLOQUEIOS JUDICIAIS ATÉ A DATA DA VENDA. EM CASO DE NÃO PODER SER RESOLVIDO EM TEMPO
      AGIO PARA O COMPRADOR, FICA ASSIM O VENDEDOR DE ARCA COM AS CUSTA FEITAS NO VEICULO E DEVOLUÇAO
      DO VALOR.
    </>,
    <>
      O COMPRADOR RECEBE O VEÍCULO NO ESTADO QUE SE ENCONTRA EXAMINADO PELO O SEU MECÂNICO DE SUA
      CONFIANÇA NESTA DATA.
    </>,
    <>A TRANSFERÊNCIA DO VEÍCULO SERÁ ENTREGUE AO COMPRADOR MEDIANTE QUITAÇÃO TOTAL DO VEÍCULO.</>,
    <>
      A COMPRADORA ASSUME O COMPROMISSO DE NOTIFICAR O VENDEDOR, DA EXISTÊNCIA DE INFRAÇÕES OCORRIDAS
      ANTES DA DATA DESTA VENDA, PORÉM AINDA NÃO CADASTRADAS NAQUELA OCASIÃO DA COMPRA PELO OS ÓRGÃO
      DE COMPETÊNCIA, AS QUAIS DEVERÃO SER PAGAS NO PRAZO DE 5 (CINCO) DIAS A CONTAR DO RECEBIMENTO
      DO AVISO OU PELA A COMUNICAÇÃO DA LOJA VENDEDOR, SOB PENA DE RESTAR CONSTITUÍDA A MORA DO
      VENDEDOR E DAR AZO A EXECUÇÃO EXTRAJUDICIAL. CASO A LOJA PAGUE A MULTA PARA NÃO IMPEDIR SUA
      NEGOCIAÇÃO, A LOJA FICA AUTORIZADA A EMITIR UM BOLETO REFERENTE A MULTA NÃO PAGA E ENVIAR AO
      VENDEDOR OU PROPRIETÁRIO PARA PAGAMENTO NESSE PERÍODO DE 5 DIAS, EM CASO DE NÃO PAGAMENTO SEU
      NOME PODERÁ SER NEGATIVADO NO SERASA. PARA EVITAR ESSE TRANSTORNO EFETUE O PAGAMENTO.
    </>,
    <>
      CASO AJA PROBLEMAS NO ATO DA TRANSFERÊNCIA DO VEICULO, COMO NUMERAÇÃO DE MOTOR OU CHASSI FICA
      DE RESPONSABILIDADE DO VENDEDOR OU PROPRIETARIO DO VEICULO CORRIGIR E FAZER ASSIM SUA
      REGULARIZAÇÃO AOS ORGÃO COMPETENTES, NÃO GERANDO CUSTOS AO COMPRADOR.
    </>,
  ]
}

/**
 * Cláusulas do contrato de repasse (loja vende sem garantia).
 *
 * Estrutura da venda, com três diferenças que vêm do recibo em papel: o
 * comprador não pode reclamar depois porque o carro saiu abaixo do valor de
 * mercado, as custas de transferência e regularização ficam com ele, e a última
 * cláusula declara expressamente a ausência de garantia da loja.
 */
function transferClauses(): React.ReactNode[] {
  return [
    <>
      A PARTIR DESTA DATA, TODO E QUALQUER DANO QUE DOS REFERIDOS VEÍCULO VENHA CAUSAR A TERCEIROS,
      FICARÁ DE RESPONSABILIDADE CIVIL E CRIMINAL DO COMPRADOR E TAMBÉM A PONTUAÇÃO JUNTO AO DETRAN.
    </>,
    <>
      É DE RESPONSABILIDADE DO VENDEDOR A QUITAÇÃO DE TODAS AS MULTAS DE TRÂNSITO, IPVA,
      LICENCIAMENTO E RESTRIÇÃO DE ALIENAÇÃO QUE O REFERIDO VEÍCULO VENHA TER NO DETRAN OU EM OUTROS
      ÓRGÃOS ATÉ A DATA DA VENDA.
    </>,
    <>
      O COMPRADOR RECEBE O VEÍCULO NO ESTADO QUE SE ENCONTRA EXAMINADO PELO O SEU MECÂNICO DE SUA
      CONFIANÇA NESTA DATA. NÃO ACEITAMOS RECLAMAÇÕES POSTERIORES VEICULO USADO E REPASSADO ABAIXO DO
      VALOR DO MERCADO.
    </>,
    <>
      A TRANSFERÊNCIA DO VEÍCULO SERÁ ENTREGUE AO COMPRADOR MEDIANTE QUITAÇÃO TOTAL DO VEÍCULO. E O
      CLIENTE ARCA COM AS CUSTA DE TRANSFERÊNCIA E REGULARIZAÇÃO PARA O SEU NOME OU PESSOA INDICADA.
    </>,
    <>CARRO DE REPASSE SEM NENHUMA GARANTIA DA LOJA.</>,
  ]
}

/** Letras das cláusulas: A), B), C)… conforme a posição na lista. */
function clauseLetter(index: number) {
  return String.fromCharCode(65 + index)
}

/**
 * Fac-símile do contrato em papel: preto sobre branco em qualquer tema,
 * proporções A4 e quebras de página controladas para impressão/PDF.
 *
 * Tolera snapshots incompletos porque é o mesmo componente usado na prévia,
 * que roda com o formulário ainda pela metade.
 */
export function ContractDocument({ title, data, contractDate, type }: ContractDocumentProps) {
  const { buyer, vehicles, trade_ins, negotiation, delivery, store } = normalizeSaleData(data)
  const storeName = store.name || 'A LOJA'
  const roles = contractRoles(type)
  const isPurchase = roles.storeIsBuyer

  // Na prévia ainda pode não haver veículo escolhido: renderiza um bloco
  // vazio para o documento manter a estrutura em vez de "sumir".
  const soldList: ContractVehicle[] = vehicles.length > 0 ? vehicles : [EMPTY_VEHICLE]

  const isPlural = soldList.length > 1
  const kmLines = soldList.filter((v) => formatKm(v.km))
  const clauses =
    type === 'compra'
      ? purchaseClauses()
      : type === 'repasse'
        ? transferClauses()
        : saleClauses(storeName)

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
        className="mb-1.5 block w-[60%] mx-auto"
        loading="eager"
      />

      <h1 className="mb-1.5 text-center text-[12px] font-bold tracking-tight">{title}</h1>

      {/* Cliente — COMPRADOR na venda e no repasse, VENDEDOR na compra. Mesma
          grade de 4 colunas dos veículos. O RG entra nos tipos cujo recibo em
          papel pede o documento do cliente. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label={roles.customer} value={buyer.name} />
          <Field label="CPF" value={formatCpf(buyer.cpf)} />
          <Field label="TEL" value={formatPhone(buyer.phone)} />
          {roles.showsRg && <Field label="RG" value={buyer.rg} />}
          <Field span={roles.showsRg ? 2 : 3} label="ENDERECO" value={buyer.address} />
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

      {/* Veículos recebidos na troca — não existe na compra, onde a loja é a
          parte que paga e não há veículo dado como entrada. */}
      {roles.hasTradeIns && trade_ins.length > 0 && (
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
        <strong>Cláusula 2ª.</strong>{' '}
        {isPurchase
          ? 'A COMPRADORA pagará ao VENDEDOR, pela compra do veículo da seguinte forma.'
          : 'O COMPRADOR pagará ao VENDEDOR, pela compra do veículo da seguinte forma.'}
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
            VALOR: {formatCurrency(negotiation.total_value)}
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
        {clauses.map((clause, i) => (
          <li key={i}>
            {clauseLetter(i)}) {clause}
          </li>
        ))}
        {/* Quilometragem: na venda registra com quanto o carro saiu; na compra,
            com quanto entrou. Sempre a última letra da sequência. */}
        {kmLines.length > 0 && (
          <li>
            {clauseLetter(clauses.length)}){' '}
            {kmLines.length === 1
              ? isPurchase
                ? `VEICULO ENTRA NA LOJA COM ${formatKm(kmLines[0].km)} KM`
                : `VEICULO SAI DA LOJA O VEICULO COM ${formatKm(kmLines[0].km)} KM`
              : `${
                  isPurchase ? 'VEICULOS ENTRAM NA LOJA' : 'VEICULOS SAEM DA LOJA'
                } COM A SEGUINTE QUILOMETRAGEM: ${kmLines
                  .map((v) => `${v.brand_model || 'VEÍCULO'} — ${formatKm(v.km)} KM`)
                  .join('; ')}`}
          </li>
        )}
      </ol>

      {/* Local e data */}
      <p className="mb-1 text-center font-semibold">
        {store.city || 'FORTALEZA'}, {longDatePt(contractDate)}
      </p>

      {/* Assinaturas em 2x2. Sem prefixo responsivo (`sm:`) de propósito: a
          folha tem largura fixa de 210mm, então um breakpoint de viewport
          faria o PDF sair diferente conforme o tamanho da janela. */}
      <section className="grid grid-cols-2 gap-x-10 gap-y-1">
        {/* Na compra o cliente assina primeiro, como VENDEDOR, seguido do
            representante da loja — a ordem do recibo em papel. */}
        {isPurchase ? (
          <>
            <SignatureLine
              name={buyer.name}
              extra={buyer.cpf ? `CPF: ${formatCpf(buyer.cpf)}` : undefined}
              caption={roles.customer}
            />
            <SignatureLine name={store.seller_name} caption={roles.store}/>
          </>
        ) : (
          <>
            <SignatureLine name={store.seller_name} caption={roles.store} />
            <SignatureLine
              name={buyer.name}
              extra={buyer.cpf ? `CPF: ${formatCpf(buyer.cpf)}` : undefined}
              caption={roles.customer}
            />
          </>
        )}
        <WitnessLine index={1} />
        <WitnessLine index={2} />
      </section>
    </div>
  )
}
