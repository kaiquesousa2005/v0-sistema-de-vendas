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

function VehicleBlock({ vehicle, index, total }: { vehicle: ContractVehicle; index: number; total: number }) {
  return (
    <div className="space-y-0.5 break-inside-avoid">
      {total > 1 && <div className="font-semibold">VEÍCULO {index + 1}:</div>}
      <div className="flex flex-wrap gap-x-6">
        <span>
          <strong>MARCA/MODELO:</strong> <Val>{vehicle.brand_model}</Val>
        </span>
        <span>
          <strong>RENAVAN:</strong> <Val>{vehicle.renavam}</Val>
        </span>
        <span>
          <strong>PLACA:</strong> <Val>{vehicle.plate}</Val>
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6">
        <span>
          <strong>CHASSI:</strong> <Val>{vehicle.chassis}</Val>
        </span>
        <span>
          <strong>COR:</strong> <Val>{vehicle.color}</Val>
        </span>
        <span>
          <strong>ANO:</strong> <Val>{vehicle.year}</Val>
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6">
        <span>
          <strong>COMBUSTÍVEL:</strong> <Val>{vehicle.fuel}</Val>
        </span>
        <span>
          <strong>KM:</strong> <Val>{formatKm(vehicle.km)}</Val>
        </span>
      </div>
    </div>
  )
}

function SignatureLine({ name, caption, extra }: { name?: string; caption: string; extra?: string }) {
  return (
    <div className="space-y-0.5 break-inside-avoid">
      <div className="pt-6">_______________________________</div>
      {name && <div className="font-semibold">{name}</div>}
      {extra && <div>{extra}</div>}
      <div>{caption}</div>
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
      className="contract-sheet mx-auto w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[10.5px] leading-[1.45] text-black shadow-sm print:max-w-none print:shadow-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Cabeçalho da loja. <img> puro para não depender de otimização/lazy
          loading na hora de imprimir. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/contract-header.png"
        alt="MCar Veículos"
        className="mb-3 block w-full"
        loading="eager"
      />

      {store.address && <p className="mb-3 text-[10px] font-semibold">{store.address}</p>}

      <h1 className="mb-3 text-center text-[13px] font-bold tracking-tight">{title}</h1>

      {/* Comprador */}
      <section className="mb-3 space-y-0.5">
        <div>
          <strong>COMPRADOR:</strong> <Val>{buyer.name}</Val>
        </div>
        <div className="flex flex-wrap gap-x-6">
          <span>
            <strong>CPF:</strong> <Val>{formatCpf(buyer.cpf)}</Val>
          </span>
          <span>
            <strong>TEL:</strong> <Val>{formatPhone(buyer.phone)}</Val>
          </span>
        </div>
        <div>
          <strong>DATA DE NASCIMENTO:</strong> <Val>{longDatePt(buyer.birth_date)}</Val>
        </div>
        <div>
          <strong>ENDERECO:</strong> <Val>{buyer.address}</Val>
        </div>
      </section>

      {/* Cláusula 1ª — objeto */}
      <h2 className="mb-1 font-bold">DO OBJETO DO CONTRATO</h2>
      <p className="mb-1">
        <strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO,{' '}
        {isPlural ? 'os veículos abaixo descriminados' : 'o veículo abaixo descriminado'}:
      </p>
      <section className="mb-3 space-y-2">
        {soldList.map((vehicle, i) => (
          <VehicleBlock key={i} vehicle={vehicle} index={i} total={soldList.length} />
        ))}
      </section>

      {/* Veículos recebidos na troca */}
      {trade_ins.length > 0 && (
        <section className="mb-3 space-y-2">
          <h3 className="font-bold">
            {trade_ins.length > 1 ? 'RECEBENDO OS VEICULOS:' : 'RECEBENDO O VEICULO:'}
          </h3>
          {trade_ins.map((vehicle, i) => (
            <VehicleBlock key={i} vehicle={vehicle} index={i} total={trade_ins.length} />
          ))}
        </section>
      )}

      {/* Cláusula 2ª — pagamento */}
      <p className="mb-1">
        <strong>Cláusula 2ª.</strong> O COMPRADOR pagará ao VENDEDOR, pela compra do veículo da
        seguinte forma.
      </p>
      <section className="mb-3 space-y-0.5">
        <div className="font-bold">NEGOCIACAO:</div>
        <div>
          <Val>{negotiation.summary}</Val>
        </div>
        <div className="font-bold">{formatCurrency(negotiation.total_value)}</div>
        {negotiation.observations && (
          <p className="whitespace-pre-wrap">
            <strong>OBS:</strong> {negotiation.observations}
          </p>
        )}
      </section>

      {/* Entrega */}
      {delivery.date && (
        <p className="mb-3 font-semibold">
          VEÍCULO ENTREGUE NA DATA: {longDatePt(delivery.date)}
          {delivery.time ? ` ÀS ${delivery.time}` : ''}
        </p>
      )}

      {/* Cláusulas fixas */}
      <h2 className="mb-1 font-bold">FICA COMBINADO ENTRE AS PARTES:</h2>
      <ol className="mb-4 space-y-1.5 text-justify">
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
          E) A COMPRADORA ASSUME O COMPROMISSO DE NOTIFICAR O VENDEDOR, DA EXISTÊNCIA DE INFRAÇÕES
          OCORRIDAS ANTES DA DATA DESTA COMPRA, PORÉM AINDA NÃO CADASTRADAS NAQUELA OCASIÃO PELO OS
          ÓRGÃO DE COMPETÊNCIA, AS QUAIS DEVERÃO SER PAGAS NO PRAZO DE 5 (CINCO) DIAS A CONTAR DO
          RECEBIMENTO DO AVISO, SOB PENA DE RESTAR CONSTITUÍDA A MORA DO VENDEDOR E DAR AZO A
          EXECUÇÃO EXTRAJUDICIAL. A LOJA FICA AUTORIZADA A EMITIR UM BOLETO REFERENTE A MULTA NÃO
          PAGA, E SEU NOME PODERÁ SER NEGATIVADO. NO SERASA. PARA EVITAR ESSE TRANSTORNO EFETUE O
          PAGAMENTO.
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
      <p className="mb-2 font-semibold">
        {store.city || 'FORTALEZA'}, {longDatePt(contractDate)}
      </p>

      {/* Assinaturas */}
      <section className="space-y-1">
        <SignatureLine name={store.seller_name} caption="VENDEDOR" />
        <SignatureLine
          name={buyer.name}
          extra={buyer.cpf ? `CPF: ${formatCpf(buyer.cpf)}` : undefined}
          caption="COMPRADOR"
        />

        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <div className="break-inside-avoid">
            <div className="pt-6">_______________________________</div>
            <div>TESTEMUNHA 1</div>
            <div>NOME: _______________________________</div>
            <div>CPF: _______________________________</div>
          </div>
          <div className="break-inside-avoid">
            <div className="pt-6">_______________________________</div>
            <div>TESTEMUNHA 2</div>
            <div>NOME: _______________________________</div>
            <div>CPF: _______________________________</div>
          </div>
        </div>
      </section>
    </div>
  )
}
