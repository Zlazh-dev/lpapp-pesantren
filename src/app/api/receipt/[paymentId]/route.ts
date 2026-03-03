import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatBillingPeriod } from '@/lib/billing/period'

// jsPDF will be used client-side or via dynamic import if needed
// For server-side, we just return the receipt data as JSON
// PDF generation happens on the client side using jsPDF

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    const { paymentId } = await params

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
            invoice: {
                include: {
                    santri: { select: { fullName: true, nis: true, classGroup: { select: { name: true } } } },
                    billingModel: { select: { name: true, periodType: true } },
                    items: { orderBy: { sortOrder: 'asc' } },
                },
            },
            receipt: true,
        },
    })

    if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (!payment.verifiedAt) {
        return NextResponse.json({ error: 'Payment is not verified' }, { status: 403 })
    }

    // Return receipt data for client-side PDF generation
    return NextResponse.json({
        receiptNo: payment.receipt?.receiptNo ?? null,
        payment: {
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            paidAt: payment.paidAt,
            note: payment.note,
        },
        invoice: {
            periodKey: payment.invoice.periodKey,
            periodDisplayMode: payment.invoice.periodDisplayMode,
            periodYear: payment.invoice.periodYear,
            periodMonth: payment.invoice.periodMonth,
            hijriYear: payment.invoice.hijriYear,
            hijriMonth: payment.invoice.hijriMonth,
            hijriVariant: payment.invoice.hijriVariant,
            periodLabel: formatBillingPeriod(payment.invoice),
            totalAmount: payment.invoice.totalAmount,
            items: payment.invoice.items.map(i => ({ label: i.label, amount: i.amount })),
        },
        santri: {
            fullName: payment.invoice.santri.fullName,
            nis: payment.invoice.santri.nis,
            kelas: payment.invoice.santri.classGroup?.name ?? null,
        },
        billingModel: {
            name: payment.invoice.billingModel.name,
            periodType: payment.invoice.billingModel.periodType,
        },
    })
}
