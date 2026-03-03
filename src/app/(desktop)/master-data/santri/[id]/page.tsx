import { redirect } from 'next/navigation'

export default function MasterDataSantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // Cannot use `use()` in server redirect, so redirect to manage base and let it resolve
    redirect('/master-data/santri/manage')
}
