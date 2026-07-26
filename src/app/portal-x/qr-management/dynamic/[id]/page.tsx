'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Download, Copy, ExternalLink, Link as LinkIcon, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { downloadSingleDynamicQRPDF } from '@/lib/qrPdfGenerator';
import type { DynamicQR } from '@/types/qr.types';

export default function SingleQRPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const queryClient = useQueryClient();

    const [label, setLabel] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [status, setStatus] = useState<'assigned' | 'unassigned' | 'disabled'>('unassigned');
    const [qrDesign, setQrDesign] = useState<'dots' | 'squares'>('dots');
    const [qrColor, setQrColor] = useState<'black' | 'white'>('black');

    const { data, isLoading } = useQuery({
        queryKey: ['qr', id],
        queryFn: async () => {
            const res = await api.get<{ data: DynamicQR }>(`/admin/qr/dynamic/${id}`);
            return res.data.data;
        },
        enabled: !!id
    });

    useEffect(() => {
        if (data) {
            setLabel(data.label);
            setManualUrl(data.manual_redirect_url || '');
            setStatus(data.status);
        }
    }, [data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                label,
                manual_redirect_url: manualUrl.trim() || null,
                status: manualUrl.trim() ? 'assigned' : 'unassigned'
            };
            await api.patch(`/admin/qr/dynamic/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr', id] });
            alert('Saved successfully');
        }
    });

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Loader2 className="animate-spin" /></div>;
    if (!data) return <div>QR not found</div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button onClick={() => router.back()} className="btn btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200"><ArrowLeft size={16}/></button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>{data.label}</h1>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>
                        Status: <span className={`badge ${getStatusColor(data.status)}`}>{data.status.toUpperCase()}</span>
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
                <div className="card bg-[#161b27] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Edit Details</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label className="label">Label</label>
                            <input className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" value={label} onChange={e => setLabel(e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Permanent QR Link</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" value={data.qr_url} readOnly style={{ opacity: 0.7 }} />
                                <button className="btn btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200" onClick={() => { navigator.clipboard.writeText(data.qr_url); alert('Copied!'); }}><Copy size={14}/></button>
                                <a href={data.qr_url} target="_blank" className="btn btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200"><ExternalLink size={14}/></a>
                            </div>
                        </div>
                        <div>
                            <label className="label">Destination URL</label>
                            <div style={{ position: 'relative' }}>
                                <LinkIcon size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
                                <input className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" style={{ paddingLeft: 36 }} value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://" />
                            </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <button className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/20" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card bg-[#161b27] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Stats & Actions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>Total Scans</p>
                            <p style={{ fontSize: 24, fontWeight: 700 }}>{data.scan_count}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>Last Scanned</p>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>{formatDateTime(data.last_scanned_at)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>Created</p>
                            <p style={{ fontSize: 14, fontWeight: 500 }}>{formatDateTime(data.created_at)}</p>
                        </div>
                        <div className="divider" />
                        <div>
                            <label className="label" style={{ fontSize: 12 }}>QR Design</label>
                            <select className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 input-sm" value={qrDesign} onChange={e => setQrDesign(e.target.value as 'dots' | 'squares')} style={{ marginBottom: 8 }}>
                                <option value="dots">Modern Dots</option>
                                <option value="squares">Standard Squares</option>
                            </select>
                            <label className="label" style={{ fontSize: 12 }}>Color Theme</label>
                            <select className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 input-sm" value={qrColor} onChange={e => setQrColor(e.target.value as 'black' | 'white')} style={{ marginBottom: 16 }}>
                                <option value="black">Black on White</option>
                                <option value="white">White on Black</option>
                            </select>
                        </div>
                        <button 
                            className="btn btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200" 
                            style={{ width: '100%' }}
                            onClick={() => downloadSingleDynamicQRPDF(data.qr_url, data.label, undefined, qrDesign, qrColor)}
                        >
                            <Download size={14} /> Download PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
