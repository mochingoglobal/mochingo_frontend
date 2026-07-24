'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Download, Copy, ExternalLink, Link as LinkIcon, Palette, Image as ImageIcon, X } from 'lucide-react';
import api from '@/lib/api';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { downloadMochingoBulkQRPDF, downloadPlainBulkQRPDF, downloadStandBulkQRPDF } from '@/lib/qrPdfGenerator';
import type { BatchResponse, DynamicQR } from '@/types/qr.types';
import type { DynamicQRCategory } from '@/types/category.types';

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
    const [logoUrl, setLogoUrl] = useState<string | undefined>();
    const [categoryId, setCategoryId] = useState<string>('');
    
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

    const { data: categories } = useQuery({
        queryKey: ['dynamic-qr-categories'],
        queryFn: async () => {
            const res = await api.get<DynamicQRCategory[]>('/admin/qr/categories');
            return res.data;
        }
    });

    useEffect(() => {
        if (data?.dynamic_qrs?.length && !selectedId) {
            setSelectedId(data.dynamic_qrs[0]._id);
        }
        if (data && data.category_id !== undefined) {
            setCategoryId(data.category_id || '');
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

    const updateCategoryMutation = useMutation({
        mutationFn: async (newCategoryId: string) => {
            await api.patch(`/admin/qr/dynamic/batches/${batchId}/category`, {
                category_id: newCategoryId || null
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
        }
    });

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setCategoryId(val);
        updateCategoryMutation.mutate(val);
    };

    const hasValidRange = typeof rangeStart === 'number' && typeof rangeEnd === 'number' && rangeStart <= rangeEnd && rangeStart > 0 && rangeEnd <= (data?.qr_count || 0);

    const rangeFilteredQrs = useMemo(() => {
        if (!data?.dynamic_qrs || !hasValidRange) return [];
        return data.dynamic_qrs.filter(qr => {
            const seq = qr.batch_sequence || 0;
            return seq >= rangeStart && seq <= rangeEnd;
        });
    }, [data, rangeStart, rangeEnd, hasValidRange]);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                setLogoUrl(ev.target.result as string);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

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
                    logoUrl,
                    showTitle: !!batchTitle,
                    fileName: `${title.replace(/\s+/g, '-')}-${fileSuffix}-branded`
                });
            } else if (type === 'plain') {
                await downloadPlainBulkQRPDF({ 
                    entries,
                    logoUrl,
                    fileName: `${title.replace(/\s+/g, '-')}-${fileSuffix}-plain`
                });
            } else if (type === 'stand') {
                await downloadStandBulkQRPDF({
                    entries,
                    logoUrl,
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
        const url = new URL(window.location.origin + `/sys/qr-management/dynamic/batch/${batchId}/builder`);
        if (mode === 'range') {
            url.searchParams.set('range_start', String(rangeStart));
            url.searchParams.set('range_end', String(rangeEnd));
        }
        router.push(url.pathname + url.search);
    };

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 className="animate-spin" /></div>;
    if (!data) return <div>Batch not found</div>;

    return (
        <div className="flex flex-col max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={() => router.back()} className="btn btn-outline shrink-0"><ArrowLeft size={16}/></button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold truncate">{data.batch_label}</h1>
                        <p className="text-slate-400 text-sm truncate">Batch ID: {batchId} • {data.qr_count} QRs</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-sm text-slate-400 whitespace-nowrap shrink-0">Category:</label>
                    <select 
                        className="input input-sm w-full sm:w-[200px]" 
                        value={categoryId} 
                        onChange={handleCategoryChange}
                        disabled={updateCategoryMutation.isPending}
                    >
                        <option value="">-- No Category --</option>
                        {categories?.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                    </select>
                    {updateCategoryMutation.isPending && <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" />}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
                {/* List */}
                <div className="card p-3 max-h-[400px] lg:max-h-[calc(100vh-140px)] overflow-y-auto">
                    <div className="flex flex-col gap-2">
                        {data.dynamic_qrs.map(qr => (
                            <button
                                key={qr._id}
                                onClick={() => setSelectedId(qr._id)}
                                className={`flex flex-col gap-1 text-left p-3 rounded-lg cursor-pointer border transition-colors ${
                                    selectedId === qr._id ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'border-transparent text-slate-200 hover:bg-white/5'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm truncate pr-2">{qr.label}</span>
                                    <span className={`badge ${getStatusColor(qr.status)} text-[10px] shrink-0`}>#{qr.batch_sequence}</span>
                                </div>
                                <span className="text-xs text-slate-400 truncate">{qr.assignment_summary}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor & Actions */}
                <div className="flex flex-col gap-6">
                    
                    {/* Range Selection */}
                    <div className="card p-4 sm:p-6 bg-indigo-500/5">
                        <h2 className="text-base font-semibold mb-4">Manage Range</h2>
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div className="flex-1 sm:flex-none">
                                <label className="label">Start Sequence</label>
                                <input type="number" className="input input-sm w-full sm:w-[120px]" value={rangeStart} onChange={e => setRangeStart(e.target.value ? Number(e.target.value) : '')} placeholder="1" />
                            </div>
                            <div className="flex-1 sm:flex-none">
                                <label className="label">End Sequence</label>
                                <input type="number" className="input input-sm w-full sm:w-[120px]" value={rangeEnd} onChange={e => setRangeEnd(e.target.value ? Number(e.target.value) : '')} placeholder={String(data.qr_count)} />
                            </div>
                            {hasValidRange && (
                                <span className="pb-2 text-[13px] text-emerald-500">
                                    Selecting {rangeEnd - rangeStart + 1} QRs
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                            <button className="btn btn-primary justify-center" onClick={() => handleOpenBuilder('range')} disabled={!hasValidRange}>
                                <Palette size={16} /> Open Range Builder
                            </button>
                            <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('stand', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Stand PDF (Range)
                            </button>
                            <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('branded', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Branded PDF (Range)
                            </button>
                            <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('plain', 'range')} disabled={!hasValidRange}>
                                <Download size={16} /> Plain PDF (Range)
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="card p-4 sm:p-6">
                        <h2 className="text-lg font-semibold mb-4">Edit Selected QR</h2>
                        {selectedQr ? (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="label">Label</label>
                                    <input className="input" value={label} onChange={e => setLabel(e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Permanent QR Link</label>
                                    <div className="flex gap-2">
                                        <input className="input opacity-70 flex-1 min-w-0" value={selectedQr.qr_url} readOnly />
                                        <button className="btn btn-outline shrink-0" onClick={() => { navigator.clipboard.writeText(selectedQr.qr_url); alert('Copied!'); }}><Copy size={14}/></button>
                                        <a href={selectedQr.qr_url} target="_blank" className="btn btn-outline shrink-0"><ExternalLink size={14}/></a>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Destination URL</label>
                                    <input className="input" value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://" />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                    <button className="btn btn-primary flex-1 justify-center" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                        {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                                    </button>
                                    <button className="btn btn-outline flex-1 justify-center" onClick={() => applyTemplateMutation.mutate()} disabled={applyTemplateMutation.isPending}>
                                        Apply Destination to Entire Batch
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400">Select a QR from the list.</p>
                        )}
                    </div>

                    {/* Batch Actions */}
                    <div className="card p-4 sm:p-6">
                        <h2 className="text-lg font-semibold mb-4">Full Batch Actions</h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="label">Custom Center Logo (Optional)</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <label className="btn btn-outline cursor-pointer shrink-0">
                                        <ImageIcon size={16} /> Upload Logo
                                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </label>
                                    {logoUrl && (
                                        <div className="flex items-center gap-2">
                                            <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain bg-white rounded" />
                                            <button className="btn btn-outline p-1.5 text-red-500 border-red-500/50 hover:bg-red-500/10 shrink-0" onClick={() => setLogoUrl(undefined)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="label">Custom PDF Title (Optional)</label>
                                <input className="input" value={batchTitle} onChange={e => setBatchTitle(e.target.value)} placeholder="e.g. Summer Campaign" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                <button className="btn btn-primary justify-center" onClick={() => handleOpenBuilder('full')}>
                                    <Palette size={16} /> Open Full Batch Builder
                                </button>
                                <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('stand', 'full')}>
                                    <Download size={16} /> Download Stand PDF
                                </button>
                                <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('branded', 'full')}>
                                    <Download size={16} /> Download Branded PDF
                                </button>
                                <button className="btn btn-outline justify-center" onClick={() => handleDownloadPdf('plain', 'full')}>
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
