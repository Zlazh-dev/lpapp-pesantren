'use client'

import { Field } from './Field'

interface OrangTuaSectionProps {
    santri: any
}

/** Render kartu data orang tua / wali santri. */
export function OrangTuaSection({ santri }: OrangTuaSectionProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Orang Tua / Wali</h3>
            </div>
            <dl className="space-y-3">
                <Field label="Nama Ayah" value={santri.fatherName} />
                <Field label="Nama Ibu" value={santri.motherName} />
                <Field label="No. HP Ayah" value={santri.fatherPhone} />
                <Field label="No. HP Ibu" value={santri.motherPhone} />
                <Field label="Nama Wali" value={santri.waliName} />
                <Field label="No. HP Wali" value={santri.waliPhone} />
            </dl>
        </div>
    )
}
