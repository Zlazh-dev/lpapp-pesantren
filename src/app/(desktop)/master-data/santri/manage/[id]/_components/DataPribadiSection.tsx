'use client'

import { Field } from './Field'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { formatDate, getGenderLabel } from '@/utils/format'

const PII_ROLES = ['ADMIN', 'STAF_PENDATAAN']
const PHONE_ROLES = ['ADMIN', 'STAF_PENDATAAN', 'WALI_KELAS']

interface DataPribadiSectionProps {
    santri: any
    jenjang: string
    kelas: string
    kamarName: string
    lantaiName: string
    gedungName: string
}

function calcAge(bd: string | Date | null | undefined): string {
    if (!bd) return '-'
    const birth = new Date(bd)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    return `${age} tahun`
}

export function DataPribadiSection({ santri, jenjang, kelas, kamarName, lantaiName, gedungName }: DataPribadiSectionProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Data Pribadi</h3>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <Field label="Nama Lengkap" value={santri.fullName} />
                <Field label="NIS" value={santri.nis} mono />
                <Field label="Gender" value={getGenderLabel(santri.gender)} />
                <Field label="Tempat Lahir" value={santri.birthPlace} />
                <Field label="Tanggal Lahir" value={santri.birthDate ? formatDate(santri.birthDate) : null} />
                <Field label="Umur" value={calcAge(santri.birthDate)} />

                {/* No HP — hanya untuk role yang diizinkan */}
                <RoleGuard allowedRoles={PHONE_ROLES} fallback={<Field label="No. HP" value="••••••••" />}>
                    <Field label="No. HP" value={santri.phone} />
                </RoleGuard>

                <Field label="Gedung" value={gedungName} />
                <Field label="Lantai" value={lantaiName} />
                <Field label="Kamar" value={kamarName} />
                <Field label="Jenjang" value={jenjang} />
                <Field label="Kelas" value={kelas} />

                {/* NIK & No KK — hanya ADMIN / STAF_PENDATAAN */}
                <RoleGuard allowedRoles={PII_ROLES}>
                    <Field label="NIK" value={santri.nik} mono />
                </RoleGuard>
                <RoleGuard allowedRoles={PII_ROLES}>
                    <Field label="No. KK" value={santri.noKK} mono />
                </RoleGuard>

                <Field label="Tanggal Masuk" value={santri.enrollmentDate ? formatDate(santri.enrollmentDate) : null} />
                <Field label="Jenjang Pendidikan" value={santri.educationLevel} />

                {/* Alumni badge */}
                {santri.deactivatedAt && (
                    <div className="md:col-span-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold">🎓 Alumni</span>
                        <span className="text-sm text-slate-600">Tanggal Keluar: <strong>{formatDate(santri.deactivatedAt)}</strong></span>
                    </div>
                )}
            </dl>
        </div>
    )
}
