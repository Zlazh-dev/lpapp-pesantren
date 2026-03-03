'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { trpc } from '@/utils/trpc'

type DeleteTarget = { type: 'complex' | 'building' | 'floor' | 'room'; id: number; name: string }

export default function KamarPageClient() {
    const router = useRouter()
    const utils = trpc.useUtils()

    const [selectedComplexId, setSelectedComplexId] = useState<number | null>(null)
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null)
    const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

    const [draggingUser, setDraggingUser] = useState<string | null>(null)
    const [dropTarget, setDropTarget] = useState<number | null>(null)

    const [addingComplex, setAddingComplex] = useState(false)
    const [newComplexName, setNewComplexName] = useState('')
    const [addingBuilding, setAddingBuilding] = useState(false)
    const [newBuildingName, setNewBuildingName] = useState('')
    const [addingFloor, setAddingFloor] = useState(false)
    const [newFloorNumber, setNewFloorNumber] = useState('')
    const [addingRoom, setAddingRoom] = useState(false)
    const [newRoomName, setNewRoomName] = useState('')
    const [newRoomCapacity, setNewRoomCapacity] = useState(20)

    const { data: complexes } = trpc.dorm.complex.list.useQuery()
    const { data: buildings } = trpc.dorm.building.listByComplex.useQuery(selectedComplexId!, { enabled: !!selectedComplexId })
    const { data: floors } = trpc.dorm.floor.listByBuilding.useQuery(selectedBuildingId!, { enabled: !!selectedBuildingId })
    const { data: rooms } = trpc.dorm.room.list.useQuery()
    const { data: supervisors, refetch: refetchSupervisors } = trpc.dorm.room.availableSupervisors.useQuery()

    const showMsg = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000) }

    const invalidateAll = () => { utils.dorm.room.list.invalidate(); refetchSupervisors() }

    const createComplexMut = trpc.dorm.complex.create.useMutation({
        onSuccess: (data: any) => { utils.dorm.complex.list.invalidate(); setSelectedComplexId(data.id); setSelectedBuildingId(null); setSelectedFloorId(null); setAddingComplex(false); setNewComplexName(''); showMsg(`Komplek "${data.name}" dibuat`) },
        onError: (e: any) => setError(e.message),
    })
    const deleteComplexMut = trpc.dorm.complex.delete.useMutation({
        onSuccess: () => { utils.dorm.complex.list.invalidate(); utils.dorm.room.list.invalidate(); refetchSupervisors(); if (selectedComplexId === deleteTarget?.id) { setSelectedComplexId(null); setSelectedBuildingId(null); setSelectedFloorId(null) }; setDeleteTarget(null); showMsg('Komplek berhasil dihapus') },
        onError: (e: any) => { setError(e.message); setDeleteTarget(null) },
    })
    const createBuildingMut = trpc.dorm.building.create.useMutation({
        onSuccess: (data: any) => { utils.dorm.building.listByComplex.invalidate(selectedComplexId!); setSelectedBuildingId(data.id); setSelectedFloorId(null); setAddingBuilding(false); setNewBuildingName(''); showMsg(`Gedung "${data.name}" dibuat`) },
        onError: (e: any) => setError(e.message),
    })
    const deleteBuildingMut = trpc.dorm.building.delete.useMutation({
        onSuccess: () => { utils.dorm.building.listByComplex.invalidate(selectedComplexId!); utils.dorm.room.list.invalidate(); refetchSupervisors(); if (selectedBuildingId === deleteTarget?.id) { setSelectedBuildingId(null); setSelectedFloorId(null) }; setDeleteTarget(null); showMsg('Gedung berhasil dihapus') },
        onError: (e: any) => { setError(e.message); setDeleteTarget(null) },
    })
    const createFloorMut = trpc.dorm.floor.create.useMutation({
        onSuccess: (data: any) => { utils.dorm.floor.listByBuilding.invalidate(selectedBuildingId!); setSelectedFloorId(data.id); setAddingFloor(false); setNewFloorNumber(''); showMsg(`Lantai ${data.number} dibuat`) },
        onError: (e: any) => setError(e.message),
    })
    const deleteFloorMut = trpc.dorm.floor.delete.useMutation({
        onSuccess: () => { utils.dorm.floor.listByBuilding.invalidate(selectedBuildingId!); utils.dorm.room.list.invalidate(); refetchSupervisors(); if (selectedFloorId === deleteTarget?.id) setSelectedFloorId(null); setDeleteTarget(null); showMsg('Lantai berhasil dihapus') },
        onError: (e: any) => { setError(e.message); setDeleteTarget(null) },
    })
    const createRoomMut = trpc.dorm.room.create.useMutation({
        onSuccess: () => { invalidateAll(); setAddingRoom(false); setNewRoomName(''); setNewRoomCapacity(20); showMsg('Kamar berhasil dibuat') },
        onError: (e: any) => setError(e.message),
    })
    const deleteRoomMut = trpc.dorm.room.delete.useMutation({
        onSuccess: () => { invalidateAll(); setDeleteTarget(null); showMsg('Kamar berhasil dihapus') },
        onError: (e: any) => { setError(e.message); setDeleteTarget(null) },
    })
    const assignSupervisor = trpc.dorm.room.assignSupervisor.useMutation({
        onSuccess: () => { invalidateAll(); showMsg('Pembimbing berhasil di-assign') },
        onError: (e: any) => setError(e.message),
    })
    const removeSupervisor = trpc.dorm.room.removeSupervisor.useMutation({
        onSuccess: () => { invalidateAll(); showMsg('Pembimbing berhasil dihapus') },
    })

    const handleDrop = (roomId: number) => {
        if (!draggingUser) return
        assignSupervisor.mutate({ roomId, userId: draggingUser })
        setDraggingUser(null); setDropTarget(null)
    }

    const handleDelete = () => {
        if (!deleteTarget) return
        if (deleteTarget.type === 'complex') deleteComplexMut.mutate(deleteTarget.id)
        else if (deleteTarget.type === 'building') deleteBuildingMut.mutate(deleteTarget.id)
        else if (deleteTarget.type === 'floor') deleteFloorMut.mutate(deleteTarget.id)
        else if (deleteTarget.type === 'room') deleteRoomMut.mutate(deleteTarget.id)
    }

    const filteredRooms = (rooms ?? []).filter((r: any) => selectedFloorId ? r.floor?.id === selectedFloorId : false)
    const availableSupervisors = (supervisors ?? []).filter((s: any) => !s.isAssigned)
    const assignedSupervisors = (supervisors ?? []).filter((s: any) => s.isAssigned)

    const TrashIcon = () => (
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    )
    const PlusIcon = () => (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
    )

    const InlineAdd = ({ value, onChange, onConfirm, placeholder, type = 'text', isPending }: any) => (
        <div className="flex gap-1 p-2 border-b border-dashed border-emerald-200 bg-emerald-50/50">
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoFocus
                className="flex-1 min-w-0 px-2 py-1 rounded border border-emerald-200 text-xs bg-white outline-none focus:border-emerald-400"
                onKeyDown={e => e.key === 'Enter' && value && onConfirm()} />
            <button onClick={() => value && onConfirm()} disabled={!value || isPending}
                className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-medium disabled:opacity-50">OK</button>
        </div>
    )

    const deleteDescriptions: Record<string, string> = {
        complex: 'Semua gedung, lantai, dan kamar di dalam komplek ini akan ikut dihapus. Santri yang menghuni kamar-kamar tersebut akan otomatis dikeluarkan.',
        building: 'Semua lantai dan kamar di dalam gedung ini akan ikut dihapus. Santri yang menghuni kamar-kamar tersebut akan otomatis dikeluarkan.',
        floor: 'Semua kamar di lantai ini akan ikut dihapus. Santri yang menghuni kamar-kamar tersebut akan otomatis dikeluarkan.',
        room: 'Santri yang menghuni kamar ini akan otomatis dikeluarkan.',
    }

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* Header */}
            <div className="mb-3 flex-shrink-0">
                <h1 className="text-sm font-bold text-gray-900">Data Kamar Asrama</h1>
                <p className="text-xs text-gray-500 mt-0.5">Kelola kamar dan assign pembimbing dengan drag & drop</p>
            </div>

            {error && <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex-shrink-0">{error}</div>}
            {success && <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-600 flex-shrink-0">{success}</div>}

            {/* 5-Panel */}
            <div className="flex flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">

                {/* ─── Panel 1: Komplek ─── */}
                <div className="w-[180px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Komplek</span>
                        <button onClick={() => setAddingComplex(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center"><PlusIcon /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {addingComplex && <InlineAdd value={newComplexName} onChange={setNewComplexName} onConfirm={() => createComplexMut.mutate({ name: newComplexName })} placeholder="Nama komplek" isPending={createComplexMut.isPending} />}
                        {(complexes ?? []).map((c: any) => (
                            <div key={c.id} onClick={() => { setSelectedComplexId(c.id); setSelectedBuildingId(null); setSelectedFloorId(null) }}
                                className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selectedComplexId === c.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                <span className={`text-xs font-medium flex-1 truncate ${selectedComplexId === c.id ? 'text-emerald-700' : 'text-gray-800'}`}>{c.name}</span>
                                <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'complex', id: c.id, name: c.name }) }}
                                    className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                        {!complexes?.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada komplek</div>}
                    </div>
                </div>

                {/* ─── Panel 2: Gedung ─── */}
                <div className="w-[180px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Gedung</span>
                        {selectedComplexId && <button onClick={() => setAddingBuilding(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center"><PlusIcon /></button>}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selectedComplexId
                            ? <div className="p-4 text-center text-xs text-gray-400">Pilih komplek</div>
                            : <>
                                {addingBuilding && <InlineAdd value={newBuildingName} onChange={setNewBuildingName} onConfirm={() => createBuildingMut.mutate({ complexId: selectedComplexId, name: newBuildingName })} placeholder="Nama gedung" isPending={createBuildingMut.isPending} />}
                                {(buildings ?? []).map((b: any) => (
                                    <div key={b.id} onClick={() => { setSelectedBuildingId(b.id); setSelectedFloorId(null) }}
                                        className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selectedBuildingId === b.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                        <span className={`text-xs font-medium flex-1 truncate ${selectedBuildingId === b.id ? 'text-emerald-700' : 'text-gray-800'}`}>{b.name}</span>
                                        <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'building', id: b.id, name: b.name }) }}
                                            className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                                {!buildings?.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada gedung</div>}
                            </>
                        }
                    </div>
                </div>

                {/* ─── Panel 3: Lantai ─── */}
                <div className="w-[180px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Lantai</span>
                        {selectedBuildingId && <button onClick={() => setAddingFloor(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center"><PlusIcon /></button>}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selectedBuildingId
                            ? <div className="p-4 text-center text-xs text-gray-400">Pilih gedung</div>
                            : <>
                                {addingFloor && <InlineAdd value={newFloorNumber} onChange={setNewFloorNumber} onConfirm={() => createFloorMut.mutate({ buildingId: selectedBuildingId, number: +newFloorNumber })} placeholder="No. lantai" type="number" isPending={createFloorMut.isPending} />}
                                {(floors ?? []).map((f: any) => {
                                    const roomCount = (rooms ?? []).filter((r: any) => r.floor?.id === f.id).length
                                    return (
                                        <div key={f.id} onClick={() => setSelectedFloorId(f.id)}
                                            className={`flex items-center gap-1 px-3 py-2 border-b border-gray-100 cursor-pointer group/row transition ${selectedFloorId === f.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                            <span className={`text-xs font-medium flex-1 truncate ${selectedFloorId === f.id ? 'text-emerald-700' : 'text-gray-800'}`}>Lantai {f.number}</span>
                                            <span className="text-[10px] text-gray-400 mr-1">{roomCount}</span>
                                            <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'floor', id: f.id, name: `Lantai ${f.number}` }) }}
                                                className="w-5 h-5 flex-shrink-0 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    )
                                })}
                                {!floors?.length && <div className="p-4 text-center text-xs text-gray-400">Belum ada lantai</div>}
                            </>
                        }
                    </div>
                </div>

                {/* ─── Panel 4: Kamar ─── */}
                <div className="flex-1 border-r border-gray-200 flex flex-col min-w-0">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">Kamar</span>
                        {selectedFloorId && <button onClick={() => setAddingRoom(v => !v)} className="w-5 h-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center justify-center"><PlusIcon /></button>}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selectedFloorId
                            ? <div className="p-6 text-center text-xs text-gray-400">Pilih lantai</div>
                            : <>
                                {addingRoom && (
                                    <div className="flex gap-1 p-2 border-b border-dashed border-emerald-200 bg-emerald-50/50">
                                        <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Nama kamar" autoFocus
                                            className="flex-1 min-w-0 px-2 py-1 rounded border border-emerald-200 text-xs bg-white outline-none" />
                                        <input type="number" value={newRoomCapacity} onChange={e => setNewRoomCapacity(+e.target.value)} min={1}
                                            className="w-12 px-2 py-1 rounded border border-emerald-200 text-xs bg-white outline-none" placeholder="Kap" />
                                        <button onClick={() => newRoomName && createRoomMut.mutate({ floorId: selectedFloorId, name: newRoomName, capacity: newRoomCapacity })}
                                            disabled={!newRoomName || createRoomMut.isPending} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs disabled:opacity-50">OK</button>
                                    </div>
                                )}
                                {filteredRooms.length === 0
                                    ? <div className="p-6 text-center text-xs text-gray-400">Belum ada kamar</div>
                                    : (
                                        <table className="w-full">
                                            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Nama</th>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Terisi</th>
                                                    <th className="px-3 py-1.5 text-left text-[10px] font-medium text-gray-500">Pembimbing</th>
                                                    <th className="px-3 py-1.5 text-center text-[10px] font-medium text-gray-500 w-14">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRooms.map((r: any) => {
                                                    const occ = r._count?.assignments ?? 0
                                                    const pct = r.capacity ? Math.min(100, (occ / r.capacity) * 100) : 0
                                                    const isOver = occ > r.capacity
                                                    const isDragOver = dropTarget === r.id
                                                    return (
                                                        <tr key={r.id}
                                                            onDragOver={e => { e.preventDefault(); setDropTarget(r.id) }}
                                                            onDragLeave={() => setDropTarget(null)}
                                                            onDrop={e => { e.preventDefault(); handleDrop(r.id) }}
                                                            className={`border-b border-gray-100 transition group/row ${isDragOver ? 'bg-emerald-100 ring-1 ring-inset ring-emerald-400' : 'hover:bg-gray-50'}`}>
                                                            <td className="px-3 py-2">
                                                                <button onClick={() => router.push(`/kamar/${r.id}`)} className="text-xs font-medium text-gray-900 hover:text-emerald-700 transition text-left">{r.name}</button>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <span className={`text-xs ${isOver ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{occ}/{r.capacity}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {r.supervisor ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs text-emerald-700 font-medium truncate max-w-[100px]">{r.supervisor.fullName}</span>
                                                                        <button onClick={() => removeSupervisor.mutate({ roomId: r.id })} className="text-gray-300 hover:text-red-500 text-[10px] transition opacity-0 group-hover/row:opacity-100">✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <span className={`text-xs italic ${isDragOver ? 'text-emerald-600' : 'text-gray-300'}`}>{isDragOver ? '↓ Lepas' : 'Drop'}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center justify-center gap-0.5">
                                                                    <button onClick={() => router.push(`/kamar/${r.id}`)} className="w-5 h-5 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-500 rounded flex items-center justify-center transition">
                                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                                    </button>
                                                                    <button onClick={() => setDeleteTarget({ type: 'room', id: r.id, name: r.name })} className="w-5 h-5 bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-400 rounded flex items-center justify-center transition opacity-0 group-hover/row:opacity-100">
                                                                        <TrashIcon />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    )
                                }
                            </>
                        }
                    </div>
                </div>

                {/* ─── Panel 5: Pembimbing ─── */}
                <div className="w-[200px] flex-shrink-0 flex flex-col">
                    <div className="px-3 py-2 border-b border-gray-200 bg-violet-600 flex-shrink-0">
                        <p className="text-xs font-semibold text-white">Pembimbing</p>
                        <p className="text-[10px] text-violet-300">Drag ke kamar untuk assign</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {availableSupervisors.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tersedia ({availableSupervisors.length})</span>
                                </div>
                                {availableSupervisors.map((s: any) => (
                                    <div key={s.id} draggable onDragStart={() => setDraggingUser(s.id)} onDragEnd={() => { setDraggingUser(null); setDropTarget(null) }}
                                        className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 cursor-grab active:cursor-grabbing hover:bg-violet-50 transition group">
                                        <svg className="w-2.5 h-2.5 text-gray-300 group-hover:text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                        <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-bold text-violet-700">{s.fullName.charAt(0)}</span>
                                        </div>
                                        <span className="text-xs text-gray-700 truncate flex-1">{s.fullName}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {assignedSupervisors.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ditugaskan ({assignedSupervisors.length})</span>
                                </div>
                                {assignedSupervisors.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition group/sup">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[9px] font-bold text-emerald-600">{s.fullName.charAt(0)}</span>
                                        </div>
                                        <span className="text-xs text-gray-600 truncate flex-1">{s.fullName}</span>
                                        <button onClick={() => {
                                            const assignedRoom = (rooms ?? []).find((r: any) => r.supervisor?.id === s.id)
                                            if (assignedRoom) removeSupervisor.mutate({ roomId: assignedRoom.id })
                                        }} className="w-4 h-4 text-emerald-300 hover:text-red-500 flex items-center justify-center transition text-[10px] opacity-0 group-hover/sup:opacity-100 flex-shrink-0" title="Un-assign">✕</button>
                                    </div>
                                ))}
                            </>
                        )}
                        {!(supervisors ?? []).length && <div className="p-4 text-center text-xs text-gray-400 italic">Belum ada pembimbing</div>}
                    </div>
                </div>
            </div>

            {/* ── Unified Delete Modal ── */}
            {deleteTarget && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-gray-900">Hapus {deleteTarget.type === 'complex' ? 'Komplek' : deleteTarget.type === 'building' ? 'Gedung' : deleteTarget.type === 'floor' ? 'Lantai' : 'Kamar'}?</h3>
                            <p className="text-sm font-semibold text-gray-800 mt-1">&quot;{deleteTarget.name}&quot;</p>
                            <p className="text-xs text-gray-500 mt-2">{deleteDescriptions[deleteTarget.type]}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Batal</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition shadow-md shadow-red-500/20">Ya, Hapus</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
