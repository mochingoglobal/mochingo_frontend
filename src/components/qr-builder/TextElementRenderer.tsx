'use client';
import React, { useRef, useState, useEffect } from 'react';
import { TextElement } from './types';

interface TextElementRendererProps {
    element: TextElement;
    isSelected: boolean;
    onContentChange: (content: string) => void;
    onEditingChange?: (isEditing: boolean) => void;
    scale: number;
}

export default function TextElementRenderer({
    element,
    isSelected,
    onContentChange,
    onEditingChange,
    scale,
}: TextElementRendererProps) {
    const [editing, setEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const startEditing = () => {
        if (!isSelected) return;
        setEditing(true);
        onEditingChange?.(true);
    };

    const stopEditing = (newContent?: string) => {
        setEditing(false);
        onEditingChange?.(false);
        if (newContent !== undefined) onContentChange(newContent);
    };

    useEffect(() => {
        if (editing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [editing]);

    // When element gets deselected from outside, exit editing too
    useEffect(() => {
        if (!isSelected && editing) stopEditing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelected]);

    const displayText =
        element.textTransform === 'uppercase' ? element.content.toUpperCase()
            : element.textTransform === 'lowercase' ? element.content.toLowerCase()
                : element.textTransform === 'capitalize'
                    ? element.content.replace(/\b\w/g, c => c.toUpperCase())
                    : element.content;

    const sharedStyle: React.CSSProperties = {
        fontFamily: `'${element.fontFamily}', Arial, sans-serif`,
        fontSize: element.fontSize * scale,
        fontWeight: element.fontWeight,
        color: element.color,
        textAlign: element.textAlign,
        letterSpacing: element.letterSpacing * scale,
        lineHeight: element.lineHeight,
        width: '100%',
        height: '100%',
    };

    if (editing) {
        return (
            <textarea
                ref={textareaRef}
                defaultValue={element.content}
                onBlur={(e) => stopEditing(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') stopEditing();
                    e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                    ...sharedStyle,
                    resize: 'none',
                    background: 'rgba(255,255,255,0.9)',
                    border: '1.5px solid #3b82f6',
                    outline: 'none',
                    borderRadius: 2,
                    padding: '2px 4px',
                    boxSizing: 'border-box',
                    cursor: 'text',
                    display: 'block',
                }}
            />
        );
    }

    return (
        <div
            style={{
                ...sharedStyle,
                padding: '2px 4px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                    element.textAlign === 'left' ? 'flex-start'
                        : element.textAlign === 'right' ? 'flex-end'
                            : 'center',
                pointerEvents: 'auto',
                cursor: isSelected ? 'text' : 'grab',
                userSelect: 'none',
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing();
            }}
            title={isSelected ? 'Double-click to edit' : undefined}
        >
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {displayText || '\u00A0'}
            </span>
        </div>
    );
}
