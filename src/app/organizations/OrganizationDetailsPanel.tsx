'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { type Organization, type UserOrganization, type TodoOrganization, type Profile, type Todo } from '@/db/schema'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { Edit2, XCircle, Save, Calendar, Trash2 } from 'lucide-react'
import { StandardDetailForm } from '@/components/templates/StandardDetailForm'
import { StandardSublistTabs } from '@/components/templates/StandardSublistTabs'
import { updateOrganizationDetails, deleteOrganization, updateOrganizationUsers, updateOrganizationTodos } from './actions'
import { OrganizationUsersSublist, type OrganizationUsersSublistRef } from './OrganizationUsersSublist'
import { OrganizationTodosSublist, type OrganizationTodosSublistRef } from './OrganizationTodosSublist'
import { useRouter } from 'next/navigation'

interface OrganizationDetailsPanelProps {
    organization: Organization | null
    userOrgs: UserOrganization[]
    todoOrgs: TodoOrganization[]
    allProfiles: Profile[]
    allTodos: Todo[]
    readOnly?: boolean
    onEnterEditMode?: () => void
    onClose: () => void
    onSaved: () => void
    onDiscard: () => void
    activeTab: string
    onTabChange: (tabId: string) => void
}

export function OrganizationDetailsPanel({
    organization,
    userOrgs,
    todoOrgs,
    allProfiles,
    allTodos,
    readOnly = false,
    onEnterEditMode,
    onClose,
    onSaved,
    onDiscard,
    activeTab,
    onTabChange
}: OrganizationDetailsPanelProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [details, setDetails] = useState<{
        name: string;
        description: string;
        userIds: string[];
        todoIds: number[];
    }>({ name: '', description: '', userIds: [], todoIds: [] })

    const [sublistBusy, setSublistBusy] = useState(false)
    const usersSublistMode = useRef<string>('idle')
    const todosSublistMode = useRef<string>('idle')
    const currentOrgId = useRef<number | null>(null)

    const usersListRef = useRef<OrganizationUsersSublistRef>(null)
    const todosListRef = useRef<OrganizationTodosSublistRef>(null)

    useEffect(() => {
        if (organization && organization.id !== currentOrgId.current) {
            currentOrgId.current = organization.id;
            setDetails({
                name: organization.name || '',
                description: organization.description || '',
                userIds: userOrgs.filter(r => r.organizationId === organization.id).map(r => r.userId),
                todoIds: todoOrgs.filter(r => r.organizationId === organization.id).map(r => r.todoId),
            })
        }
    }, [organization, userOrgs, todoOrgs])

    const handleUsersModeChange = useCallback((mode: string) => {
        usersSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || todosSublistMode.current !== 'idle')
    }, [])

    const handleTodosModeChange = useCallback((mode: string) => {
        todosSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || usersSublistMode.current !== 'idle')
    }, [])

    const allProfilesMap = useMemo(() => new Map(allProfiles.map(p => [p.id, p])), [allProfiles]);
    const allTodosMap = useMemo(() => new Map(allTodos.map(t => [t.id, t])), [allTodos]);

    if (!organization) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await Promise.all([
                updateOrganizationDetails(organization.id, {
                    name: details.name,
                    description: details.description,
                }),
                updateOrganizationUsers(organization.id, details.userIds),
                updateOrganizationTodos(organization.id, details.todoIds)
            ])
            onSaved()
        } catch (error) {
            console.error('Failed to save org details', error)
            alert(error instanceof Error ? error.message : "Failed to save details.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this organization?')) return;
        setIsDeleting(true)
        try {
            await deleteOrganization(organization.id)
            onClose()
        } catch (error) {
            console.error('Failed to delete org', error)
            alert(error instanceof Error ? error.message : "Failed to delete.")
            setIsDeleting(false)
        }
    }

    const handleDiscard = () => {
        if (organization) {
            setDetails({
                name: organization.name || '',
                description: organization.description || '',
                userIds: userOrgs.filter(r => r.organizationId === organization.id).map(r => r.userId),
                todoIds: todoOrgs.filter(r => r.organizationId === organization.id).map(r => r.todoId),
            });
        }
        onDiscard();
    }


    const formActions = readOnly ? (
        <div className="flex items-center gap-2">
           <ToolbarButton variant="outline" onClick={onEnterEditMode} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<Edit2 />} label="Edit" />
           <ToolbarButton variant="outline" onClick={handleDelete} disabled={isDeleting} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm" icon={<Trash2 />} label="Delete" />
        </div>
    ) : sublistBusy ? null : (
        <>
            <ToolbarButton variant="outline" onClick={handleDiscard} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
            <ToolbarButton variant="outline" onClick={handleSave} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
        </>
    )

    const titleEl = !readOnly ? (
        <input
            type="text"
            value={details.name}
            onChange={(e) => setDetails({ ...details, name: e.target.value })}
            className="text-xl font-semibold tracking-tight bg-transparent border-b border-primary/50 outline-none px-1 py-0.5 w-full flex-1"
            placeholder="Organization Name"
        />
    ) : (
        <span className="truncate block w-full">{organization.name || "Unnamed"}</span>
    )

    return (
        <StandardDetailForm
            title={titleEl}
            formActions={formActions}
            onClose={onClose}
            hideClose={!readOnly}
        >
            <div className="space-y-6">
                {/* Org Fields */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            Description
                        </label>
                        {readOnly ? (
                            <div className="p-2 border border-border rounded-md bg-muted/30 text-sm min-h-[38px] whitespace-pre-wrap">
                                {organization.description || <span className="text-muted-foreground italic">None provided</span>}
                            </div>
                        ) : (
                            <textarea
                                value={details.description}
                                onChange={(e) => setDetails({ ...details, description: e.target.value })}
                                className="w-full p-2 border border-primary/50 rounded-md bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                                placeholder="Organization description"
                            />
                        )}
                    </div>
                    <div className="space-y-1 col-span-full">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Created On
                        </label>
                        <div className="p-2 border border-border rounded-md bg-muted/30 text-sm" suppressHydrationWarning>
                            {new Date(organization.createdAt).toLocaleString('en-GB')}
                        </div>
                    </div>
                </div>

                {/* Users/Todos Sublists */}
                <StandardSublistTabs
                    tabs={[
                        {
                            id: 'users',
                            label: 'Users',
                            content: (
                                <OrganizationUsersSublist
                                    ref={usersListRef}
                                    linkedIds={details.userIds}
                                    availableProfiles={allProfiles}
                                    allProfilesMap={allProfilesMap}
                                    readOnly={readOnly}
                                    onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, userIds: newIds }))}
                                    onModeChange={handleUsersModeChange}
                                />
                            )
                        },
                        {
                            id: 'todos',
                            label: 'Todos',
                            content: (
                                <OrganizationTodosSublist
                                    ref={todosListRef}
                                    linkedIds={details.todoIds}
                                    availableTodos={allTodos}
                                    allTodosMap={allTodosMap}
                                    readOnly={readOnly}
                                    onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, todoIds: newIds }))}
                                    onModeChange={handleTodosModeChange}
                                />
                            )
                        }
                    ]}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    disableTabSwitch={sublistBusy}
                />
            </div>
        </StandardDetailForm>
    )
}
