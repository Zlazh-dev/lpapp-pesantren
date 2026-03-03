'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/utils/trpc'
import { PAGE_GROUP_CODES } from '@/lib/page-groups'

const PermissionsCatalogEditor = dynamic(() => import('./PermissionsCatalogEditor'), { ssr: false })

type PageAccessState = {
    selectedPageIds: string[]
}

const GROUP_LABELS: Record<string, string> = {
    DASHBOARD: 'Beranda',
    MASTER_DATA: 'Master Data',
    KEUANGAN: 'Keuangan',
    AKADEMIK: 'Akademik',
    USER_MANAGEMENT: 'User Management',
    SETTINGS: 'Pengaturan',
}

export default function PermissionsClient() {
    const utils = trpc.useUtils()
    const [selectedRoleId, setSelectedRoleId] = useState('')
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [showEditor, setShowEditor] = useState(false)
    const [toast, setToast] = useState('')

    const [draft, setDraft] = useState<PageAccessState>({
        selectedPageIds: [],
    })

    const { data: matrix, isLoading: matrixLoading } = trpc.permissions.access.getMatrix.useQuery()
    const { data: roleAccess, isLoading: roleAccessLoading } = trpc.permissions.access.getRoleAccess.useQuery(
        { roleId: selectedRoleId },
        { enabled: !!selectedRoleId }
    )

    const setRoleAccessMutation = trpc.permissions.access.setRoleAccess.useMutation({
        onSuccess: async (result) => {
            await Promise.all([
                utils.permissions.access.getRoleAccess.invalidate({ roleId: selectedRoleId }),
                utils.permissions.me.permissions.invalidate(),
            ])
            if (result.skipped) {
                setToast(result.reason ?? 'Role ADMIN otomatis memiliki akses ke semua halaman')
                setTimeout(() => setToast(''), 2500)
                return
            }
            setToast('Akses role berhasil disimpan (page-level)')
            setTimeout(() => setToast(''), 2500)
        },
        onError: (error) => {
            setToast(error.message)
            setTimeout(() => setToast(''), 3500)
        },
    })

    const roles = matrix?.roles ?? []

    const sortedGroups = useMemo(() => {
        const groups = roleAccess?.groups ?? []
        const lockedOrder = new Map<string, number>(PAGE_GROUP_CODES.map((code, index) => [code, index]))
        return [...groups].sort((a, b) => {
            const aOrder = lockedOrder.get(a.code)
            const bOrder = lockedOrder.get(b.code)
            if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
            if (aOrder !== undefined) return -1
            if (bOrder !== undefined) return 1
            return a.name.localeCompare(b.name)
        })
    }, [roleAccess?.groups])

    useEffect(() => {
        if (!roleAccess) return

        const selectedPages = [...new Set(roleAccess.rolePageAllowed)]
        const nextExpanded: Record<string, boolean> = {}

        for (const group of roleAccess.groups) {
            const hasSelectedPage = group.pages.some((page) => selectedPages.includes(page.id))
            if (hasSelectedPage) {
                nextExpanded[group.id] = true
            }
        }

        setDraft({
            selectedPageIds: selectedPages,
        })
        setExpandedGroups(nextExpanded)
    }, [roleAccess])

    const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
    const isAdminRole = selectedRole?.code === 'ADMIN'
    const selectedPageSet = useMemo(() => new Set(draft.selectedPageIds), [draft.selectedPageIds])

    const effectiveSelectedPageSet = useMemo(() => {
        if (!isAdminRole) return selectedPageSet
        return new Set((roleAccess?.groups ?? []).flatMap((group) => group.pages.map((page) => page.id)))
    }, [isAdminRole, roleAccess?.groups, selectedPageSet])

    const togglePage = (pageId: string) => {
        if (isAdminRole) return
        setDraft((prev) => {
            const exists = prev.selectedPageIds.includes(pageId)
            return {
                selectedPageIds: exists
                    ? prev.selectedPageIds.filter((id) => id !== pageId)
                    : [...prev.selectedPageIds, pageId],
            }
        })
    }

    const toggleGroupSelectAll = (groupId: string) => {
        if (isAdminRole) return
        const group = sortedGroups.find((item) => item.id === groupId)
        if (!group) return
        const groupPageIds = group.pages.map((page) => page.id)

        setDraft((prev) => ({
            ...prev,
            selectedPageIds: (() => {
                const currentSet = new Set(prev.selectedPageIds)
                const isAllSelected = groupPageIds.every((pageId) => currentSet.has(pageId))

                if (isAllSelected) {
                    for (const pageId of groupPageIds) currentSet.delete(pageId)
                } else {
                    for (const pageId of groupPageIds) currentSet.add(pageId)
                }

                return [...currentSet]
            })(),
        }))
    }

    const handleSave = () => {
        if (!selectedRoleId || isAdminRole) {
            if (isAdminRole) {
                setToast('Role ADMIN otomatis memiliki akses ke semua halaman')
                setTimeout(() => setToast(''), 2500)
            }
            return
        }

        setRoleAccessMutation.mutate({
            roleId: selectedRoleId,
            pageIds: draft.selectedPageIds,
        })
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {toast && (
                <div className="fixed top-6 right-6 z-50 rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Page Permissions</h1>
                    <p className="text-sm text-slate-500 mt-1">Atur akses role per halaman. Group hanya dipakai sebagai kategori tampilan sidebar.</p>
                </div>
                <button
                    onClick={() => setShowEditor((v) => !v)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                    {showEditor ? 'Tutup Editor Grup/Halaman' : 'Edit Groups & Pages'}
                </button>
            </div>

            {showEditor && <PermissionsCatalogEditor />}

            {matrixLoading ? (
                <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3">Roles</h2>
                        <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${selectedRoleId === role.id
                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="font-medium">{role.name}</div>
                                    <div className="text-xs font-mono opacity-70">{role.code}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-slate-700">
                                {selectedRole ? `Akses untuk ${selectedRole.name}` : 'Pilih role di kiri'}
                            </h2>
                            <button
                                onClick={handleSave}
                                disabled={!selectedRoleId || isAdminRole || setRoleAccessMutation.isPending}
                                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {setRoleAccessMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>

                        {isAdminRole && (
                            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                Role ADMIN otomatis memiliki akses ke semua halaman. Checklist tidak diperlukan.
                            </div>
                        )}

                        {!selectedRoleId ? (
                            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                                Pilih role terlebih dahulu.
                            </div>
                        ) : roleAccessLoading ? (
                            <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />
                        ) : (
                            <div className="space-y-3">
                                {sortedGroups.map((group) => {
                                    const expanded = expandedGroups[group.id] ?? false
                                    const groupPageIds = group.pages.map((page) => page.id)
                                    const selectedCount = groupPageIds.filter((pageId) => effectiveSelectedPageSet.has(pageId)).length
                                    const isAllSelected = groupPageIds.length > 0 && selectedCount === groupPageIds.length

                                    return (
                                        <div key={group.id} className="rounded-lg border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.id]: !expanded }))}
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-700">{GROUP_LABELS[group.code] ?? group.name}</span>
                                                    <span className="text-xs font-mono text-slate-400">{group.code}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{selectedCount}/{group.pages.length} dipilih</span>
                                                    <span>{expanded ? 'v' : '>'}</span>
                                                </div>
                                            </button>

                                            {expanded && (
                                                <div className="border-t border-slate-100 px-3 py-3 space-y-3">
                                                    <button
                                                        onClick={() => toggleGroupSelectAll(group.id)}
                                                        disabled={isAdminRole || setRoleAccessMutation.isPending || group.pages.length === 0}
                                                        className={`rounded border px-2.5 py-1.5 text-xs disabled:opacity-50 ${isAllSelected
                                                            ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                            : 'border-slate-200 text-slate-600'
                                                            }`}
                                                    >
                                                        {isAllSelected ? 'Batalkan pilih semua kategori ini' : 'Pilih semua kategori ini'}
                                                    </button>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                        {group.pages.map((page) => (
                                                            <label key={page.id} className="flex items-center gap-2 rounded border border-slate-200 px-2.5 py-2 text-sm text-slate-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={effectiveSelectedPageSet.has(page.id)}
                                                                    onChange={() => togglePage(page.id)}
                                                                    disabled={isAdminRole || setRoleAccessMutation.isPending}
                                                                    className="h-4 w-4"
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="truncate">{page.name}</p>
                                                                    <p className="truncate text-xs text-slate-400 font-mono">{page.path}</p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
