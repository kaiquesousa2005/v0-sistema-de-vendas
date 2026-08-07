import { ContractsList } from '@/components/dashboard/contracts-list'

export const metadata = {
  title: 'Contratos - AutoGest',
  description: 'Criar e gerenciar contratos de venda, devolução, repasse, consignação e sinal',
}

export default function ContratosPage() {
  return <ContractsList />
}
