'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from "sonner";
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { OrganizationDetailsPanel } from './OrganizationDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Organization, type UserOrganization, type TodoOrganization, type Profile, type Todo, type Role, type UserRole } from '@/db/schema'
import { cn } from '@/lib/utils'
import { createOrganization, updateOrgSequence, updateOrgNames, toggleOrgsInactiveStatus, deleteMultipleOrgs } from './actions'
import { ResponsiveToolbar, ToolbarButton } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Edit2, MoveVertical, CheckSquare, Trash2, XCircle, Save, ArrowLeft } from 'lucide-react'
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

export type OrganizationWithCreator = Organization & {
    creatorDisplayName?: string;
};

interface OrganizationsListProps {
    initialOrganizations: OrganizationWithCreator[]
    initialUserOrgs: UserOrganization[]
    initialTodoOrgs: TodoOrganization[]
    allProfiles: Profile[]
    allTodos: Todo[]
    initialRoles: Role[]
    initialUserRoles: UserRole[]
    selectedId: number | null
    activeTab: string
}

function SortableOrgItem({ id, org, isReordering, isEditing, isIdle, isCurrentlyEditing, onStartEdit, onOpenDetails, onTextChange, isSelectable, isSelected, onSelectToggle, selectedId }: { id: number, org: OrganizationWithCreator, isReordering: boolean, isEditing: boolean, isIdle: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onOpenDetails: (id: number) => void, onTextChange: (id: number, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: number) => void, selectedId: number | null }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = { transform: CSS.Transform.toString(transform), transition }

    return (
        <li ref={setNodeRef} style={style} {...(isReordering ? attributes : {})} {...(isReordering ? listeners : {})} className={cn("p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors hover:border-primary/50", isReordering ? 'touch-none cursor-grab active:cursor-grabbing' : '', selectedId === id && "border-primary shadow-glow-emerald")}>
            {isSelectable && (
                <input type="checkbox" checked={isSelected} onChange={() => onSelectToggle(id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0" />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing || isIdle ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id); else if (isIdle) onOpenDetails(id); }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea value={org.name} onChange={(e) => onTextChange(id, e.target.value)} className="bg-transparent border-b border-primary outline-none font-semibold text-lg px-1 -mx-1 py-0 resize-none overflow-hidden h-7" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                ) : (
                    <span className={`font-semibold text-lg break-words whitespace-pre-wrap ${org.inactive ? 'line-through text-muted-foreground' : ''}`}>{org.name}</span>
                )}
                {org.description && !isCurrentlyEditing && (
                    <span className={`text-sm text-muted-foreground truncate ${org.inactive ? 'line-through' : ''}`}>
                        {org.description}
                    </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 cursor-default" suppressHydrationWarning>
                    <span>Created on {new Date(org.createdAt).toLocaleDateString('en-GB')}</span>
                    {org.creatorDisplayName && (
                        <>
                            <span>&bull;</span>
                            <span>by {org.creatorDisplayName}</span>
                        </>
                    )}
                </div>
            </div>
        </li>
    )
}

export function OrganizationsList({
    initialOrganizations,
    initialUserOrgs,
    initialTodoOrgs,
    allProfiles,
    allTodos,
    initialRoles,
    initialUserRoles,
    selectedId,
    activeTab
}: OrganizationsListProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [orgs, setOrgs] = useState(initialOrganizations)
    const [userOrgs, setUserOrgs] = useState(initialUserOrgs)
    const [todoOrgs, setTodoOrgs] = useState(initialTodoOrgs)
    const [roles, setRoles] = useState(initialRoles)
    const [userRoles, setUserRoles] = useState(initialUserRoles)
    
    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'inactive' | 'delete' | 'reordering'>('idle')
    const [isSaving, setIsSaving] = useState(false)
    const [editingOrgId, setEditingOrgId] = useState<number | null>(null)
    const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([])
    const [newOrgName, setNewOrgName] = useState('')
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')

    const sortedOrgs = useMemo(() => [...orgs].sort((a,b) => a.sequence - b.sequence), [orgs])
    const pendingUpdate = useRef(false)

    useEffect(() => {
        if (!pendingUpdate.current) {
            setOrgs(initialOrganizations)
            setUserOrgs(initialUserOrgs)
            setTodoOrgs(initialTodoOrgs)
            setRoles(initialRoles)
            setUserRoles(initialUserRoles)
        }
        if (mode === 'idle') {
            pendingUpdate.current = false
            setNewOrgName('')
        }
    }, [initialOrganizations, initialUserOrgs, initialTodoOrgs, initialRoles, initialUserRoles, mode])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setOrgs((items) => {
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

    const handleCreateOrg = async (name: string) => {
        setIsSaving(true)
        try {
            const newOrg = await createOrganization(name)
            router.push(`${pathname}?id=${newOrg.id}`)
            setDetailsMode('editing')
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error('Failed to create organization', error);
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
                if (newOrgName.trim()) {
                    await handleCreateOrg(newOrgName.trim())
                }
            } else if (mode === 'reordering') {
                const updates = orgs.map((o, index) => ({ id: o.id, sequence: index }))
                await updateOrgSequence(updates)
            } else if (mode === 'editing') {
                const updates = orgs
                    .filter(o => { const init = initialOrganizations.find(io => io.id === o.id); return init && init.name !== o.name })
                    .map(o => ({ id: o.id, name: o.name }))
                if (updates.length > 0) await updateOrgNames(updates)
            } else if (mode === 'inactive') {
                if (selectedOrgIds.length > 0) {
                    setOrgs(orgs.map(o => selectedOrgIds.includes(o.id) ? { ...o, inactive: !o.inactive } : o))
                    await toggleOrgsInactiveStatus(selectedOrgIds)
                }
            } else if (mode === 'delete') {
                if (selectedOrgIds.length > 0) {
                    setOrgs(orgs.filter(o => !selectedOrgIds.includes(o.id)))
                    await deleteMultipleOrgs(selectedOrgIds)
                    if (selectedId && selectedOrgIds.includes(selectedId)) {
                        handleCloseDetails()
                    }
                }
            }
            setMode('idle')
            setEditingOrgId(null)
            setSelectedOrgIds([])
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
        setOrgs(initialOrganizations)
        setMode('idle')
        setEditingOrgId(null)
        setSelectedOrgIds([])
        setNewOrgName('')
    }

    const handleSelectToggle = (id: number) => {
        setSelectedOrgIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const handleTextChange = (id: number, text: string) => {
        setOrgs(orgs.map(o => o.id === id ? { ...o, name: text } : o))
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
        <StandardList title="Orgs" toolbarActions={toolbarActions} disabledToolbar={!!selectedId}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedOrgs.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    <ul className={cn("space-y-3", detailsMode === 'editing' ? 'pointer-events-none opacity-50 transition-opacity' : '')}>
                        {mode === 'creating' && (
                            <li className="p-4 border border-primary/50 shadow-md rounded-md bg-card text-card-foreground flex gap-3 items-center transition-colors">
                                <AutoResizeTextarea value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="New Organization Name" className="bg-transparent border-b border-primary outline-none font-semibold text-lg px-1 -mx-1 py-0 resize-none overflow-hidden w-full h-8" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                            </li>
                        )}
                        {sortedOrgs.map((org) => (
                            <SortableOrgItem
                                key={org.id}
                                id={org.id}
                                org={org}
                                isReordering={mode === 'reordering'}
                                isEditing={mode === 'editing'}
                                isIdle={mode === 'idle'}
                                isCurrentlyEditing={editingOrgId === org.id}
                                onStartEdit={setEditingOrgId}
                                onOpenDetails={handleOpenDetails}
                                onTextChange={handleTextChange}
                                isSelectable={mode === 'inactive' || mode === 'delete'}
                                isSelected={selectedOrgIds.includes(org.id)}
                                onSelectToggle={handleSelectToggle}
                                selectedId={selectedId}
                            />
                        ))}
                        {sortedOrgs.length === 0 && mode !== 'creating' && (
                            <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                                No organizations found.
                            </p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <OrganizationDetailsPanel
            organization={orgs.find(o => o.id === selectedId) || null}
            userOrgs={userOrgs}
            todoOrgs={todoOrgs}
            allProfiles={allProfiles}
            allTodos={allTodos}
            allRoles={roles}
            userRoles={userRoles}
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
