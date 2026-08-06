import {
  formatCpf,
  formatCurrency,
  formatKm,
  formatPhone,
  longDatePt,
  type SaleContractData,
} from '@/lib/contracts'

interface ContractDocumentProps {
  title: string
  data: SaleContractData
  contractDate: string
}

function VehicleBlock({ vehicle }: { vehicle: SaleContractData['vehicle'] }) {
  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap gap-x-6">
        <span>
          <strong>MARCA/MODELO:</strong> {vehicle.brand_model}
        </span>
        <span>
          <strong>RENAVAN:</strong> {vehicle.renavam}
        </span>
        <span>
          <strong>PLACA:</strong> {vehicle.plate}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6">
        <span>
          <strong>CHASSI:</strong> {vehicle.chassis}
        </span>
        <span>
          <strong>COR:</strong> {vehicle.color}
        </span>
        <span>
          <strong>ANO:</strong> {vehicle.year}
        </span>
      </div>
      <div>
        <strong>COMBUSTÍVEL:</strong> {vehicle.fuel}
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
 */
export function ContractDocument({ title, data, contractDate }: ContractDocumentProps) {
  const { buyer, vehicle, trade_in, negotiation, delivery, exit_km, warranty, store } = data
  const storeName = store.name || 'A LOJA'

  return (
    <div
      className="contract-sheet mx-auto w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[10.5px] leading-[1.45] text-black shadow-sm print:max-w-none print:px-[14mm] print:py-0 print:shadow-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Cabeçalho da loja */}
      {store.address && (
        <p className="mb-3 text-[10px] font-semibold">{store.address}</p>
      )}

      <h1 className="mb-3 text-center text-[13px] font-bold tracking-tight">{title}</h1>

      {/* Comprador */}
      <section className="mb-3 space-y-0.5">
        <div>
          <strong>COMPRADOR:</strong> {buyer.name}
        </div>
        <div className="flex flex-wrap gap-x-6">
          <span>
            <strong>CPF:</strong> {formatCpf(buyer.cpf)}
          </span>
          <span>
            <strong>TEL:</strong> {formatPhone(buyer.phone)}
          </span>
        </div>
        <div>
          <strong>DATA DE NASCIMENTO:</strong> {longDatePt(buyer.birth_date)}
        </div>
        <div>
          <strong>ENDERECO:</strong> {buyer.address}
        </div>
      </section>

      {/* Cláusula 1ª — objeto */}
      <h2 className="mb-1 font-bold">DO OBJETO DO CONTRATO</h2>
      <p className="mb-1">
        <strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO, o veículo abaixo
        descriminado:
      </p>
      <section className="mb-3">
        <VehicleBlock vehicle={vehicle} />
      </section>

      {/* Veículo recebido na troca */}
      {trade_in && (
        <section className="mb-3">
          <h3 className="font-bold">RECEBENDO OS VEICULOS:</h3>
          <VehicleBlock vehicle={trade_in} />
        </section>
      )}

      {/* Cláusula 2ª — pagamento */}
      <p className="mb-1">
        <strong>Cláusula 2ª.</strong> O COMPRADOR pagará ao VENDEDOR, pela compra do veículo da
        seguinte forma.
      </p>
      <section className="mb-3 space-y-0.5">
        <div className="font-bold">NEGOCIACAO:</div>
        <div>{negotiation.summary}</div>
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
          DECLARADA E ASSUMIDA PELA LOJA, NESTE INSTRUMENTO, QUAL SEJA DE {warranty.days} (
          {warranty.days === 90 ? 'NOVENTA' : warranty.days}) DIAS OU{' '}
          {warranty.km.toLocaleString('pt-BR')} KM (O QUE OCORRER PRIMEIRO), A PARTIR DA DATA DO
          RECEBIMENTO DO VEÍCULO, REFERENTE A MOTOR (BLOCO) E CAMBIO (CAIXA DE MARCHA), QUE EM
          SERVIÇO E USO NORMAL APRESENTA DEFEITO DE FUNCIONAMENTO POR LAUDO TÉCNICO EMITIDO PELA{' '}
          {storeName}; A GARANTIA ESTÁ AUTOMATICAMENTE CANCELADA SE O VEÍCULO FOR SUBMETIDO E
          SOBRECARGA OU ACIDENTES OU QUALQUER TIPO DE MAU USO, USADO PARA COMPETIÇÃO DIVERSAS, SE A
          MANUTENÇÃO FOR NEGLIGENCIADA, SE A ESTRUTURA TÉCNICA OU MECÂNICA FOR MODIFICADA, SE HOUVER
          MODIFICAÇÃO DO COMBUSTÍVEL DE PROPULSÃO DO SISTEMA DE MOTOR E SE OS SERVIÇOS COBERTOS PELA
          GARANTIA FOREM EXECUTADOS POR OFICINAS NÃO AUTORIZADA PRÉVIA E EXPRESSAMENTE (POR ESCRITO)
          PELA {storeName}.
        </li>
        <li>G) VEICULO SAI DA LOJA O VEICULO COM {formatKm(exit_km)} KM</li>
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
          extra={`CPF: ${formatCpf(buyer.cpf)}`}
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
