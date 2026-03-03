import type { StudentCardProps } from './types'
import { StudentCardImage } from './StudentCardImage'
import { StudentCardHeader } from './StudentCardHeader'
import { StudentCardMeta } from './StudentCardMeta'
import { StudentCardAction } from './StudentCardAction'

export function StudentCard({
    name,
    nis,
    kamar,
    kelas,
    imageUrl,
    verified,
    onClickDetail,
    className,
}: StudentCardProps) {
    return (
        <div
            className={`
                group w-full
                rounded-[24px] bg-white
                p-3.5
                ring-1 ring-black/[0.04]
                shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]
                hover:-translate-y-1
                transition-all duration-300 ease-out
                ${className ?? ''}
            `.trim()}
        >
            {/* Image — dominates top ~65% */}
            <StudentCardImage imageUrl={imageUrl} name={name} />

            {/* Text content */}
            <div className="mt-3 space-y-1.5 px-0.5">
                <StudentCardHeader name={name} verified={verified} />
                <StudentCardMeta nis={nis} kamar={kamar} kelas={kelas} />
            </div>

            {/* Bottom action row */}
            <div className="mt-3 flex items-center justify-end px-0.5">
                <StudentCardAction onClick={onClickDetail} />
            </div>
        </div>
    )
}
