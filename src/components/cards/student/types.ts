export type StudentCardProps = {
    name: string
    nis: string | number
    kamar: string
    kelas: string
    imageUrl?: string | null
    verified?: boolean
    onClickDetail?: () => void
    className?: string
}
