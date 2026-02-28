'use client'

import { useState, useEffect } from 'react'
import { type Todo } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { X, Save, Image as ImageIcon, FileText, Link as LinkIcon } from 'lucide-react'
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'
import { updateTodoDetails } from './actions'

interface TodoDetailsPanelProps {
    todo: Todo | null
    allTodos: Todo[]
    onClose: () => void
    onSaved: () => void
}

export function TodoDetailsPanel({ todo, allTodos, onClose, onSaved }: TodoDetailsPanelProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [details, setDetails] = useState<{
        description: string;
        images: string[];
        files: { name: string, url: string }[];
        parentId: number | null;
    }>({ description: '', images: [], files: [], parentId: null })

    const [newImageUrl, setNewImageUrl] = useState('')
    const [newFileName, setNewFileName] = useState('')
    const [newFileUrl, setNewFileUrl] = useState('')

    // Reset local state when todo changes
    useEffect(() => {
        if (todo) {
            setDetails({
                description: todo.description || '',
                images: Array.isArray(todo.images) ? todo.images : [],
                files: Array.isArray(todo.files) ? todo.files : [],
                parentId: todo.parentId,
            })
            setNewImageUrl('')
            setNewFileName('')
            setNewFileUrl('')
        }
    }, [todo])

    if (!todo) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateTodoDetails(todo.id, {
                description: details.description,
                images: details.images,
                files: details.files,
                parentId: details.parentId,
            })
            onSaved()
            onClose()
        } catch (error) {
            console.error('Failed to save todo details', error)
        } finally {
            setIsSaving(false)
        }
    }

    const addImage = () => {
        if (newImageUrl.trim()) {
            setDetails(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }))
            setNewImageUrl('')
        }
    }

    const removeImage = (index: number) => {
        setDetails(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
    }

    const addFile = () => {
        if (newFileName.trim() && newFileUrl.trim()) {
            setDetails(prev => ({ ...prev, files: [...prev.files, { name: newFileName.trim(), url: newFileUrl.trim() }] }))
            setNewFileName('')
            setNewFileUrl('')
        }
    }

    const removeFile = (index: number) => {
        setDetails(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
    }

    return (
        <div className="w-full h-full bg-card border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shadow-sm flex-shrink-0">
                <h2 className="text-xl font-semibold tracking-tight">Todo Details</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Read-only Title */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Title</label>
                    <p className="text-lg font-medium bg-muted/50 p-3 rounded-md border border-border/50">{todo.text}</p>
                </div>

                {/* Description */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
                    <AutoResizeTextarea
                        value={details.description}
                        onChange={(e) => setDetails({ ...details, description: e.target.value })}
                        placeholder="Add a more detailed description..."
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow resize-none min-h-[100px]"
                    />
                </div>

                {/* Parent Selector */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" /> Parent Todo
                    </label>
                    <select
                        value={details.parentId || ''}
                        onChange={(e) => setDetails({ ...details, parentId: e.target.value ? Number(e.target.value) : null })}
                        className="bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow placeholder:text-muted-foreground"
                    >
                        <option value="">None</option>
                        {allTodos.filter(t => t.id !== todo.id).map(t => (
                            <option key={t.id} value={t.id}>{t.text}</option>
                        ))}
                    </select>
                </div>

                {/* Images List */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Attached Images
                    </label>
                    {details.images.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {details.images.map((img, i) => (
                                <div key={i} className="relative group rounded-md border border-border/50 overflow-hidden bg-muted aspect-video flex-shrink-0 shadow-sm">
                                    <img src={img} alt={`Attached ${i}`} className="w-full h-full object-cover transition-opacity duration-300" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image' }} />
                                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2 isolate group hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all rounded-md focus-within:shadow-[0_0_15px_rgba(139,92,246,0.3)] duration-300">
                        <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Image URL..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }} className="flex-1 bg-background border border-input rounded-l-md px-3 py-2 text-sm focus:outline-none z-10 transition-colors" />
                        <Button onClick={addImage} variant="secondary" className="rounded-l-none border border-l-0 border-input z-0 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40" type="button">Add</Button>
                    </div>
                </div>

                {/* Files List */}
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Attached Files
                    </label>
                    {details.files.length > 0 && (
                        <ul className="space-y-2 mb-4">
                            {details.files.map((file, i) => (
                                <li key={i} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/40 shadow-sm">
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate mr-2 block break-all font-medium transition-colors hover:text-blue-600">{file.name}</a>
                                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive flex-shrink-0 p-1 hover:bg-destructive/10 rounded-full transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-2 isolate group hover:shadow-[0_0_15px_rgba(14,165,233,0.2)] transition-all rounded-md focus-within:shadow-[0_0_15px_rgba(14,165,233,0.3)] duration-300">
                        <input type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)} placeholder="File Name" className="flex-[0.4] bg-background border border-input rounded-l-md px-3 py-2 text-sm focus:outline-none z-10" />
                        <input type="text" value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} placeholder="File URL" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFile(); } }} className="flex-[0.6] bg-background border border-l-0 border-input px-3 py-2 text-sm focus:outline-none z-10" />
                        <Button onClick={addFile} variant="secondary" className="rounded-l-none border border-l-0 border-input z-0 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-900/40" type="button">Add</Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] flex-shrink-0">
                <Button variant="outline" onClick={onClose} disabled={isSaving} className="hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 shadow-sm transition-all">Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all border-0">
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
