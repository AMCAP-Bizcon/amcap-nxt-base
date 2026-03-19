'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { CheckSquare, Trash2, Edit2, MoveVertical, Save, XCircle, PlusCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateTodoSequence, updateTodoTexts, toggleTodosDoneStatus, deleteMultipleTodos, createTodo } from './actions'
import { TodoDetailsPanel, type TodoDetailsPanelRef } from './TodoDetailsPanel'
import { MasterDetailLayout } from '@/components/templates/MasterDetailLayout'
import { StandardList } from '@/components/templates/StandardList'
import { useRouter, usePathname } from 'next/navigation'

import { type Todo, type TodoRelationship, type Organization, type TodoOrganization } from '@/db/schema'

export type TodoWithMedia = Todo & {
    images: { url: string; path: string }[];
    files: { name?: string; url: string; path: string }[];
};
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'

function SortableItem({ id, todo, isReordering, isEditing, isIdle, isCurrentlyEditing, onStartEdit, onOpenDetails, onTextChange, isSelectable, isSelected, onSelectToggle }: { id: number, todo: TodoWithMedia, isReordering: boolean, isEditing: boolean, isIdle: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onOpenDetails: (id: number) => void, onTextChange: (id: number, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

    const style = { transform: CSS.Transform.toString(transform), transition }

    return (
        <li ref={setNodeRef} style={style} {...(isReordering ? attributes : {})} {...(isReordering ? listeners : {})} className={`p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors ${isReordering ? 'touch-none cursor-grab active:cursor-grabbing hover:border-primary/50' : ''} ${isEditing ? 'hover:border-primary/50' : ''}`}>
            {isSelectable && (
                <input type="checkbox" checked={isSelected} onChange={() => onSelectToggle(id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0" />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing || isIdle ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id); else if (isIdle) onOpenDetails(id); }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea value={todo.text} onChange={(e) => onTextChange(id, e.target.value)} className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 resize-none overflow-hidden" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                ) : (
                    <span className={`font-medium break-words whitespace-pre-wrap ${todo.done ? 'line-through text-muted-foreground' : ''}`}>{todo.text}</span>
                )}
                <span className="text-xs text-muted-foreground cursor-default" suppressHydrationWarning>
                    {new Date(todo.createdAt).toLocaleString('en-GB')}
                </span>
            </div>
        </li>
    )
}

export function TodoList({ 
    initialTodos, 
    initialRelationships, 
    initialOrganizations,
    initialTodoOrgs,
    selectedId, 
    activeTab 
}: { 
    initialTodos: TodoWithMedia[], 
    initialRelationships: TodoRelationship[],
    initialOrganizations: Organization[],
    initialTodoOrgs: TodoOrganization[],
    selectedId: number | null,
    activeTab: string
}) {
    const router = useRouter()
    const pathname = usePathname()

    const [todos, setTodos] = useState(initialTodos)
    const [relationships, setRelationships] = useState(initialRelationships)
    const [organizations, setOrganizations] = useState(initialOrganizations)
    const [todoOrgs, setTodoOrgs] = useState(initialTodoOrgs)
    const [mode, setMode] = useState<'idle' | 'reordering' | 'editing' | 'done' | 'delete' | 'creating'>('idle')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
    const [selectedTodoIds, setSelectedTodoIds] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [newTodoText, setNewTodoText] = useState('')
    const [detailsMode, setDetailsMode] = useState<'idle' | 'editing'>('idle')
    const [listContext, setListContext] = useState<{type: 'children' | 'parents', id: number} | null>(null)
    const [contextHistory, setContextHistory] = useState<({type: 'children' | 'parents', id: number} | null)[]>([])
    const detailsPanelRef = useRef<TodoDetailsPanelRef>(null)
    
    const sortedTodos = useMemo(() => [...todos].sort((a,b) => a.sequence - b.sequence), [todos])

    const displayTodos = useMemo(() => {
        if (!listContext) {
            const hasParents = new Set(relationships.map(r => r.childId));
            return sortedTodos.filter(t => !hasParents.has(t.id) || t.isPinned);
        } else if (listContext.type === 'children') {
            const childIds = new Set(relationships.filter(r => r.parentId === listContext.id).map(r => r.childId));
            return sortedTodos.filter(t => childIds.has(t.id));
        } else if (listContext.type === 'parents') {
            const parentIds = new Set(relationships.filter(r => r.childId === listContext.id).map(r => r.parentId));
            return sortedTodos.filter(t => parentIds.has(t.id));
        }
        return [];
    }, [sortedTodos, relationships, listContext]);

    const pendingUpdate = useRef(false)

    useEffect(() => {
        if (!pendingUpdate.current) {
            setTodos(initialTodos)
            setRelationships(initialRelationships)
            setOrganizations(initialOrganizations)
            setTodoOrgs(initialTodoOrgs)
        }
        if (mode === 'idle') {
            pendingUpdate.current = false;
        }
        if (mode === 'idle') {
            setNewTodoText('')
        }
    }, [initialTodos, initialRelationships, initialOrganizations, initialTodoOrgs, mode])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setTodos((items) => {
                const currentSorted = [...items].sort((a,b) => a.sequence - b.sequence)
                const oldIndex = currentSorted.findIndex(item => item.id === active.id)
                const newIndex = currentSorted.findIndex(item => item.id === over.id)
                const reordered = arrayMove(currentSorted, oldIndex, newIndex)
                return reordered.map((item, index) => ({ ...item, sequence: index }))
            })
        }
    }

    const handleSaveList = async () => {
        setIsSaving(true)
        pendingUpdate.current = true
        try {
            if (mode === 'creating') {
                if (newTodoText.trim()) {
                    await createTodo(newTodoText.trim())
                }
            } else if (mode === 'reordering') {
                const updates = todos.map((todo, index) => ({ id: todo.id, sequence: index }))
                await updateTodoSequence(updates)
            } else if (mode === 'editing') {
                const updates = todos
                    .filter(t => { const init = initialTodos.find(it => it.id === t.id); return init && init.text !== t.text })
                    .map(todo => ({ id: todo.id, text: todo.text }))
                if (updates.length > 0) await updateTodoTexts(updates)
            } else if (mode === 'done') {
                if (selectedTodoIds.length > 0) {
                    setTodos(todos.map(t => selectedTodoIds.includes(t.id) ? { ...t, done: !t.done } : t))
                    await toggleTodosDoneStatus(selectedTodoIds)
                }
            } else if (mode === 'delete') {
                if (selectedTodoIds.length > 0) {
                    setTodos(todos.filter(t => !selectedTodoIds.includes(t.id)))
                    await deleteMultipleTodos(selectedTodoIds)
                }
            }
            setMode('idle')
            setEditingTodoId(null)
            setSelectedTodoIds([])
        } catch (error) {
            pendingUpdate.current = false
            console.error("Failed to save", error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscardList = () => {
        setTodos(initialTodos)
        setMode('idle')
        setEditingTodoId(null)
        setSelectedTodoIds([])
        setNewTodoText('')
    }

    useEffect(() => {
        // Keyboard shortcuts for Save/Discard were removed as per user request.
    }, [])

    const handleSelectToggle = (id: number) => {
        setSelectedTodoIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const handleTextChange = (id: number, text: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, text } : t))
    }

    const modeStyles: Record<typeof mode, { gradient: string, shadow: string }> = {
        idle: { gradient: 'via-slate-400/40', shadow: 'shadow-glow-slate' },
        creating: { gradient: 'via-violet-500/50', shadow: 'shadow-glow-violet' },
        editing: { gradient: 'via-blue-500/50', shadow: 'shadow-glow-blue' },
        reordering: { gradient: 'via-amber-500/50', shadow: 'shadow-glow-amber' },
        done: { gradient: 'via-emerald-500/50', shadow: 'shadow-glow-emerald' },
        delete: { gradient: 'via-rose-500/50', shadow: 'shadow-glow-rose' }
    }

    const handleOpenDetails = (id: number) => {
        router.push(`${pathname}?id=${id}`)
    }

    const handleCloseDetails = () => {
        setDetailsMode('idle')
        setListContext(null)
        setContextHistory([])
        router.push(pathname)
    }

    const handleDrillDown = (id: number, relationType: 'parent' | 'child') => {
        setContextHistory(prev => [...prev, listContext])
        if (relationType === 'child') {
            setListContext({ type: 'children', id: selectedId! })
        } else if (relationType === 'parent') {
            setListContext({ type: 'parents', id: selectedId! })
        }
        router.push(`${pathname}?id=${id}`)
    }

    const handleTabChange = (tabId: string) => {
        if (selectedId) {
            router.push(`${pathname}?id=${selectedId}&tab=${tabId}`)
        }
    }

    const listToolbarActions = mode === 'idle' ? (
        <>
            {contextHistory.length > 0 && (
                <ToolbarButton variant="outline" onClick={() => {
                    const prev = contextHistory[contextHistory.length - 1];
                    setListContext(prev);
                    setContextHistory(h => h.slice(0, -1));
                }} className="h-9 text-slate-600 hover:text-slate-700 hover:bg-slate-50 hover:shadow-glow-slate-sm" icon={<ArrowLeft />} label="Back" />
            )}
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
        <StandardList toolbarActions={listToolbarActions} disabledToolbar={!!selectedId}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={displayTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <ul className={cn("space-y-3", detailsMode === 'editing' ? 'pointer-events-none opacity-50 transition-opacity' : '')}>
                        {mode === 'creating' && (
                            <li className="p-4 border border-primary/50 shadow-md rounded-md bg-card text-card-foreground flex gap-3 items-center transition-colors">
                                <AutoResizeTextarea value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} placeholder="What needs to be done?" className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 py-1 resize-none overflow-hidden w-full" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }} />
                            </li>
                        )}
                        {displayTodos.map((todo) => (
                            <SortableItem key={todo.id} id={todo.id} todo={todo} isReordering={mode === 'reordering'} isEditing={mode === 'editing'} isIdle={mode === 'idle'} isCurrentlyEditing={editingTodoId === todo.id} onStartEdit={setEditingTodoId} onOpenDetails={handleOpenDetails} onTextChange={handleTextChange} isSelectable={mode === 'done' || mode === 'delete'} isSelected={selectedTodoIds.includes(todo.id)} onSelectToggle={handleSelectToggle} />
                        ))}
                        {displayTodos.length === 0 && mode !== 'creating' && (
                            <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                                No todos yet. Click &quot;Create&quot; to start!
                            </p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>
        </StandardList>
    )

    const detailSlot = selectedId ? (
        <TodoDetailsPanel
            ref={detailsPanelRef}
            todo={todos.find(t => t.id === selectedId) || null}
            allTodos={todos}
            relationships={relationships}
            allOrganizations={organizations}
            todoOrgs={todoOrgs}
            readOnly={detailsMode === 'idle'}
            onEnterEditMode={() => setDetailsMode('editing')}
            onClose={handleCloseDetails}
            onDrillDown={handleDrillDown}
            onSaved={() => { setDetailsMode('idle'); pendingUpdate.current = false; }}
            onDiscard={() => { setDetailsMode('idle'); }}
            activeTab={activeTab}
            onTabChange={handleTabChange}
        />
    ) : null

    return (
        <MasterDetailLayout 
            listSlot={listSlot}
            detailSlot={detailSlot}
            isDetailOpen={!!selectedId}
            panelGroupClassName={modeStyles[mode].shadow}
        />
    )
}
