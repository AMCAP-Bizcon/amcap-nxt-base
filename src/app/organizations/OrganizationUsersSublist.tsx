'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { type Profile } from '@/db/schema'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Trash2, Save, XCircle, Check, Edit2, MoveVertical, CheckSquare } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ResponsiveToolbar } from '@/components/ui/responsive-toolbar'

interface OrganizationUsersSublistProps {
    linkedIds: string[];
    availableProfiles: Profile[];
    allProfilesMap: Map<string, Profile>;
    readOnly?: boolean;
    onLinksChanged: (newIds: string[]) => void;
    onClickUser?: (id: string) => void;
    onModeChange?: (mode: 'idle' | 'creating' | 'delete') => void;
}

export interface OrganizationUsersSublistRef {
    saveIfUnsaved: () => Promise<void>;
}

export const OrganizationUsersSublist = forwardRef<OrganizationUsersSublistRef, OrganizationUsersSublistProps>(({ linkedIds, availableProfiles, allProfilesMap, readOnly = false, onLinksChanged, onClickUser, onModeChange }, ref) => {
    const [mode, setMode] = useState<'idle' | 'creating' | 'delete'>('idle')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchText, setSearchText] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        onModeChange?.(mode)
    }, [mode, onModeChange])

    const [localLinkedIds, setLocalLinkedIds] = useState(linkedIds)
    useEffect(() => { setLocalLinkedIds(linkedIds) }, [linkedIds])

    const localProfiles = localLinkedIds.map(id => allProfilesMap.get(id)!).filter(Boolean)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (mode === 'delete') {
                if (selectedIds.length > 0) {
                    const newIds = localLinkedIds.filter(id => !selectedIds.includes(id))
                    setLocalLinkedIds(newIds)
                    onLinksChanged(newIds)
                }
            }
            setMode('idle')
            setSelectedIds([])
            setSearchText('')
        } catch (error) {
            console.error(error)
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
        setSelectedIds([])
        setSearchText('')
        setLocalLinkedIds(linkedIds)
    }

    const handleSelectToggle = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const modeStyles = {
        idle: 'transparent',
        creating: 'border-violet-500/50 shadow-glow-violet-sm',
        delete: 'border-rose-500/50 shadow-glow-rose-sm',
    }

    return (
        <div className="flex flex-col gap-3">
            {!readOnly && (
                <ResponsiveToolbar>
                    {mode === 'idle' ? (
                        <>
                            <ToolbarButton variant="outline" onClick={() => setMode('creating')} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<PlusCircle />} label="Create" />
                            <ToolbarButton variant="outline" onClick={() => {}} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<Edit2 />} label="Edit" />
                            <ToolbarButton variant="outline" onClick={() => {}} className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm" icon={<MoveVertical />} label="Move" />
                            <ToolbarButton variant="outline" onClick={() => {}} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<CheckSquare />} label="Complete" />
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
                    <li className="p-0 border border-primary/50 rounded-md bg-card flex flex-col overflow-hidden shadow-sm">
                        <Command className="w-full bg-transparent p-0">
                            <CommandInput
                                placeholder={`Search to link a user...`}
                                value={searchText}
                                onValueChange={setSearchText}
                                autoFocus
                            />
                            <CommandList>
                                <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
                                    No matched user found.
                                </CommandEmpty>
                                <CommandGroup>
                                    {availableProfiles.filter(p => !localLinkedIds.includes(p.id)).map((p) => (
                                        <CommandItem
                                            key={p.id}
                                            value={p.email + " " + (p.displayName || "")}
                                            onSelect={() => {
                                                const newIds = [...localLinkedIds, p.id];
                                                setLocalLinkedIds(newIds);
                                                onLinksChanged(newIds);
                                                setMode('idle');
                                                setSearchText('');
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", localLinkedIds.includes(p.id) ? "opacity-100" : "opacity-0")} />
                                            <div className="flex flex-col">
                                                <span className="truncate font-medium">{p.displayName || "Unknown User"}</span>
                                                <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </li>
                )}
                {localProfiles.length === 0 && mode !== 'creating' && (
                    <p className="text-sm text-muted-foreground p-2 italic">No users linked.</p>
                )}
                {localProfiles.map(p => (
                    <li
                        key={p.id}
                        className={cn(
                            "p-3 border border-border rounded-md bg-card text-sm flex gap-3 items-center transition-colors",
                            mode === 'delete' && "hover:border-rose-500/50",
                            readOnly && "opacity-90"
                        )}
                    >
                        {mode === 'delete' && (
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={() => handleSelectToggle(p.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer shrink-0"
                            />
                        )}
                        <div className="flex flex-col gap-0.5 w-full">
                            <span
                                className={cn(
                                    "font-semibold",
                                    onClickUser && "hover:text-primary transition-colors cursor-pointer"
                                )}
                                onClick={() => onClickUser?.(p.id)}
                            >
                                {p.displayName || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">{p.email}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
})

OrganizationUsersSublist.displayName = 'OrganizationUsersSublist'
