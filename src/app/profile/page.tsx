'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, QrCode, Edit2, X, ScanLine, Link2, Search, Link as LinkIcon, Camera, MessageSquare, MapPin, Globe } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
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

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// Helper to determine icon based on destination URL
function getDestinationIcon(url: string | undefined | null) {
    if (!url) return <LinkIcon size={20} />;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return <Camera size={20} />;
    if (lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp.com')) return <MessageSquare size={20} />;
    if (lowerUrl.includes('search.google.com') || lowerUrl.includes('g.page')) return <MapPin size={20} />;
    return <Globe size={20} />;
}

// Helper to extract service name
function getServiceName(url: string | undefined | null) {
    if (!url) return 'Unassigned';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return 'Instagram';
    if (lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp.com')) return 'WhatsApp';
    if (lowerUrl.includes('search.google.com') || lowerUrl.includes('g.page')) return 'Google';
    return 'Website';
}

export default function ProfileDashboard() {
    const { user, isAuthenticated, token, logout } = useConsumerAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        const frameId = requestAnimationFrame(() => setIsHydrated(true));
        return () => cancelAnimationFrame(frameId);
    }, []);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');

    // Scanner State
    const [isScanning, setIsScanning] = useState(false);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Dropdown State
    const [showDropdown, setShowDropdown] = useState(false);

    // Post-scan modal state
    const [scannedToken, setScannedToken] = useState<string | null>(null);
    const [scannedCategory, setScannedCategory] = useState<string | null>(null);
    const [isResolvingToken, setIsResolvingToken] = useState(false);
    const [claimUrl, setClaimUrl] = useState('');
    const [claimError, setClaimError] = useState<string | null>(null);
    const [isOwnQR, setIsOwnQR] = useState(false);
    const [ownQRId, setOwnQRId] = useState<string | null>(null);

    // Track which QR link is copied
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && searchTerm) {
                setSearchTerm('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchTerm]);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push('/');
        }
    }, [isHydrated, isAuthenticated, router]);

    // Fetch QRs using React Query, now passing search term
    const { data: qrs, isLoading, isFetching } = useQuery({
        queryKey: ['my-qrs', debouncedSearchTerm],
        queryFn: async () => {
            const endpoint = debouncedSearchTerm 
                ? `/consumer/qr?q=${encodeURIComponent(debouncedSearchTerm)}`
                : '/consumer/qr';
            const res = await api.get(endpoint, {
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
            setIsOwnQR(false);
            setOwnQRId(null);
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
        
        // Use queryClient to get the cached QRs in case `qrs` is currently filtered by search
        const currentQrs: ConsumerQR[] = queryClient.getQueryData(['my-qrs', '']) || [];
        const myExistingQR = currentQrs.find(qr => qr.token === extractedToken);
        
        if (myExistingQR) {
            setIsOwnQR(true);
            setOwnQRId(myExistingQR.id);
            setClaimUrl(myExistingQR.manual_redirect_url || '');
        } else {
            setIsOwnQR(false);
            setOwnQRId(null);
            setClaimUrl('');
        }
        
        try {
            const res = await api.get(`/qr/dynamic/${extractedToken}/resolve`);
            const { status, redirect_url } = res.data?.data || {};

            if (status === 'assigned' && !myExistingQR) {
                setClaimError('This QR code is already assigned to someone else.');
            }
            
            if (status === 'unassigned' && redirect_url) {
                try {
                    const parsedUrl = new URL(redirect_url);
                    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0 && pathParts[0] !== 'setup' && pathParts[0] !== 'dq') {
                        const rawCategory = decodeURIComponent(pathParts[0]);
                        const formatted = rawCategory.split(/[- ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        setScannedCategory(formatted);
                    }
                } catch (e) {
                    // Ignore
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
            <div className="min-h-screen bg-mochingo-warm-oat flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-mochingo-rich-black" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-mochingo-warm-oat flex items-center justify-center">
                <p className="text-mochingo-rich-black/60 font-medium">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mochingo-warm-oat text-mochingo-rich-black font-sans selection:bg-mochingo-rich-black selection:text-mochingo-warm-oat overflow-x-hidden">
            
            {/* ==========================================================
                HEADER
                ========================================================== */}
            <header className="sticky top-0 z-40 w-full h-[72px] bg-[#F2EDE7]/90 backdrop-blur-2xl border-b" style={{ borderColor: '#D8D1C8' }}>
                <div className="max-w-7xl mx-auto w-full h-full px-6 md:px-12 flex items-center justify-between">
                    
                    {/* Logo */}
                    <Link href="/" className="w-24 md:w-28 relative h-6 md:h-7 hover:opacity-80 transition-opacity">
                        <Image
                            src="/images/brand/mochingo-primary-black.svg"
                            alt="Mochingo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </Link>
                    
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold tracking-wide">
                        <Link href="/profile" className="border-b-2 border-mochingo-rich-black pb-1">Dashboard</Link>
                        <span className="opacity-30 cursor-not-allowed pb-1" title="Coming soon">QR Codes</span>
                        <span className="opacity-30 cursor-not-allowed pb-1" title="Coming soon">Analytics</span>
                    </nav>
                    
                    {/* User Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 group"
                        >
                            <div className="w-9 h-9 rounded-full bg-mochingo-rich-black flex items-center justify-center text-mochingo-warm-oat font-bold text-sm select-none overflow-hidden group-hover:scale-105 transition-transform">
                                {user.profile_picture ? (
                                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user.name[0].toLowerCase()
                                )}
                            </div>
                            <svg className="w-4 h-4 opacity-50 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {showDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                <div className="absolute right-0 mt-3 w-56 bg-mochingo-warm-oat border rounded-xl shadow-2xl z-50 overflow-hidden" style={{ borderColor: '#D8D1C8' }}>
                                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(216,209,200,0.5)' }}>
                                        <p className="text-sm font-bold truncate">{user.name}</p>
                                        <p className="text-xs opacity-60 truncate">{user.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <Link href="#" className="block px-3 py-2 text-sm font-medium hover:bg-black/5 rounded-lg transition-colors">Profile</Link>
                                        <Link href="#" className="block px-3 py-2 text-sm font-medium hover:bg-black/5 rounded-lg transition-colors">Account Settings</Link>
                                    </div>
                                    <div className="p-1 border-t" style={{ borderColor: 'rgba(216,209,200,0.5)' }}>
                                        <button 
                                            onClick={() => {
                                                api.post('/consumer/auth/logout').finally(() => {
                                                    logout();
                                                    router.push('/');
                                                });
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-black/5 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                </div>
            </header>

            {/* ==========================================================
                MAIN CONTENT
                ========================================================== */}
            <main className="w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16 flex flex-col lg:flex-row gap-12 lg:gap-20">
                
                {/* Left Column (Sticky on desktop) */}
                <div className="w-full lg:w-[380px] shrink-0 space-y-12 lg:sticky lg:top-28 self-start">
                    
                    {/* Intro */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-50 mb-4">
                            YOUR DIGITAL TOUCHPOINTS
                        </p>
                        <h1 className="text-4xl md:text-[44px] font-black leading-[0.95] tracking-tight mb-5 max-w-[300px]">
                            Your QR codes.<br />One simple<br />connection.
                        </h1>
                        <p className="text-sm font-medium opacity-75 max-w-[280px] leading-relaxed">
                            Create, manage and connect your physical products to the digital world.
                        </p>
                    </div>

                    {/* Scan Action */}
                    <div className="bg-[#F2EDE7] border rounded-2xl p-6" style={{ borderColor: '#D8D1C8' }}>
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-mochingo-rich-black/5 flex items-center justify-center shrink-0">
                                <ScanLine size={24} />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold uppercase tracking-widest mb-1.5">Scan a new QR code</h3>
                                <p className="text-[13px] opacity-70 leading-relaxed">
                                    Add a new QR code to your collection.<br/>Scan a QR code and instantly assign its destination.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsScanning(true)}
                            className="w-full h-14 bg-mochingo-rich-black text-mochingo-warm-oat rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-3 hover:opacity-90 transition-opacity active:scale-[0.98]"
                        >
                            <ScanLine size={18} />
                            Scan QR Code
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                    
                </div>

                {/* Right Column (QR List & Search) */}
                <div className="flex-1 min-w-0">
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[26px] md:text-3xl font-black tracking-tight">Your QR codes</h2>
                        <span className="text-[13px] opacity-60 font-medium">{qrs?.length || 0} active</span>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            {isFetching && debouncedSearchTerm !== searchTerm ? (
                                <Loader2 size={18} className="animate-spin opacity-50" />
                            ) : (
                                <Search size={18} className="opacity-50" />
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Search QR ID, name or destination"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-[52px] pl-11 pr-10 bg-transparent border rounded-xl text-[15px] font-medium placeholder:opacity-40 outline-none transition-colors"
                            style={{ borderColor: '#D8D1C8', color: 'var(--mochingo-rich-black)' }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--mochingo-rich-black)'}
                            onBlur={(e) => e.target.style.borderColor = '#D8D1C8'}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center opacity-40 hover:opacity-100 transition-opacity"
                                aria-label="Clear search"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* LOADING / EMPTY STATES */}
                    {isLoading && !qrs ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 size={28} className="animate-spin opacity-40" />
                        </div>
                    ) : qrs?.length === 0 ? (
                        <div className="py-16 text-center">
                            {debouncedSearchTerm ? (
                                <>
                                    <h4 className="text-[17px] font-bold mb-2">No QR code found</h4>
                                    <p className="text-[14px] opacity-60">We couldn't find a QR code matching "{debouncedSearchTerm}".<br/>Try searching by QR ID, name or destination.</p>
                                </>
                            ) : (
                                <>
                                    <h4 className="text-[17px] font-bold mb-2">No QR codes yet</h4>
                                    <p className="text-[14px] opacity-60">Create your first digital touchpoint.</p>
                                    <button 
                                        onClick={() => setIsScanning(true)}
                                        className="mt-6 inline-flex h-12 px-6 items-center justify-center border border-mochingo-rich-black rounded-full font-bold text-sm hover:bg-mochingo-rich-black hover:text-mochingo-warm-oat transition-colors"
                                    >
                                        Scan QR Code →
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        /* QR CARDS GRID */
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {qrs.map((qr: ConsumerQR) => (
                                <div 
                                    key={qr.id} 
                                    className="bg-transparent border rounded-xl p-5 flex flex-col justify-between hover:bg-white/40 transition-colors"
                                    style={{ borderColor: '#D8D1C8' }}
                                >
                                    {/* Top Row */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-[52px] h-[52px] rounded-[14px] bg-mochingo-rich-black/5 flex items-center justify-center shrink-0">
                                            {getDestinationIcon(qr.manual_redirect_url)}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-base font-bold truncate leading-none mb-1">{qr.label}</h4>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Active</span>
                                                </div>
                                            </div>
                                            <p className="text-[12px] font-mono opacity-60 uppercase tracking-wide">
                                                {qr.token.length > 20 ? `${qr.token.substring(0, 20)}...` : qr.token}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Destination Area */}
                                    <div className="mb-6">
                                        {editingId === qr.id ? (
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="url" 
                                                    value={editUrl} 
                                                    onChange={(e) => setEditUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    className="flex-1 h-10 px-3 border rounded-lg bg-white/50 text-[13px] font-mono outline-none focus:border-black transition-colors min-w-0"
                                                    style={{ borderColor: '#D8D1C8' }}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && editUrl) updateMutation.mutate({id: qr.id, url: editUrl});
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => updateMutation.mutate({id: qr.id, url: editUrl})}
                                                    disabled={updateMutation.isPending || !editUrl}
                                                    className="h-10 px-4 bg-mochingo-rich-black text-mochingo-warm-oat rounded-lg text-xs font-bold disabled:opacity-50"
                                                >
                                                    {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                                                </button>
                                                <button 
                                                    onClick={() => setEditingId(null)}
                                                    className="w-10 h-10 flex items-center justify-center border rounded-lg hover:bg-black/5"
                                                    style={{ borderColor: '#D8D1C8' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold mb-0.5">{getServiceName(qr.manual_redirect_url)}</span>
                                                <span className="text-[13px] font-mono opacity-60 truncate">
                                                    {qr.manual_redirect_url || <span className="italic">Not assigned</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Meta */}
                                    <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'rgba(216,209,200,0.5)' }}>
                                        <div className="flex items-center gap-2 text-[12px] opacity-60">
                                            <span>Claimed {formatDateTime(qr.assigned_at).split(',')[0]}</span>
                                            <span className="w-1 h-1 rounded-full bg-current opacity-40 mx-1" />
                                            <span>{qr.scan_count} scans</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => {
                                                    const link = `${window.location.origin}/dq/${qr.token}`;
                                                    navigator.clipboard.writeText(link);
                                                    setCopiedId(qr.id);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
                                                    copiedId === qr.id ? 'text-emerald-500' : 'text-mochingo-rich-black/70 hover:text-black'
                                                }`}
                                                title="Copy dynamic redirect link for NFC tags"
                                            >
                                                {copiedId === qr.id ? (
                                                    <>Copied <CheckCircle2 size={12} /></>
                                                ) : (
                                                    <>Copy Link <Link2 size={12} /></>
                                                )}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingId(qr.id);
                                                    setEditUrl(qr.manual_redirect_url || '');
                                                }}
                                                className="flex items-center gap-1.5 text-[12px] font-semibold hover:opacity-60 transition-opacity"
                                            >
                                                Edit <Edit2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                    <div 
                        className="absolute inset-0 bg-mochingo-rich-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
                        onClick={() => { setScannedToken(null); setClaimUrl(''); setClaimError(null); setScannedCategory(null); }} 
                    />
                    
                    <div className="relative w-full max-w-md bg-mochingo-warm-oat border rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200" style={{ borderColor: '#D8D1C8' }}>
                        
                        <div className="flex justify-center mb-6 sm:hidden">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full" />
                        </div>
                        
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
                                    <Link2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight">
                                        {isOwnQR ? 'Update Destination' : scannedCategory ? `Assign ${scannedCategory}` : 'Assign Destination'}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[11px] font-bold uppercase tracking-widest opacity-50">Token</span>
                                        <code className="text-[12px] font-mono font-bold tracking-wider opacity-80 uppercase">
                                            {scannedToken}
                                        </code>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setScannedToken(null); setClaimUrl(''); setClaimError(null); setScannedCategory(null); }} 
                                className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center opacity-50 hover:opacity-100 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {isResolvingToken ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 size={24} className="animate-spin opacity-50 mb-4" />
                                <p className="text-sm font-medium opacity-60">Analyzing QR Code...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {isOwnQR && claimUrl?.includes('/pet/') ? (
                                    <div className="p-5 rounded-2xl bg-black/5 text-center">
                                        <p className="text-sm font-bold">This is your Pet Tag.</p>
                                        <p className="text-xs opacity-70 mt-1 leading-relaxed">You can update the pet's photo, medical records, and your contact information.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-bold uppercase tracking-widest opacity-60">
                                            {scannedCategory ? `${scannedCategory} URL` : 'Destination URL'}
                                        </label>
                                        <input 
                                            type="url"
                                            value={claimUrl}
                                            onChange={e => setClaimUrl(e.target.value)}
                                            placeholder={
                                                scannedCategory?.toLowerCase()?.includes('google') 
                                                    ? "https://g.page/review/..." 
                                                    : scannedCategory?.toLowerCase()?.includes('instagram') 
                                                    ? "https://instagram.com/yourprofile" 
                                                    : scannedCategory?.toLowerCase()?.includes('whatsapp')
                                                    ? "https://wa.me/1234567890"
                                                    : "https://..."
                                            }
                                            className="w-full h-14 px-4 rounded-xl bg-transparent border text-sm font-mono outline-none focus:border-black transition-colors"
                                            style={{ borderColor: '#D8D1C8' }}
                                            autoFocus
                                        />
                                        {scannedCategory && !claimError && (
                                            <div className="mt-1">
                                                <p className="text-xs opacity-60 mb-2">Assign your business {scannedCategory} URL to this QR code.</p>
                                                {scannedCategory.toLowerCase()?.includes('whatsapp') && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button 
                                                            onClick={() => setClaimUrl('https://wa.me/')}
                                                            className="px-2.5 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[11px] font-mono font-medium transition-colors"
                                                        >
                                                            wa.me/
                                                        </button>
                                                        <button 
                                                            onClick={() => setClaimUrl('https://chat.whatsapp.com/')}
                                                            className="px-2.5 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[11px] font-mono font-medium transition-colors"
                                                        >
                                                            chat.whatsapp.com/
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {claimError && (
                                            <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                                {claimError}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {isOwnQR && claimUrl?.includes('/pet/') ? (
                                    <Link href={`/pet-tag?token=${scannedToken}`} className="flex w-full h-14 bg-mochingo-rich-black text-mochingo-warm-oat rounded-xl font-bold text-[15px] items-center justify-center hover:opacity-90 transition-opacity active:scale-[0.98]">
                                        Edit Pet Profile
                                    </Link>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setClaimError(null);
                                            if (scannedCategory?.toLowerCase()?.includes('whatsapp')) {
                                                const url = claimUrl.trim();
                                                if (url === 'https://wa.me/' || url === 'http://wa.me/') {
                                                    setClaimError('Please enter your mobile number.');
                                                    return;
                                                }
                                                if (url === 'https://chat.whatsapp.com/' || url === 'http://chat.whatsapp.com/') {
                                                    setClaimError('Please enter the group code.');
                                                    return;
                                                }
                                            }
                                            
                                            if (isOwnQR && ownQRId) {
                                                updateMutation.mutate({ id: ownQRId, url: claimUrl }, {
                                                    onSuccess: () => {
                                                        setScannedToken(null);
                                                        setScannedCategory(null);
                                                        setClaimUrl('');
                                                        setIsOwnQR(false);
                                                        setOwnQRId(null);
                                                    },
                                                    onError: (err: any) => {
                                                        setClaimError(err.response?.data?.message || 'Failed to update QR');
                                                    }
                                                });
                                            } else {
                                                claimMutation.mutate();
                                            }
                                        }} 
                                        disabled={claimMutation.isPending || updateMutation.isPending || !claimUrl}
                                        className="w-full h-14 bg-mochingo-rich-black text-mochingo-warm-oat rounded-xl font-bold text-[15px] transition-all disabled:opacity-50 flex items-center justify-center active:scale-[0.98]"
                                    >
                                        {(claimMutation.isPending || updateMutation.isPending) ? <Loader2 size={20} className="animate-spin" /> : isOwnQR ? 'Update Destination' : 'Claim & Save'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
