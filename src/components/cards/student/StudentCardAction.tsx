type Props = {
    label?: string
    onClick?: () => void
}

export function StudentCardAction({ label = 'Lihat Detail', onClick }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                inline-flex items-center gap-1 rounded-full
                bg-slate-100 px-5 py-2
                text-[13px] font-semibold text-slate-700
                shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                ring-1 ring-black/[0.03]
                transition-all duration-200
                hover:bg-slate-200/80 hover:shadow-sm
                active:scale-[0.97]
            "
            aria-label={label}
        >
            {label}
            <span className="text-slate-400 ml-0.5">+</span>
        </button>
    )
}
