'use client'

import { useState, useEffect } from 'react'
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { UserDetailsPanel } from './UserDetailsPanel'
import { useRouter, usePathname } from 'next/navigation'
import { type Profile, type UserManagementRelationship, type Organization, type UserOrganization } from '@/db/schema'
import { cn } from '@/lib/utils'

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
        <StandardList title="Users">
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
