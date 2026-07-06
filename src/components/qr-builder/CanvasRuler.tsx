'use client';
import { useRef, useEffect, useCallback } from 'react';

interface CanvasRulerProps {
    canvasWidth: number;
    canvasHeight: number;
    scale: number;
    rulerSize?: number;
}

// ── Colour palette ───────────────────────────────────────────
const BG = '#0d0f1a';
const SEP = '#252838';
const TICK_XS = '#2a2e42';   // every 10
const TICK_SM = '#37405c';   // every 25
const TICK_MD = '#545e80';   // every 50
const TICK_LG = '#6e7fa8';   // every 100
const LABEL = '#8b97c0';   // normal number labels
const CENTER_CLR = '#f59e0b';   // amber — center mark
const CURSOR_CLR = '#3b82f6';   // blue  — mouse indicator
const ORIGIN_CLR = '#10b981';   // green — 0 origin

const FONT = (size: number, dpr: number) =>
    `bold ${size * dpr}px 'Inter', system-ui, sans-serif`;

// ── Horizontal ruler ─────────────────────────────────────────
function drawH(
    ctx: CanvasRenderingContext2D,
    cW: number,
    scale: number,
    rH: number,
    dpr: number,
    mouseX: number | null,
) {
    const W = cW * scale * dpr;
    const H = rH * dpr;
    const cx = cW / 2;          // center in logical px

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Bottom border
    ctx.fillStyle = SEP;
    ctx.fillRect(0, H - dpr, W, dpr);

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let lx = 0; lx <= cW; lx++) {
        if (lx % 10 !== 0) continue;
        const x = lx * scale * dpr;
        const is100 = lx % 100 === 0;
        const is50 = lx % 50 === 0 && !is100;
        const is25 = lx % 25 === 0 && lx % 50 !== 0;
        const isCenter = lx === cx;
        const isOrigin = lx === 0;

        let tickH: number;
        let color: string;

        if (isOrigin) { tickH = H; color = ORIGIN_CLR; }
        else if (isCenter) { tickH = H; color = CENTER_CLR; }
        else if (is100) { tickH = H * 0.65; color = TICK_LG; }
        else if (is50) { tickH = H * 0.50; color = TICK_MD; }
        else if (is25) { tickH = H * 0.35; color = TICK_SM; }
        else { tickH = H * 0.22; color = TICK_XS; }

        ctx.strokeStyle = color;
        ctx.lineWidth = isCenter || isOrigin ? 1.5 * dpr : dpr;
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x, H - tickH);
        ctx.stroke();

        // Labels
        if (isOrigin) {
            ctx.font = FONT(8, dpr);
            ctx.fillStyle = ORIGIN_CLR;
            ctx.fillText('0', x + 2 * dpr, 2 * dpr);
        } else if (isCenter) {
            const label = String(lx);
            ctx.font = FONT(8.5, dpr);
            ctx.fillStyle = CENTER_CLR;
            // Small pill background
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = CENTER_CLR;
            ctx.beginPath();
            ctx.roundRect(x - tw / 2 - 3 * dpr, 2 * dpr, tw + 6 * dpr, 12 * dpr, 2 * dpr);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, 3.5 * dpr);
            ctx.textAlign = 'left';
        } else if (is100 || is50) {
            ctx.font = FONT(7.5, dpr);
            ctx.fillStyle = LABEL;
            ctx.fillText(String(lx), x + 2 * dpr, 2 * dpr);
        }
    }

    // Mouse cursor line
    if (mouseX !== null) {
        const mx = mouseX * scale * dpr;
        ctx.strokeStyle = CURSOR_CLR;
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Coordinate badge
        const label = `${Math.round(mouseX)}`;
        ctx.font = FONT(7.5, dpr);
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = CURSOR_CLR;
        ctx.beginPath();
        ctx.roundRect(mx - tw / 2 - 3 * dpr, 2 * dpr, tw + 6 * dpr, 12 * dpr, 2 * dpr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, mx, 3.5 * dpr);
        ctx.textAlign = 'left';
    }
}

// ── Vertical ruler ───────────────────────────────────────────
function drawV(
    ctx: CanvasRenderingContext2D,
    cH: number,
    scale: number,
    rW: number,
    dpr: number,
    mouseY: number | null,
) {
    const H = cH * scale * dpr;
    const W = rW * dpr;
    const cy = cH / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Right border
    ctx.fillStyle = SEP;
    ctx.fillRect(W - dpr, 0, dpr, H);

    ctx.textBaseline = 'top';

    for (let ly = 0; ly <= cH; ly++) {
        if (ly % 10 !== 0) continue;
        const y = ly * scale * dpr;
        const is100 = ly % 100 === 0;
        const is50 = ly % 50 === 0 && !is100;
        const is25 = ly % 25 === 0 && ly % 50 !== 0;
        const isCenter = ly === cy;
        const isOrigin = ly === 0;

        let tickW: number;
        let color: string;

        if (isOrigin) { tickW = W; color = ORIGIN_CLR; }
        else if (isCenter) { tickW = W; color = CENTER_CLR; }
        else if (is100) { tickW = W * 0.65; color = TICK_LG; }
        else if (is50) { tickW = W * 0.50; color = TICK_MD; }
        else if (is25) { tickW = W * 0.35; color = TICK_SM; }
        else { tickW = W * 0.22; color = TICK_XS; }

        ctx.strokeStyle = color;
        ctx.lineWidth = isCenter || isOrigin ? 1.5 * dpr : dpr;
        ctx.beginPath();
        ctx.moveTo(W, y);
        ctx.lineTo(W - tickW, y);
        ctx.stroke();

        // Labels (rotated)
        if (isOrigin) {
            ctx.save();
            ctx.translate(W - 2 * dpr, y + 2 * dpr);
            ctx.rotate(-Math.PI / 2);
            ctx.font = FONT(7.5, dpr);
            ctx.fillStyle = ORIGIN_CLR;
            ctx.fillText('0', 0, 0);
            ctx.restore();
        } else if (isCenter) {
            const label = String(ly);
            ctx.font = FONT(7.5, dpr);
            const tw = ctx.measureText(label).width;
            ctx.fillStyle = CENTER_CLR;
            ctx.beginPath();
            ctx.roundRect(2 * dpr, y - 7 * dpr, W - 4 * dpr, 13 * dpr, 2 * dpr);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.save();
            ctx.translate(W / 2, y);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, 0, 0);
            ctx.restore();
            void tw;
        } else if (is100 || is50) {
            ctx.save();
            ctx.translate(W - 2 * dpr, y - 1 * dpr);
            ctx.rotate(-Math.PI / 2);
            ctx.font = FONT(7, dpr);
            ctx.fillStyle = LABEL;
            ctx.textAlign = 'right';
            ctx.fillText(String(ly), 0, 0);
            ctx.restore();
        }
    }

    // Mouse cursor line
    if (mouseY !== null) {
        const my = mouseY * scale * dpr;
        ctx.strokeStyle = CURSOR_CLR;
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(0, my);
        ctx.lineTo(W, my);
        ctx.stroke();
        ctx.setLineDash([]);

        const label = `${Math.round(mouseY)}`;
        ctx.font = FONT(7.5, dpr);
        ctx.fillStyle = CURSOR_CLR;
        ctx.beginPath();
        ctx.roundRect(2 * dpr, my - 7 * dpr, W - 4 * dpr, 13 * dpr, 2 * dpr);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.save();
        ctx.translate(W / 2, my);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }
}

// ── Component ─────────────────────────────────────────────────
export default function CanvasRuler({
    canvasWidth,
    canvasHeight,
    scale,
    rulerSize = 28,
}: CanvasRulerProps) {
    const hRef = useRef<HTMLCanvasElement>(null);
    const vRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const displayW = canvasWidth * scale;
    const displayH = canvasHeight * scale;

    const redrawH = useCallback(() => {
        const c = hRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        drawH(ctx, canvasWidth, scale, rulerSize, dpr, mouseRef.current.x);
    }, [canvasWidth, scale, rulerSize, dpr]);

    const redrawV = useCallback(() => {
        const c = vRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        drawV(ctx, canvasHeight, scale, rulerSize, dpr, mouseRef.current.y);
    }, [canvasHeight, scale, rulerSize, dpr]);

    useEffect(() => { redrawH(); }, [redrawH]);
    useEffect(() => { redrawV(); }, [redrawV]);

    const onMove = useCallback((e: MouseEvent) => {
        const hC = hRef.current;
        const vC = vRef.current;
        if (!hC || !vC) return;
        const hRect = hC.getBoundingClientRect();
        const vRect = vC.getBoundingClientRect();
        const logX = (e.clientX - hRect.left) / scale;
        const logY = (e.clientY - vRect.top) / scale;
        mouseRef.current = {
            x: logX >= 0 && logX <= canvasWidth ? logX : null,
            y: logY >= 0 && logY <= canvasHeight ? logY : null,
        };
        redrawH();
        redrawV();
    }, [scale, canvasWidth, canvasHeight, redrawH, redrawV]);

    const onLeave = useCallback(() => {
        mouseRef.current = { x: null, y: null };
        redrawH();
        redrawV();
    }, [redrawH, redrawV]);

    useEffect(() => {
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseleave', onLeave);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseleave', onLeave);
        };
    }, [onMove, onLeave]);

    return (
        <>
            {/* Corner square */}
            <div style={{
                position: 'absolute', top: 0, left: 0,
                width: rulerSize, height: rulerSize,
                background: BG,
                borderRight: `1px solid ${SEP}`,
                borderBottom: `1px solid ${SEP}`,
                zIndex: 202, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {/* Tiny crosshair icon */}
                <svg width={10} height={10} viewBox="0 0 10 10">
                    <line x1="5" y1="0" x2="5" y2="10" stroke={CENTER_CLR} strokeWidth="0.8" strokeDasharray="2,2" />
                    <line x1="0" y1="5" x2="10" y2="5" stroke={CENTER_CLR} strokeWidth="0.8" strokeDasharray="2,2" />
                    <circle cx="5" cy="5" r="1.5" fill={CENTER_CLR} />
                </svg>
            </div>

            {/* Horizontal ruler */}
            <div style={{
                position: 'absolute', top: 0, left: rulerSize,
                width: displayW, height: rulerSize,
                pointerEvents: 'none', zIndex: 201,
            }}>
                <canvas
                    ref={hRef}
                    width={Math.round(displayW * dpr)}
                    height={Math.round(rulerSize * dpr)}
                    style={{ width: displayW, height: rulerSize, display: 'block' }}
                />
            </div>

            {/* Vertical ruler */}
            <div style={{
                position: 'absolute', top: rulerSize, left: 0,
                width: rulerSize, height: displayH,
                pointerEvents: 'none', zIndex: 201,
            }}>
                <canvas
                    ref={vRef}
                    width={Math.round(rulerSize * dpr)}
                    height={Math.round(displayH * dpr)}
                    style={{ width: rulerSize, height: displayH, display: 'block' }}
                />
            </div>
        </>
    );
}
