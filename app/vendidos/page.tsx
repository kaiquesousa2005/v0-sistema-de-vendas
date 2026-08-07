import { SoldVehiclesList } from '@/components/dashboard/sold-vehicles-list'

export const metadata = {
  title: 'Vendidos - AutoGest',
  description: 'Ver veículos vendidos',
}

// O Header e o título ficam dentro do SoldVehiclesList
export default function VendidosPage() {
  return <SoldVehiclesList />
}
