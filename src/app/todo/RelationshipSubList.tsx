'use client'

import { useState, useEffect } from 'react'
import { type Todo } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { CheckSquare, Trash2, Edit2, Save, XCircle, PlusCircle, Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { createTodo, updateTodoTexts, toggleTodosDoneStatus } from './actions'

interface RelationshipSubListProps {
    title: string;
    linkedIds: number[];
    availableTodos: Todo[];
    allTodosMap: Map<number, Todo>;
    onLinksChanged: (newIds: number[]) => void;
}

export function RelationshipSubList({ title, linkedIds, availableTodos, allTodosMap, onLinksChanged }: RelationshipSubListProps) {
    const [mode, setMode] = useState<'idle' | 'creating' | 'editing' | 'done' | 'delete'>('idle')
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [newTodoText, setNewTodoText] = useState('')
    const [editingTodoId, setEditingTodoId] = useState<number | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [openDropdown, setOpenDropdown] = useState(false)

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

    const handleDiscard = () => {
        // revert local text edits if editing
        setLocalTodos(localLinkedIds.map(id => allTodosMap.get(id)!).filter(Boolean))
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
        delete: 'border-rose-500/50 shadow-glow-rose-sm'
    }

    return (
        <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {title}
            </label>

            <Popover open={openDropdown} onOpenChange={setOpenDropdown}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={openDropdown} className="w-full justify-between" disabled={mode !== 'idle'}>
                        Search mapped {title.toLowerCase()}...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search..." />
                        <CommandList>
                            <CommandEmpty>No matching todos found.</CommandEmpty>
                            <CommandGroup>
                                {availableTodos.filter(t => !localLinkedIds.includes(t.id)).map((todo) => (
                                    <CommandItem
                                        key={todo.id}
                                        value={todo.id.toString() + " " + todo.text}
                                        onSelect={() => {
                                            const newIds = [...localLinkedIds, todo.id];
                                            setLocalLinkedIds(newIds);
                                            onLinksChanged(newIds);
                                            setOpenDropdown(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", localLinkedIds.includes(todo.id) ? "opacity-100" : "opacity-0")} />
                                        <span className="truncate">{todo.text}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <div className="flex gap-2 w-full mt-1">
                {mode === 'idle' ? (
                    <>
                        <Button variant="outline" size="icon" onClick={() => setMode('creating')} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm">
                            <PlusCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setMode('editing')} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm">
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setMode('done')} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm">
                            <CheckSquare className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setMode('delete')} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:shadow-glow-rose-sm">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" size="icon" onClick={handleDiscard} disabled={isSaving} className="text-slate-500 hover:bg-slate-50 hover:shadow-glow-slate-sm">
                            <XCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleSave} disabled={isSaving} className="text-sky-600 hover:bg-sky-50 hover:shadow-glow-sky-sm">
                            <Save className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>

            <ul className={cn("space-y-2 mt-2 transition-all duration-300", mode !== 'idle' ? `p-2 border rounded-md ${modeStyles[mode]} bg-background/50` : "")}>
                {mode === 'creating' && (
                    <li className="p-2 border border-primary/50 rounded-md bg-card flex gap-2 items-center">
                        <AutoResizeTextarea
                            value={newTodoText}
                            onChange={(e) => setNewTodoText(e.target.value)}
                            placeholder="Type a new todo to add..."
                            className="bg-transparent outline-none font-medium px-1 -mx-1 py-1 resize-none w-full"
                            autoFocus
                        />
                    </li>
                )}
                {localTodos.length === 0 && mode !== 'creating' && (
                    <p className="text-sm text-muted-foreground p-2">No items listed.</p>
                )}
                {localTodos.map(todo => {
                    const isSelectable = mode === 'done' || mode === 'delete';
                    const isSelected = selectedIds.includes(todo.id);
                    const isEditing = mode === 'editing';
                    const isCurrentlyEditing = editingTodoId === todo.id;

                    return (
                        <li key={todo.id} className={cn("p-2 border border-border rounded-md bg-card text-sm flex gap-2 items-center transition-colors", isEditing ? 'hover:border-primary/50 cursor-pointer' : '')}>
                            {isSelectable && (
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectToggle(todo.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer shrink-0"
                                />
                            )}
                            <div className="flex flex-col gap-1 w-full" onClick={() => { if (isEditing) setEditingTodoId(todo.id); }}>
                                {isCurrentlyEditing ? (
                                    <AutoResizeTextarea
                                        value={todo.text}
                                        onChange={(e) => handleTextChange(todo.id, e.target.value)}
                                        className="bg-transparent border-b border-primary outline-none font-medium px-1 -mx-1 resize-none w-full"
                                        autoFocus
                                    />
                                ) : (
                                    <span className={cn("font-medium break-words whitespace-pre-wrap", todo.done ? 'line-through text-muted-foreground' : '')}>{todo.text}</span>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
