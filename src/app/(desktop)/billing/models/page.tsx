import { redirect } from 'next/navigation'

export default function LegacyBillingModelsPage() {
    redirect('/keuangan?tab=pengaturan-tagihan')
}
