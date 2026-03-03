'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { trpc } from '@/utils/trpc'

type GroupFormState = {
    id?: string
    code: string
    name: string
    sortOrder: number
}

type PageFormState = {
    id?: string
    groupId: string
    code: string
    name: string
    path: string
    sortOrder: number
}

const emptyGroupForm: GroupFormState = { code: '', name: '', sortOrder: 0 }

export default function PermissionsCatalogEditor() {
    const utils = trpc.useUtils()
    const [selectedGroupId, setSelectedGroupId] = useState('')
    const [groupForm, setGroupForm] = useState<GroupFormState>(emptyGroupForm)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'page', id: string, label: string } | null>(null)
    const [pageForm, setPageForm] = useState<PageFormState>({
        groupId: '',
        code: '',
        name: '',
        path: '',
        sortOrder: 0,
    })

    const { data: groups, isLoading: loadingGroups } = trpc.permissions.pageGroup.list.useQuery()

    const sortedGroups = useMemo(
        () => (groups ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
        [groups]
    )

    useEffect(() => {
        if (!selectedGroupId && sortedGroups.length > 0) {
            setSelectedGroupId(sortedGroups[0].id)
        }
    }, [selectedGroupId, sortedGroups])

    useEffect(() => {
        setPageForm((prev) => ({ ...prev, groupId: prev.groupId || selectedGroupId }))
    }, [selectedGroupId])

    const { data: pages, isLoading: loadingPages } = trpc.permissions.page.listByGroup.useQuery(selectedGroupId, {
        enabled: !!selectedGroupId,
    })

    const refreshCatalog = async () => {
        await Promise.all([
            utils.permissions.pageGroup.list.invalidate(),
            utils.permissions.page.listByGroup.invalidate(),
            utils.permissions.access.getRoleAccess.invalidate(),
            utils.permissions.me.permissions.invalidate(),
        ])
    }

    const createGroup = trpc.permissions.pageGroup.create.useMutation({ onSuccess: refreshCatalog })
    const updateGroup = trpc.permissions.pageGroup.update.useMutation({ onSuccess: refreshCatalog })
    const toggleGroup = trpc.permissions.pageGroup.toggleActive.useMutation({ onSuccess: refreshCatalog })
    const deleteGroup = trpc.permissions.pageGroup.delete.useMutation({ onSuccess: refreshCatalog })

    const createPage = trpc.permissions.page.create.useMutation({ onSuccess: refreshCatalog })
    const updatePage = trpc.permissions.page.update.useMutation({ onSuccess: refreshCatalog })
    const togglePage = trpc.permissions.page.toggleActive.useMutation({ onSuccess: refreshCatalog })
    const deletePage = trpc.permissions.page.delete.useMutation({ onSuccess: refreshCatalog })

    const handleGroupSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!groupForm.code || !groupForm.name) return

        if (groupForm.id) {
            updateGroup.mutate({
                id: groupForm.id,
                code: groupForm.code,
                name: groupForm.name,
                sortOrder: groupForm.sortOrder,
            })
        } else {
            createGroup.mutate({
                code: groupForm.code,
                name: groupForm.name,
                sortOrder: groupForm.sortOrder,
            })
        }

        setGroupForm(emptyGroupForm)
    }

    const editGroup = (group: any) => {
        setGroupForm({
            id: group.id,
            code: group.code,
            name: group.name,
            sortOrder: group.sortOrder,
        })
    }

    const clearGroupForm = () => setGroupForm(emptyGroupForm)

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!pageForm.groupId || !pageForm.code || !pageForm.name || !pageForm.path) return

        const payload = {
            groupId: pageForm.groupId,
            code: pageForm.code,
            name: pageForm.name,
            path: pageForm.path,
            sortOrder: pageForm.sortOrder,
        }

        if (pageForm.id) {
            updatePage.mutate({ id: pageForm.id, ...payload })
        } else {
            createPage.mutate(payload)
        }

        setPageForm({ groupId: selectedGroupId, code: '', name: '', path: '', sortOrder: 0 })
    }

    const editPage = (page: any) => {
        setPageForm({
            id: page.id,
            groupId: page.groupId,
            code: page.code,
            name: page.name,
            path: page.path,
            sortOrder: page.sortOrder,
        })
    }

    const clearPageForm = () => setPageForm({ groupId: selectedGroupId, code: '', name: '', path: '', sortOrder: 0 })

    return (
        <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-5">
                <div>
                    <h3 className="text-sm font-semibold text-slate-700">Editor Grup & Halaman</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Kelola group custom, page catalog, dan pemindahan halaman antar grup.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page Groups</h4>

                        <form onSubmit={handleGroupSubmit} className="space-y-2">
                            <input
                                value={groupForm.code}
                                onChange={(e) => setGroupForm((prev) => ({ ...prev, code: e.target.value }))}
                                placeholder="Code (CORE/REPORTS)"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />
                            <input
                                value={groupForm.name}
                                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Nama grup"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />
                            <input
                                type="number"
                                value={groupForm.sortOrder}
                                onChange={(e) => setGroupForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))}
                                placeholder="Sort"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                                <button type="submit" className="rounded bg-teal-600 px-3 py-2 text-xs font-semibold text-white">
                                    {groupForm.id ? 'Update Group' : 'Tambah Group'}
                                </button>
                                {groupForm.id && (
                                    <button type="button" onClick={clearGroupForm} className="rounded border border-slate-200 px-3 py-2 text-xs">
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="space-y-2 max-h-72 overflow-auto pr-1">
                            {loadingGroups ? (
                                <div className="h-24 rounded bg-slate-100 animate-pulse" />
                            ) : (
                                sortedGroups.map((group) => (
                                    <div key={group.id} className={`rounded border px-2.5 py-2 ${selectedGroupId === group.id ? 'border-teal-400 bg-teal-50' : 'border-slate-200'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => setSelectedGroupId(group.id)}
                                                className="text-left"
                                            >
                                                <p className="text-sm font-medium text-slate-700">{group.name}</p>
                                                <p className="text-xs font-mono text-slate-400">{group.code}</p>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => editGroup(group)} className="rounded border border-slate-200 px-2 py-1 text-xs">Edit</button>
                                                <button
                                                    onClick={() => toggleGroup.mutate({ id: group.id, isActive: !group.isActive })}
                                                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                                                >
                                                    {group.isActive ? 'Nonaktif' : 'Aktif'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget({ type: 'group', id: group.id, label: `group "${group.code}"` })}
                                                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</h4>

                        <form onSubmit={handlePageSubmit} className="space-y-2">
                            <select
                                value={pageForm.groupId}
                                onChange={(e) => setPageForm((prev) => ({ ...prev, groupId: e.target.value }))}
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="">Pilih group</option>
                                {sortedGroups.map((group) => (
                                    <option key={group.id} value={group.id}>{group.code} - {group.name}</option>
                                ))}
                            </select>
                            <input
                                value={pageForm.code}
                                onChange={(e) => setPageForm((prev) => ({ ...prev, code: e.target.value }))}
                                placeholder="Page code"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />
                            <input
                                value={pageForm.name}
                                onChange={(e) => setPageForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Nama halaman"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />
                            <input
                                value={pageForm.path}
                                onChange={(e) => setPageForm((prev) => ({ ...prev, path: e.target.value }))}
                                placeholder="/path"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono"
                            />
                            <input
                                type="number"
                                value={pageForm.sortOrder}
                                onChange={(e) => setPageForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))}
                                placeholder="Sort"
                                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                            />

                            <div className="flex gap-2">
                                <button type="submit" className="rounded bg-teal-600 px-3 py-2 text-xs font-semibold text-white">
                                    {pageForm.id ? 'Update Page' : 'Tambah Page'}
                                </button>
                                {pageForm.id && (
                                    <button type="button" onClick={clearPageForm} className="rounded border border-slate-200 px-3 py-2 text-xs">
                                        Batal
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="space-y-2 max-h-72 overflow-auto pr-1">
                            {loadingPages ? (
                                <div className="h-24 rounded bg-slate-100 animate-pulse" />
                            ) : (
                                (pages ?? []).map((page) => (
                                    <div key={page.id} className="rounded border border-slate-200 px-2.5 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-700">{page.name}</p>
                                                <p className="truncate text-xs font-mono text-slate-400">{page.path} ({page.code})</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => editPage(page)} className="rounded border border-slate-200 px-2 py-1 text-xs">Edit</button>
                                                <button
                                                    onClick={() => togglePage.mutate({ id: page.id, isActive: !page.isActive })}
                                                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                                                >
                                                    {page.isActive ? 'Nonaktif' : 'Aktif'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget({ type: 'page', id: page.id, label: `halaman "${page.code}"` })}
                                                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                deleteTarget && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-bold text-slate-800">Hapus?</h3>
                                <p className="text-sm text-slate-500 mt-1">Hapus {deleteTarget.label}? Aksi ini tidak bisa dibatalkan.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
                                <button onClick={() => {
                                    if (deleteTarget.type === 'group') deleteGroup.mutate(deleteTarget.id)
                                    else deletePage.mutate(deleteTarget.id)
                                    setDeleteTarget(null)
                                }} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-all shadow-md shadow-red-500/20">
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    )
}
