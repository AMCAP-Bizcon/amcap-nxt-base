'use client'

import { useState, useEffect } from 'react'
import { toast } from "sonner";
import { type AccessRule, type AppTable } from '@/db/schema'
import { ToolbarButton, ResponsiveToolbar } from '@/components/ui/responsive-toolbar'
import { PlusCircle, Trash2, Power, X } from 'lucide-react'
import { updateRoleAccessRules } from './actions'

interface RoleAccessRulesSublistProps {
    roleId: number
    accessRules: AccessRule[]
    allAppTables: AppTable[]
    readOnly: boolean
}

export function RoleAccessRulesSublist({ roleId, accessRules, allAppTables, readOnly }: RoleAccessRulesSublistProps) {
    const [rules, setRules] = useState<AccessRule[]>([])
    const [mode, setMode] = useState<'idle' | 'delete'>('idle')
    const [selectedRuleIds, setSelectedRuleIds] = useState<number[]>([])

    useEffect(() => {
        // Only load rules for this role
        setRules(accessRules.filter(r => r.roleId === roleId))
    }, [accessRules, roleId])

    const handleAddRule = async () => {
        // Find a table that isn't already managed by existing rules
        const existingTableIds = rules.map(r => r.tableId);
        const nextTable = allAppTables.find(t => !existingTableIds.includes(t.id));
        const newTableId = nextTable ? nextTable.id : (allAppTables[0]?.id || 0);

        if (!newTableId) return; // No tables exist

        // Local optimistic rule, has negative ID to mark as unsaved
        const tempId = -Math.floor(Math.random() * 100000);
        const newRule: AccessRule = {
            id: tempId,
            roleId,
            tableId: newTableId,
            canRead: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            isActive: false
        }

        const newRules = [...rules, newRule]
        setRules(newRules)
        await saveRules(newRules)
    }

    const saveRules = async (currentRules: AccessRule[]) => {
        try {
            // Map down to what the Server Action expects
            const dataToSave = currentRules.map(r => ({
                tableId: r.tableId,
                canRead: r.canRead,
                canCreate: r.canCreate,
                canUpdate: r.canUpdate,
                canDelete: r.canDelete,
                isActive: r.isActive
            }))
            await updateRoleAccessRules(roleId, dataToSave)
        } catch (error: any) {
            if (error?.message?.includes('Forbidden')) {
                toast.error("Access Denied: " + error.message);
            } else {
                console.error('Failed to update access rules', error);
            }
        }
    }

    const handleDeleteSelected = async () => {
        const remainingRules = rules.filter(r => !selectedRuleIds.includes(r.id))
        setRules(remainingRules)
        setSelectedRuleIds([])
        setMode('idle')
        await saveRules(remainingRules)
    }

    const handleToggleActiveSelected = async () => {
        const updatedRules = rules.map(r => selectedRuleIds.includes(r.id) ? { ...r, isActive: !r.isActive } : r)
        setRules(updatedRules)
        setSelectedRuleIds([])
        setMode('idle')
        await saveRules(updatedRules)
    }

    const handleChangeRecord = async (ruleId: number, field: keyof AccessRule, value: any) => {
        const updatedRules = rules.map(r => r.id === ruleId ? { ...r, [field]: value } : r)
        setRules(updatedRules)
        await saveRules(updatedRules)
    }

    const toolbarActions = mode === 'idle' ? (
        !readOnly && (
            <>
                <ToolbarButton variant="outline" onClick={handleAddRule} className="h-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50" icon={<PlusCircle className="w-4 h-4" />} label="Add" />
                <ToolbarButton variant="outline" onClick={() => setMode('delete')} className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" icon={<Trash2 className="w-4 h-4" />} label="Remove" disabled={rules.length === 0} />
                <ToolbarButton variant="outline" onClick={handleToggleActiveSelected} className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" icon={<Power className="w-4 h-4" />} label="Toggle Active" disabled={selectedRuleIds.length === 0} />
            </>
        )
    ) : (
        <>
            <ToolbarButton variant="outline" onClick={() => { setMode('idle'); setSelectedRuleIds([]) }} className="h-8 text-slate-500 hover:text-slate-600 hover:bg-slate-50" icon={<X className="w-4 h-4" />} label="Cancel" />
            <ToolbarButton variant="outline" onClick={handleDeleteSelected} className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50" icon={<Trash2 className="w-4 h-4" />} label="Confirm Delete" disabled={selectedRuleIds.length === 0} />
        </>
    )

    return (
        <div className="flex flex-col gap-3">
            {!readOnly && <ResponsiveToolbar>{toolbarActions}</ResponsiveToolbar>}
            <ul className="space-y-4">
                {rules.map(rule => (
                    <li key={rule.id} className={`p-4 rounded-lg border flex flex-col gap-3 ${mode === 'delete' ? 'cursor-pointer hover:border-rose-300' : ''} ${selectedRuleIds.includes(rule.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`} onClick={() => {
                        if (mode === 'delete' || mode === 'idle') {
                            if (mode === 'delete') {
                                setSelectedRuleIds(prev => prev.includes(rule.id) ? prev.filter(id => id !== rule.id) : [...prev, rule.id])
                            } else if (mode === 'idle') {
                                setSelectedRuleIds(prev => prev.includes(rule.id) ? prev.filter(id => id !== rule.id) : [...prev, rule.id])
                            }
                        }
                    }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                {mode === 'delete' || mode === 'idle' ? (
                                    <input type="checkbox" readOnly checked={selectedRuleIds.includes(rule.id)} className="h-4 w-4 rounded border-gray-300 pointer-events-none" />
                                ) : null}
                                <select 
                                    className="bg-transparent font-semibold border-none focus:ring-0 text-foreground text-sm flex-1 outline-none disabled:opacity-50 min-w-0 pr-4"
                                    value={rule.tableId}
                                    onChange={(e) => handleChangeRecord(rule.id, 'tableId', parseInt(e.target.value, 10))}
                                    disabled={readOnly}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {allAppTables.map(t => (
                                        <option key={t.id} value={t.id}>{t.tableName.charAt(0).toUpperCase() + t.tableName.slice(1)}</option>
                                    ))}
                                </select>
                                
                                <span className={`px-2 py-0.5 mt-0.5 text-xs font-medium rounded-full ${rule.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {rule.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-6 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={rule.canRead} disabled={readOnly} onChange={(e) => handleChangeRecord(rule.id, 'canRead', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                                Read
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={rule.canCreate} disabled={readOnly} onChange={(e) => handleChangeRecord(rule.id, 'canCreate', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                                Create
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={rule.canUpdate} disabled={readOnly} onChange={(e) => handleChangeRecord(rule.id, 'canUpdate', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                                Update
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={rule.canDelete} disabled={readOnly} onChange={(e) => handleChangeRecord(rule.id, 'canDelete', e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                                Delete
                            </label>
                        </div>
                    </li>
                ))}
                {rules.length === 0 && (
                    <p className="text-muted-foreground text-center py-6 text-sm border border-dashed rounded-lg border-border">
                        No access rules defined.
                    </p>
                )}
            </ul>
        </div>
    )
}
