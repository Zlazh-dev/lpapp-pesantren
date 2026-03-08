'use client'

import * as XLSX from 'xlsx'

const TEMPLATE_COLUMNS = [
    { header: 'NIS', key: 'nis', required: true },
    { header: 'Nama Lengkap', key: 'fullName', required: true },
    { header: 'Gender (L/P)', key: 'gender', required: false },
    { header: 'Tanggal Lahir (DD/MM/YYYY)', key: 'birthDate', required: false },
    { header: 'Tempat Lahir', key: 'birthPlace', required: false },
    { header: 'No HP', key: 'phone', required: false },
    { header: 'NIK', key: 'nik', required: false },
    { header: 'No KK', key: 'noKK', required: false },
    { header: 'Tanggal Masuk (DD/MM/YYYY)', key: 'enrollmentDate', required: false },
    { header: 'Tanggal Keluar (DD/MM/YYYY, kosong jika aktif)', key: 'deactivatedAt', required: false },
    { header: 'Jenjang Pendidikan', key: 'educationLevel', required: false },
    { header: 'Nama Ayah', key: 'fatherName', required: false },
    { header: 'Nama Ibu', key: 'motherName', required: false },
    { header: 'No HP Ayah', key: 'fatherPhone', required: false },
    { header: 'No HP Ibu', key: 'motherPhone', required: false },
    { header: 'Nama Wali', key: 'waliName', required: false },
    { header: 'No HP Wali', key: 'waliPhone', required: false },
    { header: 'Deskripsi Wali Santri', key: 'description', required: false },
    { header: 'Provinsi', key: 'provinsi', required: false },
    { header: 'Kota/Kabupaten', key: 'kota', required: false },
    { header: 'Kecamatan', key: 'kecamatan', required: false },
    { header: 'Kelurahan', key: 'kelurahan', required: false },
    { header: 'Jalan', key: 'jalan', required: false },
    { header: 'Dusun (opsional)', key: 'dusun', required: false },
    { header: 'RT', key: 'rt', required: false },
    { header: 'RW', key: 'rw', required: false },
]

export { TEMPLATE_COLUMNS }

export function TemplateDownloader() {
    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            TEMPLATE_COLUMNS.map(c => c.header),
            [
                '2501001', 'Ahmad Fauzi', 'L', '15/06/2008', 'Surabaya',
                '08123456789', '3578123456789012', '3578123456780001',
                '01/07/2025', '',
                'SMP', 'Bapak Ahmad', 'Ibu Siti', '08111111111', '08222222222',
                '', '', '', 'Jawa Timur', 'Surabaya', 'Tegalsari', 'Kedungdoro',
                'Jl. Mawar No. 5', 'Krajan', '005', '003',
            ],
        ])
        ws['!cols'] = TEMPLATE_COLUMNS.map(c => ({ wch: Math.max(c.header.length + 4, 18) }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Santri')
        XLSX.writeFile(wb, 'template_upload_santri.xlsx')
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800">1. Download Template</h3>
                    <p className="text-sm text-slate-500 mt-1">Download template Excel lalu isi data santri. Kolom <strong>NIS</strong> dan <strong>Nama Lengkap</strong> wajib, kolom lainnya opsional.</p>
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                        <p className="text-xs font-semibold text-amber-700">Ketentuan Format:</p>
                        <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                            <li><strong>Tanggal Lahir &amp; Tanggal Masuk</strong>: format <code className="bg-amber-100 px-1 rounded">DD/MM/YYYY</code> (contoh: <code className="bg-amber-100 px-1 rounded">15/06/2008</code>)</li>
                            <li><strong>Tanggal Keluar</strong>: isi jika santri sudah lulus/keluar → akan otomatis ditandai sebagai <strong>alumni</strong>. Kosongkan jika masih aktif.</li>
                            <li><strong>Gender</strong>: isi <code className="bg-amber-100 px-1 rounded">L</code> (laki-laki) atau <code className="bg-amber-100 px-1 rounded">P</code> (perempuan)</li>
                        </ul>
                    </div>
                    <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                    </button>
                </div>
            </div>
        </div>
    )
}
