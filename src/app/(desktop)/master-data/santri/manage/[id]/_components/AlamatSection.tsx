'use client'

import { Field } from './Field'

interface AlamatSectionProps {
    address: Record<string, string> | null | undefined
}

/** Render alamat terstruktur: RT/RW dengan priority kolom terpisah, fallback rt_rw lama, Dusun inline. */
export function AlamatSection({ address }: AlamatSectionProps) {
    const addr = (address && typeof address === 'object') ? address as Record<string, string> : null
    const hasData = addr && Object.values(addr).some(v => v)

    const rtRwValue = (addr?.rt || addr?.rw)
        ? `RT ${addr.rt?.padStart(3, '0') ?? '-'} / RW ${addr.rw?.padStart(3, '0') ?? '-'}${addr.dusun ? ` — Dusun ${addr.dusun}` : ''}`
        : (addr?.rt_rw || null)

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Alamat</h3>
            </div>

            {hasData ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="md:col-span-2">
                        <Field label="Jalan" value={addr?.jalan} />
                    </div>
                    <Field label="RT / RW" value={rtRwValue} />
                    {/* Dusun sebagai field terpisah jika ada dan tidak di-inline RT/RW */}
                    {addr?.dusun && !addr?.rt && !addr?.rw && (
                        <Field label="Dusun" value={addr.dusun} />
                    )}
                    <Field label="Kelurahan / Desa" value={addr?.kelurahan} />
                    <Field label="Kecamatan" value={addr?.kecamatan} />
                    <Field label="Kota / Kabupaten" value={addr?.kota} />
                    <Field label="Provinsi" value={addr?.provinsi} />
                </dl>
            ) : (
                <p className="text-sm text-slate-300 italic">Belum diisi</p>
            )}
        </div>
    )
}
