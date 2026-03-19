'use client'

import { useState, useEffect } from 'react'
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { OrganizationDetailsPanel } from './OrganizationDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Organization, type UserOrganization, type TodoOrganization, type Profile, type Todo } from '@/db/schema'
import { cn } from '@/lib/utils'
import { createOrganization } from './actions'
import { ResponsiveToolbar, ToolbarButton } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Edit2, MoveVertical, CheckSquare, Trash2, XCircle, Save, ArrowLeft } from 'lucide-react'

interface OrganizationsListProps {
    initialOrganizations: Organization[]
    initialUserOrgs: UserOrganization[]
    initialTodoOrgs: TodoOrganization[]
    allProfiles: Profile[]
    allTodos: Todo[]
    selectedId: number | null
    activeTab: string
}

export function OrganizationsList({
    initialOrganizations,
    initialUserOrgs,
    initialTodoOrgs,
    allProfiles,
    allTodos,
    selectedId,
    activeTab
}: OrganizationsListProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [orgs, setOrgs] = useState(initialOrganizations)
    const [userOrgs, setUserOrgs] = useState(initialUserOrgs)
    const [todoOrgs, setTodoOrgs] = useState(initialTodoOrgs)
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        setOrgs(initialOrganizations)
        setUserOrgs(initialUserOrgs)
        setTodoOrgs(initialTodoOrgs)
    }, [initialOrganizations, initialUserOrgs, initialTodoOrgs])

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

    const handleCreateOrg = async () => {
        setIsCreating(true)
        try {
            const newOrg = await createOrganization("New Organization")
            router.push(`${pathname}?id=${newOrg.id}`)
            setDetailsMode('editing')
        } catch (error) {
            console.error('Failed to create organization', error)
        } finally {
            setIsCreating(false)
        }
    }

    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'done' | 'delete' | 'reordering'>('idle')
    const [isSaving, setIsSaving] = useState(false)

    const handleDiscardList = () => {
        setMode('idle')
        setIsCreating(false)
    }

    const handleSaveList = async () => {
        setIsSaving(true)
        try {
            if (mode === 'creating') {
                await handleCreateOrg()
            }
        } finally {
            setIsSaving(false)
            setMode('idle')
        }
    }

    const toolbarActions = mode === 'idle' ? (
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

    const listSlot = (
        <StandardList title="Organizations" toolbarActions={toolbarActions}>
            <ul className="space-y-3">
                {orgs.map((org) => (
                    <li
                        key={org.id}
                        onClick={() => handleOpenDetails(org.id)}
                        className={cn(
                            "p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex flex-col gap-1 cursor-pointer transition-all hover:border-primary/50 hover:shadow-glow-emerald-sm",
                            selectedId === org.id && "border-primary shadow-glow-emerald"
                        )}
                    >
                        <span className="font-semibold text-lg truncate">
                            {org.name}
                        </span>
                        {org.description && (
                           <span className="text-sm text-muted-foreground truncate">
                               {org.description}
                           </span>
                        )}
                        <span className="text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                            Created {new Date(org.createdAt).toLocaleDateString('en-GB')}
                        </span>
                    </li>
                ))}
                {orgs.length === 0 && (
                    <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                        No organizations found.
                    </p>
                )}
            </ul>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <OrganizationDetailsPanel
            organization={orgs.find(o => o.id === selectedId) || null}
            userOrgs={userOrgs}
            todoOrgs={todoOrgs}
            allProfiles={allProfiles}
            allTodos={allTodos}
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
