'use client';

import { useState, useRef, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    ArrowLeft, Upload, LayoutTemplate, Loader2,
    Download, FileText, Trash2, Bold, Italic,
    User, Image as ImageIcon, ChevronLeft, ChevronRight,
    QrCode
} from 'lucide-react';
import api from '@/lib/api';
import type { IOnboardingRecord, CanvasField } from '@/types/onboarding.types';
import { FIELD_REGISTRY } from '@/types/onboarding.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const MM_TO_PX_RENDER = 23.622; // 600 DPI for extremely crisp print quality

interface ITemplate {
    _id: string;
    name: string;
    cardW: number;
    cardH: number;
    frontFields: CanvasField[];
    backFields: CanvasField[];
}

const CARD_PRESETS = [
    { label: 'ID Card — CR80  (85.6 × 54 mm)',  w: 85.6, h: 54  },
    { label: 'A6  (148 × 105 mm)',               w: 148,  h: 105 },
    { label: 'A5  (210 × 148 mm)',               w: 210,  h: 148 },
    { label: 'A4  (297 × 210 mm)',               w: 297,  h: 210 },
];

// ── Render one card to offscreen canvas at 300 DPI ────────────────────────────

async function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
    });
}

async function fetchProxyImage(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    try {
        const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        if (json.dataUrl) return json.dataUrl;
    } catch {}
    return url; // fallback
}

async function renderCardToCanvas(opts: {
    templateDataUrl: string | null;
    fields: CanvasField[];
    record: IOnboardingRecord;
    widthPx: number;
    heightPx: number;
    previewW: number;
}): Promise<HTMLCanvasElement> {
    const { templateDataUrl, fields, record, widthPx, heightPx, previewW } = opts;
    const c = document.createElement('canvas');
    c.width  = widthPx;
    c.height = heightPx;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    if (templateDataUrl) {
        try { const img = await loadImg(templateDataUrl); ctx.drawImage(img, 0, 0, widthPx, heightPx); } catch {}
    }

    for (const field of fields) {
        const x = (field.xPct / 100) * widthPx;
        const y = (field.yPct / 100) * heightPx;

        if (field.type === 'image') {
            const w = ((field.widthPct  ?? 20) / 100) * widthPx;
            const h = ((field.heightPct ?? 20) / 100) * heightPx;
            const brPct = field.borderRadius ?? 0;
            const brPx = Math.min(w, h) * (brPct / 100);
            
            const url = record[field.fieldKey] as string | undefined | null;
            
            ctx.save();
            ctx.beginPath();
            if (brPx > 0 && typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, w, h, brPx);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.clip();

            if (url) {
                try {
                    const proxiedUrl = await fetchProxyImage(url);
                    const img = await loadImg(proxiedUrl);
                    ctx.drawImage(img, x, y, w, h);
                } catch {
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = '#cbd5e1';
                ctx.fill();
            }
            ctx.restore();
        } else if (field.type === 'qrcode') {
            const w = ((field.widthPct  ?? 20) / 100) * widthPx;
            const h = ((field.heightPct ?? 20) / 100) * heightPx;
            const value = record[field.fieldKey] as string | undefined | null;
            if (value) {
                try {
                    const qrcode = (await import('qrcode')).default;
                    const qrColor = field.color ?? '#000000';
                    const qrDataUrl = await qrcode.toDataURL(value, { margin: 1, color: { dark: qrColor, light: '#ffffff00' } });
                    const img = await loadImg(qrDataUrl);
                    ctx.drawImage(img, x, y, w, h);
                } catch {
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fillRect(x, y, w, h);
                }
            } else {
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(x, y, w, h);
            }
        } else {
            const fs   = (field.fontSize ?? 16) * (widthPx / previewW); // perfectly scale to match preview
            const wt   = field.bold   ? 'bold'   : 'normal';
            const st   = field.italic ? 'italic' : 'normal';
            ctx.font          = `${st} ${wt} ${fs}px "${field.fontFamily ?? 'Arial'}", sans-serif`;
            ctx.fillStyle     = field.color ?? '#000000';
            ctx.textBaseline  = 'top';
            const value = field.overrideText || record[field.fieldKey];
            ctx.fillText(String(value ?? ''), x, y);
        }
    }
    return c;
}

// ── QR Code Component for Live Preview ────────────────────────────────────────

function QRCodePreview({ text, color = '#000000' }: { text: string; color?: string }) {
    const [src, setSrc] = useState<string>('');
    
    useEffect(() => {
        if (!text) { setSrc(''); return; }
        import('qrcode').then(m => m.default.toDataURL(text, { margin: 1, color: { dark: color, light: '#ffffff00' } }))
            .then(setSrc).catch(() => setSrc(''));
    }, [text, color]);
    
    if (!src) return <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={20} color="#94a3b8" /></div>;
    return <img src={src} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', display: 'block' }} />;
}

// ── Builder ───────────────────────────────────────────────────────────────────

function BuilderInner() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);

    // ── Card size (mm) ─────────────────────────────────────────────────────────
    const [cardW, setCardW] = useState(85.6);
    const [cardH, setCardH] = useState(54);
    const [customW, setCustomW] = useState('85.6');
    const [customH, setCustomH] = useState('54');

    // ── Templates (stored as dataURL for preview + render) ─────────────────────
    const [frontDataUrl, setFrontDataUrl] = useState<string | null>(null);
    const [backDataUrl,  setBackDataUrl]  = useState<string | null>(null);
    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef  = useRef<HTMLInputElement>(null);

    // ── Side ───────────────────────────────────────────────────────────────────
    const [side, setSide] = useState<'front' | 'back'>('front');

    // ── Fields per side ────────────────────────────────────────────────────────
    const [frontFields, setFrontFields] = useState<CanvasField[]>([]);
    const [backFields,  setBackFields]  = useState<CanvasField[]>([]);
    const currentFields    = side === 'front' ? frontFields : backFields;
    const setCurrentFields = (side === 'front' ? setFrontFields : setBackFields) as React.Dispatch<React.SetStateAction<CanvasField[]>>;

    // ── Selection ──────────────────────────────────────────────────────────────
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedField = currentFields.find(f => f.id === selectedId) ?? null;

    // ── Preview person ─────────────────────────────────────────────────────────
    const [previewIdx, setPreviewIdx] = useState(0);

    // ── Card container ref (for drag calculations) ─────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Dragging from toolbox ──────────────────────────────────────────────────
    const [draggingKey, setDraggingKey] = useState<string | null>(null);

    // ── Template Save Modal ────────────────────────────────────────────────────
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // ── Download state ─────────────────────────────────────────────────────────
    const [isDownloading, setIsDownloading] = useState(false);

    // ── Fetch records ──────────────────────────────────────────────────────────
    const { data: records = [], isLoading } = useQuery<IOnboardingRecord[]>({
        queryKey: ['builder-records', ids.join(',')],
        queryFn: async () => {
            const res = await api.post<{ data: { records: IOnboardingRecord[] } }>(
                '/admin/onboarding/by-ids', { ids }
            );
            return res.data.data.records;
        },
        enabled: ids.length > 0,
    });

    const previewRecord = records[previewIdx] ?? null;

    const markDownloaded = useMutation({
        mutationFn: async () =>
            api.patch('/admin/onboarding/mark-downloaded', { ids: records.map(r => r._id) }),
    });

    // ── Templates Query & Mutation ─────────────────────────────────────────────
    const { data: templates = [], refetch: refetchTemplates } = useQuery<ITemplate[]>({
        queryKey: ['id-card-templates'],
        queryFn: async () => {
            const res = await api.get<{ data: ITemplate[] }>('/admin/onboarding/templates');
            return res.data.data;
        }
    });

    const saveTemplate = useMutation({
        mutationFn: async (name: string) => {
            await api.post('/admin/onboarding/templates', {
                name, cardW, cardH, frontFields, backFields
            });
        },
        onSuccess: () => {
            refetchTemplates();
            setIsSaveModalOpen(false);
            setTemplateName('');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to save template');
        }
    });

    const applyTemplate = (t: ITemplate) => {
        setCardW(t.cardW);
        setCardH(t.cardH);
        setCustomW(String(t.cardW));
        setCustomH(String(t.cardH));
        // Remap ids to prevent key collisions if we load multiple times
        setFrontFields(t.frontFields.map(f => ({ ...f, id: uid() })));
        setBackFields(t.backFields.map(f => ({ ...f, id: uid() })));
        setSelectedId(null);
    };

    // ── Template upload (background image) ─────────────────────────────────────
    const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>, which: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const url = ev.target?.result as string;
            if (which === 'front') setFrontDataUrl(url);
            else setBackDataUrl(url);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // ── Drop from toolbox ──────────────────────────────────────────────────────
    const handleCardDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!draggingKey) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width)  * 100;
        const yPct = ((e.clientY - rect.top)  / rect.height) * 100;

        const fieldDef = FIELD_REGISTRY.find(f => f.key === draggingKey);
        if (!fieldDef) return;

        const existing = currentFields.find(f => f.fieldKey === draggingKey);
        if (existing) {
            setCurrentFields(prev => prev.map(f =>
                f.fieldKey === draggingKey ? { ...f, xPct, yPct } : f
            ));
            setSelectedId(existing.id);
        } else {
            const nf: CanvasField = {
                id: uid(), type: fieldDef.type, fieldKey: fieldDef.key, label: fieldDef.label,
                xPct, yPct,
                fontSize: 16, fontFamily: 'Arial', color: '#000000', bold: false, italic: false,
                widthPct: 20, heightPct: 20,
            };
            setCurrentFields(prev => [...prev, nf]);
            setSelectedId(nf.id);
        }
        setDraggingKey(null);
    };

    // ── Drag placed field to reposition ────────────────────────────────────────
    const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(fieldId);

        const container = containerRef.current;
        if (!container) return;
        const rect     = container.getBoundingClientRect();
        const field    = currentFields.find(f => f.id === fieldId)!;
        const startX   = e.clientX;
        const startY   = e.clientY;
        const origXPct = field.xPct;
        const origYPct = field.yPct;

        const onMove = (ev: MouseEvent) => {
            const dx = ((ev.clientX - startX) / rect.width)  * 100;
            const dy = ((ev.clientY - startY) / rect.height) * 100;
            setCurrentFields(prev => prev.map(f =>
                f.id === fieldId
                    ? { ...f, xPct: Math.max(0, Math.min(95, origXPct + dx)), yPct: Math.max(0, Math.min(95, origYPct + dy)) }
                    : f
            ));
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    };

    // ── Drag to resize (bottom-right corner) ──────────────────────────────────
    const handleResizeMouseDown = (e: React.MouseEvent, fieldId: string, type: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(fieldId);

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const field = currentFields.find(f => f.id === fieldId)!;
        
        const startX = e.clientX;
        const startY = e.clientY;
        
        const origW = field.widthPct ?? 20;
        const origH = field.heightPct ?? 20;
        const origFs = field.fontSize ?? 16;
        
        const currentAspect = cardW / cardH;

        const onMove = (ev: MouseEvent) => {
            const dx = ((ev.clientX - startX) / rect.width) * 100;
            const dy = ((ev.clientY - startY) / rect.height) * 100;
            
            if (type === 'image' || type === 'qrcode') {
                let newW = Math.max(2, origW + dx);
                let newH = Math.max(2, origH + dy);
                
                if (type === 'qrcode') {
                    newH = newW * currentAspect;
                }
                
                updateField(fieldId, { widthPct: newW, heightPct: newH });
            } else {
                const dist = (dx + dy) / 1.5; 
                const newFs = Math.max(4, Math.min(200, origFs + dist));
                updateField(fieldId, { fontSize: Math.round(newFs) });
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    // ── Field property update ──────────────────────────────────────────────────
    const updateField = (id: string, patch: Partial<CanvasField>) =>
        setCurrentFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

    const removeField = (id: string) => {
        setCurrentFields(prev => prev.filter(f => f.id !== id));
        setSelectedId(null);
    };

    // ── Card display size (scaled to fit center panel) ─────────────────────────
    const MAX_W = 740, MAX_H = 500;
    const aspect = cardW / cardH;
    
    // Always maximize preview size for easy editing
    let displayW = MAX_W;
    let displayH = displayW / aspect;
    if (displayH > MAX_H) { 
        displayH = MAX_H; 
        displayW = displayH * aspect; 
    }

    // ── Download helpers ───────────────────────────────────────────────────────
    const renderW = Math.round(cardW * MM_TO_PX_RENDER);
    const renderH = Math.round(cardH * MM_TO_PX_RENDER);

    const buildAll = async () => {
        const out: { record: IOnboardingRecord; fc: HTMLCanvasElement; bc: HTMLCanvasElement }[] = [];
        for (const record of records) {
            const fc = await renderCardToCanvas({ templateDataUrl: frontDataUrl, fields: frontFields, record, widthPx: renderW, heightPx: renderH, previewW: displayW });
            const bc = await renderCardToCanvas({ templateDataUrl: backDataUrl,  fields: backFields,  record, widthPx: renderW, heightPx: renderH, previewW: displayW });
            out.push({ record, fc, bc });
        }
        return out;
    };

    const handleZip = async () => {
        setIsDownloading(true);
        try {
            const cards = await buildAll();
            const zip   = new JSZip();
            for (const { record, fc, bc } of cards) {
                const n = (record.registration_no || record.name || record._id).replace(/[^a-z0-9]/gi, '_');
                const fb: Blob = await new Promise(r => fc.toBlob(b => r(b!), 'image/png'));
                const bb: Blob = await new Promise(r => bc.toBlob(b => r(b!), 'image/png'));
                zip.file(`${n}_front.png`, fb);
                zip.file(`${n}_back.png`,  bb);
            }
            saveAs(await zip.generateAsync({ type: 'blob' }), `id-cards-${new Date().toISOString().slice(0, 10)}.zip`);
            await markDownloaded.mutateAsync();
        } finally { setIsDownloading(false); }
    };

    const handlePdf = async () => {
        setIsDownloading(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const cards = await buildAll();
            const orientation = cardW >= cardH ? 'landscape' : 'portrait';
            const doc = new jsPDF({ orientation, unit: 'mm', format: [cardW, cardH] });
            let first = true;
            for (const { fc, bc } of cards) {
                if (!first) doc.addPage([cardW, cardH] as any, orientation);
                first = false;
                doc.addImage(fc.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
                doc.addPage([cardW, cardH] as any, orientation);
                doc.addImage(bc.toDataURL('image/png'), 'PNG', 0, 0, cardW, cardH);
            }
            doc.save(`id-cards-${new Date().toISOString().slice(0, 10)}.pdf`);
            await markDownloaded.mutateAsync();
        } finally { setIsDownloading(false); }
    };

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (!ids.length) return (
        <div className="flex items-center justify-center h-screen bg-[#0b1120] text-slate-400 flex-col gap-4">
            <p>No records selected.</p>
            <button onClick={() => router.back()} className="btn btn-sm border border-slate-700 text-slate-300 px-4 h-8">← Back</button>
        </div>
    );

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-[#0b1120]">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
    );

    const currentTemplateUrl = side === 'front' ? frontDataUrl : backDataUrl;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-[#070e1a] flex flex-col z-50 overflow-hidden">

            {/* ── Top Bar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-[#0d1424] shrink-0 gap-2 flex-wrap">

                {/* Back + title */}
                <div className="flex items-center gap-3 pr-2 border-r border-[#334155]/50">
                    <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
                        <ArrowLeft size={17} />
                    </button>
                    <div>
                        <h1 className="text-white font-semibold text-sm leading-tight">ID Card Builder</h1>
                        <p className="text-slate-500 text-xs">{records.length === 1 ? records[0]?.name : `${records.length} people`}</p>
                    </div>
                </div>

                {/* Templates (Saved Alignments) */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-medium uppercase tracking-wide hidden lg:block">Saved Layouts:</span>
                    <select
                        className="bg-[#1e293b] text-slate-200 border border-[#334155] rounded-md px-2 py-1.5 text-xs max-w-[140px] truncate"
                        onChange={e => {
                            if (!e.target.value) return;
                            const t = templates.find(temp => temp._id === e.target.value);
                            if (t) applyTemplate(t);
                            e.target.value = ''; // Reset select so same can be loaded again
                        }}
                    >
                        <option value="">-- Load Layout --</option>
                        {templates.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => {
                            setTemplateName('');
                            setIsSaveModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                        Save Current
                    </button>
                </div>

                {/* Card size */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs hidden md:block">Size:</span>
                    <select
                        className="bg-[#1e293b] text-slate-200 border border-[#334155] rounded-md px-2 py-1.5 text-xs"
                        onChange={e => {
                            const p = CARD_PRESETS[Number(e.target.value)];
                            if (!p) return;
                            setCardW(p.w); setCardH(p.h);
                            setCustomW(String(p.w)); setCustomH(String(p.h));
                        }}
                    >
                        {CARD_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                    </select>
                    <input type="number" value={customW}
                        onChange={e => { setCustomW(e.target.value); setCardW(Number(e.target.value) || 85.6); }}
                        className="w-[60px] bg-[#1e293b] text-slate-200 border border-[#334155] rounded-md px-2 py-1.5 text-xs text-center" placeholder="W" />
                    <span className="text-slate-500 text-xs">×</span>
                    <input type="number" value={customH}
                        onChange={e => { setCustomH(e.target.value); setCardH(Number(e.target.value) || 54); }}
                        className="w-[60px] bg-[#1e293b] text-slate-200 border border-[#334155] rounded-md px-2 py-1.5 text-xs text-center" placeholder="H" />
                    <span className="text-slate-500 text-[10px]">mm</span>
                </div>

                {/* Side toggle */}
                <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1">
                    {(['front', 'back'] as const).map(s => (
                        <button key={s} onClick={() => setSide(s)}
                            className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${side === s ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                            {s === 'front' ? 'Front' : 'Back'}
                        </button>
                    ))}
                </div>

                {/* Download */}
                <div className="flex items-center gap-2">
                    <button onClick={handleZip} disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] disabled:opacity-50 transition-colors">
                        {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} ZIP
                    </button>
                    <button onClick={handlePdf} disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-colors">
                        {isDownloading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} PDF
                    </button>
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0">

                {/* ── Left panel ───────────────────────────────────────────── */}
                <div className="w-[260px] shrink-0 border-r border-white/8 bg-[#0d1424] flex flex-col overflow-y-auto">

                    {/* Template upload */}
                    <div className="p-4 border-b border-white/8">
                        <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-3">Templates</p>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => frontInputRef.current?.click()}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border transition-colors ${frontDataUrl ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}>
                                <Upload size={12} />
                                {frontDataUrl ? '✓ Front uploaded' : 'Upload Front Image'}
                            </button>
                            <button onClick={() => backInputRef.current?.click()}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs border transition-colors ${backDataUrl ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}>
                                <Upload size={12} />
                                {backDataUrl ? '✓ Back uploaded' : 'Upload Back Image'}
                            </button>
                        </div>
                        <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleTemplateUpload(e, 'front')} />
                        <input ref={backInputRef}  type="file" accept="image/*" className="hidden" onChange={e => handleTemplateUpload(e, 'back')} />
                    </div>

                    {/* Field chips */}
                    <div className="p-4 border-b border-white/8">
                        <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider mb-1">Fields</p>
                        <p className="text-slate-600 text-[10px] mb-3">Drag onto card • click placed field to edit</p>
                        <div className="flex flex-col gap-1.5">
                            {FIELD_REGISTRY.map(field => {
                                const placed = currentFields.some(f => f.fieldKey === field.key);
                                return (
                                    <div
                                        key={field.key as string}
                                        draggable
                                        onDragStart={() => setDraggingKey(field.key as string)}
                                        onClick={() => {
                                            if (placed) {
                                                const f = currentFields.find(cf => cf.fieldKey === field.key);
                                                if (f) setSelectedId(f.id);
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs select-none transition-all border ${
                                            placed
                                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 cursor-pointer'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8 hover:border-white/15 cursor-grab active:cursor-grabbing'
                                        }`}
                                    >
                                        {field.type === 'image' ? <ImageIcon size={11} /> : field.type === 'qrcode' ? <QrCode size={11} /> : <LayoutTemplate size={11} />}
                                        {field.label}
                                        {placed && <span className="ml-auto text-[10px] text-indigo-400/60">placed</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected field properties */}
                    {selectedField && (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-slate-300 text-xs font-semibold truncate mr-2">{selectedField.label}</p>
                                <button onClick={() => removeField(selectedField.id)}
                                    className="shrink-0 p-1.5 rounded hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                {selectedField.type === 'text' && (
                                    <>
                                        <div>
                                            <label className="text-slate-500 text-[10px] block mb-1">Font Size (px)</label>
                                            <input type="number" min="4" max="200" value={selectedField.fontSize ?? 16}
                                                onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                                                className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-[10px] block mb-1">Font</label>
                                            <select value={selectedField.fontFamily ?? 'Arial'}
                                                onChange={e => updateField(selectedField.id, { fontFamily: e.target.value })}
                                                className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full">
                                                {['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Inter', 'Satoshi'].map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-[10px] block mb-1">Color</label>
                                            <input type="color" value={selectedField.color ?? '#000000'}
                                                onChange={e => updateField(selectedField.id, { color: e.target.value })}
                                                className="h-8 w-full rounded cursor-pointer border border-[#1e293b] bg-transparent" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs border transition-colors ${selectedField.bold ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
                                                <Bold size={11} /> Bold
                                            </button>
                                            <button onClick={() => updateField(selectedField.id, { italic: !selectedField.italic })}
                                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs border transition-colors ${selectedField.italic ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}>
                                                <Italic size={11} /> Italic
                                            </button>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-[#1e293b]">
                                            <label className="text-slate-500 text-[10px] block mb-1">Custom Text (Overrides DB Data)</label>
                                            <input type="text" placeholder="Type to override data..." value={selectedField.overrideText ?? ''}
                                                onChange={e => updateField(selectedField.id, { overrideText: e.target.value })}
                                                className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full" />
                                        </div>
                                    </>
                                )}

                                {(selectedField.type === 'image' || selectedField.type === 'qrcode') && (
                                    <>
                                        <div>
                                            <label className="text-slate-500 text-[10px] block mb-1">Width (%)</label>
                                            <input type="number" min="2" max="100" value={selectedField.widthPct ?? 20}
                                                onChange={e => updateField(selectedField.id, { widthPct: Number(e.target.value) })}
                                                className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full" />
                                        </div>
                                        <div>
                                            <label className="text-slate-500 text-[10px] block mb-1">Height (%)</label>
                                            <input type="number" min="2" max="100" value={selectedField.heightPct ?? 20}
                                                onChange={e => updateField(selectedField.id, { heightPct: Number(e.target.value) })}
                                                className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full" />
                                        </div>
                                    </>
                                )}

                                {selectedField.type === 'image' && (
                                    <div>
                                        <label className="text-slate-500 text-[10px] block mb-1">Corner Curve (%)</label>
                                        <input type="number" min="0" max="50" value={selectedField.borderRadius ?? 0}
                                            onChange={e => updateField(selectedField.id, { borderRadius: Number(e.target.value) })}
                                            className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 w-full" />
                                    </div>
                                )}

                                {selectedField.type === 'qrcode' && (
                                    <div>
                                        <label className="text-slate-500 text-[10px] block mb-1">QR Color</label>
                                        <input type="color" value={selectedField.color ?? '#000000'}
                                            onChange={e => updateField(selectedField.id, { color: e.target.value })}
                                            className="h-8 w-full rounded cursor-pointer border border-[#1e293b] bg-transparent" />
                                    </div>
                                )}

                                {/* Fine-tune position */}
                                <div>
                                    <label className="text-slate-500 text-[10px] block mb-1">Position (X % / Y %)</label>
                                    <div className="flex gap-2">
                                        <input type="number" min="0" max="100" step="0.5"
                                            value={Math.round(selectedField.xPct * 10) / 10}
                                            onChange={e => updateField(selectedField.id, { xPct: Number(e.target.value) })}
                                            className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 flex-1" placeholder="X" />
                                        <input type="number" min="0" max="100" step="0.5"
                                            value={Math.round(selectedField.yPct * 10) / 10}
                                            onChange={e => updateField(selectedField.id, { yPct: Number(e.target.value) })}
                                            className="input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 flex-1" placeholder="Y" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!selectedField && currentFields.length > 0 && (
                        <p className="text-slate-600 text-[11px] text-center px-4 mt-4">Click a field on the card to edit its style</p>
                    )}
                </div>

                {/* ── Center — Card Canvas ──────────────────────────────────── */}
                <div
                    className="flex-1 flex flex-col items-center justify-center bg-[#060d19] overflow-auto p-8"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleCardDrop}
                >
                    {/* The card — div-based overlay (NOT html5 canvas) */}
                    <div
                        ref={containerRef}
                        onClick={() => setSelectedId(null)}
                        style={{
                            position: 'relative',
                            width:  `${displayW}px`,
                            height: `${displayH}px`,
                            background: '#ffffff',
                            borderRadius: 8,
                            overflow: 'hidden',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.85)',
                            userSelect: 'none',
                            flexShrink: 0,
                        }}
                    >
                        {/* Template image */}
                        {currentTemplateUrl ? (
                            <img
                                src={currentTemplateUrl}
                                alt="template"
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', display: 'block' }}
                            />
                        ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1e293b', color: '#475569', fontSize: 13 }}>
                                <Upload size={24} style={{ opacity: 0.3 }} />
                                <span>Drop front/back template here</span>
                                <span style={{ fontSize: 11, opacity: 0.5 }}>or use the upload buttons on the left</span>
                            </div>
                        )}

                        {/* Placed fields — each is an absolutely positioned div */}
                        {currentFields.map(field => {
                            const isSelected = field.id === selectedId;
                            const value      = previewRecord?.[field.fieldKey];

                            if (field.type === 'image' || field.type === 'qrcode') {
                                const w = field.widthPct  ?? 20;
                                const h = field.heightPct ?? 20;
                                return (
                                    <div
                                        key={field.id}
                                        onMouseDown={e => handleFieldMouseDown(e, field.id)}
                                        onClick={e => { e.stopPropagation(); setSelectedId(field.id); }}
                                        style={{
                                            position: 'absolute',
                                            left:   `${field.xPct}%`,
                                            top:    `${field.yPct}%`,
                                            width:  `${w}%`,
                                            height: `${h}%`,
                                            cursor: 'move',
                                            overflow: 'hidden',
                                            outline: isSelected ? '2px solid #6366f1' : '1.5px dashed rgba(99,102,241,0.4)',
                                            outlineOffset: 1,
                                            borderRadius: 2,
                                        }}
                                    >
                                        {field.type === 'qrcode' ? (
                                            <QRCodePreview text={value as string || 'https://mochingo.com'} color={field.color} />
                                        ) : value && typeof value === 'string' ? (
                                            <img
                                                src={value}
                                                alt="photo"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none', borderRadius: `${field.borderRadius ?? 0}%` }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: `${field.borderRadius ?? 0}%` }}>
                                                <User size={Math.round(displayH * 0.08)} color="#94a3b8" />
                                            </div>
                                        )}
                                        {isSelected && (
                                            <>
                                                <div style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(99,102,241,0.9)', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#fff', pointerEvents: 'none' }}>
                                                    {Math.round(field.widthPct ?? 20)}% × {Math.round(field.heightPct ?? 20)}%
                                                </div>
                                                <div
                                                    onMouseDown={e => handleResizeMouseDown(e, field.id, field.type)}
                                                    style={{
                                                        position: 'absolute', right: 0, bottom: 0, width: 12, height: 12,
                                                        background: '#6366f1', borderRadius: '50%', cursor: 'nwse-resize',
                                                        zIndex: 10, transform: 'translate(30%, 30%)'
                                                    }}
                                                />
                                            </>
                                        )}
                                    </div>
                                );
                            }

                            // Text field
                            const textStyle: React.CSSProperties = {
                                position:   'absolute',
                                left:       `${field.xPct}%`,
                                top:        `${field.yPct}%`,
                                fontSize:   `${field.fontSize ?? 16}px`,
                                fontFamily: `"${field.fontFamily ?? 'Arial'}", sans-serif`,
                                color:      field.color ?? '#000000',
                                fontWeight: field.bold   ? 'bold'   : 'normal',
                                fontStyle:  field.italic ? 'italic' : 'normal',
                                cursor:     'move',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                outline:    isSelected ? '2px solid #6366f1' : '1px dashed rgba(99,102,241,0)',
                                outlineOffset: 2,
                                padding:    0,
                                borderRadius: 2,
                                transition: 'outline-color 0.1s',
                            };
                            // Show hover outline even when not selected
                            const hoverClass = !isSelected ? 'hover-field-outline' : '';

                            return (
                                <div
                                    key={field.id}
                                    style={textStyle}
                                    className={hoverClass}
                                    onMouseDown={e => handleFieldMouseDown(e, field.id)}
                                    onClick={e => { e.stopPropagation(); setSelectedId(field.id); }}
                                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(99,102,241,0.35)'; }}
                                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(99,102,241,0)'; }}
                                >
                                    {field.overrideText 
                                        ? field.overrideText
                                        : previewRecord
                                            ? String(value ?? `[${field.label}]`)
                                            : `[${field.label}]`
                                    }
                                    {isSelected && (
                                        <div
                                            onMouseDown={e => handleResizeMouseDown(e, field.id, 'text')}
                                            style={{
                                                position: 'absolute', right: -4, bottom: -4, width: 10, height: 10,
                                                background: '#6366f1', borderRadius: '50%', cursor: 'nwse-resize',
                                                zIndex: 10
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Person preview selector */}
                    {records.length > 0 && (
                        <div className="flex items-center gap-3 mt-6 bg-[#0d1424] border border-white/10 rounded-xl px-4 py-2">
                            <span className="text-slate-500 text-xs">Preview:</span>
                            <button
                                onClick={() => setPreviewIdx(i => Math.max(0, i - 1))}
                                disabled={previewIdx === 0}
                                className="p-1 rounded hover:bg-white/5 text-slate-400 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <select
                                value={previewIdx}
                                onChange={e => setPreviewIdx(Number(e.target.value))}
                                className="bg-transparent text-slate-200 text-sm border-none outline-none cursor-pointer max-w-[180px]"
                            >
                                {records.map((r, i) => (
                                    <option key={r._id} value={i} className="bg-[#0d1424]">
                                        {i + 1}. {r.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setPreviewIdx(i => Math.min(records.length - 1, i + 1))}
                                disabled={previewIdx === records.length - 1}
                                className="p-1 rounded hover:bg-white/5 text-slate-400 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={15} />
                            </button>
                            <span className="text-slate-500 text-xs">{previewIdx + 1} / {records.length}</span>
                        </div>
                    )}

                    {isDownloading && (
                        <div className="mt-4 flex items-center gap-2 text-indigo-400 text-sm">
                            <Loader2 size={15} className="animate-spin" />
                            Rendering all {records.length} cards at 300 DPI…
                        </div>
                    )}

                    <p className="mt-3 text-slate-600 text-[11px]">
                        Download size: {cardW} × {cardH} mm @ 300 DPI ({renderW} × {renderH} px)
                    </p>
                </div>

                {/* ── Right panel — People list ─────────────────────────────── */}
                <div className="w-[190px] shrink-0 border-l border-white/8 bg-[#0d1424] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/8 shrink-0">
                        <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                            People ({records.length})
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2">
                        {records.map((record, idx) => (
                            <button
                                key={record._id}
                                onClick={() => setPreviewIdx(idx)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                                    idx === previewIdx
                                        ? 'bg-indigo-500/10 text-indigo-300'
                                        : 'text-slate-400 hover:bg-white/4 hover:text-slate-200'
                                }`}
                            >
                                {record.photo_url ? (
                                    <img src={record.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                        <User size={11} className="text-slate-500" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate">{record.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{record.registration_no || '—'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Save Template Modal ─────────────────────────────────────── */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h2 className="text-slate-200 text-lg font-semibold mb-2">Save Layout Template</h2>
                        <p className="text-slate-400 text-sm mb-4">Enter a name for this template to easily load it later.</p>
                        
                        <input
                            type="text"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            placeholder='e.g., "Doctor Standard"'
                            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 mb-6"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter' && templateName.trim()) {
                                    saveTemplate.mutate(templateName.trim());
                                }
                            }}
                        />

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsSaveModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => saveTemplate.mutate(templateName.trim())}
                                disabled={!templateName.trim() || saveTemplate.isPending}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition-colors"
                            >
                                {saveTemplate.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page (Suspense wrapper for useSearchParams) ────────────────────────────────

export default function BuilderPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-[#0b1120]">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
            </div>
        }>
            <BuilderInner />
        </Suspense>
    );
}
