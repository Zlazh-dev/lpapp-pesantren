import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasBillingProofViewerAccess } from '@/server/billing-proof-auth'
import { createPaymentProofFileResponse } from '@/server/payment-proof-file-response'

type RouteParams = {
    paymentId: string
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

    const { paymentId } = await params
    const normalizedId = paymentId?.trim()
    if (!normalizedId) {
        return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
        where: { id: normalizedId },
        select: { proofUrl: true },
    })

    if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (!payment.proofUrl) {
        return NextResponse.json({ error: 'Proof file is missing' }, { status: 404 })
    }

    return createPaymentProofFileResponse(request, payment.proofUrl)
}
