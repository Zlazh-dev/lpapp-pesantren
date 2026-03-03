'use client'

import { forwardRef } from 'react'

type SantriPrintData = {
    fullName: string
    nis: string
    birthPlace?: string | null
    birthDate?: string | Date | null
    phone?: string | null
    fatherName?: string | null
    motherName?: string | null
    fatherPhone?: string | null
    motherPhone?: string | null
    waliName?: string | null
    waliPhone?: string | null
    photoUrl?: string | null
    nik?: string | null
    noKK?: string | null
    createdAt?: string | Date | null
    address?: {
        jalan?: string
        rt_rw?: string
        kelurahan?: string
        kecamatan?: string
        kota?: string
        provinsi?: string
        kodepos?: string
    } | null
    classGroup?: {
        name?: string
        grade?: { level?: { name?: string } | null } | null
    } | null
    dormRoom?: {
        name?: string
        floor?: { number?: number; building?: { name?: string } | null } | null
    } | null
}

type Props = {
    santri: SantriPrintData
    logoUrl?: string | null
}

function fmtDate(d: string | Date | null | undefined): string {
    if (!d) return '-'
    const dt = new Date(d)
    return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const PrintDataSantri = forwardRef<HTMLDivElement, Props>(({ santri, logoUrl }, ref) => {
    const addr = santri.address && typeof santri.address === 'object' ? santri.address : null
    const jenjang = santri.classGroup?.grade?.level?.name ?? '-'
    const kelas = santri.classGroup?.name ?? '-'
    const gedung = santri.dormRoom?.floor?.building?.name ?? '-'
    const kamar = santri.dormRoom?.name ?? '-'

    const rtRw = addr?.rt_rw ?? ''
    const rtParts = rtRw.split('/')
    const rt = rtParts[0]?.trim() || '-'
    const rw = rtParts[1]?.trim() || '-'

    return (
        <div ref={ref} className="print-santri-document">
            <style>{`
                .print-santri-document * { margin: 0; padding: 0; box-sizing: border-box; }
                .print-santri-document {
                    width: 210mm;
                    height: 297mm;
                    margin: 0 auto;
                    font-family: 'Times New Roman', Times, serif;
                    color: #1a1a1a;
                    background: white;
                    font-size: 9pt;
                    line-height: 1.3;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                @media print {
                    .print-santri-document {
                        margin: 0;
                    }
                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
                .print-body {
                    flex: 1;
                    padding: 5mm 14mm 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                /* ── Header ── */
                .print-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding-bottom: 5px;
                    border-bottom: 2px double #2a7a4f;
                    margin-bottom: 6px;
                }
                .print-header-logo {
                    width: 72px;
                    height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    overflow: hidden;
                }
                .print-header-logo.no-image {
                    background: linear-gradient(135deg, #2a7a4f, #3d9966);
                }
                .print-header-logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .print-header-logo span {
                    color: white;
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                    line-height: 1.2;
                }
                .print-header-text {
                    flex: 1;
                    text-align: center;
                }
                .print-header-text h1 {
                    font-size: 14pt;
                    font-weight: bold;
                    color: #2a7a4f;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .print-header-text .subtitle {
                    font-size: 8pt;
                    color: #2a7a4f;
                    font-style: italic;
                    margin: 1px 0;
                }
                .print-header-text .location {
                    font-size: 10pt;
                    font-weight: bold;
                    color: #1a1a1a;
                    font-style: italic;
                    margin: 1px 0;
                }
                .print-header-text .contact {
                    font-size: 7.5pt;
                    color: #444;
                    margin: 2px 0 0 0;
                }

                /* ── Document Title ── */
                .print-title {
                    text-align: center;
                    margin: 5px 0 7px;
                }
                .print-title h2 {
                    font-size: 10.5pt;
                    font-weight: bold;
                    text-decoration: underline;
                    margin: 0 0 2px 0;
                }
                .print-title p {
                    font-size: 8.5pt;
                    margin: 1px 0;
                }

                /* ── Section Label ── */
                .print-section-label {
                    font-weight: bold;
                    font-size: 9pt;
                    margin: 6px 0 2px;
                    padding-left: 6px;
                    border-left: 3px solid #2a7a4f;
                }

                /* ── Tables ── */
                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 2px;
                }
                .print-table td {
                    padding: 1.2px 6px;
                    vertical-align: top;
                    font-size: 8.5pt;
                }
                .print-table .label {
                    width: 130px;
                    padding-left: 18px;
                    white-space: nowrap;
                }
                .print-table .sep {
                    width: 12px;
                    text-align: center;
                }
                .print-table .value {
                    word-break: break-word;
                }

                /* ── Two-column data layout ── */
                .print-two-col {
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }
                .print-two-col > div {
                    flex: 1;
                }

                /* ── Alamat + Photo row ── */
                .print-alamat-photo-row {
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                }
                .print-alamat-photo-row .alamat-col {
                    flex: 1;
                }
                .print-alamat-photo-row .photo-col {
                    flex-shrink: 0;
                    padding-top: 24px;
                }
                .print-photo-box {
                    width: 85px;
                    height: 110px;
                    border: 1px solid #999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    background: #fafafa;
                }
                .print-photo-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .print-photo-box span {
                    font-size: 8pt;
                    color: #999;
                    text-align: center;
                }

                /* ── Signature ── */
                .print-signature-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding-bottom: 10mm;
                }
                .print-signature {
                    text-align: center;
                }
                .print-signature .date-line {
                    font-size: 9pt;
                    margin-bottom: 3px;
                }
                .print-signature .knowing {
                    font-size: 9pt;
                    font-weight: bold;
                    margin-bottom: 30px;
                }
                .print-signature-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 0 30px;
                }
                .print-signature-col {
                    text-align: center;
                    width: 180px;
                }
                .print-signature-col .role {
                    font-size: 9pt;
                    margin-bottom: 40px;
                }
                .print-signature-col .name {
                    font-size: 9pt;
                    font-weight: bold;
                    border-top: 1px solid #333;
                    padding-top: 3px;
                    display: inline-block;
                    min-width: 140px;
                }

                /* ── Footer bar ── */
                .print-footer-bar {
                    flex-shrink: 0;
                    background: linear-gradient(135deg, #2a7a4f, #3d9966);
                    color: white;
                    padding: 7px 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .print-footer-bar .left h3 {
                    font-size: 11pt;
                    font-weight: bold;
                    margin: 0;
                    color: #e5d9a0;
                }
                .print-footer-bar .left p {
                    font-size: 7pt;
                    margin: 1px 0 0;
                    color: #d4e8db;
                }
                .print-footer-bar .right {
                    font-size: 11pt;
                    color: #e5d9a0;
                    font-style: italic;
                    font-family: 'Times New Roman', serif;
                }
            `}</style>

            <div className="print-body">
                {/* Header */}
                <div className="print-header">
                    <div className={`print-header-logo ${logoUrl ? 'has-image' : 'no-image'}`}>
                        {logoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={logoUrl} alt="Logo" />
                        ) : (
                            <span>PP<br />LP3iA</span>
                        )}
                    </div>
                    <div className="print-header-text">
                        <h1>Pondok Pesantren Al-Qur&apos;an LP3iA</h1>
                        <p className="subtitle">(Lembaga Pembinaan, Pendidikan, dan Pengembangan Ilmu Alqu&apos;an)</p>
                        <p className="location">Narukan-Kragan-Rembang-Jawa Tengah</p>
                        <p className="contact">Kode Pos : 59253 | Email : pp.lp3ia.narukan@gmail.com | W.A : 082120005582</p>
                    </div>
                </div>

                {/* Title */}
                <div className="print-title">
                    <h2>Data Santri Pondok Pesantren Al-Qur&apos;an LP3iA</h2>
                    <p>Narukan-Kragan-Rembang-Jawa Tengah</p>
                    <p>1446-1447 H / 2025-2026 M</p>
                </div>

                {/* Identitas Santri — full width */}
                <div>
                    <div className="print-section-label">Identitas Santri</div>
                    <table className="print-table">
                        <tbody>
                            <Row label="Nama Lengkap" value={santri.fullName} />
                            <Row label="NIS" value={santri.nis} />
                            <Row label="Tempat Lahir" value={santri.birthPlace} />
                            <Row label="Tanggal Lahir" value={fmtDate(santri.birthDate)} />
                            <Row label="No. HP Santri" value={santri.phone} />
                            <Row label="NIK" value={santri.nik} />
                            <Row label="No. KK" value={santri.noKK} />
                            <Row label="Jenjang" value={jenjang} />
                            <Row label="Kelas" value={kelas} />
                            <Row label="Gedung/Kamar" value={`${gedung} / ${kamar}`} />
                        </tbody>
                    </table>
                </div>

                {/* Alamat Lengkap — full width */}
                <div>
                    <div className="print-section-label">Alamat Lengkap</div>
                    <table className="print-table">
                        <tbody>
                            <Row label="Jalan/Dusun" value={addr?.jalan} />
                            <Row label="RT / RW" value={`${rt} / ${rw}`} />
                            <Row label="Desa" value={addr?.kelurahan} />
                            <Row label="Kecamatan" value={addr?.kecamatan} />
                            <Row label="Kabupaten" value={addr?.kota} />
                            <Row label="Provinsi" value={addr?.provinsi} />
                            <Row label="Kode Pos" value={addr?.kodepos} />
                        </tbody>
                    </table>
                </div>

                {/* Identitas Wali (kiri) + Foto (kanan) dengan gap lebar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0 }}>
                    <div style={{ flex: 1 }}>
                        <div className="print-section-label">Identitas Wali</div>
                        <table className="print-table">
                            <tbody>
                                <Row label="Nama Wali" value={santri.waliName} />
                                <Row label="No. HP Wali" value={santri.waliPhone} />
                                <Row label="Nama Ayah" value={santri.fatherName} />
                                <Row label="Nama Ibu" value={santri.motherName} />
                                <Row label="No. HP Ayah" value={santri.fatherPhone} />
                                <Row label="No. HP Ibu" value={santri.motherPhone} />
                            </tbody>
                        </table>
                    </div>
                    <div style={{ flexShrink: 0, paddingTop: 24, paddingRight: 16 }}>
                        <div className="print-photo-box">
                            {santri.photoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={santri.photoUrl} alt="Foto Santri" />
                            ) : (
                                <span>Foto<br />3×4</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Signature */}
                <div className="print-signature-wrapper">
                    <div className="print-signature">
                        <p className="date-line">Rembang, {fmtDate(santri.createdAt || new Date())}</p>
                        <p className="knowing">Mengetahui,</p>
                        <div className="print-signature-row">
                            <div className="print-signature-col">
                                <p className="role">Wali Santri</p>
                                <span className="name">{santri.fatherName || '___________________'}</span>
                            </div>
                            <div className="print-signature-col">
                                <p className="role">Penerima</p>
                                <span className="name">___________________</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer bar */}
            <div className="print-footer-bar">
                <div className="left">
                    <h3>Pondok Pesantren LP3iA</h3>
                    <p>Desa Narukan RT 004 RW 002 Kec. Kragan Kab. Rembang</p>
                </div>
                <div className="right">
                    مدرسة دوراسة القرآن والصلوة
                </div>
            </div>
        </div>
    )
})

PrintDataSantri.displayName = 'PrintDataSantri'
export default PrintDataSantri

function Row({ label, value }: { label: string; value?: string | null }) {
    return (
        <tr>
            <td className="label">{label}</td>
            <td className="sep">:</td>
            <td className="value">{value || '-'}</td>
        </tr>
    )
}
