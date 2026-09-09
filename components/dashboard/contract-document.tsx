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

/**
 * Cláusulas do contrato de consignação, reescritas para dar à loja
 * (CONSIGNATÁRIA) o máximo de liberdade na venda: negociar preço/prazo/forma de
 * pagamento livremente, conceder descontos, expor e anunciar o veículo, ficar
 * com o ágio acima do valor acertado e transferir direto ao comprador final.
 * As responsabilidades por multas, IPVA e débitos permanecem com o consignante.
 */
function consignmentClauses(storeName: string): React.ReactNode[] {
  return [
    <>
      O CONSIGNANTE AUTORIZA, EM CARÁTER IRREVOGÁVEL DURANTE A VIGÊNCIA DESTE INSTRUMENTO, A
      CONSIGNATÁRIA {storeName} A PROMOVER A VENDA DO VEÍCULO OBJETO DESTE CONTRATO, PODENDO
      NEGOCIAR LIVREMENTE PREÇO, PRAZO E FORMA DE PAGAMENTO COM O COMPRADOR FINAL, INCLUSIVE
      CONCEDER DESCONTOS E ACEITAR VEÍCULO COMO PARTE DO PAGAMENTO, DESDE QUE RESGUARDADO O VALOR
      LÍQUIDO ACERTADO A SER REPASSADO AO CONSIGNANTE.
    </>,
    <>
      O CONSIGNANTE DECLARA, SOB AS PENAS DA LEI, SER O LEGÍTIMO PROPRIETÁRIO OU ESTAR DEVIDAMENTE
      AUTORIZADO PELO PROPRIETÁRIO A CONSIGNAR O VEÍCULO, RESPONDENDO CIVIL E CRIMINALMENTE PELA
      VERACIDADE DESTA DECLARAÇÃO E PELA ORIGEM E REGULARIDADE DO BEM.
    </>,
    <>
      O CONSIGNANTE RESPONSABILIZA-SE POR TODAS AS MULTAS, SEJAM FEDERAIS, ESTADUAIS OU MUNICIPAIS,
      IPVA, LICENCIAMENTO E DEMAIS DÉBITOS QUE CONSTEM SOBRE O VEÍCULO ATÉ A DATA DA VENDA, FICANDO
      A CONSIGNATÁRIA DESDE JÁ AUTORIZADA A DESCONTAR TAIS VALORES DO MONTANTE A SER REPASSADO.
    </>,
    <>
      MULTAS OU DÉBITOS LANÇADOS APÓS A VENDA, MAS REFERENTES A PERÍODO ANTERIOR A ELA, PERMANECEM
      DE RESPONSABILIDADE DO CONSIGNANTE, QUE DEVERÁ QUITÁ-LOS E PROMOVER A TRANSFERÊNCIA DE
      PONTUAÇÃO JUNTO AOS ÓRGÃOS COMPETENTES, PODENDO RESPONDER JUDICIALMENTE EM CASO DE
      INADIMPLÊNCIA.
    </>,
    <>
      O VEÍCULO PERMANECERÁ SOB GUARDA E RESPONSABILIDADE DA CONSIGNATÁRIA ATÉ A VENDA OU SUA
      DEVOLUÇÃO, FICANDO ESTA AUTORIZADA A EXPOR, ANUNCIAR E DIVULGAR O VEÍCULO EM QUALQUER MEIO OU
      LOCAL, BEM COMO A REALIZAR DEMONSTRAÇÕES E TEST-DRIVE SUPERVISIONADO COM POSSÍVEIS COMPRADORES.
    </>,
    <>
      DURANTE A VIGÊNCIA DESTE CONTRATO O CONSIGNANTE NÃO PODERÁ VENDER O VEÍCULO POR CONTA PRÓPRIA
      NEM RETIRÁ-LO SEM AVISO PRÉVIO DE 5 (CINCO) DIAS; CASO O RETIRE ANTES DA VENDA, ARCARÁ COM AS
      DESPESAS COMPROVADAMENTE REALIZADAS PELA CONSIGNATÁRIA COM PREPARAÇÃO, ANÚNCIOS E DIVULGAÇÃO.
    </>,
    <>
      QUALQUER VALOR OBTIDO NA VENDA ACIMA DO VALOR LÍQUIDO ACERTADO COM O CONSIGNANTE CABERÁ
      INTEGRALMENTE À CONSIGNATÁRIA, A TÍTULO DE REMUNERAÇÃO PELA INTERMEDIAÇÃO E PELOS SERVIÇOS
      PRESTADOS, NADA MAIS PODENDO SER RECLAMADO PELO CONSIGNANTE A ESSE TÍTULO.
    </>,
    <>
      A CONSIGNATÁRIA FICA AUTORIZADA A RECEBER DO COMPRADOR FINAL O PAGAMENTO DO VEÍCULO E A
      PROMOVER A DOCUMENTAÇÃO E A TRANSFERÊNCIA DIRETAMENTE PARA O COMPRADOR OU PARA QUEM ESTE
      INDICAR, INDEPENDENTEMENTE DE NOVA ANUÊNCIA DO CONSIGNANTE.
    </>,
    <>
      O(A) CONSIGNANTE RECONHECE QUE O PRESENTE INSTRUMENTO É FIRMADO NOS TERMOS DO ARTIGO 585, II,
      DO CÓDIGO DE PROCESSO CIVIL, CONSTITUINDO TÍTULO EXECUTIVO EXTRAJUDICIAL.
    </>,
  ]
}

/**
 * Cláusulas do contrato de devolução, redigidas para proteger a loja ao máximo.
 *
 * Registram que a compra foi presencial (sem direito de arrependimento do art.
 * 49 do CDC), que a devolução é feita por mera liberalidade da loja, que o
 * veículo é recebido no estado em que se encontra e — o ponto crítico — que a
 * devolução só é aceita com o veículo TOTALMENTE QUITADO, ficando todos os
 * juros e encargos do financiamento por conta exclusiva do comprador. Fecham
 * com a quitação plena e irrevogável dando à loja segurança jurídica.
 */
function returnClauses(storeName: string): React.ReactNode[] {
  return [
    <>
      AS PARTES DECLARAM QUE A COMPRA E VENDA DO VEÍCULO ACIMA DESCRITO FOI REALIZADA DE FORMA
      PRESENCIAL, NO ESTABELECIMENTO DA {storeName}, TENDO O COMPRADOR VISTORIADO, TESTADO E EXAMINADO
      O VEÍCULO POR MECÂNICO DE SUA CONFIANÇA ANTES DA AQUISIÇÃO. POR NÃO SE TRATAR DE COMPRA REALIZADA
      FORA DO ESTABELECIMENTO COMERCIAL OU À DISTÂNCIA, NÃO SE APLICA O DIREITO DE ARREPENDIMENTO
      PREVISTO NO ARTIGO 49 DO CÓDIGO DE DEFESA DO CONSUMIDOR.
    </>,
    <>
      O COMPRADOR RECONHECE QUE A LOJA NÃO TEM QUALQUER OBRIGAÇÃO LEGAL OU CONTRATUAL DE ACEITAR A
      DEVOLUÇÃO DO VEÍCULO. A LOJA, EXCLUSIVAMENTE POR MERA LIBERALIDADE E COMO ATO DE CORTESIA, ACEITA
      RECEBER O VEÍCULO DE VOLTA, SEM QUE ISSO CONSTITUA RECONHECIMENTO DE VÍCIO, DEFEITO OU CULPA, NEM
      GERE PRECEDENTE OU OBRIGAÇÃO PARA FUTURAS NEGOCIAÇÕES.
    </>,
    <>
      A LOJA RECEBE O VEÍCULO NO ESTADO FÍSICO, MECÂNICO E DOCUMENTAL EM QUE ELE SE ENCONTRA NESTA
      DATA, COM O DESGASTE NATURAL DO USO E A QUILOMETRAGEM ATUAL. EVENTUAIS AVARIAS, FALTAS DE PEÇAS,
      ACESSÓRIOS OU DANOS EXISTENTES SERÃO AVALIADOS E PODERÃO SER DEDUZIDOS DO VALOR A SER RESTITUÍDO.
    </>,
    <>
      CASO O VEÍCULO TENHA SIDO OBJETO DE FINANCIAMENTO, CONSÓRCIO OU QUALQUER MODALIDADE DE CRÉDITO, A
      DEVOLUÇÃO SOMENTE SERÁ ACEITA COM O VEÍCULO TOTALMENTE QUITADO E LIVRE DE QUALQUER GRAVAME,
      ALIENAÇÃO FIDUCIÁRIA OU RESTRIÇÃO. TODOS OS JUROS, ENCARGOS, TARIFAS, SEGUROS E CUSTOS DECORRENTES
      DO FINANCIAMENTO SÃO DE RESPONSABILIDADE EXCLUSIVA DO COMPRADOR, NADA PODENDO SER COBRADO DA LOJA
      A ESSE TÍTULO.
    </>,
    <>
      MULTAS DE TRÂNSITO, IPVA, LICENCIAMENTO, PEDÁGIOS E QUAISQUER DÉBITOS OU INFRAÇÕES GERADOS NO
      PERÍODO EM QUE O VEÍCULO ESTEVE NA POSSE DO COMPRADOR SÃO DE SUA INTEIRA RESPONSABILIDADE, BEM
      COMO A PONTUAÇÃO JUNTO AO DETRAN, FICANDO A LOJA AUTORIZADA A DESCONTAR TAIS VALORES DO MONTANTE A
      SER RESTITUÍDO.
    </>,
    <>
      DO VALOR A SER RESTITUÍDO PODERÃO SER DEDUZIDOS OS CUSTOS DE REPARO, HIGIENIZAÇÃO, REGULARIZAÇÃO
      DOCUMENTAL, TRIBUTOS, TARIFAS E DEMAIS DESPESAS ADMINISTRATIVAS INCORRIDAS PELA LOJA EM RAZÃO DA
      VENDA E DA DEVOLUÇÃO, CIENTE E DE ACORDO O COMPRADOR.
    </>,
    <>
      COM O RECEBIMENTO DO VALOR ORA AJUSTADO E A ENTREGA DO VEÍCULO, AS PARTES DÃO ENTRE SI PLENA,
      GERAL, RASA E IRREVOGÁVEL QUITAÇÃO DO NEGÓCIO ORIGINAL E DESTA DEVOLUÇÃO, PARA NADA MAIS
      RECLAMAREM UMA DA OUTRA, A QUALQUER TÍTULO, TEMPO OU PRETEXTO, SEJA EM JUÍZO OU FORA DELE.
    </>,
    <>
      O COMPRADOR DECLARA QUE A PRESENTE DEVOLUÇÃO É ESPONTÂNEA, FEITA DE LIVRE E ESPONTÂNEA VONTADE,
      SEM QUALQUER VÍCIO DE CONSENTIMENTO, COAÇÃO OU INDUÇÃO, ESTANDO CIENTE E DE PLENO ACORDO COM TODAS
      AS CONDIÇÕES ACIMA ESTABELECIDAS.
    </>,
  ]
}

/** Letras das cláusulas: A), B), C)… conforme a posição na lista. */
function clauseLetter(index: number) {
  return String.fromCharCode(65 + index)
}

/** Dados bancários fixos da loja, exibidos no recibo de sinal. */
const SIGNAL_BANK_INFO = [
  'CONTA ITAU JURIDICA',
  'AG 1587',
  'CONTA 98551-4',
  'CNPJ 23.760.314/0001-98',
  'PIX: MCARVEICULOS2015@GMAIL.COM',
  'NOME ARLENE FREIRE SOUSA ME',
]

/**
 * Corpo do contrato de sinal. Reaproveita as grades da venda — dados do cliente
 * e do veículo — e abaixo mostra o bloco do sinal (valor da entrada, valor total
 * do veículo e o prazo para concretizar a compra) seguido dos dados bancários
 * fixos da loja. Não tem cláusulas: é apenas o recibo do sinal.
 */
function SignalBody({
  buyer,
  vehicle,
  signal,
}: {
  buyer: ReturnType<typeof normalizeSaleData>['buyer']
  vehicle: ContractVehicle
  signal: NonNullable<ReturnType<typeof normalizeSaleData>['signal']>
}) {
  const deadline = signal.deadline_date
    ? `${longDatePt(signal.deadline_date)}${signal.deadline_time ? ` ÀS ${signal.deadline_time}` : ''}`
    : '—'

  return (
    <>
      {/* Dados do cliente — mesma grade de 4 colunas da venda. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label="CLIENTE" value={buyer.name} />
          <Field label="CPF" value={formatCpf(buyer.cpf)} />
          <Field label="TEL" value={formatPhone(buyer.phone)} />
          <Field label="RG" value={buyer.rg} />
          <Field span={2} label="ENDERECO" value={buyer.address} />
          <Field label="NASCIMENTO" value={longDatePt(buyer.birth_date)} />
        </FieldGrid>
      </section>

      {/* Dados do veículo — o mesmo bloco usado na venda. */}
      <h2 className="font-bold">VEICULO DO SINAL DE COMPRA</h2>
      <section className="mb-1.5 space-y-1">
        <VehicleBlock vehicle={vehicle} index={0} total={1} />
      </section>

      {/* Bloco do sinal: valores e prazo para concretizar a compra. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">VALOR DO SINAL:</span>
          <span className="font-bold tabular-nums">{formatCurrency(signal.signal_value)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">VALOR TOTAL DO VEICULO:</span>
          <span className="font-bold tabular-nums">{formatCurrency(signal.sale_value)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">FINALIZACAO DA NEGOCIACAO:</span>
          <span className="font-semibold">{deadline}</span>
        </div>
      </section>

      {/* Dados bancários fixos: conta para onde o sinal foi enviado. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <div className="mb-0.5 font-bold">DADOS PARA PAGAMENTO</div>
        {SIGNAL_BANK_INFO.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </section>
    </>
  )
}

/**
 * Corpo do contrato de consignação. Reaproveita as grades da venda — dados do
 * consignante e dos veículos — e inclui um bloco opcional do proprietário
 * (quando o veículo está em nome de terceiro/empresa), o valor líquido acertado
 * a repassar e as cláusulas que dão liberdade de venda à loja.
 */
function ConsignmentBody({
  buyer,
  owner,
  vehicles,
  negotiation,
  storeName,
}: {
  buyer: ReturnType<typeof normalizeSaleData>['buyer']
  owner: ReturnType<typeof normalizeSaleData>['owner']
  vehicles: ContractVehicle[]
  negotiation: ReturnType<typeof normalizeSaleData>['negotiation']
  storeName: string
}) {
  const isPlural = vehicles.length > 1
  const hasOwner = Boolean(owner.name.trim() || owner.document.trim())
  const clauses = consignmentClauses(storeName)

  return (
    <>
      {/* Consignante — mesma grade de 4 colunas da venda. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label="CONSIGNANTE" value={buyer.name} />
          <Field label="CPF" value={formatCpf(buyer.cpf)} />
          <Field label="TEL" value={formatPhone(buyer.phone)} />
          <Field label="RG" value={buyer.rg} />
          <Field span={2} label="ENDERECO" value={buyer.address} />
          <Field label="NASCIMENTO" value={longDatePt(buyer.birth_date)} />
        </FieldGrid>
      </section>

      {/* Proprietário do veículo: só aparece quando o carro está em nome de
          terceiro ou empresa. */}
      {hasOwner && (
        <section className="mb-1.5 border border-black/25 px-1.5 py-1">
          <FieldGrid>
            <Field span={3} label="VEICULO EM NOME DE" value={owner.name} />
            <Field label="CPF/CNPJ" value={owner.document} />
          </FieldGrid>
        </section>
      )}

      {/* Veículos objeto da consignação — o mesmo bloco usado na venda. */}
      <h2 className="font-bold">
        {isPlural ? 'OBJETO — VEICULOS EM CONSIGNAÇÃO' : 'OBJETO — VEICULO EM CONSIGNAÇÃO'}
      </h2>
      <section className="mb-1.5 space-y-1">
        {vehicles.map((vehicle, i) => (
          <VehicleBlock key={i} vehicle={vehicle} index={i} total={vehicles.length} />
        ))}
      </section>

      {/* Valor líquido acertado a repassar ao consignante. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">VALOR ACERTADO A REPASSAR AO CONSIGNANTE:</span>
          <span className="font-bold tabular-nums">{formatCurrency(negotiation.total_value)}</span>
        </div>
        {negotiation.observations && (
          <p className="whitespace-pre-wrap">
            <strong>OBS:</strong> {negotiation.observations}
          </p>
        )}
      </section>

      {/* Cláusulas de consignação e responsabilidade. */}
      <h2 className="font-bold">FICA COMBINADO ENTRE AS PARTES:</h2>
      <ol className="mb-2 space-y-0.5 text-justify text-[8px] leading-[1.3]">
        {clauses.map((clause, i) => (
          <li key={i}>
            {clauseLetter(i)}) {clause}
          </li>
        ))}
      </ol>
    </>
  )
}

/**
 * Corpo do contrato de devolução. Reaproveita as grades da venda — dados do
 * comprador (com RG) e do veículo devolvido — e inclui um bloco com a data/hora
 * da compra original e da devolução, a forma de pagamento da restituição e o
 * valor a restituir, seguido das cláusulas de proteção da loja.
 */
function ReturnBody({
  buyer,
  vehicle,
  returnInfo,
  observations,
  storeName,
}: {
  buyer: ReturnType<typeof normalizeSaleData>['buyer']
  vehicle: ContractVehicle
  returnInfo: NonNullable<ReturnType<typeof normalizeSaleData>['returnInfo']>
  observations: string
  storeName: string
}) {
  const clauses = returnClauses(storeName)
  const purchaseMoment = returnInfo.purchase_date
    ? `${longDatePt(returnInfo.purchase_date)}${returnInfo.purchase_time ? ` ÀS ${returnInfo.purchase_time}` : ''}`
    : '—'
  const returnMoment = returnInfo.return_date
    ? `${longDatePt(returnInfo.return_date)}${returnInfo.return_time ? ` ÀS ${returnInfo.return_time}` : ''}`
    : '—'

  return (
    <>
      {/* Comprador que devolve — mesma grade de 4 colunas da venda, com RG. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label="COMPRADOR" value={buyer.name} />
          <Field label="CPF" value={formatCpf(buyer.cpf)} />
          <Field label="TEL" value={formatPhone(buyer.phone)} />
          <Field label="RG" value={buyer.rg} />
          <Field span={2} label="ENDERECO" value={buyer.address} />
          <Field label="NASCIMENTO" value={longDatePt(buyer.birth_date)} />
        </FieldGrid>
      </section>

      {/* Veículo devolvido — o mesmo bloco usado na venda. */}
      <h2 className="font-bold">VEICULO DEVOLVIDO</h2>
      <section className="mb-1.5 space-y-1">
        <VehicleBlock vehicle={vehicle} index={0} total={1} />
      </section>

      {/* Datas da compra e da devolução, forma de pagamento e valor a restituir. */}
      <section className="mb-1.5 border border-black/25 px-1.5 py-1">
        <FieldGrid>
          <Field span={2} label="DATA E HORA DA COMPRA" value={purchaseMoment} />
          <Field span={2} label="DATA E HORA DA DEVOLUCAO" value={returnMoment} />
        </FieldGrid>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <span className="font-bold">FORMA DE PAGAMENTO DA DEVOLUCAO:</span>{' '}
            <span className="break-words">
              <Val>{returnInfo.payment_method}</Val>
            </span>
          </div>
          <div className="shrink-0 font-bold tabular-nums">
            VALOR RESTITUIDO: {formatCurrency(returnInfo.return_value)}
          </div>
        </div>
        {observations && (
          <p className="mt-1 whitespace-pre-wrap">
            <strong>OBS:</strong> {observations}
          </p>
        )}
      </section>

      {/* Cláusulas de devolução e quitação. */}
      <h2 className="font-bold">FICA COMBINADO ENTRE AS PARTES:</h2>
      <ol className="mb-2 space-y-0.5 text-justify text-[8px] leading-[1.3]">
        {clauses.map((clause, i) => (
          <li key={i}>
            {clauseLetter(i)}) {clause}
          </li>
        ))}
      </ol>
    </>
  )
}

/**
 * Fac-símile do contrato em papel: preto sobre branco em qualquer tema,
 * proporções A4 e quebras de página controladas para impressão/PDF.
 *
 * Tolera snapshots incompletos porque é o mesmo componente usado na prévia,
 * que roda com o formulário ainda pela metade.
 */
export function ContractDocument({ title, data, contractDate, type }: ContractDocumentProps) {
  const { buyer, owner, vehicles, trade_ins, negotiation, delivery, signal, returnInfo, store } =
    normalizeSaleData(data)
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
className="mb-1.5 block w-[50%] mx-auto"
        loading="eager"
      />

      <h1 className="mb-1.5 text-center text-[12px] font-bold tracking-tight">{title}</h1>

      {/* O sinal é um recibo: grade do cliente e do veículo como na venda,
          seguidas do bloco do sinal e dos dados bancários. Sem cláusulas. */}
      {roles.isSignal ? (
        <SignalBody
          buyer={buyer}
          vehicle={soldList[0]}
          signal={signal ?? { signal_value: 0, sale_value: 0, deadline_date: '', deadline_time: '' }}
        />
      ) : roles.isConsignment ? (
        <ConsignmentBody
          buyer={buyer}
          owner={owner}
          vehicles={soldList}
          negotiation={negotiation}
          storeName={storeName}
        />
      ) : roles.isReturn ? (
        <ReturnBody
          buyer={buyer}
          vehicle={soldList[0]}
          returnInfo={
            returnInfo ?? {
              purchase_date: '',
              purchase_time: '',
              return_date: '',
              return_time: '',
              payment_method: '',
              return_value: 0,
            }
          }
          observations={negotiation.observations}
          storeName={storeName}
        />
      ) : (
        <>
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
        </>
      )}

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
<SignatureLine
  name={store.seller_name}
  caption={roles.store}
  extra="CNPJ: 23.760.314/0001-98"
/>
          </>
        ) : (
          <>
<SignatureLine
  name={store.seller_name}
  caption={roles.store}
  extra="CNPJ: 23.760.314/0001-98"
/>
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
