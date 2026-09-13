'use client';
import { useCallback, useRef, useState } from 'react';
import { BuilderHook } from './useBuilderState';
import { SHADOW_PRESETS, TextElement, QRElement, ImageElement, PreviewMode } from './types';
import DraggableElement from './DraggableElement';
import TextElementRenderer from './TextElementRenderer';
import QRElementRenderer from './QRElementRenderer';
import CanvasRuler from './CanvasRuler';

const CANVAS_DISPLAY_SIZE = 400;
const RULER_SIZE = 28;

interface BuilderCanvasProps {
    builder: BuilderHook;
    previewMode: PreviewMode;
    guidesEnabled?: boolean;
}

/** SVG scan corner brackets — sharp outer tips, rounded inner corners */
function ScanCorners({
    top, left, frameW, frameH, size, color, thick = 3, bend = 10,
}: {
    top: number; left: number; frameW: number; frameH: number;
    size: number; color: string; thick?: number; bend?: number;
}) {
    const r = frameW + left;   // right edge of frame
    const b = frameH + top;    // bottom edge of frame
    const L = size;             // arm length
    const radius = Math.max(0, Math.min(bend, L));

    const paths = [
        `M ${left + L},${top} L ${left + radius},${top} Q ${left},${top} ${left},${top + radius} L ${left},${top + L}`,
        `M ${r - L},${top} L ${r - radius},${top} Q ${r},${top} ${r},${top + radius} L ${r},${top + L}`,
        `M ${left},${b - L} L ${left},${b - radius} Q ${left},${b} ${left + radius},${b} L ${left + L},${b}`,
        `M ${r - L},${b} L ${r - radius},${b} Q ${r},${b} ${r},${b - radius} L ${r},${b - L}`,
    ];

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 100,
                overflow: 'visible',
            }}
        >
            {paths.map((d, i) => (
                <path
                    key={i}
                    d={d}
                    stroke={color}
                    strokeWidth={thick}
                    strokeLinejoin="round"
                    strokeLinecap="butt"
                    fill="none"
                />
            ))}
        </svg>
    );
}


// ── Spacing Overlay ──────────────────────────────────────────
// Shows L/R/T/B distances from selected element to canvas edges (Figma-style)
function SpacingOverlay({
    el, canvasWidth, canvasHeight, scale,
}: {
    el: { x: number; y: number; width: number; height: number };
    canvasWidth: number; canvasHeight: number; scale: number;
}) {
    const sx = el.x * scale;
    const sy = el.y * scale;
    const sw = el.width * scale;
    const sh = el.height * scale;
    const sCX = sx + sw / 2;   // element center X in display px
    const sCY = sy + sh / 2;   // element center Y in display px

    const leftPx   = Math.round(el.x);
    const rightPx  = Math.round(canvasWidth  - el.x - el.width);
    const topPx    = Math.round(el.y);
    const bottomPx = Math.round(canvasHeight - el.y - el.height);

    const lineColor  = 'rgba(217,70,239,0.75)';   // fuchsia
    const badgeBg    = 'rgba(168,85,247,0.92)';   // purple
    const minGap     = 2; // don't draw if essentially at the edge

    const Badge = ({ value, style }: { value: number; style: React.CSSProperties }) => (
        <span style={{
            position: 'absolute',
            background: badgeBg,
            color: '#fff',
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 4px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            lineHeight: 1.6,
            pointerEvents: 'none',
            letterSpacing: 0.3,
            ...style,
        }}>{value}px</span>
    );

    return (
        <>
            {/* Left gap: from x=0 to element left edge, at element center Y */}
            {leftPx > minGap && (
                <div style={{
                    position: 'absolute', pointerEvents: 'none', zIndex: 190,
                    top: sCY - 1, left: 0, width: sx, height: 2,
                    background: lineColor,
                    borderTop: `1px dashed rgba(217,70,239,0.9)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Badge value={leftPx} style={{ top: -9 }} />
                </div>
            )}

            {/* Right gap: from element right edge to canvas right, at element center Y */}
            {rightPx > minGap && (
                <div style={{
                    position: 'absolute', pointerEvents: 'none', zIndex: 190,
                    top: sCY - 1, left: sx + sw,
                    width: canvasWidth * scale - sx - sw,
                    height: 2,
                    background: lineColor,
                    borderTop: `1px dashed rgba(217,70,239,0.9)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Badge value={rightPx} style={{ top: -9 }} />
                </div>
            )}

            {/* Top gap: from y=0 to element top, at element center X */}
            {topPx > minGap && (
                <div style={{
                    position: 'absolute', pointerEvents: 'none', zIndex: 190,
                    left: sCX - 1, top: 0, width: 2, height: sy,
                    background: lineColor,
                    borderLeft: `1px dashed rgba(217,70,239,0.9)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                }}>
                    <Badge value={topPx} style={{ left: 4 }} />
                </div>
            )}

            {/* Bottom gap: from element bottom to canvas bottom, at element center X */}
            {bottomPx > minGap && (
                <div style={{
                    position: 'absolute', pointerEvents: 'none', zIndex: 190,
                    left: sCX - 1, top: sy + sh,
                    width: 2,
                    height: canvasHeight * scale - sy - sh,
                    background: lineColor,
                    borderLeft: `1px dashed rgba(217,70,239,0.9)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                }}>
                    <Badge value={bottomPx} style={{ left: 4 }} />
                </div>
            )}
        </>
    );
}


export default function BuilderCanvas({ builder, previewMode, guidesEnabled = true }: BuilderCanvasProps) {
    const {
        state, selectElement, moveElement, resizeElement, rotateElement,
        deleteElement, duplicateElement, toggleLock, updateElement, sortedElements,
    } = builder;
    const { background, selectedId, canvasWidth, canvasHeight } = state;

    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [guides, setGuides] = useState<{ h: boolean; v: boolean }>({ h: false, v: false });

    // Find selected element for spacing overlay
    const selectedEl = selectedId ? state.elements.find(e => e.id === selectedId) : null;

    const getDisplayDimensions = () => {
        const ratio = canvasHeight / canvasWidth;
        const w = CANVAS_DISPLAY_SIZE;
        const h = w * ratio;
        return { w, h };
    };
    const { w: displayW, h: displayH } = getDisplayDimensions();
    const scale = displayW / canvasWidth;

    const deselect = useCallback((e: React.PointerEvent) => {
        // Only deselect if the pointer landed directly on the canvas background,
        // not on a child element that forgot to stopPropagation
        if (e.target !== e.currentTarget) return;
        if (!editingElementId) selectElement(null);
    }, [selectElement, editingElementId]);

    // ── Card layout ─────────────────────────────────────────────
    // Outer = sharp corners (no borderRadius), filled with border colour
    // Inner = rounded inner edge (overflow:hidden + borderRadius)
    const shadow = SHADOW_PRESETS[background.shadowDepth] ?? 'none';
    const bw = background.borderWidth; // border thickness in display px

    const outerCSS: React.CSSProperties = {
        position: 'relative',
        width: displayW,
        height: displayH,
        backgroundColor: background.borderWidth > 0 ? background.borderColor : 'transparent',
        borderRadius: background.borderRadius,
        boxShadow: shadow,
        flexShrink: 0,
    };

    const innerBg: React.CSSProperties = background.backgroundImageUrl
        ? {
              backgroundImage: `url(${background.backgroundImageUrl})`,
              backgroundSize: '100% 100%', // Use 100% 100% since canvas matches image ratio exactly now
              backgroundPosition: 'center',
              backgroundColor: background.backgroundColor
          }
        : background.useGradient
            ? { background: `linear-gradient(${background.gradientDirection}, ${background.gradientColor1}, ${background.gradientColor2})` }
            : { backgroundColor: background.backgroundColor };

    const innerCSS: React.CSSProperties = {
        position: 'absolute',
        top: bw,
        left: bw,
        right: bw,
        bottom: bw,
        borderRadius: background.borderRadius,
        overflow: 'hidden',
        ...innerBg,
    };

    // ── Scan corner computation ─────────────────────────────────
    const qrEl = sortedElements.find(el => el.type === 'qr') as QRElement | undefined;
    const cSize = (background.scanCornerSize ?? 32) * scale;
    const offX = (background.scanCornerOffsetX ?? 12) * scale;
    const offY = (background.scanCornerOffsetY ?? 12) * scale;

    let cornerFrameTop: number, cornerFrameLeft: number, cornerFrameW: number, cornerFrameH: number;

    if (background.scanCornerMode !== 'card' && qrEl) {
        // "QR mode": frame tightly around the QR element with padding
        cornerFrameLeft = qrEl.x * scale - offX;
        cornerFrameTop = qrEl.y * scale - offY;
        cornerFrameW = qrEl.width * scale + offX * 2;
        cornerFrameH = qrEl.height * scale + offY * 2;
    } else {
        // "Card mode": frame the entire canvas with edge offset
        cornerFrameLeft = offX;
        cornerFrameTop = offY;
        cornerFrameW = displayW - offX * 2;
        cornerFrameH = displayH - offY * 2;
    }

    // ── Smart alignment guides ──────────────────────────────────
    // Bright red Canva-style guides — visible, labeled, with snap
    const guideBase: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 200,
        transition: 'opacity 80ms',
    };
    const centerGuideH: React.CSSProperties = {
        ...guideBase,
        top: displayH / 2 - 1,
        left: 0,
        width: '100%',
        height: 2,
        background: '#ef4444',
        boxShadow: '0 0 6px 2px rgba(239,68,68,0.55)',
        opacity: guides.h ? 1 : 0,
    };
    const centerGuideV: React.CSSProperties = {
        ...guideBase,
        left: displayW / 2 - 1,
        top: 0,
        width: 2,
        height: '100%',
        background: '#ef4444',
        boxShadow: '0 0 6px 2px rgba(239,68,68,0.55)',
        opacity: guides.v ? 1 : 0,
    };
    // Crosshair dot at dead-center when both guides are active
    const crosshairDot: React.CSSProperties = {
        ...guideBase,
        top: displayH / 2 - 6,
        left: displayW / 2 - 6,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#ef4444',
        border: '2px solid #fff',
        boxShadow: '0 0 8px 3px rgba(239,68,68,0.7)',
        opacity: guides.h && guides.v ? 1 : 0,
    };

    const wrapperStyle: React.CSSProperties = previewMode === 'stand' ? { perspective: 800 } : {};
    const innerStyle: React.CSSProperties = previewMode === 'stand' ? { transform: 'rotateX(18deg)', transformOrigin: 'bottom center' } : {};

    return (
        <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, ...wrapperStyle }}
            className="flex-1 bg-gray-100 min-h-0"
        >
            <div style={innerStyle}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* Canvas (offset by ruler strip) */}
                    <div style={{ marginLeft: RULER_SIZE, marginTop: RULER_SIZE, position: 'relative' }}>
                        {/* Card: sharp outer corners + rounded inner edge */}
                        <div style={outerCSS}>
                            <div style={innerCSS} onPointerDown={deselect}>
                                {/* Scan corners — auto-framing QR or card */}
                                {background.showScanCorners && (
                                    <ScanCorners
                                        top={cornerFrameTop}
                                        left={cornerFrameLeft}
                                        frameW={cornerFrameW}
                                        frameH={cornerFrameH}
                                        size={cSize}
                                        color={background.scanCornerColor}
                                        thick={background.scanCornerThickness ?? 3}
                                        bend={(background.scanCornerBend ?? 10) * scale}
                                    />
                                )}

                                {/* ── Alignment guides — Canva style ── */}
                                {/* Horizontal centre line */}
                                <div style={centerGuideH}>
                                    {guides.h && (
                                        <span style={{
                                            position: 'absolute', left: 4, top: -9,
                                            fontSize: 9, fontWeight: 700, color: '#fff',
                                            background: '#ef4444', padding: '1px 4px',
                                            borderRadius: 3, letterSpacing: 0.5,
                                            whiteSpace: 'nowrap', lineHeight: 1.4,
                                        }}>CENTER</span>
                                    )}
                                </div>
                                {/* Vertical centre line */}
                                <div style={centerGuideV}>
                                    {guides.v && (
                                        <span style={{
                                            position: 'absolute', top: 4, left: 3,
                                            fontSize: 9, fontWeight: 700, color: '#fff',
                                            background: '#ef4444', padding: '1px 4px',
                                            borderRadius: 3, letterSpacing: 0.5,
                                            whiteSpace: 'nowrap', lineHeight: 1.4,
                                            writingMode: 'vertical-rl',
                                        }}>CENTER</span>
                                    )}
                                </div>
                                {/* Crosshair dot — shown when both axes snap */}
                                <div style={crosshairDot} />

                                {/* Spacing overlay — shown when element is selected */}
                                {selectedEl && (
                                    <SpacingOverlay
                                        el={selectedEl}
                                        canvasWidth={canvasWidth}
                                        canvasHeight={canvasHeight}
                                        scale={scale}
                                    />
                                )}

                                {/* Design elements */}
                                {sortedElements.map((el) => {
                                    const isBeingEdited = editingElementId === el.id;
                                    return (
                                        <DraggableElement
                                            key={el.id}
                                            element={el}
                                            isSelected={selectedId === el.id}
                                            isChildEditing={isBeingEdited}
                                            lockAspectRatio={el.type === 'qr' || el.id === 'nfc_element_singleton'}
                                            scale={scale}
                                            canvasWidth={canvasWidth}
                                            canvasHeight={canvasHeight}
                                            onSelect={() => selectElement(el.id)}
                                            onMove={(x, y) => {
                                                if (!guidesEnabled) {
                                                    moveElement(el.id, x, y);
                                                    return;
                                                }
                                                const cx = canvasWidth / 2, cy = canvasHeight / 2;
                                                const elCX = x + el.width / 2, elCY = y + el.height / 2;
                                                const snapThreshold = 2;
                                                const snapH = Math.abs(elCY - cy) < snapThreshold;
                                                const snapV = Math.abs(elCX - cx) < snapThreshold;
                                                setGuides({ h: snapH, v: snapV });
                                                const snapX = snapV ? cx - el.width / 2 : x;
                                                const snapY = snapH ? cy - el.height / 2 : y;
                                                moveElement(el.id, snapX, snapY);
                                            }}
                                            onMoveEnd={() => setGuides({ h: false, v: false })}
                                            onResize={(w, h) => {
                                                if (el.type === 'qr') {
                                                    // Keep QR code square — use the larger dimension
                                                    const size = Math.max(w, h);
                                                    resizeElement(el.id, size, size);
                                                } else {
                                                    resizeElement(el.id, w, h);
                                                }
                                            }}
                                            onRotate={(angle) => rotateElement(el.id, angle)}
                                            onDelete={() => deleteElement(el.id)}
                                            onDuplicate={() => duplicateElement(el.id)}
                                            onToggleLock={() => toggleLock(el.id)}
                                        >
                                            {el.type === 'text' && (
                                                <TextElementRenderer
                                                    element={el as TextElement}
                                                    isSelected={selectedId === el.id}
                                                    scale={scale}
                                                    onContentChange={(content: string) => updateElement<TextElement>(el.id, { content })}
                                                    onEditingChange={(isEditing: boolean) => setEditingElementId(isEditing ? el.id : null)}
                                                />
                                            )}
                                            {el.type === 'qr' && (
                                                <QRElementRenderer
                                                    element={el as QRElement}
                                                    tableURL={state.tableURL}
                                                    displayW={el.width * scale}
                                                    displayH={el.height * scale}
                                                />
                                            )}
                                            {el.type === 'image' && (
                                                <img
                                                    src={(el as ImageElement).src}
                                                    alt="element"
                                                    style={{
                                                        width: '100%', height: '100%',
                                                        objectFit: (el as ImageElement).objectFit,
                                                        borderRadius: (el as ImageElement).borderRadius,
                                                        display: 'block', pointerEvents: 'none',
                                                    }}
                                                    draggable={false}
                                                />
                                            )}
                                        </DraggableElement>
                                    );
                                })}

                                {/* ── Item Number Badge (draggable preview) ── */}
                                {background.showItemNumber && (() => {
                                    const num = String(background.itemNumberStart ?? 1).padStart(4, '0');
                                    const fs = (background.itemNumberFontSize ?? 11) * scale;
                                    const padX = (background.itemNumberPadding ?? 8) * scale;
                                    const padY = padX * 0.5;
                                    const br = (background.itemNumberBorderRadius ?? 4) * scale;
                                    const bw = (background.borderWidth ?? 0) * scale;

                                    // Position: use stored coords or default to bottom-right
                                    const hasPos = background.itemNumberX !== undefined && background.itemNumberY !== undefined;
                                    const badgeLeft = hasPos
                                        ? (background.itemNumberX! * scale)
                                        : undefined;
                                    const badgeTop = hasPos
                                        ? (background.itemNumberY! * scale)
                                        : undefined;
                                    const badgeRight = hasPos ? undefined : bw + 6 * scale;
                                    const badgeBottom = hasPos ? undefined : bw + 6 * scale;

                                    return (
                                        <div
                                            title="Drag to reposition"
                                            style={{
                                                position: 'absolute',
                                                left: badgeLeft,
                                                top: badgeTop,
                                                right: badgeRight,
                                                bottom: badgeBottom,
                                                background: background.itemNumberBgColor ?? '#000',
                                                color: background.itemNumberTextColor ?? '#fff',
                                                fontSize: fs,
                                                fontFamily: 'monospace',
                                                fontWeight: 700,
                                                padding: `${padY}px ${padX}px`,
                                                borderRadius: br,
                                                letterSpacing: 1,
                                                lineHeight: 1.4,
                                                pointerEvents: 'auto',
                                                zIndex: 300,
                                                userSelect: 'none',
                                                whiteSpace: 'nowrap',
                                                cursor: 'move',
                                                touchAction: 'none',
                                                outline: '2px dashed transparent',
                                                transition: 'outline-color 120ms',
                                            }}
                                            onPointerEnter={e => {
                                                (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(59,130,246,0.7)';
                                            }}
                                            onPointerLeave={e => {
                                                (e.currentTarget as HTMLElement).style.outlineColor = 'transparent';
                                            }}
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                const el = e.currentTarget as HTMLElement;
                                                el.setPointerCapture(e.pointerId);
                                                el.style.outlineColor = 'rgba(59,130,246,0.9)';

                                                // Compute current canvas position of badge top-left
                                                const parentRect = el.parentElement!.getBoundingClientRect();
                                                const elRect = el.getBoundingClientRect();
                                                const startCanvasX = (elRect.left - parentRect.left) / scale;
                                                const startCanvasY = (elRect.top - parentRect.top) / scale;
                                                const startClientX = e.clientX;
                                                const startClientY = e.clientY;

                                                const onMove = (ev: PointerEvent) => {
                                                    const dx = (ev.clientX - startClientX) / scale;
                                                    const dy = (ev.clientY - startClientY) / scale;
                                                    const newX = Math.max(0, Math.min(canvasWidth - 40, startCanvasX + dx));
                                                    const newY = Math.max(0, Math.min(canvasHeight - 20, startCanvasY + dy));
                                                    builder.updateBackground({
                                                        itemNumberX: Math.round(newX),
                                                        itemNumberY: Math.round(newY),
                                                    });
                                                };
                                                const onUp = () => {
                                                    el.style.outlineColor = 'transparent';
                                                    el.removeEventListener('pointermove', onMove);
                                                    el.removeEventListener('pointerup', onUp);
                                                };
                                                el.addEventListener('pointermove', onMove);
                                                el.addEventListener('pointerup', onUp);
                                            }}
                                            onDoubleClick={() => {
                                                // Double-click resets to auto bottom-right
                                                builder.updateBackground({ itemNumberX: undefined, itemNumberY: undefined });
                                            }}
                                        >
                                            {num}
                                        </div>
                                    );
                                })()}

                            </div>
                        </div>
                    </div>

                    {/* Rulers */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: displayW + RULER_SIZE, height: displayH + RULER_SIZE, pointerEvents: 'none' }}>
                        <CanvasRuler canvasWidth={canvasWidth} canvasHeight={canvasHeight} scale={scale} rulerSize={RULER_SIZE} />
                    </div>
                </div>

                {/* Stand base */}
                {previewMode === 'stand' && (
                    <div style={{
                        width: displayW + RULER_SIZE + 40, height: 16,
                        background: 'linear-gradient(to right, #d1d5db, #9ca3af, #d1d5db)',
                        borderRadius: '0 0 50% 50%', marginLeft: -20,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    }} />
                )}
            </div>
        </div>
    );
}
