'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from "sonner";
import { type Role, type UserRole, type Profile, type Organization } from '@/db/schema'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { Edit2, XCircle, Save, Calendar, Trash2, Image as ImageIcon, FileText, Camera } from 'lucide-react'
import { StandardDetailForm } from '@/components/templates/StandardDetailForm'
import { StandardSublistTabs } from '@/components/templates/StandardSublistTabs'
import { updateRoleDetails, deleteRole, updateRoleUsers } from './actions'
import { RoleAssignmentsSublist, type RoleAssignmentsSublistRef, type RoleAssignment } from './RoleAssignmentsSublist'
import { RoleAccessRulesSublist } from './RoleAccessRulesSublist'
import { type AccessRule, type AppTable } from '@/db/schema'
import { useRouter } from 'next/navigation'

interface RoleDetailsPanelProps {
    role: Role | null
    userRoles: UserRole[]
    accessRules: AccessRule[]
    allAppTables: AppTable[]
    allProfiles: Profile[]
    allOrganizations: Organization[]
    readOnly?: boolean
    onEnterEditMode?: () => void
    onClose: () => void
    onSaved: () => void
    onDiscard: () => void
    activeTab: string
    onTabChange: (tabId: string) => void
}

export function RoleDetailsPanel({
    role,
    userRoles,
    accessRules,
    allAppTables,
    allProfiles,
    allOrganizations,
    readOnly = false,
    onEnterEditMode,
    onClose,
    onSaved,
    onDiscard,
    activeTab,
    onTabChange
}: RoleDetailsPanelProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [details, setDetails] = useState<{
        name: string;
        description: string;
        assignments: RoleAssignment[];
    }>({ name: '', description: '', assignments: [] })

    const [sublistBusy, setSublistBusy] = useState(false)
    const sublistMode = useRef<string>('idle')
    const currentRoleId = useRef<number | null>(null)

    const listRef = useRef<RoleAssignmentsSublistRef>(null)

    useEffect(() => {
        if (role && role.id !== currentRoleId.current) {
            currentRoleId.current = role.id;
            setDetails({
                name: role.name || '',
                description: role.description || '',
                assignments: userRoles.filter(r => r.roleId === role.id).map(r => ({ userId: r.userId, organizationId: r.organizationId })),
            })
        }
    }, [role, userRoles])

    const handleSublistModeChange = useCallback((mode: string) => {
        sublistMode.current = mode
        setSublistBusy(mode !== 'idle')
    }, [])

    const allProfilesMap = useMemo(() => new Map(allProfiles.map(p => [p.id, p])), [allProfiles]);
    const allOrganizationsMap = useMemo(() => new Map(allOrganizations.map(o => [o.id, o])), [allOrganizations]);

    if (!role) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await Promise.all([
                updateRoleDetails(role.id, {
                    name: details.name,
                    description: details.description,
                }),
                updateRoleUsers(role.id, details.assignments)
            ])
            onSaved()
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error('Failed to save role details', error);
                toast.error(error instanceof Error ? error.message : "Failed to save details.");
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        setIsDeleting(true)
        try {
            await deleteRole(role.id)
            onClose()
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error('Failed to delete role', error);
                toast.error(error instanceof Error ? error.message : "Failed to delete.");
            }
            setIsDeleting(false);
        }
    }

    const handleDiscard = () => {
        if (role) {
            setDetails({
                name: role.name || '',
                description: role.description || '',
                assignments: userRoles.filter(r => r.roleId === role.id).map(r => ({ userId: r.userId, organizationId: r.organizationId })),
            });
        }
        onDiscard();
    }

    const promptAddImage = () => { console.warn("Image upload not supported for roles yet") }
    const promptCaptureImage = () => { console.warn("Camera capture not supported for roles yet") }
    const promptAddFile = () => { console.warn("File upload not supported for roles yet") }

    const formActions = readOnly ? (
        <>
            <ToolbarButton variant="outline" onClick={promptAddImage} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<ImageIcon />} label="Add Image" />
            <ToolbarButton variant="outline" onClick={promptCaptureImage} className="h-9 text-pink-600 hover:text-pink-700 hover:bg-pink-50 hover:shadow-glow-pink-sm" icon={<Camera />} label="Capture" />
            <ToolbarButton variant="outline" onClick={promptAddFile} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<FileText />} label="Add File" />
            <ToolbarButton variant="outline" onClick={onEnterEditMode} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<Edit2 />} label="Edit Details" />
        </>
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
            placeholder="Role Name"
        />
    ) : (
        <span className="truncate block w-full">{role.name || "Unnamed"}</span>
    )

    return (
        <StandardDetailForm
            title={titleEl}
            formActions={formActions}
            onClose={onClose}
            hideClose={!readOnly}
        >
            <div className="space-y-6">
                {/* Role Fields */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            Description
                        </label>
                        {readOnly ? (
                            <div className="p-2 border border-border rounded-md bg-muted/30 text-sm min-h-[38px] whitespace-pre-wrap">
                                {role.description || <span className="text-muted-foreground italic">None provided</span>}
                            </div>
                        ) : (
                            <textarea
                                value={details.description}
                                onChange={(e) => setDetails({ ...details, description: e.target.value })}
                                className="w-full p-2 border border-primary/50 rounded-md bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-y"
                                placeholder="Role description"
                            />
                        )}
                    </div>
                    <div className="space-y-1 col-span-full">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Created On
                        </label>
                        <div className="p-2 border border-border rounded-md bg-muted/30 text-sm" suppressHydrationWarning>
                            {new Date(role.createdAt).toLocaleString('en-GB')}
                        </div>
                    </div>
                </div>

                {/* Sublists */}
                <StandardSublistTabs
                    tabs={[
                        {
                            id: 'assignments',
                            label: 'Assignments',
                            content: (
                                <RoleAssignmentsSublist
                                    ref={listRef}
                                    assignments={details.assignments}
                                    allProfilesMap={allProfilesMap}
                                    allOrganizationsMap={allOrganizationsMap}
                                    readOnly={readOnly}
                                    onAssignmentsChanged={(newAsg) => setDetails(prev => ({ ...prev, assignments: newAsg }))}
                                    onModeChange={handleSublistModeChange}
                                />
                            )
                        },
                        {
                            id: 'access-rules',
                            label: 'Access Rules',
                            content: (
                                <RoleAccessRulesSublist
                                    roleId={role.id}
                                    accessRules={accessRules}
                                    allAppTables={allAppTables}
                                    readOnly={readOnly}
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
