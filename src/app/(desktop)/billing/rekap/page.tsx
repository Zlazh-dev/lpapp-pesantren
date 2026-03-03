import { redirect } from 'next/navigation'

export default function LegacyBillingRekapPage() {
    redirect('/keuangan?tab=rekap')
}
