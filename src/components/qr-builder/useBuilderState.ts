'use client';
import { useState, useCallback, useRef } from 'react';
import {
    BuilderState,
    DesignElement,
    BackgroundStyle,
    DEFAULT_BACKGROUND,
    DEFAULT_QR_ELEMENT,
    TextElement,
    ImageElement,
    SHADOW_PRESETS,
} from './types';
import { createStyledQRCodeCanvas } from '@/lib/qrCodeGenerator';
import jsPDF from 'jspdf';

const CANVAS_W = 400;
const CANVAS_H = 400;
const QR_PAGE_SIZE_MM = 60;

// ── ID generator ──────────────────────────────────────────────
let _idCounter = 0;
const genId = () => `el_${++_idCounter}_${Date.now()}`;

// ── Create default initial state ──────────────────────────────
const createInitialState = (outletName: string, tableURL: string): BuilderState => {
    const safeOutletName = (outletName || 'Dynleaf').trim() || 'Dynleaf';
    const qrId = genId();
    const headingId = genId();
    const subId = genId();
    const tableId = genId();

    return {
        outletName: safeOutletName,
        tableURL,
        canvasWidth: CANVAS_W,
        canvasHeight: CANVAS_H,
        selectedId: null,
        background: { ...DEFAULT_BACKGROUND },
        elements: [
            // QR Code (center)
            {
                ...DEFAULT_QR_ELEMENT,
                id: qrId,
                x: 100,
                y: 110,
                zIndex: 10,
            },
            // Heading text (restaurant name)
            {
                id: headingId,
                type: 'text',
                content: safeOutletName.toUpperCase(),
                x: 40,
                y: 50,
                width: 320,
                height: 36,
                rotation: 0,
                locked: false,
                zIndex: 20,
                opacity: 1,
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: '700',
                color: '#000000',
                textAlign: 'center',
                letterSpacing: 2,
                lineHeight: 1.2,
                textTransform: 'uppercase',
            } as TextElement,
            // Subtitle
            {
                id: subId,
                type: 'text',
                content: 'TAP OR SCAN OUR MENU',
                x: 40,
                y: 320,
                width: 320,
                height: 32,
                rotation: 0,
                locked: false,
                zIndex: 20,
                opacity: 1,
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: '700',
                color: '#000000',
                textAlign: 'center',
                letterSpacing: 2,
                lineHeight: 1.2,
                textTransform: 'uppercase',
            } as TextElement,
            // Table number placeholder
            {
                id: tableId,
                type: 'text',
                content: 'TABLE 1',
                x: 40,
                y: 358,
                width: 320,
                height: 28,
                rotation: 0,
                locked: false,
                zIndex: 20,
                opacity: 1,
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: '400',
                color: '#6b7280',
                textAlign: 'center',
                letterSpacing: 1,
                lineHeight: 1.2,
                textTransform: 'uppercase',
            } as TextElement,
        ],
    };
};

// ── Main hook ─────────────────────────────────────────────────
export function useBuilderState(outletName: string, tableURL: string) {
    const [state, setState] = useState<BuilderState>(() =>
        createInitialState(outletName, tableURL)
    );

    // Undo history
    const historyRef = useRef<BuilderState[]>([]);
    const pushHistory = useCallback((prev: BuilderState) => {
        historyRef.current = [...historyRef.current.slice(-29), prev];
    }, []);

    // ── Setters ────────────────────────────────────────────────

    const selectElement = useCallback((id: string | null) => {
        setState(s => ({ ...s, selectedId: id }));
    }, []);

    const updateBackground = useCallback((patch: Partial<BackgroundStyle>) => {
        setState(s => ({
            ...s,
            background: { ...s.background, ...patch },
        }));
    }, []);

    const updateElement = useCallback(<T extends DesignElement>(id: string, patch: Partial<T>) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el =>
                el.id === id ? { ...el, ...patch } as DesignElement : el
            ),
        }));
    }, []);

    const moveElement = useCallback((id: string, x: number, y: number) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el =>
                el.id === id ? { ...el, x, y } : el
            ),
        }));
    }, []);

    const resizeElement = useCallback((id: string, width: number, height: number) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el =>
                el.id === id ? { ...el, width, height } : el
            ),
        }));
    }, []);

    const rotateElement = useCallback((id: string, rotation: number) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el =>
                el.id === id ? { ...el, rotation } : el
            ),
        }));
    }, []);

    const addTextElement = useCallback(() => {
        const id = genId();
        const newEl: TextElement = {
            id,
            type: 'text',
            content: 'Your Text Here',
            x: 80,
            y: 180,
            width: 240,
            height: 40,
            rotation: 0,
            locked: false,
            zIndex: state.elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1,
            opacity: 1,
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
            textAlign: 'center',
            letterSpacing: 0,
            lineHeight: 1.4,
            textTransform: 'none',
        };
        pushHistory(state);
        setState(s => ({
            ...s,
            elements: [...s.elements, newEl],
            selectedId: id,
        }));
    }, [state, pushHistory]);

    const addImageElement = useCallback((src: string) => {
        const id = genId();
        const newEl: ImageElement = {
            id,
            type: 'image',
            src,
            x: 80,
            y: 80,
            width: 240,
            height: 120,
            rotation: 0,
            locked: false,
            zIndex: state.elements.reduce((m, e) => Math.max(m, e.zIndex), 0) + 1,
            opacity: 1,
            borderRadius: 0,
            objectFit: 'contain',
        };
        pushHistory(state);
        setState(s => ({ ...s, elements: [...s.elements, newEl], selectedId: id }));
    }, [state, pushHistory]);

    const deleteElement = useCallback((id: string) => {
        pushHistory(state);
        setState(s => ({
            ...s,
            elements: s.elements.filter(el => el.id !== id),
            selectedId: s.selectedId === id ? null : s.selectedId,
        }));
    }, [state, pushHistory]);

    const duplicateElement = useCallback((id: string) => {
        const el = state.elements.find(e => e.id === id);
        if (!el) return;
        const newEl: DesignElement = { ...el, id: genId(), x: el.x + 20, y: el.y + 20 };
        pushHistory(state);
        setState(s => ({ ...s, elements: [...s.elements, newEl], selectedId: newEl.id }));
    }, [state, pushHistory]);

    const toggleLock = useCallback((id: string) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(el =>
                el.id === id ? { ...el, locked: !el.locked } : el
            ),
        }));
    }, []);

    const bringForward = useCallback((id: string) => {
        setState(s => {
            const el = s.elements.find(e => e.id === id);
            if (!el) return s;
            return {
                ...s,
                elements: s.elements.map(e =>
                    e.id === id ? { ...e, zIndex: e.zIndex + 1 } : e
                ),
            };
        });
    }, []);

    const sendBackward = useCallback((id: string) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(e =>
                e.id === id ? { ...e, zIndex: Math.max(0, e.zIndex - 1) } : e
            ),
        }));
    }, []);

    const undo = useCallback(() => {
        const prev = historyRef.current.pop();
        if (prev) setState(prev);
    }, []);

    // ── NFC element ────────────────────────────────────────────
    const NFC_ID = 'nfc_element_singleton';

    const makeNFCSVG = (color: string) => {
        // NFC icon: 4 concentric curved arcs only — matches reference exactly )))) 
        const svg = [
            '<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" fill="none">',
            `<path d="M8,26 Q15,36 8,46" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`,
            `<path d="M20,18 Q30,36 20,54" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`,
            `<path d="M33,10 Q46,36 33,62" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`,
            `<path d="M47,1 Q62,36 47,71" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`,
            '</svg>',
        ].join('');
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    const hasNFC = state.elements.some(e => e.id === NFC_ID);

    const toggleNFC = useCallback(() => {
        const exists = state.elements.some(e => e.id === NFC_ID);
        if (exists) {
            pushHistory(state);
            setState(s => ({
                ...s,
                elements: s.elements.filter(e => e.id !== NFC_ID),
                selectedId: null,
            }));
        } else {
            const color = state.background.borderColor;
            const nfcEl: ImageElement = {
                id: NFC_ID,
                type: 'image',
                src: makeNFCSVG(color),
                x: CANVAS_W / 2 - 32,
                y: 8,
                width: 64,
                height: 72,
                rotation: 0,
                locked: false,
                zIndex: 50,
                opacity: 1,
                borderRadius: 0,
                objectFit: 'contain',
            };
            pushHistory(state);
            setState(s => ({ ...s, elements: [...s.elements, nfcEl], selectedId: NFC_ID }));
        }
    }, [state, pushHistory]);

    const updateNFCColor = useCallback((color: string) => {
        setState(s => ({
            ...s,
            elements: s.elements.map(e =>
                e.id === NFC_ID
                    ? { ...e, src: makeNFCSVG(color) } as DesignElement
                    : e
            ),
        }));
    }, []);

    // ── Export ─────────────────────────────────────────────────


    const renderToCanvas = useCallback(async (
        size: number,
        tableNumber?: number,
        tableURLOverride?: string
    ): Promise<HTMLCanvasElement | null> => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scale = size / state.canvasWidth;
        const { background, elements } = state;

        // ── Background: sharp outer corners, rounded inner edge ──
        const r = background.borderRadius * scale;
        const bw = background.borderWidth * scale;

        // 1. Fill entire canvas with border colour → sharp outer corners
        ctx.fillStyle = background.borderColor;
        ctx.fillRect(0, 0, size, size);

        // 2. Fill inner rounded rect with card background color
        const innerX = bw, innerY = bw;
        const innerW = size - bw * 2, innerH = size - bw * 2;

        if (background.useGradient) {
            const gx1 = background.gradientDirection.includes('right') ? innerX + innerW : innerX;
            const gy1 = background.gradientDirection.includes('bottom') ? innerY + innerH : innerY;
            const grad = ctx.createLinearGradient(innerX, innerY, gx1, gy1);
            grad.addColorStop(0, background.gradientColor1);
            grad.addColorStop(1, background.gradientColor2);
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = background.backgroundColor;
        }
        ctx.beginPath();
        ctx.roundRect(innerX, innerY, innerW, innerH, r);
        ctx.fill();


        // Scan corners — respects scanCornerMode, offsets, size from state
        if (background.showScanCorners) {
            const cSize = (background.scanCornerSize ?? 32) * scale;
            const offX = (background.scanCornerOffsetX ?? 12) * scale;
            const offY = (background.scanCornerOffsetY ?? 12) * scale;
            const cThick = (background.scanCornerThickness ?? 3) * scale;
            const bend = Math.max(0, Math.min(background.scanCornerBend ?? 10, background.scanCornerSize ?? 32)) * scale;

            // Determine corner frame position (same logic as BuilderCanvas)
            let frameLeft: number, frameTop: number, frameW: number, frameH: number;
            const qrEl = elements.find(e => e.type === 'qr');
            if ((background.scanCornerMode ?? 'qr') !== 'card' && qrEl) {
                frameLeft = qrEl.x * scale - offX;
                frameTop = qrEl.y * scale - offY;
                frameW = qrEl.width * scale + offX * 2;
                frameH = qrEl.height * scale + offY * 2;
            } else {
                frameLeft = offX;
                frameTop = offY;
                frameW = size - offX * 2;
                frameH = size - offY * 2;
            }

            ctx.strokeStyle = background.scanCornerColor;
            ctx.lineWidth = cThick;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'butt';

            // top-left
            ctx.beginPath();
            ctx.moveTo(frameLeft + cSize, frameTop);
            ctx.lineTo(frameLeft + bend, frameTop);
            ctx.quadraticCurveTo(frameLeft, frameTop, frameLeft, frameTop + bend);
            ctx.lineTo(frameLeft, frameTop + cSize);
            ctx.stroke();
            // top-right
            ctx.beginPath();
            ctx.moveTo(frameLeft + frameW - cSize, frameTop);
            ctx.lineTo(frameLeft + frameW - bend, frameTop);
            ctx.quadraticCurveTo(frameLeft + frameW, frameTop, frameLeft + frameW, frameTop + bend);
            ctx.lineTo(frameLeft + frameW, frameTop + cSize);
            ctx.stroke();
            // bottom-left
            ctx.beginPath();
            ctx.moveTo(frameLeft, frameTop + frameH - cSize);
            ctx.lineTo(frameLeft, frameTop + frameH - bend);
            ctx.quadraticCurveTo(frameLeft, frameTop + frameH, frameLeft + bend, frameTop + frameH);
            ctx.lineTo(frameLeft + cSize, frameTop + frameH);
            ctx.stroke();
            // bottom-right
            ctx.beginPath();
            ctx.moveTo(frameLeft + frameW - cSize, frameTop + frameH);
            ctx.lineTo(frameLeft + frameW - bend, frameTop + frameH);
            ctx.quadraticCurveTo(frameLeft + frameW, frameTop + frameH, frameLeft + frameW, frameTop + frameH - bend);
            ctx.lineTo(frameLeft + frameW, frameTop + frameH - cSize);
            ctx.stroke();
        }

        // ── Elements (sorted by zIndex) ─────────────────────────
        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

        for (const el of sorted) {
            const x = el.x * scale;
            const y = el.y * scale;
            const w = el.width * scale;
            const h = el.height * scale;

            ctx.save();
            ctx.globalAlpha = el.opacity;
            ctx.translate(x + w / 2, y + h / 2);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.translate(-(w / 2), -(h / 2));

            if (el.type === 'text') {
                // Replace TABLE N or ID label patterns in text
                let txt = el.content;
                if (tableNumber !== undefined) {
                    // Replace TABLE N with the appropriate label
                    txt = txt.replace(/TABLE\s*\d+/i, `TABLE ${tableNumber}`);
                    // Also replace generic id label patterns
                    txt = txt.replace(/\b[a-z]+\s+\d+$/i, (state as any)._currentIdLabel || `TABLE ${tableNumber}`);
                }
                const fontSize = el.fontSize * scale;
                const weight = el.fontWeight;
                ctx.font = `${weight} ${fontSize}px '${el.fontFamily}', Arial, sans-serif`;
                ctx.fillStyle = el.color;
                ctx.textAlign = el.textAlign as CanvasTextAlign;
                ctx.textBaseline = 'middle';
                ctx.letterSpacing = `${el.letterSpacing * scale}px`;
                const textX = el.textAlign === 'left' ? 0 : el.textAlign === 'right' ? w : w / 2;
                const display = el.textTransform === 'uppercase' ? txt.toUpperCase()
                    : el.textTransform === 'lowercase' ? txt.toLowerCase() : txt;
                ctx.fillText(display, textX, h / 2);

            } else if (el.type === 'image') {
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise<void>((res, rej) => {
                        img.onload = () => res();
                        img.onerror = () => rej();
                        img.src = el.src;
                    });
                    if (el.borderRadius > 0) {
                        ctx.beginPath();
                        ctx.roundRect(0, 0, w, h, el.borderRadius * scale);
                        ctx.clip();
                    }
                    ctx.drawImage(img, 0, 0, w, h);
                } catch {
                    /* skip if image fails */
                }

            } else if (el.type === 'qr') {
                const qrCanvas = await createStyledQRCodeCanvas({
                    text: tableURLOverride ?? state.tableURL,
                    size: Math.round(w),
                    padding: Math.round(el.padding * scale),
                    logoUrl: el.centerLogoUrl,
                    foregroundColor: el.fgColor,
                    backgroundColor: el.bgColor,
                    markerColor: el.cornerColor,
                });
                if (qrCanvas) {
                    // White background for QR area
                    ctx.fillStyle = el.bgColor;
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(qrCanvas, 0, 0, w, h);
                }
            }

            ctx.restore();
        }

        return canvas;
    }, [state]);

    const exportPNG = useCallback(async (outletName: string) => {
        const canvas = await renderToCanvas(2000);
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${outletName}-QR-branded.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [renderToCanvas]);

    const exportBulkPDF = useCallback(async (
        outletName: string,
        outletSlug: string,
        tableCount: number,
        subMenuSlug?: string,
        idPrefix: string = 'table',
        startFrom: number = 1
    ) => {
        const baseURL = 'https://www.dynleaf.com';

        const pageSizeMM = QR_PAGE_SIZE_MM;

        // Convert the card border colour (hex) to RGB so the PDF page background
        // matches it — any sub-pixel gap between pages won't appear black
        const borderHex = state.background.borderColor.replace('#', '');
        const bgR = parseInt(borderHex.substring(0, 2), 16);
        const bgG = parseInt(borderHex.substring(2, 4), 16);
        const bgB = parseInt(borderHex.substring(4, 6), 16);

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageSizeMM, pageSizeMM],
            compress: true,
        });

        for (let i = 0; i < tableCount; i++) {
            const currentNum = startFrom + i;
            // Each QR gets its own page
            if (i > 0) pdf.addPage([pageSizeMM, pageSizeMM]);

            // Paint page background with the card border colour
            pdf.setFillColor(bgR, bgG, bgB);
            pdf.rect(0, 0, pageSizeMM, pageSizeMM, 'F');

            const idValue = `${idPrefix}-${currentNum}`;
            const idLabel = `#${currentNum}`;

            let tableURLForTable = `${baseURL}/restaurant/${outletSlug}/menu?source=qr_scan&id=${encodeURIComponent(idValue)}`;
            if (subMenuSlug) {
                tableURLForTable += `&sm=${encodeURIComponent(subMenuSlug)}`;
            }

            // Temporarily set the current ID label for text replacement
            (state as any)._currentIdLabel = idLabel;

            const canvas = await renderToCanvas(2400, currentNum, tableURLForTable);
            if (!canvas) continue;

            const imgData = canvas.toDataURL('image/png');
            // Fill the entire page — no margins, no whitespace
            pdf.addImage(imgData, 'PNG', 0, 0, pageSizeMM, pageSizeMM);
        }

        // Clear temp label
        delete (state as any)._currentIdLabel;

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const endNum = startFrom + tableCount - 1;
        link.download = `${outletName}-QR-branded-${idPrefix}-${startFrom}-to-${endNum}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    }, [renderToCanvas, state.background.borderColor]);

    const exportDynamicBulkPDF = useCallback(async (
        title: string,
        entries: Array<{ label: string; qrUrl: string; displayLabel?: string | null }>,
        fileName?: string
    ) => {
        const pageSizeMM = QR_PAGE_SIZE_MM;
        const borderHex = state.background.borderColor.replace('#', '');
        const bgR = parseInt(borderHex.substring(0, 2), 16);
        const bgG = parseInt(borderHex.substring(2, 4), 16);
        const bgB = parseInt(borderHex.substring(4, 6), 16);

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageSizeMM, pageSizeMM],
            compress: true,
        });

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const displayLabel = String(entry.displayLabel || '').trim();
            if (i > 0) pdf.addPage([pageSizeMM, pageSizeMM]);

            pdf.setFillColor(bgR, bgG, bgB);
            pdf.rect(0, 0, pageSizeMM, pageSizeMM, 'F');

            if (displayLabel) {
                (state as any)._currentIdLabel = displayLabel;
            } else {
                delete (state as any)._currentIdLabel;
            }
            const canvas = await renderToCanvas(2400, displayLabel ? i + 1 : undefined, entry.qrUrl);
            if (!canvas) continue;

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageSizeMM, pageSizeMM);
        }

        delete (state as any)._currentIdLabel;

        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = (fileName || title || 'dynamic-qr-batch').replace(/[\\/:*?"<>|]+/g, '-').trim();
        link.download = `${safeTitle}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    }, [renderToCanvas, state.background.borderColor]);

    return {
        state,
        // Selection
        selectElement,
        // Background
        updateBackground,
        // Elements
        updateElement,
        moveElement,
        resizeElement,
        addTextElement,
        addImageElement,
        deleteElement,
        duplicateElement,
        toggleLock,
        bringForward,
        sendBackward,
        // History
        undo,
        canUndo: historyRef.current.length > 0,
        // NFC
        hasNFC,
        toggleNFC,
        updateNFCColor,
        // Rotation
        rotateElement,
        // Export
        exportPNG,
        exportBulkPDF,
        exportDynamicBulkPDF,
        renderToCanvas,
        // Derived
        selectedElement: state.elements.find(e => e.id === state.selectedId) ?? null,
        sortedElements: [...state.elements].sort((a, b) => a.zIndex - b.zIndex),
        shadowCSS: SHADOW_PRESETS[state.background.shadowDepth] ?? 'none',
    };
}

export type BuilderHook = ReturnType<typeof useBuilderState>;
