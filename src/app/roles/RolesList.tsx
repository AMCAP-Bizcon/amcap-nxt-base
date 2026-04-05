'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from "sonner";
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { RoleDetailsPanel } from './RoleDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Role, type UserRole, type Profile, type Organization, type AccessRule, type RoleOrganization } from '@/db/schema'
import { cn } from '@/lib/utils'
import { createRole, updateRoleSequence, updateRoleNames, toggleRolesInactiveStatus, deleteMultipleRoles } from './actions'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Edit2, MoveVertical, CheckSquare, Trash2, XCircle, Save } from 'lucide-react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type RoleWithCreator = Role & {
    creatorDisplayName?: string;
};

interface RolesListProps {
    initialRoles: RoleWithCreator[]
    initialUserRoles: UserRole[]
    initialRoleOrgs: RoleOrganization[]
    initialAccessRules: AccessRule[]
    allProfiles: Profile[]
    allOrganizations: Organization[]
    selectedId: number | null
    activeTab: string
}

function SortableRoleItem({ id, role, isReordering, isEditing, isIdle, isCurrentlyEditing, onStartEdit, onOpenDetails, onTextChange, isSelectable, isSelected, onSelectToggle, selectedId }: { id: number, role: RoleWithCreator, isReordering: boolean, isEditing: boolean, isIdle: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onOpenDetails: (id: number) => void, onTextChange: (id: number, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: number) => void, selectedId: number | null }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = { transform: CSS.Transform.toString(transform), transition }

    return (
        <li ref={setNodeRef} style={style} {...(isReordering ? attributes : {})} {...(isReordering ? listeners : {})} className={cn("p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors hover:border-primary/50", isReordering ? 'touch-none cursor-grab active:cursor-grabbing' : '', selectedId === id && "border-primary shadow-glow-emerald")}>
            {isSelectable && (
                <input type="checkbox" checked={isSelected} onChange={() => onSelectToggle(id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0" />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing || isIdle ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id); else if (isIdle) onOpenDetails(id); }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea value={role.name} onChange={(e) => onTextChange(id, e.target.value)} className="bg-transparent border-b border-primary outline-none font-semibold text-lg px-1 -mx-1 py-0 resize-none overflow-hidden h-7" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                ) : (
                    <span className={`font-semibold text-lg break-words whitespace-pre-wrap ${role.inactive ? 'line-through text-muted-foreground' : ''}`}>{role.name}</span>
                )}
                {role.description && !isCurrentlyEditing && (
                    <span className={`text-sm text-muted-foreground truncate ${role.inactive ? 'line-through' : ''}`}>
                        {role.description}
                    </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 cursor-default" suppressHydrationWarning>
                    <span>Created on {new Date(role.createdAt).toLocaleDateString('en-GB')}</span>
                    {role.creatorDisplayName && (
                        <>
                            <span>&bull;</span>
                            <span>by {role.creatorDisplayName}</span>
                        </>
                    )}
                </div>
            </div>
        </li>
    )
}

export function RolesList({
    initialRoles,
    initialUserRoles,
    initialRoleOrgs,
    initialAccessRules,
    allProfiles,
    allOrganizations,
    selectedId,
    activeTab
}: RolesListProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [roles, setRoles] = useState(initialRoles)
    const [userRoles, setUserRoles] = useState(initialUserRoles)
    const [roleOrgs, setRoleOrgs] = useState(initialRoleOrgs)
    const [accessRules, setAccessRules] = useState(initialAccessRules)
    
    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'inactive' | 'delete' | 'reordering'>('idle')
    const [isSaving, setIsSaving] = useState(false)
    const [editingRoleId, setEditingRoleId] = useState<number | null>(null)
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
    const [newRoleName, setNewRoleName] = useState('')
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')

    const sortedRoles = useMemo(() => [...roles].sort((a,b) => a.sequence - b.sequence), [roles])
    const pendingUpdate = useRef(false)

    useEffect(() => {
        if (!pendingUpdate.current) {
            setRoles(initialRoles)
            setUserRoles(initialUserRoles)
            setRoleOrgs(initialRoleOrgs)
            setAccessRules(initialAccessRules)
        }
        if (mode === 'idle') {
            pendingUpdate.current = false
            setNewRoleName('')
        }
    }, [initialRoles, initialUserRoles, initialRoleOrgs, initialAccessRules, mode])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setRoles((items) => {
                const currentSorted = [...items].sort((a,b) => a.sequence - b.sequence)
                const oldIndex = currentSorted.findIndex(item => item.id === active.id)
                const newIndex = currentSorted.findIndex(item => item.id === over.id)
                const reordered = arrayMove(currentSorted, oldIndex, newIndex)
                return reordered.map((item, index) => ({ ...item, sequence: index }))
            })
        }
    }

    const handleOpenDetails = (id: number) => {
        router.push(`${pathname}?id=${id}`)
    }

    const handleCloseDetails = () => {
        setDetailsMode('idle')
        router.push(pathname)
    }

    const handleTabChange = (tabId: string) => {
        if (selectedId) {
            router.push(`${pathname}?id=${selectedId}&tab=${tabId}`)
        }
    }

    const handleCreateRole = async (name: string) => {
        setIsSaving(true)
        try {
            const newRole = await createRole(name)
            router.push(`${pathname}?id=${newRole.id}`)
            setDetailsMode('editing')
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error('Failed to create role', error);
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveList = async () => {
        setIsSaving(true)
        pendingUpdate.current = true
        try {
            if (mode === 'creating') {
                if (newRoleName.trim()) {
                    await handleCreateRole(newRoleName.trim())
                }
            } else if (mode === 'reordering') {
                const updates = roles.map((r, index) => ({ id: r.id, sequence: index }))
                await updateRoleSequence(updates)
            } else if (mode === 'editing') {
                const updates = roles
                    .filter(r => { const init = initialRoles.find(ir => ir.id === r.id); return init && init.name !== r.name })
                    .map(r => ({ id: r.id, name: r.name }))
                if (updates.length > 0) await updateRoleNames(updates)
            } else if (mode === 'inactive') {
                if (selectedRoleIds.length > 0) {
                    setRoles(roles.map(r => selectedRoleIds.includes(r.id) ? { ...r, inactive: !r.inactive } : r))
                    await toggleRolesInactiveStatus(selectedRoleIds)
                }
            } else if (mode === 'delete') {
                if (selectedRoleIds.length > 0) {
                    setRoles(roles.filter(r => !selectedRoleIds.includes(r.id)))
                    await deleteMultipleRoles(selectedRoleIds)
                    if (selectedId && selectedRoleIds.includes(selectedId)) {
                        handleCloseDetails()
                    }
                }
            }
            setMode('idle')
            setEditingRoleId(null)
            setSelectedRoleIds([])
        } catch (error: any) {
            pendingUpdate.current = false
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error("Failed to save", error);
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscardList = () => {
        setRoles(initialRoles)
        setMode('idle')
        setEditingRoleId(null)
        setSelectedRoleIds([])
        setNewRoleName('')
    }

    const handleSelectToggle = (id: number) => {
        setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const handleTextChange = (id: number, text: string) => {
        setRoles(roles.map(r => r.id === id ? { ...r, name: text } : r))
    }

    const modeStyles: Record<typeof mode, { gradient: string, shadow: string }> = {
        idle: { gradient: 'via-slate-400/40', shadow: 'shadow-glow-slate' },
        creating: { gradient: 'via-violet-500/50', shadow: 'shadow-glow-violet' },
        editing: { gradient: 'via-blue-500/50', shadow: 'shadow-glow-blue' },
        reordering: { gradient: 'via-amber-500/50', shadow: 'shadow-glow-amber' },
        inactive: { gradient: 'via-emerald-500/50', shadow: 'shadow-glow-emerald' },
        delete: { gradient: 'via-rose-500/50', shadow: 'shadow-glow-rose' }
    }

    const toolbarActions = mode === 'idle' ? (
        <>
            <ToolbarButton variant="outline" onClick={() => setMode('creating')} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<PlusCircle />} label="Create" />
            <ToolbarButton variant="outline" onClick={() => setMode('editing')} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<Edit2 />} label="Edit" />
            <ToolbarButton variant="outline" onClick={() => setMode('reordering')} className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm" icon={<MoveVertical />} label="Move" />
            <ToolbarButton variant="outline" onClick={() => setMode('inactive')} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<CheckSquare />} label="Deactivate" />
            <ToolbarButton variant="outline" onClick={() => setMode('delete')} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm" icon={<Trash2 />} label="Remove" />
        </>
    ) : (
        <>
            <ToolbarButton variant="outline" onClick={handleDiscardList} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
            <ToolbarButton variant="outline" onClick={handleSaveList} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
        </>
    )

    const listSlot = (
        <StandardList title="Roles" toolbarActions={toolbarActions} disabledToolbar={!!selectedId}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedRoles.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    <ul className={cn("space-y-3", detailsMode === 'editing' ? 'pointer-events-none opacity-50 transition-opacity' : '')}>
                        {mode === 'creating' && (
                            <li className="p-4 border border-primary/50 shadow-md rounded-md bg-card text-card-foreground flex gap-3 items-center transition-colors">
                                <AutoResizeTextarea value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="New Role Name" className="bg-transparent border-b border-primary outline-none font-semibold text-lg px-1 -mx-1 py-0 resize-none overflow-hidden w-full h-8" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                            </li>
                        )}
                        {sortedRoles.map((role) => (
                            <SortableRoleItem
                                key={role.id}
                                id={role.id}
                                role={role}
                                isReordering={mode === 'reordering'}
                                isEditing={mode === 'editing'}
                                isIdle={mode === 'idle'}
                                isCurrentlyEditing={editingRoleId === role.id}
                                onStartEdit={setEditingRoleId}
                                onOpenDetails={handleOpenDetails}
                                onTextChange={handleTextChange}
                                isSelectable={mode === 'inactive' || mode === 'delete'}
                                isSelected={selectedRoleIds.includes(role.id)}
                                onSelectToggle={handleSelectToggle}
                                selectedId={selectedId}
                            />
                        ))}
                        {sortedRoles.length === 0 && mode !== 'creating' && (
                            <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                                No roles found.
                            </p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <RoleDetailsPanel
            role={roles.find(r => r.id === selectedId) || null}
            userRoles={userRoles}
            roleOrganizations={roleOrgs}
            accessRules={accessRules}
            allProfiles={allProfiles}
            allOrganizations={allOrganizations}
            readOnly={detailsMode === 'idle'}
            onEnterEditMode={() => setDetailsMode('editing')}
            onClose={handleCloseDetails}
            onSaved={() => { setDetailsMode('idle'); pendingUpdate.current = false; }}
            onDiscard={() => setDetailsMode('idle')}
            activeTab={activeTab}
            onTabChange={handleTabChange}
        />
    ) : null

    return (
        <MasterDetailLayout
            listSlot={listSlot}
            detailSlot={detailSlot}
            isDetailOpen={!!selectedId}
            panelGroupClassName={modeStyles[mode].shadow}
        />
    )
}
