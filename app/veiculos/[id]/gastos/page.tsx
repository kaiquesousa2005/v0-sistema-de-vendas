import { VehicleExpenses } from '@/components/dashboard/vehicle-expenses'

export const metadata = {
  title: 'Gastos do Veículo - AutoGest',
  description: 'Gerenciar gastos de um veículo específico',
}

export default function VehicleGastosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <VehicleExpenses params={params} />
}
