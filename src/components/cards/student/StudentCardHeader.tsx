type Props = {
    name: string
    verified?: boolean
}

export function StudentCardHeader({ name, verified }: Props) {
    return (
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800 leading-snug truncate">
                {name}
            </h3>
            {verified && (
                <span
                    className="inline-flex flex-shrink-0 items-center justify-center w-[18px] h-[18px] rounded-full bg-emerald-500"
                    title="Aktif"
                    aria-label="Santri aktif"
                >
                    <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5 text-white">
                        <path
                            d="M10 3.5L4.75 8.5L2 5.875"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            )}
        </div>
    )
}
