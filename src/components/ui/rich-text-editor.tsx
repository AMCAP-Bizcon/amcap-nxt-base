import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2, Quote, Undo, Redo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null
    }

    return (
        <div className="flex flex-wrap gap-1 p-1 border-b border-border bg-muted/40 items-center">
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("bold") && "bg-muted text-foreground")}
                type="button"
            >
                <Bold className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("italic") && "bg-muted text-foreground")}
                type="button"
            >
                <Italic className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("strike") && "bg-muted text-foreground")}
                type="button"
            >
                <Strikethrough className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("heading", { level: 2 }) && "bg-muted text-foreground")}
                type="button"
            >
                <Heading2 className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("bulletList") && "bg-muted text-foreground")}
                type="button"
            >
                <List className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("orderedList") && "bg-muted text-foreground")}
                type="button"
            >
                <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
                className={cn("h-8 w-8 hover:bg-muted font-bold", editor.isActive("blockquote") && "bg-muted text-foreground")}
                type="button"
            >
                <Quote className="h-4 w-4" />
            </Button>

            <div className="w-[1px] h-6 bg-border mx-1" />

            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().undo().run() }}
                disabled={!editor.can().chain().focus().undo().run()}
                className="h-8 w-8 hover:bg-muted font-bold disabled:opacity-50"
                type="button"
            >
                <Undo className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.preventDefault(); editor.chain().focus().redo().run() }}
                disabled={!editor.can().chain().focus().redo().run()}
                className="h-8 w-8 hover:bg-muted font-bold disabled:opacity-50"
                type="button"
            >
                <Redo className="h-4 w-4" />
            </Button>
        </div>
    )
}

/**
 * A Tailwind-styled rich text editor powered by Tiptap.
 */
export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                }
            }),
            Placeholder.configure({
                placeholder: placeholder || "Write something...",
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none before:h-0',
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: "focus:outline-none min-h-[120px] p-4 text-sm [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:font-mono [&_pre]:text-sm",
            },
        },
    })

    // Prevent cursor jumping issues by only updating editor content
    // when the incoming value is fundamentally different (e.g. changing between items)
    // or initializing.
    React.useEffect(() => {
        if (editor && value !== undefined && value !== editor.getHTML()) {
            // Only set content if we are not currently focused (the user is not typing)
            if (!editor.isFocused || !editor.getHTML()) {
                editor.commands.setContent(value || '')
            }
        }
    }, [value, editor])

    return (
        <div className={cn("w-full bg-background border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow", className)}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="cursor-text" onClick={() => editor?.chain().focus().run()} />
        </div>
    )
}
