'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, QrCode, Link as LinkIcon, Edit2, X, ScanLine, Link2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import QRScanner from '@/components/QRScanner';

interface ConsumerQR {
    id: string;
    token: string;
    label: string;
    status: string;
    manual_redirect_url: string;
    scan_count: number;
    created_at: string;
    assigned_at: string;
}

interface ApiErrorResponse {
    message?: string;
}

export default function ProfileDashboard() {
    const { user, isAuthenticated, token } = useConsumerAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        const frameId = requestAnimationFrame(() => setIsHydrated(true));
        return () => cancelAnimationFrame(frameId);
    }, []);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);

    // Post-scan modal state
    const [scannedToken, setScannedToken] = useState<string | null>(null);
    const [scannedCategory, setScannedCategory] = useState<string | null>(null);
    const [isResolvingToken, setIsResolvingToken] = useState(false);
    const [claimUrl, setClaimUrl] = useState('');
    const [claimError, setClaimError] = useState<string | null>(null);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push('/');
        }
    }, [isHydrated, isAuthenticated, router]);

    const { data: qrs, isLoading } = useQuery({
        queryKey: ['my-qrs'],
        queryFn: async () => {
            const res = await api.get('/consumer/qr', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data.data.qrs;
        },
        enabled: isAuthenticated && !!token
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, url }: { id: string, url: string }) => {
            await api.patch(`/consumer/qr/${id}`, { destination_url: url }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-qrs'] });
            setEditingId(null);
            setEditUrl('');
        }
    });

    const claimMutation = useMutation({
        mutationFn: async () => {
            await api.post('/consumer/qr/claim', {
                token: scannedToken,
                destination_url: claimUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-qrs'] });
            setScannedToken(null);
            setScannedCategory(null);
            setClaimUrl('');
            setClaimError(null);
        },
        onError: (err: AxiosError<ApiErrorResponse>) => {
            setClaimError(err.response?.data?.message || 'Failed to claim QR');
        }
    });

    const handleScan = async (scannedText: string) => {
        setIsScanning(false);
        
        let extractedToken = scannedText;
        try {
            const url = new URL(scannedText);
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0) {
                extractedToken = pathParts[pathParts.length - 1];
            }
        } catch {
            // Not a URL, fallback to raw text
        }

        setScannedToken(extractedToken);
        setIsResolvingToken(true);
        setScannedCategory(null);
        
        try {
            const res = await api.get(`/qr/dynamic/${extractedToken}/resolve`);
            const { status, redirect_url } = res.data?.data || {};
            
            if (status === 'unassigned' && redirect_url) {
                try {
                    const parsedUrl = new URL(redirect_url);
                    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0 && pathParts[0] !== 'setup' && pathParts[0] !== 'dq') {
                        // Extract category slug from the path (e.g. 'instagram', 'google%20review')
                        const rawCategory = decodeURIComponent(pathParts[0]);
                        // Format it: 'google review' -> 'Google Review', 'instagram' -> 'Instagram'
                        const formatted = rawCategory.split(/[- ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        setScannedCategory(formatted);
                    }
                } catch (e) {
                    // Ignore parse errors, fallback to generic
                }
            }
        } catch (e) {
            console.error("Failed to resolve token", e);
        } finally {
            setIsResolvingToken(false);
        }
    };

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <p className="text-slate-400">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#142033_0,#07101f_36%,#050914_100%)] flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white overflow-x-hidden">
            
            {/* ==========================================================
                HEADER
                ========================================================== */}
            <header className="sticky top-0 z-40 w-full h-[68px] bg-slate-950/75 backdrop-blur-2xl border-b border-white/10">
                <div className="max-w-6xl mx-auto w-full h-full flex justify-center">
                    {/* Dashboard Content Container */}
                    <div className="w-full max-w-[430px] sm:max-w-2xl lg:max-w-5xl px-5 sm:px-6 lg:px-8 h-full flex items-center relative">
                        
                        {/* Back Button */}
                        <div className="absolute left-5 sm:left-6 flex">
                            <Link 
                                href="/" 
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-95"
                                aria-label="Go back"
                            >
                                <ArrowLeft size={18} strokeWidth={2.5} />
                            </Link>
                        </div>
                        
                        {/* Title - Perfectly Centered */}
                        <div className="flex-1 flex justify-center pointer-events-none">
                            <h1 className="text-[15px] sm:text-base font-semibold text-white tracking-tight">My Dashboard</h1>
                        </div>
                        
                        {/* Avatar */}
                        <div className="absolute right-5 sm:right-6 flex">
                            {user.profile_picture ? (
                                <img 
                                    src={user.profile_picture} 
                                    alt="Profile" 
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/15 object-cover shadow-sm" 
                                    referrerPolicy="no-referrer" 
                                />
                            ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-sm select-none">
                                    {user.name[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        
                    </div>
                </div>
            </header>

            {/* ==========================================================
                MAIN CONTENT
                ========================================================== */}
            <main className="flex-1 w-full max-w-6xl mx-auto flex justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                <div className="w-full max-w-[430px] sm:max-w-2xl lg:max-w-5xl mx-auto space-y-6 sm:space-y-8">
                    
                    {/* ----------------------------------------------------
                        HERO SCAN CARD
                        ---------------------------------------------------- */}
                    <section>
                        <div className="relative w-full rounded-2xl sm:rounded-3xl bg-slate-900/85 border border-white/10 p-3.5 sm:p-6 lg:p-8 min-h-[220px] sm:min-h-[280px] flex flex-col justify-between overflow-hidden shadow-2xl shadow-slate-950/50">
                            
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent pointer-events-none" />
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.13),transparent_42%,rgba(16,185,129,0.12))] pointer-events-none" />
                            
                            {/* Inner Content */}
                            <div className="relative z-10 flex flex-col h-full">
                                
                                {/* Top Row: Icon & Badge */}
                                <div className="flex items-start justify-between gap-3 mb-6 sm:mb-10">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[18px] sm:rounded-2xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-300/20 backdrop-blur-md shadow-inner shrink-0">
                                        <ScanLine size={26} strokeWidth={1.5} />
                                    </div>
                                    <div className="shrink-0">
                                        <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-md">
                                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
                                            <span className="text-[9px] sm:text-[11px] font-bold text-emerald-300 uppercase tracking-wider whitespace-nowrap">Ready to scan</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Bottom Row: Text & CTA */}
                                <div className="mt-auto">
                                    <h2 className="text-[21px] sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 tracking-tight leading-tight">Scan New QR Code</h2>
                                    <p className="text-[13px] sm:text-base text-slate-300/85 mb-4 sm:mb-7 max-w-2xl leading-relaxed">
                                        Tap here to open your camera, scan a dynamic QR code, and assign a destination URL instantly.
                                    </p>
                                    <button 
                                        onClick={() => setIsScanning(true)} 
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 h-12 sm:h-14 px-5 sm:px-8 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-[15px] sm:text-base shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition-all active:scale-[0.98]"
                                    >
                                        <ScanLine size={20} strokeWidth={2.5} />
                                        <span>Open Scanner</span>
                                    </button>
                                </div>
                                
                            </div>
                        </div>
                    </section>

                    {/* ----------------------------------------------------
                        ASSIGNED QRS SECTION
                        ---------------------------------------------------- */}
                    <section className="space-y-3.5 sm:space-y-5">
                        
                        {/* Section Header */}
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[11px] sm:text-sm font-bold text-slate-400 uppercase tracking-[0.18em] sm:tracking-widest">
                                Assigned QR Codes
                            </h3>
                            {qrs && qrs.length > 0 && (
                                <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 sm:min-w-8 sm:px-2.5 sm:py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] sm:text-xs font-semibold text-slate-300">
                                    {qrs.length}
                                </span>
                            )}
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                <p className="text-sm text-slate-500">Loading your QR codes...</p>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && qrs?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/45">
                                <div className="w-20 h-20 bg-white/[0.04] rounded-2xl flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                                    <QrCode size={36} className="text-slate-500" strokeWidth={1.5} />
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">No QRs claimed yet</h4>
                                <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">
                                    Use the scanner above to claim your first dynamic QR code.
                                </p>
                            </div>
                        )}

                        {/* QR Cards List */}
                        {!isLoading && qrs && qrs.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                                {qrs.map((qr: ConsumerQR) => (
                                    <div 
                                        key={qr.id} 
                                        className="w-full min-w-0 bg-slate-900/70 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col gap-3 sm:gap-5 transition-colors hover:border-white/20 hover:bg-slate-900/90"
                                    >
                                        
                                        {/* Top Info Row */}
                                        <div className="flex items-start gap-2.5 sm:gap-4 min-w-0">
                                            {/* Icon */}
                                            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-2xl bg-cyan-400/10 text-cyan-300 flex items-center justify-center border border-cyan-300/20">
                                                <QrCode size={21} strokeWidth={1.5} />
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center min-h-10 sm:min-h-12">
                                                {/* Title & Badge */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 min-w-0">
                                                    <h4 className="text-sm sm:text-base font-semibold text-white truncate leading-tight min-w-0">
                                                        {qr.label}
                                                    </h4>
                                                    <span className="self-start sm:self-auto max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-1.5 py-0.5 rounded-md bg-slate-950/80 text-cyan-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                                        {qr.token}
                                                    </span>
                                                </div>
                                                
                                                {/* Metadata */}
                                                <div className="flex items-center flex-wrap gap-x-1.5 sm:gap-x-2 gap-y-1 text-[10px] sm:text-xs text-slate-500">
                                                    <span>Claimed {formatDateTime(qr.assigned_at).split(',')[0]}</span>
                                                    <span className="hidden sm:inline-block">•</span>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500/80" />
                                                        <span className="font-medium text-slate-400">{qr.scan_count}</span> {qr.scan_count === 1 ? 'scan' : 'scans'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Separator Line */}
                                        <div className="w-full h-px bg-white/10" />

                                        {/* Bottom Action Row (Edit/View) */}
                                        <div className="w-full">
                                            {editingId === qr.id ? (
                                                
                                                /* --- EDIT MODE --- */
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                                                    <input 
                                                        type="url" 
                                                        value={editUrl} 
                                                        onChange={(e) => setEditUrl(e.target.value)}
                                                        placeholder="https://..."
                                                        className="flex-1 h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-slate-950/90 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white outline-none text-[12px] sm:text-sm font-mono min-w-0 transition-all" 
                                                        autoFocus 
                                                    />
                                                    <div className="grid grid-cols-[1fr_44px] sm:grid-cols-[1fr_48px] sm:flex gap-2 shrink-0">
                                                        <button 
                                                            onClick={() => updateMutation.mutate({id: qr.id, url: editUrl})} 
                                                            disabled={updateMutation.isPending || !editUrl} 
                                                            className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold flex items-center justify-center min-w-0 sm:min-w-[100px] transition-colors active:scale-95"
                                                        >
                                                            {updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : "Save"}
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingId(null)} 
                                                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
                                                            aria-label="Cancel editing"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                            ) : (

                                                /* --- VIEW MODE --- */
                                                <div className="grid grid-cols-[minmax(0,1fr)_44px] sm:grid-cols-[minmax(0,1fr)_48px] gap-2 sm:gap-3 w-full group min-w-0">
                                                    {/* URL Box */}
                                                    <div className="min-w-0 flex items-center gap-2 sm:gap-3 h-11 sm:h-12 px-2.5 sm:px-4 rounded-xl bg-slate-950/90 border border-white/10 group-hover:border-white/20 transition-colors">
                                                        <LinkIcon size={15} className="text-slate-600 shrink-0" />
                                                        <span className="flex-1 min-w-0 truncate font-mono text-[11px] sm:text-[13px] text-slate-400 group-hover:text-slate-300 transition-colors">
                                                            {qr.manual_redirect_url ? qr.manual_redirect_url : <span className="font-sans italic text-slate-600">No destination URL set</span>}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Edit Button */}
                                                    <button 
                                                        onClick={() => {
                                                            setEditingId(qr.id);
                                                            setEditUrl(qr.manual_redirect_url);
                                                        }}
                                                        className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all active:scale-95"
                                                        aria-label="Edit destination URL"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                </div>

                                            )}
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* ==========================================================
                SCANNER FULLSCREEN
                ========================================================== */}
            {isScanning && (
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setIsScanning(false)}
                />
            )}

            {/* ==========================================================
                POST-SCAN MODAL
                ========================================================== */}
            {scannedToken && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" 
                        onClick={() => { setScannedToken(null); setClaimUrl(''); setClaimError(null); setScannedCategory(null); }} 
                    />
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[28px] sm:rounded-[24px] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
                        
                        {/* Mobile Pull Handle */}
                        <div className="flex justify-center mb-6 sm:hidden">
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
                        </div>
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                                    <Link2 size={24} strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                        {scannedCategory ? `Assign ${scannedCategory}` : 'Assign Destination'}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 font-medium">Token:</span>
                                        <code className="px-2 py-0.5 rounded-md bg-slate-950 text-indigo-400 font-mono text-[11px] font-bold tracking-widest border border-slate-800 uppercase">
                                            {scannedToken}
                                        </code>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setScannedToken(null); setClaimUrl(''); setClaimError(null); setScannedCategory(null); }} 
                                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        {isResolvingToken ? (
                            <div className="flex flex-col items-center justify-center py-6">
                                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                                <p className="text-sm text-slate-400 font-medium">Analyzing QR Code...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                
                                {/* Input Field */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {scannedCategory ? `${scannedCategory} URL` : 'Destination URL'}
                                    </label>
                                    <input 
                                        type="url"
                                        value={claimUrl}
                                        onChange={e => setClaimUrl(e.target.value)}
                                        placeholder={
                                            scannedCategory?.toLowerCase().includes('google') 
                                                ? "https://g.page/review/..." 
                                                : scannedCategory?.toLowerCase().includes('instagram') 
                                                ? "https://instagram.com/yourprofile" 
                                                : "https://..."
                                        }
                                        className="w-full h-14 px-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none font-mono text-sm transition-all"
                                        autoFocus
                                    />
                                    {scannedCategory && !claimError && (
                                        <p className="text-xs text-slate-500 mt-1">Assign your business {scannedCategory} URL to this QR code.</p>
                                    )}
                                    {claimError && (
                                        <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                            <span>{claimError}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button 
                                    onClick={() => claimMutation.mutate()} 
                                    disabled={!claimUrl || claimMutation.isPending}
                                    className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                                >
                                    {claimMutation.isPending ? (
                                        <><Loader2 size={20} className="animate-spin" /> Claiming...</>
                                    ) : (
                                        'Claim & Save'
                                    )}
                                </button>
                                
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
