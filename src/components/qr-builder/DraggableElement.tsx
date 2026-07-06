'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Trash2, Lock, Unlock, Copy, RotateCw } from 'lucide-react';
import { DesignElement } from './types';

interface DraggableElementProps {
    element: DesignElement;
    isSelected: boolean;
    isChildEditing?: boolean;
    lockAspectRatio?: boolean;
    scale: number;
    canvasWidth: number;
    canvasHeight: number;
    onSelect: () => void;
    onMove: (x: number, y: number) => void;
    onMoveEnd?: () => void;
    onResize: (w: number, h: number) => void;
    onRotate: (angle: number) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onToggleLock: () => void;
    children: React.ReactNode;
}

type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw';

export default function DraggableElement({
    element, isSelected, isChildEditing = false, lockAspectRatio = false, scale,
    canvasWidth, canvasHeight, onSelect, onMove, onMoveEnd,
    onResize, onRotate, onDelete, onDuplicate, onToggleLock, children,
}: DraggableElementProps) {
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [displayRotation, setDisplayRotation] = useState(element.rotation);

    const containerRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<{
        mx: number; my: number; w: number; h: number;
        x: number; y: number; corner: ResizeCorner;
    } | null>(null);
    const rotateRef = useRef<{ startAngle: number; startRotation: number } | null>(null);

    const dragX = useMotionValue(0);
    const dragY = useMotionValue(0);

    const isDraggable = !element.locked && !isResizing && !isRotating && !isChildEditing;

    // Sync display rotation with state
    useEffect(() => setDisplayRotation(element.rotation), [element.rotation]);

    // Reset drag offsets when position updates from state
    useEffect(() => {
        dragX.set(0);
        dragY.set(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [element.x, element.y]);

    // ── Helpers ────────────────────────────────────────────────
    const getElementCenter = () => {
        const el = containerRef.current;
        if (!el) return { cx: 0, cy: 0 };
        const rect = el.getBoundingClientRect();
        return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    };

    // ── Resize ────────────────────────────────────────────────
    const handleResizeStart = (e: React.MouseEvent, corner: ResizeCorner) => {
        e.stopPropagation();
        e.preventDefault();
        if (element.locked) return;
        resizeRef.current = {
            mx: e.clientX, my: e.clientY,
            w: element.width, h: element.height,
            x: element.x, y: element.y,
            corner,
        };
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;
        const handleMove = (e: MouseEvent) => {
            const r = resizeRef.current;
            if (!r) return;
            const dxPx = (e.clientX - r.mx) / scale;
            const dyPx = (e.clientY - r.my) / scale;

            let newW = r.w, newH = r.h, newX = r.x, newY = r.y;

            if (lockAspectRatio) {
                // Preserve original aspect ratio (works for any shape — square QR or rectangular NFC)
                const aspect = r.h / r.w;
                const diag = (e.clientX - r.mx + (e.clientY - r.my)) / 2 / scale;
                if (r.corner === 'se') { newW = Math.max(20, r.w + diag); newH = newW * aspect; }
                if (r.corner === 'sw') { newW = Math.max(20, r.w - diag); newH = newW * aspect; newX = r.x + (r.w - newW); }
                if (r.corner === 'ne') { newW = Math.max(20, r.w + diag); newH = newW * aspect; newY = r.y + (r.h - newH); }
                if (r.corner === 'nw') { newW = Math.max(20, r.w - diag); newH = newW * aspect; newX = r.x + (r.w - newW); newY = r.y + (r.h - newH); }
            } else {
                if (r.corner === 'se') { newW = Math.max(20, r.w + dxPx); newH = Math.max(10, r.h + dyPx); }
                if (r.corner === 'sw') { newW = Math.max(20, r.w - dxPx); newH = Math.max(10, r.h + dyPx); newX = r.x + dxPx; }
                if (r.corner === 'ne') { newW = Math.max(20, r.w + dxPx); newH = Math.max(10, r.h - dyPx); newY = r.y + dyPx; }
                if (r.corner === 'nw') { newW = Math.max(20, r.w - dxPx); newH = Math.max(10, r.h - dyPx); newX = r.x + dxPx; newY = r.y + dyPx; }
            }

            onResize(newW, newH);
            // Move is only needed for nw/sw/ne corners
            if (r.corner !== 'se') onMove(Math.max(0, newX), Math.max(0, newY));
        };
        const handleUp = () => setIsResizing(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResizing, scale]);

    // ── Rotation ──────────────────────────────────────────────
    const handleRotateStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (element.locked) return;
        const { cx, cy } = getElementCenter();
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
        rotateRef.current = { startAngle, startRotation: element.rotation };
        setIsRotating(true);
    };

    useEffect(() => {
        if (!isRotating) return;
        const onMove = (e: MouseEvent) => {
            if (!rotateRef.current) return;
            const { cx, cy } = getElementCenter();
            const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
            let newRot = rotateRef.current.startRotation + (angle - rotateRef.current.startAngle);
            // Snap to multiples of 45° when within 5°
            const snaps = [0, 45, 90, 135, 180, -45, -90, -135, -180, 225, 270, 315, 360];
            for (const snap of snaps) {
                if (Math.abs(newRot - snap) < 5) { newRot = snap; break; }
            }
            setDisplayRotation(newRot);
            onRotate(newRot);
        };
        const onUp = () => setIsRotating(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRotating]);

    const displayX = element.x * scale;
    const displayY = element.y * scale;
    const displayW = element.width * scale;
    const displayH = element.height * scale;

    // Resize handle positions (outside the element boundary)
    const handleOffset = 6; // px outside element
    const handleSize = 14;   // px, large for easy grab

    const cornerHandles: Array<{
        corner: ResizeCorner;
        style: React.CSSProperties;
        cursor: string;
    }> = [
            { corner: 'nw', cursor: 'nw-resize', style: { top: -handleOffset, left: -handleOffset } },
            { corner: 'ne', cursor: 'ne-resize', style: { top: -handleOffset, right: -handleOffset } },
            { corner: 'sw', cursor: 'sw-resize', style: { bottom: -handleOffset, left: -handleOffset } },
            { corner: 'se', cursor: 'se-resize', style: { bottom: -handleOffset, right: -handleOffset } },
        ];

    return (
        <motion.div
            ref={containerRef}
            drag={isDraggable}
            dragMomentum={false}
            dragElastic={0}
            style={{
                position: 'absolute',
                left: displayX,
                top: displayY,
                width: displayW,
                height: displayH,
                x: dragX,
                y: dragY,
                rotate: element.rotation,
                opacity: element.opacity,
                cursor: element.locked ? 'not-allowed' : isChildEditing ? 'text' : isRotating ? 'alias' : 'grab',
                zIndex: element.zIndex,
                userSelect: 'none',
            }}
            onPointerDown={(e) => {
                if (isChildEditing) return;
                e.stopPropagation();
                onSelect();
            }}
            onDragEnd={(_, info) => {
                if (!element.locked) {
                    const newX = Math.max(0, Math.min(canvasWidth - element.width, element.x + info.offset.x / scale));
                    const newY = Math.max(0, Math.min(canvasHeight - element.height, element.y + info.offset.y / scale));
                    onMove(newX, newY);
                }
                dragX.set(0);
                dragY.set(0);
                onMoveEnd?.();
            }}
            className={`group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-0' : 'ring-1 ring-transparent hover:ring-blue-300'}`}
        >
            {children}

            {/* Control bar */}
            {isSelected && !isChildEditing && (
                <div
                    className="absolute -top-8 left-0 flex items-center gap-1 bg-blue-600 text-white rounded px-1.5 py-0.5 shadow-lg"
                    style={{ fontSize: 10, whiteSpace: 'nowrap', zIndex: 9999 }}
                >
                    <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className="hover:bg-blue-500 rounded p-0.5" title={element.locked ? 'Unlock' : 'Lock'}>
                        {element.locked ? <Lock size={11} /> : <Unlock size={11} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="hover:bg-blue-500 rounded p-0.5" title="Duplicate">
                        <Copy size={11} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="hover:bg-red-500 rounded p-0.5" title="Delete">
                        <Trash2 size={11} />
                    </button>
                    <span className="text-[9px] text-blue-200 ml-0.5 font-mono">
                        {Math.round(element.width)}×{Math.round(element.height)}
                        {element.rotation !== 0 && `  ${Math.round(displayRotation)}°`}
                    </span>
                </div>
            )}

            {/* Rotation handle */}
            {isSelected && !element.locked && !isChildEditing && (
                <>
                    {/* Stem */}
                    <div style={{
                        position: 'absolute', top: -52, left: '50%', width: 1, height: 44,
                        background: '#3b82f6', transform: 'translateX(-50%)',
                        pointerEvents: 'none', zIndex: 9998,
                    }} />
                    {/* Handle */}
                    <div
                        onMouseDown={handleRotateStart}
                        title={`Rotate (${Math.round(displayRotation)}°)`}
                        style={{
                            position: 'absolute', top: -68, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 22, height: 22,
                            background: isRotating ? '#1d4ed8' : '#2563eb',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'alias',
                            zIndex: 9999,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                            border: '2px solid white',
                        }}
                    >
                        <RotateCw size={11} color="white" />
                    </div>
                </>
            )}

            {/* 4 Corner resize handles */}
            {isSelected && !element.locked && !isChildEditing && cornerHandles.map(({ corner, cursor, style }) => (
                <div
                    key={corner}
                    onMouseDown={(e) => handleResizeStart(e, corner)}
                    style={{
                        position: 'absolute',
                        width: handleSize,
                        height: handleSize,
                        background: '#2563eb',
                        border: '2px solid white',
                        borderRadius: 3,
                        cursor,
                        zIndex: 9999,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        ...style,
                    }}
                />
            ))}
        </motion.div>
    );
}
