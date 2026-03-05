'use client'

import { useSession } from 'next-auth/react'
import { trpc } from '@/utils/trpc'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts'

/* ── Mock yearly trend data (replace with real API when available) ── */
const TREND_DATA = [
    { year: '2018', putra: 82, putri: 64 },
    { year: '2019', putra: 105, putri: 89 },
    { year: '2020', putra: 98, putri: 95 },
    { year: '2021', putra: 134, putri: 112 },
    { year: '2022', putra: 156, putri: 128 },
    { year: '2023', putra: 178, putri: 145 },
    { year: '2024', putra: 198, putri: 162 },
    { year: '2025', putra: 215, putri: 174 },
]

/* ── Custom Recharts Tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    const putra = payload.find((p: any) => p.dataKey === 'putra')
    const putri = payload.find((p: any) => p.dataKey === 'putri')
    return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl text-white min-w-[160px]">
            <p className="text-xs font-semibold text-slate-400 mb-2">Tahun {label}</p>
            {putra && (
                <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="flex items-center gap-1.5 text-xs text-blue-300">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        Putra
                    </span>
                    <span className="font-bold text-sm text-blue-200">{putra.value}</span>
                </div>
            )}
            {putri && (
                <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-pink-300">
                        <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                        Putri
                    </span>
                    <span className="font-bold text-sm text-pink-200">{putri.value}</span>
                </div>
            )}
            {putra && putri && (
                <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-400">
                    Total: <span className="text-white font-semibold">{putra.value + putri.value}</span>
                </div>
            )}
        </div>
    )
}

/* ── Circular Progress Ring ── */
function ProgressRing({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
    const r = (size - 12) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (pct / 100) * circ
    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
                className="text-slate-100" strokeWidth={6} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                strokeWidth={6} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
    )
}

/* ── KPI Card ── */
function KpiCard({
    title, value, delta, icon, gradient, iconBg,
}: {
    title: string
    value: string | number
    delta?: string
    icon: React.ReactNode
    gradient: string
    iconBg: string
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl ${gradient} p-px shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-default`}>
            <div className="rounded-2xl bg-white/80 backdrop-blur-md h-full p-5">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                        <p className="text-3xl font-extrabold text-slate-800 leading-none">
                            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </p>
                        {delta && (
                            <div className="flex items-center gap-1 mt-2">
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    {delta}
                                </span>
                                <span className="text-[10px] text-slate-400">bulan ini</span>
                            </div>
                        )}
                    </div>
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                        {icon}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Program Progress Card ── */
function ProgramCard({ label, count, total, pct, color, ringColor }: {
    label: string; count: number; total: number; pct: number; color: string; ringColor: string
}) {
    return (
        <div className="relative rounded-xl bg-white/80 backdrop-blur-md border border-slate-100 p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 flex items-center gap-4">
            <div className="relative flex-shrink-0">
                <ProgressRing pct={pct} color={ringColor} size={72} />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: ringColor }}>
                    {pct}%
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {count.toLocaleString('id-ID')} / {total.toLocaleString('id-ID')} santri
                </p>
                <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, background: ringColor }}
                    />
                </div>
            </div>
            <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
                Aktif
            </span>
        </div>
    )
}

/* ── Main Page ── */
export default function DashboardPage() {
    const { data: session } = useSession()
    const firstName = (session?.user?.name ?? 'Admin').split(' ')[0]

    const now = new Date()
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`

    const statsQuery = trpc.santri.dashboardStats.useQuery(undefined, { retry: false })
    const stats = statsQuery.data
    const isLoading = statsQuery.isLoading

    /* ── Skeleton ── */
    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-56 bg-slate-200 rounded-xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-32 bg-slate-200 rounded-2xl" />
                    <div className="h-32 bg-slate-200 rounded-2xl" />
                </div>
                <div className="h-72 bg-slate-200 rounded-2xl" />
            </div>
        )
    }

    const total = stats?.total ?? 0
    const putra = stats?.putra ?? 0
    const putri = stats?.putri ?? 0
    const mahadAly = stats?.mahadAly ?? 0
    const tahfidz = stats?.tahfidz ?? 0
    const formal = stats?.formal ?? 0
    const pctTahfidz = total > 0 ? Math.round((tahfidz / total) * 100) : 0
    const pctFormal = total > 0 ? Math.round((formal / total) * 100) : 0
    const pctMahadAly = total > 0 ? Math.round((mahadAly / total) * 100) : 0

    return (
        <div className="space-y-6">

            {/* ── Header greeting ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">
                        Halo, {firstName}! 👋
                    </h1>
                    <p className="text-sm text-slate-400 mt-0.5">{dateStr}</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-slate-100 shadow-sm">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-600">Sistem Online</span>
                </div>
            </div>

            {/* ── Row 1: 4 KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Total Santri"
                    value={total}
                    delta="+48"
                    gradient="bg-gradient-to-br from-emerald-400 to-teal-500"
                    iconBg="bg-emerald-50"
                    icon={
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                />
                <KpiCard
                    title="Santri Putra"
                    value={putra}
                    delta="+22"
                    gradient="bg-gradient-to-br from-blue-400 to-indigo-500"
                    iconBg="bg-blue-50"
                    icon={
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                />
                <KpiCard
                    title="Santri Putri"
                    value={putri}
                    delta="+26"
                    gradient="bg-gradient-to-br from-pink-400 to-rose-500"
                    iconBg="bg-pink-50"
                    icon={
                        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    }
                />
                <KpiCard
                    title="Ma'had Aly"
                    value={mahadAly}
                    delta="+15"
                    gradient="bg-gradient-to-br from-violet-400 to-purple-500"
                    iconBg="bg-violet-50"
                    icon={
                        <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    }
                />
            </div>

            {/* ── Row 2: Tahfidz + Formal ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard
                    title="Tahfidz"
                    value={tahfidz}
                    delta="+31"
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    iconBg="bg-amber-50"
                    icon={
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    }
                />
                <KpiCard
                    title="Formal"
                    value={formal}
                    delta="+17"
                    gradient="bg-gradient-to-br from-slate-400 to-slate-600"
                    iconBg="bg-slate-100"
                    icon={
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    }
                />
            </div>

            {/* ── Chart: Tren Pendaftar ── */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Tren Jumlah Pendaftar Santri Baru</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Per tahun ajaran 2018 – 2025</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded-full" />
                            Putra
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <span className="w-3 h-0.5 bg-pink-500 inline-block rounded-full" />
                            Putri
                        </span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={TREND_DATA} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="year"
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            width={30}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line
                            type="monotone"
                            dataKey="putra"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                            animationDuration={1200}
                        />
                        <Line
                            type="monotone"
                            dataKey="putri"
                            stroke="#ec4899"
                            strokeWidth={2.5}
                            dot={{ fill: '#ec4899', r: 4, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, stroke: '#ec4899', strokeWidth: 2, fill: '#fff' }}
                            animationDuration={1400}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── Program Progress ── */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm p-6">
                <div className="mb-4">
                    <h2 className="text-base font-bold text-slate-800">Distribusi Program</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Proporsi santri per program pendidikan</p>
                </div>
                {total === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8 italic">
                        Belum ada data santri
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ProgramCard
                            label="Tahfidz"
                            count={tahfidz}
                            total={total}
                            pct={pctTahfidz}
                            color="bg-amber-50 text-amber-700"
                            ringColor="#f59e0b"
                        />
                        <ProgramCard
                            label="Formal"
                            count={formal}
                            total={total}
                            pct={pctFormal}
                            color="bg-slate-100 text-slate-600"
                            ringColor="#64748b"
                        />
                        <ProgramCard
                            label="Ma'had Aly"
                            count={mahadAly}
                            total={total}
                            pct={pctMahadAly}
                            color="bg-violet-50 text-violet-700"
                            ringColor="#8b5cf6"
                        />
                    </div>
                )}
            </div>

        </div>
    )
}
