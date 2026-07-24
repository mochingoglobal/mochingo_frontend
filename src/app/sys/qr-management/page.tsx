'use client';

import { useState, useRef, ChangeEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    QrCode, Search, Plus, ScanLine, Sparkles, RefreshCw, Download,
    Loader2, Link as LinkIcon, ImageIcon, X, Users, AlertTriangle,
    MapPin, Phone, Briefcase, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { createStyledQRCodeCanvas } from '@/lib/qrCodeGenerator';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import type { ListDynamicQRsResponse, DynamicQRGroupInventoryItem } from '@/types/qr.types';
import type { DynamicQRCategory } from '@/types/category.types';

// ─── Custom QR Tab ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    { label: 'Dynleaf Green', value: '#298000' },
    { label: 'Deep Blue', value: '#1d4ed8' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Rose', value: '#e11d48' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Teal', value: '#0d9488' },
    { label: 'Slate', value: '#334155' },
    { label: 'Black', value: '#000000' },
];

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

function CustomQRTab() {
    const [url, setUrl] = useState('');
    const [label, setLabel] = useState('');
    const [markerColor, setMarkerColor] = useState('#000000');
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [logoFileName, setLogoFileName] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExportingJpeg, setIsExportingJpeg] = useState(false);
    const [error, setError] = useState('');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const debouncedUrl = useDebounce(url, 600);

    const isValidUrl = (str: string) => {
        try { new URL(str); return true; } catch { return false; }
    };

    const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoDataUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const generateQR = useCallback(async (targetUrl: string, color: string, logo: string | null, size = 800) => {
        if (!targetUrl || !isValidUrl(targetUrl)) {
            setQrDataUrl(null);
            setError(targetUrl ? 'Please enter a valid URL (including https://)' : '');
            return null;
        }
        setError('');
        return await createStyledQRCodeCanvas({ text: targetUrl, size, padding: Math.round(size * 0.067), logoUrl: logo ?? undefined, markerColor: color });
    }, []);

    useEffect(() => {
        let cancelled = false;
        setIsGenerating(true);
        generateQR(debouncedUrl, markerColor, logoDataUrl, 800).then((canvas) => {
            if (cancelled) return;
            if (canvas) setQrDataUrl(canvas.toDataURL('image/png'));
            setIsGenerating(false);
        });
        return () => { cancelled = true; };
    }, [debouncedUrl, markerColor, logoDataUrl, generateQR]);

    const download = (dataUrl: string, ext: string) => {
        const safeName = (label.trim() || 'custom-qr').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${safeName}-qr.${ext}`;
        link.click();
    };

    const handleDownloadPng = () => qrDataUrl && download(qrDataUrl, 'png');

    const handleDownloadJpeg = async () => {
        if (!url || !isValidUrl(url)) return;
        setIsExportingJpeg(true);
        try {
            const hiRes = await generateQR(url, markerColor, logoDataUrl, 3000);
            if (!hiRes) return;
            const canvas = document.createElement('canvas');
            canvas.width = hiRes.width; canvas.height = hiRes.height;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(hiRes, 0, 0);
            download(canvas.toDataURL('image/jpeg', 0.97), 'jpg');
        } finally {
            setIsExportingJpeg(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Sparkles size={20} color="#8b5cf6" /> Custom QR Generator
                </h2>
                <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Paste any link to generate a branded QR code instantly.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label className="label">Destination URL</label>
                        <div style={{ position: 'relative' }}>
                            <LinkIcon size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
                            <input
                                className="input" style={{ paddingLeft: 36, fontFamily: 'monospace' }}
                                placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)}
                            />
                        </div>
                        {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</p>}
                    </div>

                    <div>
                        <label className="label">File Label (Optional)</label>
                        <input className="input" placeholder="e.g. Campaign Link" value={label} onChange={e => setLabel(e.target.value)} />
                    </div>

                    <div>
                        <label className="label">Center Logo</label>
                        {logoDataUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--card-border)' }}>
                                <img src={logoDataUrl} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoFileName}</p>
                                </div>
                                <button onClick={() => { setLogoDataUrl(null); setLogoFileName(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => logoInputRef.current?.click()} style={{ width: '100%', padding: 16, background: 'transparent', border: '2px dashed var(--card-border)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <ImageIcon size={18} /> Upload PNG/SVG
                            </button>
                        )}
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </div>

                    <div>
                        <label className="label">Corner Color</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c.value} onClick={() => setMarkerColor(c.value)}
                                    style={{ width: 32, height: 32, borderRadius: '50%', background: c.value, border: markerColor === c.value ? '2px solid white' : '2px solid transparent', cursor: 'pointer', outline: markerColor === c.value ? '2px solid #8b5cf6' : 'none', outlineOffset: 2 }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <QrCode size={20} color="#6366f1" /> Preview
                </h2>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--card-border)', borderRadius: 12, padding: 24, minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {isGenerating ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#94a3b8' }}>
                            <Loader2 size={32} className="animate-spin" color="#6366f1" />
                            <p style={{ fontSize: 14 }}>Generating…</p>
                        </div>
                    ) : qrDataUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                            <div style={{ background: 'white', padding: 12, borderRadius: 12 }}>
                                <img src={qrDataUrl} alt="QR" style={{ width: 200, height: 200 }} draggable={false} />
                            </div>
                            {label && <p style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>}
                            <p style={{ fontSize: 12, color: '#94a3b8', wordBreak: 'break-all', textAlign: 'center', maxWidth: 300 }}>{url}</p>
                            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 300 }}>
                                <button onClick={handleDownloadPng} className="btn btn-outline" style={{ flex: 1 }}><Download size={14}/> PNG</button>
                                <button onClick={handleDownloadJpeg} className="btn btn-primary" style={{ flex: 1 }} disabled={isExportingJpeg}>
                                    {isExportingJpeg ? <Loader2 size={14} className="animate-spin" /> : <Download size={14}/>} JPEG
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#64748b' }}>
                            <QrCode size={48} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                            <p style={{ fontSize: 14, fontWeight: 500 }}>Enter a URL</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Dynamic QR Tab ───────────────────────────────────────────────────────────

function DynamicQRTab() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    const [label, setLabel] = useState('');
    const [count, setCount] = useState(1);
    const [categoryId, setCategoryId] = useState<string>('');

    const { data: categories } = useQuery({
        queryKey: ['dynamic-qr-categories'],
        queryFn: async () => {
            const res = await api.get<DynamicQRCategory[]>('/admin/qr/categories');
            return res.data;
        }
    });

    const { data, isLoading } = useQuery({
        queryKey: ['dynamic-qrs', page, debouncedSearch],
        queryFn: async () => {
            const res = await api.get<{ data: ListDynamicQRsResponse }>(`/admin/qr/dynamic?page=${page}&limit=50&search=${encodeURIComponent(debouncedSearch)}`);
            return res.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                label,
                count,
                start_from: 1,
                category_id: categoryId || undefined
            };
            const res = await api.post('/admin/qr/dynamic', payload);
            return res.data.data;
        },
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['dynamic-qrs'] });
            setLabel('');
            setCount(1);
            setCategoryId('');
            if (created.batch_id && created.created_count > 1) {
                router.push(`/sys/qr-management/dynamic/batch/${created.batch_id}`);
            } else if (created.dynamic_qrs?.[0]?._id) {
                router.push(`/sys/qr-management/dynamic/${created.dynamic_qrs[0]._id}`);
            }
        }
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Create Bar */}
            <div className="card p-4 sm:p-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="label">Group Label</label>
                        <input className="input" placeholder="e.g. Marketing Posters" value={label} onChange={e => setLabel(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="label">Category (Optional)</label>
                        <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            <option value="">-- No Category --</option>
                            {categories?.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-[100px]">
                        <label className="label">Count</label>
                        <input type="number" min="1" max="1000" className="input" value={count} onChange={e => setCount(Number(e.target.value) || 1)} />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            className="btn btn-primary flex-1 md:flex-none justify-center h-[38px]"
                            onClick={() => createMutation.mutate()}
                            disabled={!label.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Create
                        </button>
                        <button
                            className="btn btn-outline flex-1 md:flex-none justify-center h-[38px]"
                            onClick={() => router.push('/sys/qr-management/dynamic/start-scanning')}
                        >
                            <ScanLine size={16} /> Scan Assign
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h3 className="text-base font-semibold">Dynamic QR Groups ({data?.total || 0})</h3>
                    <div className="relative w-full sm:w-[240px]">
                        <Search size={14} className="absolute left-3 top-[11px] text-slate-500" />
                        <input className="input input-sm pl-8 w-full" placeholder="Search labels..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Group Label</th>
                                <th>QRs</th>
                                <th>Status</th>
                                <th>Assignment Summary</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><Loader2 className="animate-spin mx-auto" /></td></tr>
                            ) : data?.dynamic_qrs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No dynamic QRs found</td></tr>
                            ) : (
                                data?.dynamic_qrs.map((row) => (
                                    <tr
                                        key={row.batch_id}
                                        onClick={() => {
                                            router.push(`/sys/qr-management/dynamic/batch/${row.batch_id}`);
                                        }}
                                    >
                                        <td>
                                            <span style={{ fontWeight: 500 }}>{row.label}</span>
                                        </td>
                                        <td>{row.qr_count}</td>
                                        <td>
                                            <span className={`badge ${getStatusColor(row.status)}`}>{row.status.toUpperCase()}</span>
                                        </td>
                                        <td>{row.assignment_summary}</td>
                                        <td style={{ color: '#94a3b8' }}>{formatDateTime(row.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QRManagementPage() {
    const [tab, setTab] = useState<'custom' | 'dynamic' | 'users'>('custom');

    const tabs: { key: typeof tab; label: string }[] = [
        { key: 'custom', label: 'Custom QR' },
        { key: 'dynamic', label: 'Dynamic QR' },
    ];

    return (
        <div className="flex flex-col max-w-full">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">QR Management</h1>
                <p className="text-slate-400 text-sm sm:text-base">Generate one-off branded QRs, manage permanent Dynamic QRs.</p>
            </div>

            <div className="inline-flex bg-white/5 p-1 rounded-lg mb-6 gap-1 self-start">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '6px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                            background: tab === t.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: tab === t.key ? '#818cf8' : '#94a3b8',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'custom' && <CustomQRTab />}
            {tab === 'dynamic' && <DynamicQRTab />}
        </div>
    );
}
