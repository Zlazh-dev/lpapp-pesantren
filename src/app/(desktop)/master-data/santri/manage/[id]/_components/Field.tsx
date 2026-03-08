'use client'

interface FieldProps {
    label: string
    value?: string | null
    mono?: boolean
}

/** Reusable field label + value untuk halaman detail. Render null jika value kosong. */
export function Field({ label, value, mono }: FieldProps) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</dt>
            <dd className={`text-sm font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>
                {value || <span className="text-slate-300 font-normal italic">—</span>}
            </dd>
        </div>
    )
}
