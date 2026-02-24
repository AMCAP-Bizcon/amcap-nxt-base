'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { updateTodoSequence, updateTodoTexts } from './actions'

type Todo = {
    id: number
    text: string
    done: boolean
    userId: string
    sequence: number
    createdAt: Date
}

function SortableItem({ id, todo, isReordering, isEditing, isCurrentlyEditing, onStartEdit, onTextChange }: { id: number, todo: Todo, isReordering: boolean, isEditing: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onTextChange: (id: number, text: string) => void }) {
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
            className={`p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex justify-between items-center transition-colors ${isReordering ? 'cursor-grab active:cursor-grabbing hover:border-primary/50' : ''} ${isEditing ? 'hover:border-primary/50' : ''}`}
        >
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
                    <span className="font-medium">{todo.text}</span>
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
    const [mode, setMode] = useState<'idle' | 'reordering' | 'editing'>('idle')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
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
            }
            setMode('idle')
            setEditingTodoId(null)
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
            <div className="flex justify-end gap-2 mb-4">
                {mode === 'idle' ? (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setMode('editing')}>
                            Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('reordering')}>
                            Alter
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
                            Discard
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
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
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    )
}
