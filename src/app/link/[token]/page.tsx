import GuardianPortalClient from './_components/GuardianPortalClient'

export default async function LinkPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    return <GuardianPortalClient token={token} />
}
