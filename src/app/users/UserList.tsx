'use client'

import { useState, useEffect } from 'react'
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { UserDetailsPanel } from './UserDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Profile, type UserManagementRelationship, type Organization, type UserOrganization } from '@/db/schema'
import { cn } from '@/lib/utils'
import { PlusCircle, Edit2, MoveVertical, CheckSquare, Trash2, XCircle, Save, ArrowLeft } from 'lucide-react'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'

interface UserListProps {
    initialProfiles: Profile[]
    initialRelationships: UserManagementRelationship[]
    initialOrganizations: Organization[]
    initialUserOrgs: UserOrganization[]
    selectedId: string | null
    activeTab: string
}

export function UserList({
    initialProfiles,
    initialRelationships,
    initialOrganizations,
    initialUserOrgs,
    selectedId,
    activeTab
}: UserListProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [profiles, setProfiles] = useState(initialProfiles)
    const [relationships, setRelationships] = useState(initialRelationships)
    const [organizations, setOrganizations] = useState(initialOrganizations)
    const [userOrgs, setUserOrgs] = useState(initialUserOrgs)
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')

    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'done' | 'delete' | 'reordering'>('idle')
    const [isSaving, setIsSaving] = useState(false)

    const handleDiscardList = () => {
        setMode('idle')
    }

    const handleSaveList = async () => {
        setIsSaving(true)
        try {
            // Placeholder: no list operations implemented natively for users yet
        } finally {
            setIsSaving(false)
            setMode('idle')
        }
    }

    const listToolbarActions = mode === 'idle' ? (
        <>
            <ToolbarButton variant="outline" onClick={() => setMode('creating')} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<PlusCircle />} label="Create" />
            <ToolbarButton variant="outline" onClick={() => setMode('editing')} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<Edit2 />} label="Edit" />
            <ToolbarButton variant="outline" onClick={() => setMode('reordering')} className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm" icon={<MoveVertical />} label="Move" />
            <ToolbarButton variant="outline" onClick={() => setMode('done')} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<CheckSquare />} label="Complete" />
            <ToolbarButton variant="outline" onClick={() => setMode('delete')} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm" icon={<Trash2 />} label="Remove" />
        </>
    ) : (
        <>
            <ToolbarButton variant="outline" onClick={handleDiscardList} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
            <ToolbarButton variant="outline" onClick={handleSaveList} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
        </>
    )

    useEffect(() => {
        setProfiles(initialProfiles)
        setRelationships(initialRelationships)
        setOrganizations(initialOrganizations)
        setUserOrgs(initialUserOrgs)
    }, [initialProfiles, initialRelationships, initialOrganizations, initialUserOrgs])

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

    const listSlot = (
        <StandardList title="Users" toolbarActions={listToolbarActions}>
            <ul className="space-y-3">
                {profiles.map((profile) => (
                    <li
                        key={profile.id}
                        onClick={() => handleOpenDetails(profile.id)}
                        className={cn(
                            "p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex flex-col gap-1 cursor-pointer transition-all hover:border-primary/50 hover:shadow-glow-emerald-sm",
                            selectedId === profile.id && "border-primary shadow-glow-emerald"
                        )}
                    >
                        <span className="font-semibold text-lg">
                            {profile.displayName || "Unknown User"}
                        </span>
                        <span className="text-sm text-muted-foreground italic">
                            {profile.email}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                            Joined {new Date(profile.createdAt).toLocaleDateString('en-GB')}
                        </span>
                    </li>
                ))}
                {profiles.length === 0 && (
                    <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                        No users found in the system.
                    </p>
                )}
            </ul>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <UserDetailsPanel
            profile={profiles.find(p => p.id === selectedId) || null}
            allProfiles={profiles}
            relationships={relationships}
            allOrganizations={organizations}
            userOrgs={userOrgs}
            readOnly={detailsMode === 'idle'}
            onEnterEditMode={() => setDetailsMode('editing')}
            onClose={handleCloseDetails}
            onSaved={() => setDetailsMode('idle')}
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
        />
    )
}
