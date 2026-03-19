'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { type Profile, type UserManagementRelationship } from '@/db/schema'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { Edit2, XCircle, Save, User as UserIcon, Phone, Mail, Calendar, Image as ImageIcon, FileText, Camera } from 'lucide-react'
import { StandardDetailForm } from '@/components/templates/StandardDetailForm'
import { StandardSublistTabs } from '@/components/templates/StandardSublistTabs'
import { updateProfile, updateUserManagementRelationships, updateUserOrganizations } from './actions'
import { UserRelationshipSubList, type UserRelationshipSubListRef } from './UserRelationshipSubList'
import { UserOrganizationsSublist, type UserOrganizationsSublistRef } from './UserOrganizationsSublist'

interface UserDetailsPanelProps {
    profile: Profile | null
    allProfiles: Profile[]
    relationships: UserManagementRelationship[]
    allOrganizations: import('@/db/schema').Organization[]
    userOrgs: import('@/db/schema').UserOrganization[]
    readOnly?: boolean
    onEnterEditMode?: () => void
    onClose: () => void
    onSaved: () => void
    onDiscard: () => void
    activeTab: string
    onTabChange: (tabId: string) => void
}

export function UserDetailsPanel({
    profile,
    allProfiles,
    relationships,
    allOrganizations,
    userOrgs,
    readOnly = false,
    onEnterEditMode,
    onClose,
    onSaved,
    onDiscard,
    activeTab,
    onTabChange
}: UserDetailsPanelProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [details, setDetails] = useState<{
        displayName: string;
        phone: string;
        managerIds: string[];
        managedUserIds: string[];
        organizationIds: number[];
    }>({ displayName: '', phone: '', managerIds: [], managedUserIds: [], organizationIds: [] })

    const [sublistBusy, setSublistBusy] = useState(false)
    const managersSublistMode = useRef<string>('idle')
    const managedBySublistMode = useRef<string>('idle')
    const orgsSublistMode = useRef<string>('idle')
    const currentProfileId = useRef<string | null>(null)

    const managersListRef = useRef<UserRelationshipSubListRef>(null)
    const managedByListRef = useRef<UserRelationshipSubListRef>(null)
    const orgsListRef = useRef<UserOrganizationsSublistRef>(null)

    useEffect(() => {
        if (profile && profile.id !== currentProfileId.current) {
            currentProfileId.current = profile.id;
            setDetails({
                displayName: profile.displayName || '',
                phone: profile.phone || '',
                managerIds: relationships.filter(r => r.managedUserId === profile.id).map(r => r.managerId),
                managedUserIds: relationships.filter(r => r.managerId === profile.id).map(r => r.managedUserId),
                organizationIds: userOrgs.filter(r => r.userId === profile.id).map(r => r.organizationId),
            })
        }
    }, [profile, relationships, userOrgs])

    const handleManagersModeChange = useCallback((mode: string) => {
        managersSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || managedBySublistMode.current !== 'idle' || orgsSublistMode.current !== 'idle')
    }, [])

    const handleManagedByModeChange = useCallback((mode: string) => {
        managedBySublistMode.current = mode
        setSublistBusy(mode !== 'idle' || managersSublistMode.current !== 'idle' || orgsSublistMode.current !== 'idle')
    }, [])

    const handleOrgsModeChange = useCallback((mode: string) => {
        orgsSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || managersSublistMode.current !== 'idle' || managedBySublistMode.current !== 'idle')
    }, [])

    if (!profile) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await Promise.all([
                updateProfile(profile.id, {
                    displayName: details.displayName,
                    phone: details.phone,
                }),
                updateUserManagementRelationships(profile.id, details.managerIds, details.managedUserIds),
                updateUserOrganizations(profile.id, details.organizationIds)
            ])
            onSaved()
        } catch (error) {
            console.error('Failed to save user details', error)
            alert(error instanceof Error ? error.message : "Failed to save details.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscard = () => {
        if (profile) {
            setDetails({
                displayName: profile.displayName || '',
                phone: profile.phone || '',
                managerIds: relationships.filter(r => r.managedUserId === profile.id).map(r => r.managerId),
                managedUserIds: relationships.filter(r => r.managerId === profile.id).map(r => r.managedUserId),
                organizationIds: userOrgs.filter(r => r.userId === profile.id).map(r => r.organizationId),
            });
        }
        onDiscard();
    }

    const allProfilesMap = useMemo(() => new Map(allProfiles.map(p => [p.id, p])), [allProfiles]);
    const allOrganizationsMap = useMemo(() => new Map(allOrganizations.map(o => [o.id, o])), [allOrganizations]);

    const simulatedGraph = useMemo(() => {
        if (!profile) return [];
        let graph = relationships.filter(r => r.managedUserId !== profile.id && r.managerId !== profile.id);
        details.managerIds.forEach(mId => graph.push({ managerId: mId, managedUserId: profile.id }));
        details.managedUserIds.forEach(muId => graph.push({ managerId: profile.id, managedUserId: muId }));
        return graph;
    }, [details, relationships, profile]);

    const getManagedUsersRecursive = (startId: string) => {
        const managed = new Set<string>();
        const queue = [startId];
        while (queue.length > 0) {
            const curr = queue.shift()!;
            for (const r of simulatedGraph) {
                if (r.managerId === curr && !managed.has(r.managedUserId)) {
                    managed.add(r.managedUserId);
                    queue.push(r.managedUserId);
                }
            }
        }
        return managed;
    }

    const availableManagers = useMemo(() => {
        if (!profile) return [];
        const managed = getManagedUsersRecursive(profile.id);
        return allProfiles.filter(p => p.id !== profile.id && !managed.has(p.id));
    }, [allProfiles, profile, simulatedGraph]);

    const availableManagedUsers = useMemo(() => {
        if (!profile) return [];
        return allProfiles.filter(p => {
            if (p.id === profile.id) return false;
            const managedByP = getManagedUsersRecursive(p.id);
            return !managedByP.has(profile.id);
        });
    }, [allProfiles, profile, simulatedGraph]);

    const promptAddImage = () => { console.warn("Image upload not supported for users yet") }
    const promptCaptureImage = () => { console.warn("Camera capture not supported for users yet") }
    const promptAddFile = () => { console.warn("File upload not supported for users yet") }

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
            value={details.displayName}
            onChange={(e) => setDetails({ ...details, displayName: e.target.value })}
            className="text-xl font-semibold tracking-tight bg-transparent border-b border-primary/50 outline-none px-1 py-0.5 w-full flex-1"
            placeholder="User Display Name"
        />
    ) : (
        <span className="truncate block w-full">{profile.displayName || "Unknown User"}</span>
    )

    return (
        <StandardDetailForm
            title={titleEl}
            formActions={formActions}
            onClose={onClose}
            hideClose={!readOnly}
        >
            <div className="space-y-6">
                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> Email Address
                        </label>
                        <div className="p-2 border border-border rounded-md bg-muted/30 text-sm truncate">
                            {profile.email}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> Phone Number
                        </label>
                        {readOnly ? (
                            <div className="p-2 border border-border rounded-md bg-muted/30 text-sm min-h-[38px]">
                                {profile.phone || <span className="text-muted-foreground italic">Not provided</span>}
                            </div>
                        ) : (
                            <input
                                type="tel"
                                value={details.phone}
                                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                                className="w-full p-2 border border-primary/50 rounded-md bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Phone number"
                            />
                        )}
                    </div>
                    <div className="space-y-1 col-span-full">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Member Since
                        </label>
                        <div className="p-2 border border-border rounded-md bg-muted/30 text-sm" suppressHydrationWarning>
                            {new Date(profile.createdAt).toLocaleString('en-GB')}
                        </div>
                    </div>
                </div>

                {/* Managers/Managed-By Sublists */}
                <StandardSublistTabs
                    tabs={[
                        {
                            id: 'managers',
                            label: 'Managers',
                            content: (
                                <UserRelationshipSubList
                                    ref={managersListRef}
                                    title="Managers"
                                    linkedIds={details.managerIds}
                                    availableProfiles={availableManagers}
                                    allProfilesMap={allProfilesMap}
                                    readOnly={readOnly}
                                    onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, managerIds: newIds }))}
                                    onModeChange={handleManagersModeChange}
                                />
                            )
                        },
                        {
                            id: 'managed-by',
                            label: 'Managed Users',
                            content: (
                                <UserRelationshipSubList
                                    ref={managedByListRef}
                                    title="Managed Users"
                                    linkedIds={details.managedUserIds}
                                    availableProfiles={availableManagedUsers}
                                    allProfilesMap={allProfilesMap}
                                    readOnly={readOnly}
                                    onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, managedUserIds: newIds }))}
                                    onModeChange={handleManagedByModeChange}
                                />
                            )
                        },
                        {
                            id: 'organizations',
                            label: 'Organizations',
                            content: (
                                <UserOrganizationsSublist
                                    ref={orgsListRef}
                                    linkedIds={details.organizationIds}
                                    availableOrganizations={allOrganizations}
                                    allOrganizationsMap={allOrganizationsMap}
                                    readOnly={readOnly}
                                    onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, organizationIds: newIds }))}
                                    onModeChange={handleOrgsModeChange}
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
