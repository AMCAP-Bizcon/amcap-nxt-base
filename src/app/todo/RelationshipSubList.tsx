'use client'

import { useState, useEffect } from 'react'
import { type Todo } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { CheckSquare, Trash2, Edit2, Save, XCircle, PlusCircle, Check, MoveVertical } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { createTodo, updateTodoTexts, toggleTodosDoneStatus } from './actions'
import { forwardRef, useImperativeHandle } from 'react'
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

// Move SortableItem out of component or define inline
function SortableSublistItem({ id, todo, readOnly, mode, editingTodoId, selectedIds, onSelectToggle, onStartEdit, onTextChange, onClickTodo }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const style = { transform: CSS.Transform.toString(transform), transition }
    
    const isEditing = mode === 'editing';
    const isCurrentlyEditing = editingTodoId === todo.id;
    const isReordering = mode === 'reordering';
    const isSelectable = mode === 'done' || mode === 'delete';
    const isSelected = selectedIds.includes(todo.id);

    return (
        <li ref={setNodeRef} style={style} {...(isReordering ? attributes : {})} {...(isReordering ? listeners : {})} className={cn("p-2 border border-border rounded-md bg-card text-sm flex gap-2 items-center transition-colors", isEditing ? 'hover:border-primary/50 cursor-pointer' : '', isReordering ? 'touch-none cursor-grab active:cursor-grabbing hover:border-primary/50' : '', readOnly && 'opacity-80 cursor-default')}>
            {isSelectable && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectToggle(todo.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer shrink-0"
                />
            )}
            <div className="flex flex-col gap-1 w-full" onClick={() => { if (isEditing) { onStartEdit(todo.id); } }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea
                        value={todo.text}
                        onChange={(e) => onTextChange(todo.id, e.target.value)}
                        className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 resize-none w-full"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }}
                    />
                ) : (
                    <span
                        className={cn("font-medium break-words whitespace-pre-wrap", todo.done ? 'line-through text-muted-foreground' : '', (readOnly && !isEditing && onClickTodo) ? "hover:text-primary transition-colors cursor-pointer" : "")} 
                        onClick={(e) => { 
                            if (readOnly && !isEditing && onClickTodo) {
                                e.stopPropagation();
                                onClickTodo(todo.id); 
                            }
                        }}
                    >
                        {todo.text}
                    </span>
                )}
            </div>
        </li>
    )
}

export interface RelationshipSubListRef {
    saveIfUnsaved: () => Promise<void>;
}

interface RelationshipSubListProps {
    title: string;
    linkedIds: number[];
    availableTodos: Todo[];
    allTodosMap: Map<number, Todo>;
    readOnly?: boolean;
    onLinksChanged: (newIds: number[]) => void;
    onClickTodo?: (id: number) => void;
}

export const RelationshipSubList = forwardRef<RelationshipSubListRef, RelationshipSubListProps>(({ title, linkedIds, availableTodos, allTodosMap, readOnly = false, onLinksChanged, onClickTodo }, ref) => {
    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'done' | 'delete' | 'reordering'>('idle')
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [newTodoText, setNewTodoText] = useState('')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // We maintain a local copy of "linkedIds" array from Props
    const [localLinkedIds, setLocalLinkedIds] = useState(linkedIds)
    useEffect(() => { setLocalLinkedIds(linkedIds) }, [linkedIds])

    // localTodos materializes the IDs into objects, and allows local TEXT edits in edit mode.
    const [localTodos, setLocalTodos] = useState<Todo[]>([])

    useEffect(() => {
        setLocalTodos(localLinkedIds.map(id => allTodosMap.get(id)!).filter(Boolean))
    }, [localLinkedIds, allTodosMap])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (mode === 'creating') {
                if (newTodoText.trim()) {
                    const newTodo = await createTodo(newTodoText.trim())
                    const newIds = [...localLinkedIds, newTodo.id]
                    setLocalLinkedIds(newIds)
                    onLinksChanged(newIds)
                }
            } else if (mode === 'editing') {
                const updates = localTodos
                    .filter(t => {
                        const init = allTodosMap.get(t.id)
                        return init && init.text !== t.text
                    })
                    .map(todo => ({ id: todo.id, text: todo.text }))

                if (updates.length > 0) {
                    await updateTodoTexts(updates)
                }
            } else if (mode === 'done') {
                if (selectedIds.length > 0) {
                    await toggleTodosDoneStatus(selectedIds)
                }
            } else if (mode === 'delete') {
                if (selectedIds.length > 0) {
                    const newIds = localLinkedIds.filter(id => !selectedIds.includes(id))
                    setLocalLinkedIds(newIds)
                    onLinksChanged(newIds)
                }
            } else if (mode === 'reordering') {
                onLinksChanged(localLinkedIds)
            }
            setMode('idle')
            setEditingTodoId(null)
            setSelectedIds([])
            setNewTodoText('')
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
        // revert local text edits if editing
        setLocalTodos(localLinkedIds.map(id => allTodosMap.get(id)!).filter(Boolean))
        if(mode === 'reordering'){
            setLocalLinkedIds(linkedIds)
        }
        setMode('idle')
        setEditingTodoId(null)
        setSelectedIds([])
        setNewTodoText('')
    }

    const handleSelectToggle = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id])
    }

    const handleTextChange = (id: number, text: string) => {
        setLocalTodos(localTodos.map(t => t.id === id ? { ...t, text } : t))
    }

    const modeStyles = {
        idle: 'transparent',
        creating: 'border-violet-500/50 shadow-glow-violet-sm',
        editing: 'border-blue-500/50 shadow-glow-blue-sm',
        done: 'border-emerald-500/50 shadow-glow-emerald-sm',
        delete: 'border-rose-500/50 shadow-glow-rose-sm',
        reordering: 'border-amber-500/50 shadow-glow-amber-sm'
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setLocalLinkedIds((items) => {
                const oldIndex = items.indexOf(active.id as number)
                const newIndex = items.indexOf(over.id as number)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {!readOnly && (
                <div className="flex gap-2 w-full justify-center shrink-0 overflow-x-auto py-4 px-2 -my-3 scrollbar-hide">
                    {mode === 'idle' ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setMode('creating')} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm px-3 shrink-0">
                                <PlusCircle className="w-4 h-4 mr-1.5" />
                                <span>Create</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setMode('editing')} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm px-3 shrink-0">
                                <Edit2 className="w-4 h-4 mr-1.5" />
                                <span>Edit</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setMode('reordering')} className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm px-3 shrink-0">
                                <MoveVertical className="w-4 h-4 mr-1.5" />
                                <span>Move</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setMode('done')} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm px-3 shrink-0">
                                <CheckSquare className="w-4 h-4 mr-1.5" />
                                <span>Complete</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setMode('delete')} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm px-3 shrink-0">
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                <span>Remove</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50 px-3 shrink-0">
                                <XCircle className="w-4 h-4 mr-1.5" />
                                <span>Discard (Esc)</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50 px-3 shrink-0">
                                <Save className="w-4 h-4 mr-1.5" />
                                <span>{isSaving ? 'Saving...' : 'Save (Enter)'}</span>
                            </Button>
                        </>
                    )}
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <ul className={cn("space-y-2 mt-2 transition-all duration-300", mode !== 'idle' ? `p-2 border rounded-md ${modeStyles[mode]} bg-background/50` : "")}>
                        {mode === 'creating' && (
                            <li className="p-0 border border-primary/50 rounded-md bg-card flex flex-col overflow-hidden shadow-sm">
                                <Command className="w-full bg-transparent p-0">
                                    <CommandInput
                                        placeholder={`Search or type to create new ${title.toLowerCase()}...`}
                                        value={newTodoText}
                                        onValueChange={setNewTodoText}
                                        autoFocus
                                    />
                                    <CommandList>
                                        <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
                                            No matched {title.toLowerCase()}. Press Save to create a new one.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {availableTodos.filter(t => !localLinkedIds.includes(t.id)).map((todo) => (
                                                <CommandItem
                                                    key={todo.id}
                                                    value={todo.id.toString() + " " + todo.text}
                                                    onSelect={() => {
                                                        const newIds = [...localLinkedIds, todo.id];
                                                        setLocalLinkedIds(newIds);
                                                        onLinksChanged(newIds);
                                                        setMode('idle');
                                                        setNewTodoText('');
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", localLinkedIds.includes(todo.id) ? "opacity-100" : "opacity-0")} />
                                                    <span className="truncate">{todo.text}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </li>
                        )}
                        {localTodos.length === 0 && mode !== 'creating' && (
                            <p className="text-sm text-muted-foreground p-2">No items listed.</p>
                        )}
                        {localTodos.map(todo => (
                            <SortableSublistItem 
                                key={todo.id} 
                                id={todo.id} 
                                todo={todo}
                                readOnly={readOnly}
                                mode={mode}
                                editingTodoId={editingTodoId}
                                selectedIds={selectedIds}
                                onSelectToggle={handleSelectToggle}
                                onStartEdit={setEditingTodoId}
                                onTextChange={handleTextChange}
                                onClickTodo={onClickTodo}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    )
})

RelationshipSubList.displayName = 'RelationshipSubList'
