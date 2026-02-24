'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckSquare, Trash2, Edit2, MoveVertical, Save, XCircle } from 'lucide-react'
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
import { updateTodoSequence, updateTodoTexts, markTodosAsDone, deleteMultipleTodos } from './actions'

type Todo = {
    id: number
    text: string
    done: boolean
    userId: string
    sequence: number
    createdAt: Date
}

function SortableItem({ id, todo, isReordering, isEditing, isCurrentlyEditing, onStartEdit, onTextChange, isSelectable, isSelected, onSelectToggle }: { id: number, todo: Todo, isReordering: boolean, isEditing: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onTextChange: (id: number, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: number) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <li
            ref={setNodeRef}
            style={style}
            {...(isReordering ? attributes : {})}
            {...(isReordering ? listeners : {})}
            className={`p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors ${isReordering ? 'cursor-grab active:cursor-grabbing hover:border-primary/50' : ''} ${isEditing ? 'hover:border-primary/50' : ''}`}
        >
            {isSelectable && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectToggle(id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id) }}>
                {isCurrentlyEditing ? (
                    <input
                        type="text"
                        value={todo.text}
                        onChange={(e) => onTextChange(id, e.target.value)}
                        className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1"
                        autoFocus
                    />
                ) : (
                    <span className={`font-medium ${todo.done ? 'line-through text-muted-foreground' : ''}`}>{todo.text}</span>
                )}
                <span className="text-xs text-muted-foreground cursor-default">
                    {new Date(todo.createdAt).toLocaleDateString()} | {new Date(todo.createdAt).toLocaleTimeString()}
                </span>
            </div>
        </li>
    )
}


export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
    const [todos, setTodos] = useState(initialTodos)
    const [mode, setMode] = useState<'idle' | 'reordering' | 'editing' | 'done' | 'delete'>('idle')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
    const [selectedTodoIds, setSelectedTodoIds] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (mode === 'idle') {
            setTodos(initialTodos)
        }
    }, [initialTodos, mode])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setTodos((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)

                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (mode === 'reordering') {
                const updates = todos.map((todo, index) => ({
                    id: todo.id,
                    sequence: index,
                }))
                await updateTodoSequence(updates)
            } else if (mode === 'editing') {
                const updates = todos
                    .filter(t => {
                        const init = initialTodos.find(it => it.id === t.id)
                        return init && init.text !== t.text
                    })
                    .map(todo => ({
                        id: todo.id,
                        text: todo.text,
                    }))
                if (updates.length > 0) {
                    await updateTodoTexts(updates)
                }
            } else if (mode === 'done') {
                if (selectedTodoIds.length > 0) {
                    await markTodosAsDone(selectedTodoIds)
                    // Optimistic update handled by invalidation or state change
                    setTodos(todos.map(t => selectedTodoIds.includes(t.id) ? { ...t, done: true } : t))
                }
            } else if (mode === 'delete') {
                if (selectedTodoIds.length > 0) {
                    await deleteMultipleTodos(selectedTodoIds)
                    // Optimistic update
                    setTodos(todos.filter(t => !selectedTodoIds.includes(t.id)))
                }
            }
            setMode('idle')
            setEditingTodoId(null)
            setSelectedTodoIds([])
        } catch (error) {
            console.error("Failed to save", error)
            // Ideally add a toast notification here
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscard = () => {
        setTodos(initialTodos)
        setMode('idle')
        setEditingTodoId(null)
        setSelectedTodoIds([])
    }

    const handleSelectToggle = (id: number) => {
        setSelectedTodoIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
    }

    const handleTextChange = (id: number, text: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, text } : t))
    }

    if (todos.length === 0) {
        return <p className="text-muted-foreground text-center mt-8">No todos yet. Create one above!</p>
    }

    return (
        <div className="w-full">
            {/* The Mini Toolbar */}
            <div className="flex justify-center flex-wrap gap-3 mb-4">
                {mode === 'idle' ? (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setMode('done')} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <CheckSquare className="w-4 h-4 mr-1.5" />
                            Done
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('delete')} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Delete
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('editing')} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit2 className="w-4 h-4 mr-1.5" />
                            Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('reordering')} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                            <MoveVertical className="w-4 h-4 mr-1.5" />
                            Alter
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving} className="text-muted-foreground hover:bg-muted/50">
                            <XCircle className="w-4 h-4 mr-1.5" />
                            Discard
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                            <Save className="w-4 h-4 mr-1.5" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                )}
            </div>

            {/* The List to Display Data */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={todos.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <ul className="space-y-3">
                        {todos.map((todo) => (
                            <SortableItem
                                key={todo.id}
                                id={todo.id}
                                todo={todo}
                                isReordering={mode === 'reordering'}
                                isEditing={mode === 'editing'}
                                isCurrentlyEditing={editingTodoId === todo.id}
                                onStartEdit={setEditingTodoId}
                                onTextChange={handleTextChange}
                                isSelectable={mode === 'done' || mode === 'delete'}
                                isSelected={selectedTodoIds.includes(todo.id)}
                                onSelectToggle={handleSelectToggle}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    )
}
