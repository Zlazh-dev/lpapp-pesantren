'use client'

interface DataPreviewTableProps {
    rows: any[]
}

export function DataPreviewTable({ rows }: DataPreviewTableProps) {
    if (!rows.length) return null

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">NIS</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Nama</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Gender</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Tgl Lahir</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Tgl Masuk</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Tgl Keluar</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Jenjang</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">No HP</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 20).map((r: any, i: number) => (
                        <tr key={i} className={`hover:bg-slate-50/50 ${r.deactivatedAt ? 'opacity-60' : ''}`}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{r.nis}</td>
                            <td className="px-3 py-2 text-slate-700">{r.fullName}</td>
                            <td className="px-3 py-2 text-slate-500">{r.gender || '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{r.birthDate || '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{r.enrollmentDate || '—'}</td>
                            <td className="px-3 py-2">
                                {r.deactivatedAt
                                    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                                        🎓 {r.deactivatedAt}
                                    </span>
                                    : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{r.educationLevel || '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{r.phone || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > 20 && (
                <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 text-center">
                    ... dan {rows.length - 20} baris lainnya
                </div>
            )}
        </div>
    )
}
