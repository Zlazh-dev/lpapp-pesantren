import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBillingProofViewerAccess } from '@/server/billing-proof-auth'
import { createPaymentProofFileResponse } from '@/server/payment-proof-file-response'

type RouteParams = {
    proofId: string
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<RouteParams> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasBillingProofViewerAccess(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { proofId } = await params
    const normalizedId = proofId?.trim()
    if (!normalizedId) {
        return NextResponse.json({ error: 'Invalid proof id' }, { status: 400 })
    }

    const proof = await prisma.paymentProof.findUnique({
        where: { id: normalizedId },
        select: { imageUrl: true },
    })

    if (!proof) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    if (!proof.imageUrl) {
        return NextResponse.json({ error: 'Proof file is missing' }, { status: 404 })
    }

    return createPaymentProofFileResponse(request, proof.imageUrl)
}
