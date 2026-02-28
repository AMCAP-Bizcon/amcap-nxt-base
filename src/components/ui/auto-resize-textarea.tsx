import * as React from "react"
import { useEffect, useRef } from "react"

export function AutoResizeTextarea({
    value,
    onChange,
    placeholder,
    className,
    autoFocus,
    onKeyDown
}: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let lastWidth = textarea.clientWidth;

        const resizeObserver = new ResizeObserver(() => {
            if (textarea.clientWidth !== lastWidth) {
                lastWidth = textarea.clientWidth;
                adjustHeight();
            }
        });

        resizeObserver.observe(textarea);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            rows={1}
            autoFocus={autoFocus}
            onKeyDown={onKeyDown}
        />
    );
}
