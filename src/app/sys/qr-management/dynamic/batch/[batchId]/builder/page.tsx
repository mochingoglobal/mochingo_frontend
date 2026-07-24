'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, Undo2, Download, FileDown, Loader2, Type, ImageIcon, Crosshair,
} from 'lucide-react';
import BuilderCanvas from '@/components/qr-builder/BuilderCanvas';
import BuilderSidebar from '@/components/qr-builder/BuilderSidebar';
import { useBuilderState } from '@/components/qr-builder/useBuilderState';
import { PreviewMode } from '@/components/qr-builder/types';
import api from '@/lib/api';
import type { BatchResponse } from '@/types/qr.types';

function DynamicBatchBuilderInner({ batch }: { batch: BatchResponse }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [previewMode, setPreviewMode] = useState<PreviewMode>('card');
    const [isExporting, setIsExporting] = useState(false);
    const [exportLabel, setExportLabel] = useState('');
    const [guidesEnabled, setGuidesEnabled] = useState(true);
    
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    const rangeStart = Number(searchParams?.get('range_start') || 0);
    const rangeEnd = Number(searchParams?.get('range_end') || 0);
    
    const filteredQrs = useMemo(() => {
        if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeStart <= 0 || rangeEnd < rangeStart) {
            return batch.dynamic_qrs;
        }
        const subset = batch.dynamic_qrs.filter((qr) => {
            const batchSequence = Number(qr.batch_sequence || 0);
            return batchSequence >= rangeStart && batchSequence <= rangeEnd;
        });
        return subset.length ? subset : batch.dynamic_qrs;
    }, [batch.dynamic_qrs, rangeEnd, rangeStart]);
    
    const previewQr = filteredQrs[0];
    const builder = useBuilderState(batch.batch_label, previewQr?.qr_url || '');

    useEffect(() => {
        const headingTextEl = builder.state.elements.find(
            (el) => el.type === 'text' && (el as any).content === batch.batch_label.toUpperCase()
        );
        const tableTextEl = builder.state.elements.find(
            (el) => el.type === 'text' && /^(TABLE|[A-Z]+)\s+\d+$/i.test((el as any).content)
        );

        if (headingTextEl) {
            builder.updateElement(headingTextEl.id, { content: '' });
        }

        if (tableTextEl) {
            builder.updateElement(tableTextEl.id, { content: '' });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch.batch_label, previewQr?._id]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const qrEl = builder.state.elements.find(el => el.type === 'qr');
            if (qrEl && ev.target?.result) {
                builder.updateElement(qrEl.id, { centerLogoUrl: ev.target.result as string });
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleExportPNG = useCallback(async () => {
        setIsExporting(true);
        setExportLabel('Exporting preview PNG...');
        try {
            await builder.exportPNG(batch.batch_label);
        } finally {
            setIsExporting(false);
            setExportLabel('');
        }
    }, [builder, batch.batch_label]);

    const handleExportPDF = useCallback(async () => {
        setIsExporting(true);
        setExportLabel(`Generating bulk PDF for ${filteredQrs.length} QRs...`);
        try {
            await builder.exportDynamicBulkPDF(
                batch.batch_label,
                filteredQrs.map((qr) => ({
                    label: qr.label,
                    qrUrl: qr.qr_url,
                    displayLabel: null,
                })),
                `${batch.batch_label}-${filteredQrs.length === batch.dynamic_qrs.length ? 'bulk' : `range-${rangeStart}-to-${rangeEnd}`}`
            );
        } finally {
            setIsExporting(false);
            setExportLabel('');
        }
    }, [builder, batch.batch_label, batch.dynamic_qrs.length, filteredQrs, rangeEnd, rangeStart]);

    const previewModes: Array<{ id: PreviewMode; label: string }> = [
        { id: 'card', label: 'Branded Tag' },
        { id: 'stand', label: 'Table Stand' },
    ];

    return (
        <div style={{ height: 'calc(100vh - 64px)', margin: '-24px', display: 'flex', flexDirection: 'column', background: '#020617', color: 'white', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ height: 48, background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
                <button
                    onClick={() => router.back()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div style={{ width: 1, height: 24, background: '#334155' }} />

                <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                    {batch.batch_label} - {filteredQrs.length === batch.dynamic_qrs.length ? 'Full Batch Builder' : `Range ${rangeStart}-${rangeEnd} Builder`}
                </span>

                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: 8, padding: 2, gap: 2 }}>
                    {previewModes.map(pm => (
                        <button
                            key={pm.id}
                            onClick={() => setPreviewMode(pm.id)}
                            style={{ 
                                padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                                background: previewMode === pm.id ? '#2563eb' : 'transparent',
                                color: previewMode === pm.id ? 'white' : '#94a3b8'
                            }}
                        >
                            {pm.label}
                        </button>
                    ))}
                </div>

                <div style={{ width: 1, height: 24, background: '#334155' }} />

                <button
                    onClick={builder.undo}
                    disabled={!builder.canUndo}
                    title="Undo"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, background: 'none', border: 'none', color: builder.canUndo ? '#94a3b8' : '#334155', cursor: builder.canUndo ? 'pointer' : 'not-allowed' }}
                >
                    <Undo2 size={16} />
                </button>

                <button
                    onClick={() => setGuidesEnabled(g => !g)}
                    title={guidesEnabled ? 'Guides ON' : 'Guides OFF'}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        background: guidesEnabled ? 'rgba(6,182,212,0.2)' : 'transparent',
                        border: guidesEnabled ? '1px solid #06b6d4' : '1px solid #475569',
                        color: guidesEnabled ? '#22d3ee' : '#64748b'
                    }}
                >
                    <Crosshair size={14} /> Guides
                </button>

                <button
                    onClick={builder.addTextElement}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 4, fontSize: 12, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', cursor: 'pointer' }}
                >
                    <Type size={14} /> Add Text
                </button>

                <button
                    onClick={() => logoInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 4, fontSize: 12, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', cursor: 'pointer' }}
                >
                    <ImageIcon size={14} /> QR Logo
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />

                <div style={{ width: 1, height: 24, background: '#334155' }} />

                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: '#334155', border: '1px solid #475569', color: 'white', cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.5 : 1 }}
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Bulk PDF
                </button>

                <button
                    onClick={handleExportPNG}
                    disabled={isExporting}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: '#2563eb', border: 'none', color: 'white', cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.5 : 1 }}
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export PNG
                </button>
            </div>

            {isExporting && (
                <div style={{ height: 4, background: '#1e293b', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, background: '#3b82f6', animation: 'pulse 1.5s infinite', width: '100%' }} />
                </div>
            )}
            {isExporting && exportLabel && (
                <div style={{ fontSize: 12, textAlign: 'center', color: '#60a5fa', padding: '4px 0', background: '#0f172a', borderBottom: '1px solid #334155', flexShrink: 0 }}>
                    {exportLabel}
                </div>
            )}

            {/* Builder Main */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <BuilderCanvas builder={builder} previewMode={previewMode} guidesEnabled={guidesEnabled} />
                <BuilderSidebar builder={builder} />
            </div>
        </div>
    );
}

export default function QRDynamicBatchBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = params?.batchId as string;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['batch-builder', batchId],
        queryFn: async () => {
            const response = await api.get<{ data: BatchResponse }>(`/admin/qr/dynamic/batches/${batchId}`);
            return response.data.data;
        },
        enabled: !!batchId,
    });

    if (isLoading) {
        return (
            <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: 'white', margin: '-24px' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                <span style={{ marginLeft: 12, color: '#94a3b8' }}>Loading interactive builder...</span>
            </div>
        );
    }

    if (isError || !data?.dynamic_qrs?.length) {
        return (
            <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#020617', color: 'white', margin: '-24px', gap: 16 }}>
                <p style={{ color: '#94a3b8' }}>Dynamic QR batch not found.</p>
                <button
                    onClick={() => router.back()}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    return <DynamicBatchBuilderInner batch={data} />;
}
