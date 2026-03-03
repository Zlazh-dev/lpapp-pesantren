type Props = {
    nis: string | number
    kamar: string
    kelas: string
}

export function StudentCardMeta({ nis, kamar, kelas }: Props) {
    return (
        <div className="space-y-0.5">
            <p className="text-[13px] text-slate-400 truncate">
                NIS: {nis}
            </p>
            <p className="text-[12px] text-slate-500 leading-relaxed truncate" title={`Kelas: ${kelas} · Kamar: ${kamar}`}>
                <span className="text-slate-400">Kelas:</span> <span className="font-medium text-slate-600">{kelas}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span className="text-slate-400">Kamar:</span> <span className="font-medium text-slate-600">{kamar}</span>
            </p>
        </div>
    )
}
