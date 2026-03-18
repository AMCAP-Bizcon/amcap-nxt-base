'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from 'react'
import { type Todo, type TodoRelationship } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Save, Image as ImageIcon, FileText, Camera, Pin, PinOff, Edit2, XCircle, X } from 'lucide-react'
import { ToolbarButton } from '@/components/ui/responsive-toolbar'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { updateTodoDetails, updateTodoRelationships } from './actions'
import { createClient } from '@/utils/supabase/client'
import { RelationshipSubList, type RelationshipSubListRef } from './RelationshipSubList'
import { StandardDetailForm } from '@/components/templates/StandardDetailForm'
import { StandardSublistTabs } from '@/components/templates/StandardSublistTabs'
import { ImageViewer } from '@/components/ui/image-viewer'

export interface TodoDetailsPanelRef {
    handleSave: () => Promise<void>;
    handleDiscard: () => void;
    promptAddImage: () => void;
    promptCaptureImage: () => void;
    promptAddFile: () => void;
    isSaving: boolean;
}

interface TodoDetailsPanelProps {
    todo: Todo | null
    allTodos: Todo[]
    relationships: TodoRelationship[]
    readOnly?: boolean
    onEnterEditMode?: () => void
    onClose: () => void
    onDrillDown: (id: number, relationType: 'parent' | 'child') => void
    onSaved: () => void
    activeTab: string
    onTabChange: (tabId: string) => void
    onDiscard: () => void
}

export const TodoDetailsPanel = forwardRef<TodoDetailsPanelRef, TodoDetailsPanelProps>(({ todo, allTodos, relationships, readOnly = false, onEnterEditMode, onClose, onDrillDown, onSaved, activeTab, onTabChange, onDiscard }, ref) => {
    const [isSaving, setIsSaving] = useState(false)
    const [details, setDetails] = useState<{
        text: string;
        description: string;
        images: { url: string; path: string }[];
        files: { name: string; url: string; path: string }[];
        parentIds: number[];
        childIds: number[];
        isPinned: boolean;
    }>({ text: '', description: '', images: [], files: [], parentIds: [], childIds: [], isPinned: false })

    const [isUploading, setIsUploading] = useState(false)
    /** Tracks whether any sublist is in a non-idle mode (editing, reordering, etc.). */
    const [sublistBusy, setSublistBusy] = useState(false)
    const childrenSublistMode = useRef<string>('idle')
    const parentsSublistMode = useRef<string>('idle')
    const imageInputRef = useRef<HTMLInputElement>(null)
    const captureInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const parentsListRef = useRef<RelationshipSubListRef>(null)
    const childrenListRef = useRef<RelationshipSubListRef>(null)
    const currentTodoId = useRef<number | null>(null)
    const [viewerState, setViewerState] = useState({ open: false, index: 0 })

    /** Recalculates sublistBusy whenever either sublist reports a mode change. */
    const handleChildrenModeChange = useCallback((mode: string) => {
        childrenSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || parentsSublistMode.current !== 'idle')
    }, [])

    const handleParentsModeChange = useCallback((mode: string) => {
        parentsSublistMode.current = mode
        setSublistBusy(mode !== 'idle' || childrenSublistMode.current !== 'idle')
    }, [])

    const supabase = createClient()

    const allTodosMap = useMemo(() => new Map(allTodos.map(t => [t.id, t])), [allTodos]);

    useEffect(() => {
        if (todo) {
            const isSameTodo = currentTodoId.current === todo.id;
            currentTodoId.current = todo.id;
            
            setDetails(prev => {
                const newParentIds = relationships
                    .filter(r => r.childId === todo.id)
                    .sort((a, b) => (allTodosMap.get(a.parentId)?.sequence ?? 0) - (allTodosMap.get(b.parentId)?.sequence ?? 0))
                    .map(r => r.parentId);
                
                const newChildIds = relationships
                    .filter(r => r.parentId === todo.id)
                    .sort((a, b) => (allTodosMap.get(a.childId)?.sequence ?? 0) - (allTodosMap.get(b.childId)?.sequence ?? 0))
                    .map(r => r.childId);

                return {
                    text: isSameTodo ? prev.text : (todo.text || ''),
                    description: isSameTodo ? prev.description : (todo.description || ''),
                    images: Array.isArray(todo.images) ? todo.images as { url: string; path: string }[] : [],
                    files: Array.isArray(todo.files) ? todo.files as { name: string; url: string; path: string }[] : [],
                    parentIds: newParentIds,
                    childIds: newChildIds,
                    isPinned: todo.isPinned ?? false,
                }
            })
        }
    }, [todo, relationships, allTodosMap])

    if (!todo) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Ensure any sublist in-progress changes (like reordering) are persisted
            await Promise.all([
                parentsListRef.current?.saveIfUnsaved(),
                childrenListRef.current?.saveIfUnsaved()
            ]);

            await Promise.all([
                updateTodoDetails(todo.id, {
                    text: details.text,
                    description: details.description,
                    images: details.images,
                    files: details.files,
                    isPinned: details.isPinned,
                }),
                updateTodoRelationships(todo.id, details.parentIds, details.childIds)
            ])
            onSaved()
        } catch (error) {
            console.error('Failed to save todo details', error)
            alert(error instanceof Error ? error.message : "Failed to save details.")
        } finally {
            setIsSaving(false)
        }
    }

    const simulatedGraph = useMemo(() => {
        if (!todo) return [];
        let graph = relationships.filter(r => r.childId !== todo.id && r.parentId !== todo.id);
        details.parentIds.forEach(pId => graph.push({ parentId: pId, childId: todo.id, userId: '' }));
        details.childIds.forEach(cId => graph.push({ parentId: todo.id, childId: cId, userId: '' }));
        return graph;
    }, [details, relationships, todo]);

    const getDescendants = (startId: number) => {
        const desc = new Set<number>();
        const queue = [startId];
        while (queue.length > 0) {
            const curr = queue.shift()!;
            for (const r of simulatedGraph) {
                if (r.parentId === curr && !desc.has(r.childId)) {
                    desc.add(r.childId);
                    queue.push(r.childId);
                }
            }
        }
        return desc;
    }

    const availableParents = useMemo(() => {
        if (!todo) return [];
        const desc = getDescendants(todo.id);
        return allTodos.filter(t => t.id !== todo.id && !desc.has(t.id));
    }, [allTodos, todo, simulatedGraph]);

    const availableChildren = useMemo(() => {
        if (!todo) return [];
        return allTodos.filter(t => {
            if (t.id === todo.id) return false;
            const desc = getDescendants(t.id);
            return !desc.has(todo.id); // Valid child if it cannot reach back to `todo`
        });
    }, [allTodos, todo, simulatedGraph]);

    const removeImage = (index: number) => {
        setDetails(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
    }

    const addFile = (name: string, url: string, path: string) => {
        if (name.trim() && url.trim() && path.trim()) {
            setDetails(prev => ({ ...prev, files: [...prev.files, { name: name.trim(), url: url.trim(), path: path.trim() }] }))
        }
    }

    const removeFile = (index: number) => {
        setDetails(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
    }

    const handleDiscard = () => {
        if (todo) {
            setDetails({
                text: todo.text || '',
                description: todo.description || '',
                images: Array.isArray(todo.images) ? todo.images as { url: string; path: string }[] : [],
                files: Array.isArray(todo.files) ? todo.files as { name: string; url: string; path: string }[] : [],
                parentIds: relationships.filter(r => r.childId === todo.id).map(r => r.parentId),
                childIds: relationships.filter(r => r.parentId === todo.id).map(r => r.childId),
                isPinned: todo.isPinned ?? false,
            });
        }
        onDiscard();
    };

    const promptAddImage = () => imageInputRef.current?.click();
    const promptCaptureImage = () => captureInputRef.current?.click();
    const promptAddFile = () => fileInputRef.current?.click();

    useImperativeHandle(ref, () => ({
        handleSave,
        handleDiscard,
        promptAddImage,
        promptCaptureImage,
        promptAddFile,
        isSaving
    }));

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !todo) return;

        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${todo.userId}/${todo.id}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('todo-media')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('todo-media').getPublicUrl(fileName);
            
            setDetails(prev => ({ ...prev, images: [...prev.images, { url: data.publicUrl, path: fileName }] }));
            if (readOnly) onEnterEditMode?.()
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
            if (captureInputRef.current) captureInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !todo) return;

        const file = e.target.files[0];
        const originalName = file.name;
        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'bin';
            const fileName = `${todo.userId}/${todo.id}/${Date.now()}_${originalName.replace(/\s+/g, '_')}`;

            const { error: uploadError } = await supabase.storage
                .from('todo-media')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('todo-media').getPublicUrl(fileName);

            addFile(originalName, data.publicUrl, fileName);
            if (readOnly) onEnterEditMode?.()
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formActions = readOnly ? (
        <>
            <ToolbarButton variant="outline" onClick={promptAddImage} className="h-9 text-violet-600 hover:text-violet-700 hover:bg-violet-50 hover:shadow-glow-violet-sm" icon={<ImageIcon />} label="Add Image" />
            <ToolbarButton variant="outline" onClick={promptCaptureImage} className="h-9 text-pink-600 hover:text-pink-700 hover:bg-pink-50 hover:shadow-glow-pink-sm" icon={<Camera />} label="Capture" />
            <ToolbarButton variant="outline" onClick={promptAddFile} className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:shadow-glow-blue-sm" icon={<FileText />} label="Add File" />
            <ToolbarButton variant="outline" onClick={onEnterEditMode} className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-glow-emerald-sm" icon={<Edit2 />} label="Edit Details" />
        </>
    ) : sublistBusy ? null : (
        <>
            <ToolbarButton variant="outline" onClick={handleDiscard} disabled={isSaving} className="h-9 text-slate-500 hover:text-slate-600 hover:bg-slate-50 hover:shadow-glow-slate-sm dark:hover:bg-slate-900/50" icon={<XCircle />} label="Discard" />
            <ToolbarButton variant="outline" onClick={handleSave} disabled={isSaving} className="h-9 text-sky-600 hover:text-sky-700 hover:bg-sky-50 hover:shadow-glow-sky-sm dark:hover:bg-sky-900/50" icon={<Save />} label={isSaving ? 'Saving...' : 'Save'} />
        </>
    )

    const headerActions = readOnly ? (
        <button
            type="button"
            onClick={async () => {
                const newPinnedState = !details.isPinned;
                setDetails({ ...details, isPinned: newPinnedState });
                if (todo) {
                    try {
                        await updateTodoDetails(todo.id, { isPinned: newPinnedState });
                        onSaved();
                    } catch (error) {
                        console.error('Failed to auto-save pin state', error);
                        alert('Failed to save pin state.');
                        setDetails({ ...details, isPinned: !newPinnedState }); // revert optimistic update
                    }
                }
            }}
            className={`p-2 rounded-md transition-colors flex-shrink-0 ${details.isPinned ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            aria-label={details.isPinned ? "Unpin Todo" : "Pin Todo"}
        >
            {details.isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
        </button>
    ) : null

    const titleEl = !readOnly ? (
        <input
            type="text"
            value={details.text}
            onChange={(e) => setDetails({ ...details, text: e.target.value })}
            className="text-xl font-semibold tracking-tight bg-transparent border-b border-primary/50 outline-none px-1 py-0.5 w-full flex-1"
            placeholder="Todo title"
        />
    ) : (
        <span className="truncate block w-full">{todo.text}</span>
    )

    return (
        <StandardDetailForm
            title={titleEl}
            headerActions={headerActions}
            formActions={formActions}
            onClose={onClose}
            hideClose={!readOnly}
        >
            {/* Description */}
            <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Description</label>
                <RichTextEditor
                    value={details.description}
                    onChange={(value) => setDetails({ ...details, description: value })}
                    placeholder="Add a more detailed description..."
                    readOnly={readOnly}
                />
            </div>

            {/* Parents/Children Relationship Selectors using StandardSublistTabs */}
            <StandardSublistTabs
                tabs={[
                    {
                        id: 'children',
                        label: 'Child Todos',
                        content: (
                            <RelationshipSubList
                                ref={childrenListRef}
                                title="Child Todos"
                                linkedIds={details.childIds}
                                availableTodos={availableChildren}
                                allTodosMap={allTodosMap}
                                readOnly={readOnly}
                                onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, childIds: newIds }))}
                                onClickTodo={(id) => onDrillDown(id, 'child')}
                                onModeChange={handleChildrenModeChange}
                            />
                        )
                    },
                    {
                        id: 'parents',
                        label: 'Parent Todos',
                        content: (
                            <RelationshipSubList
                                ref={parentsListRef}
                                title="Parent Todos"
                                linkedIds={details.parentIds}
                                availableTodos={availableParents}
                                allTodosMap={allTodosMap}
                                readOnly={readOnly}
                                onLinksChanged={(newIds) => setDetails(prev => ({ ...prev, parentIds: newIds }))}
                                onClickTodo={(id) => onDrillDown(id, 'parent')}
                                onModeChange={handleParentsModeChange}
                            />
                        )
                    }
                ]}
                activeTab={activeTab}
                onTabChange={onTabChange}
                disableTabSwitch={sublistBusy}
            />

            {/* Images List */}
            <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" /> Attached Images
                </label>
                {details.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {details.images.map((img, i) => (
                            <div 
                                key={i} 
                                className="relative group rounded-md border border-border/50 overflow-hidden bg-muted aspect-video flex-shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                onClick={() => setViewerState({ open: true, index: i })}
                            >
                                <img src={img.url} alt={`Attached ${i}`} className="w-full h-full object-cover transition-opacity duration-300" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image' }} />
                                {!readOnly && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeImage(i); }} 
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic mb-4">No images attached.</p>
                )}
            </div>

            {/* Files List */}
            <div>
                <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Attached Files
                </label>
                {details.files.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                        {details.files.map((file, i) => (
                            <li key={i} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/40 shadow-sm">
                                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline truncate mr-2 block break-all font-medium transition-colors hover:text-blue-600">{file.name}</a>
                                {!readOnly && (
                                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive flex-shrink-0 p-1 hover:bg-destructive/10 rounded-full transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground italic mb-4">No files attached.</p>
                )}
            </div>

            {/* Hidden Inputs for Uploads */}
            <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
            <input type="file" ref={captureInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <input type="file" ref={fileInputRef} accept="*" className="hidden" onChange={handleFileUpload} />

            {/* Show an uploading indicator if necessary */}
            {isUploading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card shadow-lg border border-border rounded-md px-6 py-4 flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></div>
                        <span className="text-sm font-medium">Uploading...</span>
                    </div>
                </div>
            )}

            <ImageViewer 
                images={details.images}
                initialIndex={viewerState.index}
                open={viewerState.open}
                onOpenChange={(open) => setViewerState(prev => ({ ...prev, open }))}
            />
        </StandardDetailForm>
    )
})

TodoDetailsPanel.displayName = 'TodoDetailsPanel'
