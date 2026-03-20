'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { toast } from "sonner";
import { type Role, type Organization } from '@/db/schema'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Trash2, Save, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResponsiveToolbar } from '@/components/ui/responsive-toolbar'

export interface UserRoleAssignment {
    roleId: number;
    organizationId: number;
}

interface UserRolesSublistProps {
    assignments: UserRoleAssignment[];
    allRolesMap: Map<number, Role>;
    allOrganizationsMap: Map<number, Organization>;
    readOnly?: boolean;
    onAssignmentsChanged: (newAssignments: UserRoleAssignment[]) => void;
    onModeChange?: (mode: 'idle' | 'creating' | 'delete') => void;
}

export interface UserRolesSublistRef {
    saveIfUnsaved: () => Promise<void>;
}

export const UserRolesSublist = forwardRef<UserRolesSublistRef, UserRolesSublistProps>(({ assignments, allRolesMap, allOrganizationsMap, readOnly = false, onAssignmentsChanged, onModeChange }, ref) => {
    const [mode, setMode] = useState<'idle' | 'creating' | 'delete'>('idle')
    const [selectedIndices, setSelectedIndices] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [localAssignments, setLocalAssignments] = useState(assignments)
    
    // Form state for creating
    const [newRole, setNewRole] = useState<string>('')
    const [newOrg, setNewOrg] = useState<string>('')

    useEffect(() => {
        onModeChange?.(mode)
    }, [mode, onModeChange])

    useEffect(() => { setLocalAssignments(assignments) }, [assignments])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (mode === 'delete') {
                if (selectedIndices.length > 0) {
                    const newAsgmts = localAssignments.filter((_, idx) => !selectedIndices.includes(idx))
                    setLocalAssignments(newAsgmts)
                    onAssignmentsChanged(newAsgmts)
                }
            } else if (mode === 'creating') {
                if (newRole && newOrg) {
                    const roleIdNum = parseInt(newRole, 10)
                    const orgIdNum = parseInt(newOrg, 10)
                    // Check if exists
                    const exists = localAssignments.some(a => a.roleId === roleIdNum && a.organizationId === orgIdNum)
                    if (!exists) {
                        const newAsgmts = [...localAssignments, { roleId: roleIdNum, organizationId: orgIdNum }]
                        setLocalAssignments(newAsgmts)
                        onAssignmentsChanged(newAsgmts)
                    }
                }
            }
            setMode('idle')
            setSelectedIndices([])
            setNewRole('')
            setNewOrg('')
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error(error);
            }
        } finally {
            setIsSaving(false)
        }
    }

    useImperativeHandle(ref, () => ({
        saveIfUnsaved: async () => {
            if (mode !== 'idle') {
                await handleSave();
            }
        }
    }));

    const handleDiscard = () => {
        setMode('idle')
        setSelectedIndices([])
        setNewRole('')
        setNewOrg('')
        setLocalAssignments(assignments)
    }

    const handleSelectToggle = (idx: number) => {
        setSelectedIndices(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
    }

    const modeStyles = {
        idle: 'transparent',
        creating: 'border-violet-500/50 shadow-glow-violet-sm',
        delete: 'border-rose-500/50 shadow-glow-rose-sm',
    }

    const rolesList = Array.from(allRolesMap.values()).sort((a,b) => a.name.localeCompare(b.name))
    const orgsList = Array.from(allOrganizationsMap.values()).sort((a,b) => a.name.localeCompare(b.name))

    return (
        <div className="flex flex-col gap-3">
            {!readOnly && (
                <ResponsiveToolbar>
                    {mode === 'idle' ? (
                        <>
                            <ToolbarButton variant="outline" onClick={() => setMode('creating')} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<PlusCircle />} label="Assign Role" />
                            <ToolbarButton variant="outline" onClick={() => setMode('delete')} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm" icon={<Trash2 />} label="Remove" />
                        </>
                    ) : (
                        <>
                            <ToolbarButton variant="outline" onClick={handleDiscard} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
                            <ToolbarButton variant="outline" onClick={handleSave} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
                        </>
                    )}
                </ResponsiveToolbar>
            )}

            <ul className={cn("space-y-2 mt-2 transition-all duration-300", mode !== 'idle' ? `p-2 border rounded-md ${modeStyles[mode]} bg-background/50` : "")}>
                {mode === 'creating' && (
                    <li className="p-3 border border-primary/50 rounded-md bg-card flex flex-col gap-3 overflow-hidden shadow-sm text-sm">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Select Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full p-2 rounded-md bg-transparent border border-border outline-none focus:border-primary">
                                <option value="" disabled>-- Choose Role --</option>
                                {rolesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Select Organization</label>
                            <select value={newOrg} onChange={e => setNewOrg(e.target.value)} className="w-full p-2 rounded-md bg-transparent border border-border outline-none focus:border-primary">
                                <option value="" disabled>-- Choose Organization --</option>
                                {orgsList.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    </li>
                )}
                {localAssignments.length === 0 && mode !== 'creating' && (
                    <p className="text-sm text-muted-foreground p-2 italic">No roles assigned to this user.</p>
                )}
                {localAssignments.map((a: any, idx) => {
                    const role = allRolesMap.get(a.roleId)
                    const org = allOrganizationsMap.get(a.organizationId)
                    return (
                        <li
                            key={`${a.roleId}-${a.organizationId}`}
                            className={cn(
                                "p-3 border border-border rounded-md bg-card text-sm flex gap-3 items-center transition-colors",
                                mode === 'delete' && "hover:border-rose-500/50",
                                readOnly && "opacity-90"
                            )}
                        >
                            {mode === 'delete' && (
                                <input
                                    type="checkbox"
                                    checked={selectedIndices.includes(idx)}
                                    onChange={() => handleSelectToggle(idx)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer shrink-0"
                                />
                            )}
                            <div className="flex flex-col gap-0.5 w-full">
                                <span className="font-semibold text-foreground">
                                    {role?.name || "Unknown Role"}
                                </span>
                                <span className="text-xs text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded-sm mt-0.5">
                                    in {org?.name || "Unknown Organization"}
                                </span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
})

UserRolesSublist.displayName = 'UserRolesSublist'
