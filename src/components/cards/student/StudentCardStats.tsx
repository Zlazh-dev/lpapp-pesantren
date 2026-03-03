import { Icon, type AppIconName } from '@/components/icons'

type StatItem = {
    icon: AppIconName
    value: string | number
}

type Props = {
    stats: StatItem[]
}

export function StudentCardStats({ stats }: Props) {
    if (stats.length === 0) return null

    return (
        <div className="flex items-center gap-4 min-w-0">
            {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <Icon name={stat.icon} size={16} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[90px]" title={String(stat.value)}>
                        {stat.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
