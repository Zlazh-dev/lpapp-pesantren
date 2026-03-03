export function detectPaymentProofKind(fileUrl: string): 'image' | 'pdf' {
    const lowerUrl = fileUrl.toLowerCase()
    if (lowerUrl.startsWith('data:application/pdf')) return 'pdf'
    if (lowerUrl.includes('.pdf')) return 'pdf'
    return 'image'
}

export function getPaymentProofViewerHref(input: {
    source: 'paymentProof' | 'payment'
    id: string
}): string {
    if (input.source === 'paymentProof') {
        return `/keuangan/proofs/${input.id}`
    }
    return `/keuangan/payments/${input.id}/proof`
}
