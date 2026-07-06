'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Download, Copy, ExternalLink, Link as LinkIcon, Palette } from 'lucide-react';
import api from '@/lib/api';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { downloadMochingoBulkQRPDF, downloadPlainBulkQRPDF, downloadStandBulkQRPDF } from '@/lib/qrPdfGenerator';
import type { BatchResponse, DynamicQR } from '@/types/qr.types';

export default function BatchManagementPage() {
    const params = useParams();
    const router = useRouter();
    const batchId = params?.batchId as string;
    const queryClient = useQueryClient();

    const [selectedId, setSelectedId] = useState<string>('');
    const [label, setLabel] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [status, setStatus] = useState<'assigned' | 'unassigned' | 'disabled'>('unassigned');
    const [batchTitle, setBatchTitle] = useState('');
    
    // Range State
    const [rangeStart, setRangeStart] = useState<number | ''>('');
    const [rangeEnd, setRangeEnd] = useState<number | ''>('');

    const { data, isLoading } = useQuery({
        queryKey: ['batch', batchId],
        queryFn: async () => {
            const res = await api.get<{ data: BatchResponse }>(`/admin/qr/dynamic/batches/${batchId}`);
            return res.data.data;
        },
        enabled: !!batchId
    });

    useEffect(() => {
        if (data?.dynamic_qrs?.length && !selectedId) {
            setSelectedId(data.dynamic_qrs[0]._id);
        }
    }, [data, selectedId]);

    const selectedQr = useMemo(() => data?.dynamic_qrs.find(q => q._id === selectedId), [data, selectedId]);

    useEffect(() => {
        if (selectedQr) {
            setLabel(selectedQr.label);
            setManualUrl(selectedQr.manual_redirect_url || '');
            setStatus(selectedQr.status);
        }
    }, [selectedQr]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedQr) return;
            const payload = {
                label,
                manual_redirect_url: manualUrl.trim() || null,
                status: manualUrl.trim() ? 'assigned' : 'unassigned'
            };
            await api.patch(`/admin/qr/dynamic/${selectedQr._id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            alert('Saved successfully');
        }
    });

    const applyTemplateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedQr) return;
            await api.post(`/admin/qr/dynamic/batches/${batchId}/apply-template`, {
                source_dynamic_qr_id: selectedQr._id,
                manual_redirect_url: manualUrl.trim() || null
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            alert('Applied to all QRs in this batch!');
        }
    });

    const hasValidRange = typeof rangeStart === 'number' && typeof rangeEnd === 'number' && rangeStart <= rangeEnd && rangeStart > 0 && rangeEnd <= (data?.qr_count || 0);

    const rangeFilteredQrs = useMemo(() => {
        if (!data?.dynamic_qrs || !hasValidRange) return [];
        return data.dynamic_qrs.filter(qr => {
            const seq = qr.batch_sequence || 0;
            return seq >= rangeStart && seq <= rangeEnd;
        });
    }, [data, rangeStart, rangeEnd, hasValidRange]);

    const handleDownloadPdf = async (type: 'branded' | 'plain' | 'stand', mode: 'full' | 'range') => {
        if (!data) return;
        
        const targetQRs = mode === 'full' ? data.dynamic_qrs : rangeFilteredQrs;
        if (!targetQRs.length) {
            alert('No QRs selected for download.');
            return;
        }

        const entries = targetQRs.map(qr => ({
            label: qr.label,
            qrUrl: qr.qr_url,
            displayLabel: `#${qr.batch_sequence}`,
            identificationLabel: `#${qr.batch_sequence}`
        }));
        
        const title = batchTitle || data.batch_label;
        const fileSuffix = mode === 'full' ? 'full' : `range-${rangeStart}-to-${rangeEnd}`;
        
        try {
            if (type === 'branded') {
                await downloadMochingoBulkQRPDF({
                    title,
                    entries,
                    showTitle: !!batchTitle,
                    fileName: `${title.replace(/\s+/g, '-')}-${fileSuffix}-branded`
                });
            } else if (type === 'plain') {
                await downloadPlainBulkQRPDF({ 
                    entries,
                    fileName: `${title.replace(/\s+/g, '-')}-${fileSuffix}-plain`
                });
            } else if (type === 'stand') {
                await downloadStandBulkQRPDF({
                    entries,
                    fileName: `${title.replace(/\s+/g, '-')}-${fileSuffix}-stand`
                });
            }
        } catch (err) {
            alert('Export failed');
        }
    };

    const handleOpenBuilder = (mode: 'full' | 'range') => {
        if (mode === 'range' && !hasValidRange) {
            alert('Please select a valid range first.');
            return;
        }
        const url = new URL(window.location.origin + `/admin/qr-management/dynamic/batch/${batchId}/builder`);
        if (mode === 'range') {
            url.searchParams.set('range_start', String(rangeStart));
            url.searchParams.set('range_end', String(rangeEnd));
        }
        router.push(url.pathname + url.search);
    };

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 className="animate-spin" /></div>;
    if (!data) return <div>Batch not found</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button onClick={() => router.back()} className="btn btn-outline"><ArrowLeft size={16}/></button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>{data.batch_label}</h1>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Batch ID: {batchId} • {data.qr_count} QRs</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
                {/* List */}
                <div className="card" style={{ padding: 12, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.dynamic_qrs.map(qr => (
                            <button
                                key={qr._id}
                                onClick={() => setSelectedId(qr._id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left',
                                    padding: '12px', borderRadius: 8, cursor: 'pointer', border: '1px solid',
                                    background: selectedId === qr._id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    borderColor: selectedId === qr._id ? '#6366f1' : 'transparent',
                                    color: 'white'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{qr.label}</span>
                                    <span className={`badge ${getStatusColor(qr.status)}`} style={{ fontSize: 10 }}>#{qr.batch_sequence}</span>
                                </div>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{qr.assignment_summary}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Range Selection */}
                    <div className="card" style={{ padding: 24, background: 'rgba(99, 102, 241, 0.03)' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Manage Range</h2>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div>
                                <label className="label">Start Sequence</label>
                                <input type="number" className="input input-sm" style={{ width: 120 }} value={rangeStart} onChange={e => setRangeStart(e.target.value ? Number(e.target.value) : '')} placeholder="1" />
                            </div>
                            <div>
                                <label className="label">End Sequence</label>
                                <input type="number" className="input input-sm" style={{ width: 120 }} value={rangeEnd} onChange={e => setRangeEnd(e.target.value ? Number(e.target.value) : '')} placeholder={String(data.qr_count)} />
                            </div>
                            {hasValidRange && (
                                <span style={{ paddingBottom: 8, fontSize: 13, color: '#10b981' }}>
                                    Selecting {rangeEnd - rangeStart + 1} QRs
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button className="btn btn-primary" onClick={() => handleOpenBuilder('range')} disabled={!hasValidRange}>
                                <Palette size={16} /> Open Range Builder
                            </button>
                            <button className="btn btn-outline" onClick={() => handleDownloadPdf('stand', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Stand PDF (Range)
                            </button>
                            <button className="btn btn-outline" onClick={() => handleDownloadPdf('branded', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Branded PDF (Range)
                            </button>
                            <button className="btn btn-outline" onClick={() => handleDownloadPdf('plain', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Plain PDF (Range)
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Edit Selected QR</h2>
                        {selectedQr ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label className="label">Label</label>
                                    <input className="input" value={label} onChange={e => setLabel(e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Permanent QR Link</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input className="input" value={selectedQr.qr_url} readOnly style={{ opacity: 0.7 }} />
                                        <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(selectedQr.qr_url); alert('Copied!'); }}><Copy size={14}/></button>
                                        <a href={selectedQr.qr_url} target="_blank" className="btn btn-outline"><ExternalLink size={14}/></a>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Destination URL</label>
                                    <input className="input" value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://" />
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button className="btn btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                        {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                                    </button>
                                    <button className="btn btn-outline" onClick={() => applyTemplateMutation.mutate()} disabled={applyTemplateMutation.isPending}>
                                        Apply Destination to Entire Batch
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: '#94a3b8' }}>Select a QR from the list.</p>
                        )}
                    </div>

                    {/* Batch Actions */}
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Full Batch Actions</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="label">Custom PDF Title (Optional)</label>
                                <input className="input" value={batchTitle} onChange={e => setBatchTitle(e.target.value)} placeholder="e.g. Summer Campaign" />
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={() => handleOpenBuilder('full')}>
                                    <Palette size={16} /> Open Full Batch Builder
                                </button>
                                <button className="btn btn-outline" onClick={() => handleDownloadPdf('stand', 'full')}>
                                    <Download size={16} /> Download Stand PDF
                                </button>
                                <button className="btn btn-outline" onClick={() => handleDownloadPdf('branded', 'full')}>
                                    <Download size={16} /> Download Branded PDF
                                </button>
                                <button className="btn btn-outline" onClick={() => handleDownloadPdf('plain', 'full')}>
                                    <Download size={16} /> Download Plain PDF
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
