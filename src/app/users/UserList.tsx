'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from "sonner";
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { UserDetailsPanel } from './UserDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Profile, type UserManagementRelationship, type Organization, type UserOrganization, type Role, type UserRole } from '@/db/schema'
import { cn } from '@/lib/utils'
import { Edit2, MoveVertical, CheckSquare, XCircle, Save, ArrowLeft } from 'lucide-react'
import { ResponsiveToolbar, ToolbarButton } from '@/components/ui/responsive-toolbar'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { updateUserSequence, updateUserNames, toggleUsersInactiveStatus } from './actions'
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

export type ProfileWithCreator = Profile & {
    creatorDisplayName?: string;
};

interface UserListProps {
    initialProfiles: ProfileWithCreator[]
    initialRelationships: UserManagementRelationship[]
    initialOrganizations: Organization[]
    initialUserOrgs: UserOrganization[]
    initialRoles: Role[]
    initialUserRoles: UserRole[]
    selectedId: string | null
    activeTab: string
}

function SortableUserItem({ id, profile, isReordering, isEditing, isIdle, isCurrentlyEditing, onStartEdit, onOpenDetails, onTextChange, isSelectable, isSelected, onSelectToggle, selectedId }: { id: string, profile: ProfileWithCreator, isReordering: boolean, isEditing: boolean, isIdle: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: string) => void, onOpenDetails: (id: string) => void, onTextChange: (id: string, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: string) => void, selectedId: string | null }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = { transform: CSS.Transform.toString(transform), transition }

    return (
        <li ref={setNodeRef} style={style} {...(isReordering ? attributes : {})} {...(isReordering ? listeners : {})} className={cn("p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors hover:border-primary/50", isReordering ? 'touch-none cursor-grab active:cursor-grabbing' : '', selectedId === id && "border-primary shadow-glow-emerald")}>
            {isSelectable && (
                <input type="checkbox" checked={isSelected} onChange={() => onSelectToggle(id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0" />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing || isIdle ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id); else if (isIdle) onOpenDetails(id); }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea value={profile.displayName || ''} onChange={(e) => onTextChange(id, e.target.value)} className="bg-transparent border-b border-primary outline-none font-semibold text-lg px-1 -mx-1 py-0 resize-none overflow-hidden h-7" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                ) : (
                    <span className={`font-semibold text-lg break-words whitespace-pre-wrap ${profile.inactive ? 'line-through text-muted-foreground' : ''}`}>{profile.displayName || "Unknown User"}</span>
                )}
                {!isCurrentlyEditing && (
                    <span className={`text-sm text-muted-foreground italic truncate ${profile.inactive ? 'line-through' : ''}`}>
                        {profile.email}
                    </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 cursor-default" suppressHydrationWarning>
                    <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-GB')}</span>
                    {profile.creatorDisplayName && (
                        <>
                            <span>&bull;</span>
                            <span>Created by {profile.creatorDisplayName}</span>
                        </>
                    )}
                </div>
            </div>
        </li>
    )
}

export function UserList({
    initialProfiles,
    initialRelationships,
    initialOrganizations,
    initialUserOrgs,
    initialRoles,
    initialUserRoles,
    selectedId,
    activeTab
}: UserListProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [profiles, setProfiles] = useState(initialProfiles)
    const [relationships, setRelationships] = useState(initialRelationships)
    const [organizations, setOrganizations] = useState(initialOrganizations)
    const [userOrgs, setUserOrgs] = useState(initialUserOrgs)
    const [roles, setRoles] = useState(initialRoles)
    const [userRoles, setUserRoles] = useState(initialUserRoles)
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')

    const [mode, setMode] = useState<'idle' | 'editing' | 'inactive' | 'reordering'>('idle')
    const [isSaving, setIsSaving] = useState(false)
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

    const sortedProfiles = useMemo(() => [...profiles].sort((a,b) => a.sequence - b.sequence), [profiles])
    const pendingUpdate = useRef(false)

    useEffect(() => {
        if (!pendingUpdate.current) {
            setProfiles(initialProfiles)
            setRelationships(initialRelationships)
            setOrganizations(initialOrganizations)
            setUserOrgs(initialUserOrgs)
            setRoles(initialRoles)
            setUserRoles(initialUserRoles)
        }
        if (mode === 'idle') {
            pendingUpdate.current = false
        }
    }, [initialProfiles, initialRelationships, initialOrganizations, initialUserOrgs, initialRoles, initialUserRoles, mode])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setProfiles((items) => {
                const currentSorted = [...items].sort((a,b) => a.sequence - b.sequence)
                const oldIndex = currentSorted.findIndex(item => item.id === active.id)
                const newIndex = currentSorted.findIndex(item => item.id === over.id)
                const reordered = arrayMove(currentSorted, oldIndex, newIndex)
                return reordered.map((item, index) => ({ ...item, sequence: index }))
            })
        }
    }

    const handleOpenDetails = (id: string) => {
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

    const handleSaveList = async () => {
        setIsSaving(true)
        pendingUpdate.current = true
        try {
            if (mode === 'reordering') {
                const updates = profiles.map((p, index) => ({ id: p.id, sequence: index }))
                await updateUserSequence(updates)
            } else if (mode === 'editing') {
                const updates = profiles
                    .filter(p => { const init = initialProfiles.find(ip => ip.id === p.id); return init && init.displayName !== p.displayName })
                    .map(p => ({ id: p.id, displayName: p.displayName || '' }))
                if (updates.length > 0) await updateUserNames(updates)
            } else if (mode === 'inactive') {
                if (selectedUserIds.length > 0) {
                    setProfiles(profiles.map(p => selectedUserIds.includes(p.id) ? { ...p, inactive: !p.inactive } : p))
                    await toggleUsersInactiveStatus(selectedUserIds)
                }
            }
            setMode('idle')
            setEditingUserId(null)
            setSelectedUserIds([])
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
        setProfiles(initialProfiles)
        setMode('idle')
        setEditingUserId(null)
        setSelectedUserIds([])
    }

    const handleSelectToggle = (id: string) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const handleTextChange = (id: string, text: string) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, displayName: text } : p))
    }

    const modeStyles: Record<typeof mode, { gradient: string, shadow: string }> = {
        idle: { gradient: 'via-slate-400/40', shadow: 'shadow-glow-slate' },
        editing: { gradient: 'via-blue-500/50', shadow: 'shadow-glow-blue' },
        reordering: { gradient: 'via-amber-500/50', shadow: 'shadow-glow-amber' },
        inactive: { gradient: 'via-emerald-500/50', shadow: 'shadow-glow-emerald' }
    }

    const listToolbarActions = mode === 'idle' ? (
        <>
            <ToolbarButton variant="outline" onClick={() => setMode('editing')} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<Edit2 />} label="Edit" />
            <ToolbarButton variant="outline" onClick={() => setMode('reordering')} className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm" icon={<MoveVertical />} label="Move" />
            <ToolbarButton variant="outline" onClick={() => setMode('inactive')} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<CheckSquare />} label="Deactivate" />
        </>
    ) : (
        <>
            <ToolbarButton variant="outline" onClick={handleDiscardList} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
            <ToolbarButton variant="outline" onClick={handleSaveList} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
        </>
    )

    const listSlot = (
        <StandardList title="Users" toolbarActions={listToolbarActions} disabledToolbar={!!selectedId}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedProfiles.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <ul className={cn("space-y-3", detailsMode === 'editing' ? 'pointer-events-none opacity-50 transition-opacity' : '')}>
                        {sortedProfiles.map((profile) => (
                            <SortableUserItem
                                key={profile.id}
                                id={profile.id}
                                profile={profile}
                                isReordering={mode === 'reordering'}
                                isEditing={mode === 'editing'}
                                isIdle={mode === 'idle'}
                                isCurrentlyEditing={editingUserId === profile.id}
                                onStartEdit={setEditingUserId}
                                onOpenDetails={handleOpenDetails}
                                onTextChange={handleTextChange}
                                isSelectable={mode === 'inactive'}
                                isSelected={selectedUserIds.includes(profile.id)}
                                onSelectToggle={handleSelectToggle}
                                selectedId={selectedId}
                            />
                        ))}
                        {sortedProfiles.length === 0 && (
                            <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                                No users found in the system.
                            </p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <UserDetailsPanel
            profile={profiles.find(p => p.id === selectedId) || null}
            allProfiles={profiles}
            relationships={relationships}
            allOrganizations={organizations}
            userOrgs={userOrgs}
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
