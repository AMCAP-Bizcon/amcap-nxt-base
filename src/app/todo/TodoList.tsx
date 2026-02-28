'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CheckSquare, Trash2, Edit2, MoveVertical, Save, XCircle, PlusCircle } from 'lucide-react'
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
import { TodoDetailsPanel } from './TodoDetailsPanel'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

import { type Todo } from '@/db/schema'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'

/**
 * SortableItem Component
 * 
 * Represents an individual todo item that can be dragged and dropped.
 * Handles display, editing, and selection states for each item.
 */
function SortableItem({ id, todo, isReordering, isEditing, isIdle, isCurrentlyEditing, onStartEdit, onOpenDetails, onTextChange, isSelectable, isSelected, onSelectToggle }: { id: number, todo: Todo, isReordering: boolean, isEditing: boolean, isIdle: boolean, isCurrentlyEditing: boolean, onStartEdit: (id: number) => void, onOpenDetails: (id: number) => void, onTextChange: (id: number, text: string) => void, isSelectable: boolean, isSelected: boolean, onSelectToggle: (id: number) => void }) {
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
            className={`p-4 border border-border rounded-md bg-card text-card-foreground shadow-sm flex gap-3 items-center transition-colors ${isReordering ? 'touch-none cursor-grab active:cursor-grabbing hover:border-primary/50' : ''} ${isEditing ? 'hover:border-primary/50' : ''}`}
        >
            {isSelectable && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectToggle(id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                />
            )}
            <div className={`flex flex-col gap-1 w-full ${isEditing || isIdle ? 'cursor-pointer' : ''}`} onClick={() => { if (isEditing) onStartEdit(id); else if (isIdle) onOpenDetails(id); }}>
                {isCurrentlyEditing ? (
                    <AutoResizeTextarea
                        value={todo.text}
                        onChange={(e) => onTextChange(id, e.target.value)}
                        className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 resize-none overflow-hidden"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                            }
                        }}
                    />
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

/**
 * TodoList Component
 * 
 * Main client component for managing the list of todos.
 * Handles state management, optimistic UI updates, keyboard shortcuts,
 * and drag-and-drop integration using dnd-kit.
 */
export function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
    const [todos, setTodos] = useState(initialTodos)
    const [mode, setMode] = useState<'idle' | 'reordering' | 'editing' | 'done' | 'delete' | 'creating'>('idle')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
    const [selectedDetailsTodoId, setSelectedDetailsTodoId] = useState<number | null>(null)
    const [selectedTodoIds, setSelectedTodoIds] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [newTodoText, setNewTodoText] = useState('')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    // We use this ref to know when we've requested an update and shouldn't
    // revert the UI to the older `initialTodos` prematurely.
    const pendingUpdate = useRef(false)

    useEffect(() => {
        // If we have an update pending (we just saved), don't immediately revert
        // to `initialTodos`. Wait for the `initialTodos` to actually change (which Next.js handles via revalidatePath).
        if (!pendingUpdate.current) {
            setTodos(initialTodos)
        }

        // Reset the flag if the initialTodos actually matches our latest state length or we were just creating
        if (mode === 'idle') {
            pendingUpdate.current = false;
        }

        if (mode === 'idle') {
            setNewTodoText('')
        }
    }, [initialTodos, mode])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
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
        pendingUpdate.current = true // Lock the UI state so it doesn't flicker back to old props

        try {
            if (mode === 'creating') {
                if (newTodoText.trim()) {
                    // Optimistic update for creation is tricky without a real ID, 
                    // we'll just let the server return it quickly, but keep the UI locked.
                    await createTodo(newTodoText.trim())
                }
            } else if (mode === 'reordering') {
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
                    // Optimistic update
                    setTodos(todos.map(t => selectedTodoIds.includes(t.id) ? { ...t, done: !t.done } : t))
                    await toggleTodosDoneStatus(selectedTodoIds)
                }
            } else if (mode === 'delete') {
                if (selectedTodoIds.length > 0) {
                    // Optimistic update
                    setTodos(todos.filter(t => !selectedTodoIds.includes(t.id)))
                    await deleteMultipleTodos(selectedTodoIds)
                }
            }

            setMode('idle')
            setEditingTodoId(null)
            setSelectedTodoIds([])
        } catch (error) {
            pendingUpdate.current = false // Unlock if failed
            console.error("Failed to save", error)
            // Ideally add a toast notification here
        } finally {
            setIsSaving(false)
            // We do NOT set pendingUpdate.current = false here immediately.
            // We let the useEffect handle it once mode is idle and initialTodos updates.
        }
    }

    const handleDiscard = () => {
        setTodos(initialTodos)
        setMode('idle')
        setEditingTodoId(null)
        setSelectedTodoIds([])
        setNewTodoText('')
    }

    const latestHandlers = useRef({ handleSave, handleDiscard, mode, isSaving })

    useEffect(() => {
        latestHandlers.current = { handleSave, handleDiscard, mode, isSaving }
    })

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { handleSave, handleDiscard, mode, isSaving } = latestHandlers.current
            if (mode !== 'idle' && !isSaving) {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleSave()
                } else if (e.key === 'Escape') {
                    e.preventDefault()
                    handleDiscard()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSelectToggle = (id: number) => {
        setSelectedTodoIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
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

    return (
        <div className={`w-full flex flex-col max-h-full transition-all duration-300 ease-in-out ${selectedDetailsTodoId ? 'max-w-full' : 'max-w-2xl'}`}>
            {/* Toolbar */}
            <div className={`grid shrink-0 gap-3 mb-8 w-full ${mode === 'idle' ? 'grid-cols-5' : 'grid-cols-2'}`}>
                {mode === 'idle' ? (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setMode('creating')} className="w-full h-11 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm px-2 sm:px-3">
                            <PlusCircle className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Create</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('editing')} className="w-full h-11 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm px-2 sm:px-3">
                            <Edit2 className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('reordering')} className="w-full h-11 text-amber-600 hover:text-amber-700 hover:bg-amber-50 hover:shadow-glow-amber-sm px-2 sm:px-3">
                            <MoveVertical className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Move</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('done')} className="w-full h-11 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm px-2 sm:px-3">
                            <CheckSquare className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Complete</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMode('delete')} className="w-full h-11 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm px-2 sm:px-3">
                            <Trash2 className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Remove</span>
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isSaving} className="w-full h-11 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50 px-2 sm:px-3">
                            <XCircle className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">Discard (Esc)</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="w-full h-11 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50 px-2 sm:px-3">
                            <Save className="w-4 h-4 sm:mr-1.5 shrink-0" />
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save (Enter)'}</span>
                        </Button>
                    </>
                )}
            </div>

            {/* Glowing Separator */}
            <div className={`h-[1.5px] shrink-0 w-[150%] relative left-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent ${modeStyles[mode].gradient} to-transparent my-8 blur-[0.5px] ${modeStyles[mode].shadow} transition-all duration-300 ease-out`} aria-hidden="true" />

            <ResizablePanelGroup orientation={isMobile ? "vertical" : "horizontal"} className={`w-full flex-initial items-stretch rounded-lg border border-border bg-card/50 shadow-sm overflow-hidden ${isMobile ? 'min-h-[500px]' : 'min-h-[100px]'}`}>

                {/* Left Panel: The List */}
                <ResizablePanel defaultSize={selectedDetailsTodoId ? 20 : 100} minSize={30} className="transition-all duration-300 ease-in-out h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 pr-2 min-h-0">
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
                                    {mode === 'creating' && (
                                        <li className="p-4 border border-primary/50 shadow-md rounded-md bg-card text-card-foreground flex gap-3 items-center transition-colors">
                                            <div className="flex flex-col gap-1 w-full relative">
                                                <AutoResizeTextarea
                                                    value={newTodoText}
                                                    onChange={(e) => setNewTodoText(e.target.value)}
                                                    placeholder="What needs to be done?"
                                                    className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 py-1 resize-none overflow-hidden"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </li>
                                    )}
                                    {todos.map((todo) => (
                                        <SortableItem
                                            key={todo.id}
                                            id={todo.id}
                                            todo={todo}
                                            isReordering={mode === 'reordering'}
                                            isEditing={mode === 'editing'}
                                            isIdle={mode === 'idle'}
                                            isCurrentlyEditing={editingTodoId === todo.id}
                                            onStartEdit={setEditingTodoId}
                                            onOpenDetails={setSelectedDetailsTodoId}
                                            onTextChange={handleTextChange}
                                            isSelectable={mode === 'done' || mode === 'delete'}
                                            isSelected={selectedTodoIds.includes(todo.id)}
                                            onSelectToggle={handleSelectToggle}
                                        />
                                    ))}
                                    {todos.length === 0 && mode !== 'creating' && (
                                        <p className="text-muted-foreground text-center mt-8 py-8 border-2 border-dashed border-border rounded-lg">
                                            No todos yet. Click &quot;Create&quot; to start!
                                        </p>
                                    )}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    </div>
                </ResizablePanel>

                {/* Right Panel: The Details Form */}
                {selectedDetailsTodoId && (
                    <>
                        <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />
                        <ResizablePanel defaultSize={55} minSize={40} className="h-full animate-in slide-in-from-right-10 fade-in duration-300">
                            <TodoDetailsPanel
                                todo={todos.find(t => t.id === selectedDetailsTodoId) || null}
                                allTodos={todos}
                                onClose={() => setSelectedDetailsTodoId(null)}
                                onSaved={() => {
                                    // Handled automatically via Next.js revalidatePath from server action
                                }}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    )
}
