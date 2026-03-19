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
import { Plus } from 'lucide-react'

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

    const toolbarActions = (
        <ToolbarButton
            variant="outline"
            onClick={handleCreateOrg}
            disabled={isCreating}
            className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm"
            icon={<Plus />}
            label="New Organization"
        />
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
