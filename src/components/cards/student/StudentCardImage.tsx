import Image from 'next/image'

type Props = {
    imageUrl?: string | null
    name: string
}

export function StudentCardImage({ imageUrl, name }: Props) {
    const initial = name.charAt(0).toUpperCase()

    return (
        <div className="relative w-full overflow-hidden rounded-[18px]" style={{ height: 180 }}>
            {imageUrl ? (
                <Image
                    src={imageUrl}
                    alt={`Foto ${name}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 360px"
                    className="object-cover"
                    unoptimized
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <span className="text-7xl font-bold text-slate-300 select-none">
                        {initial}
                    </span>
                </div>
            )}
        </div>
    )
}
