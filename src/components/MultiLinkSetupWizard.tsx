'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, Plus, Trash2, Camera, MessageCircle, Globe, Star, MapPin, CheckCircle2, GripVertical, AlertCircle, LogIn, Link2, ChevronDown } from 'lucide-react';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import { IconWhatsApp, IconGoogle, IconInstagram } from '@/components/BrandIcons';

interface IMultiLink {
    id: string; // internal for React key
    platform: string;
    url: string;
    label?: string;
}

const PLATFORM_OPTIONS = [
    { value: 'instagram', label: 'Instagram', icon: IconInstagram },
    { value: 'whatsapp', label: 'WhatsApp', icon: IconWhatsApp },
    { value: 'google_review', label: 'Google Review', icon: IconGoogle },
    { value: 'website', label: 'Website', icon: Globe },
    { value: 'location', label: 'Location Map', icon: MapPin },
    { value: 'other', label: 'Other Link', icon: Link2 },
];

export default function MultiLinkSetupWizard({ token, categoryName }: { token: string | null; categoryName: string }) {
    const router = useRouter();
    const { user, login, updateUser, isAuthenticated, _hasHydrated } = useConsumerAuthStore();

    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Profile form state (if missing)
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [place, setPlace] = useState('');
    const [business, setBusiness] = useState('');

    // Links state
    const [links, setLinks] = useState<IMultiLink[]>([
        { id: '1', platform: 'instagram', url: '', label: '' },
    ]);

    useEffect(() => {
        if (isAuthenticated && useConsumerAuthStore.getState().token) {
            api.get('/consumer/auth/me')
                .then((res) => {
                    const serverUser = res.data?.data?.user;
                    if (serverUser) {
                        updateUser(serverUser);
                        if (serverUser.name && !name) setName(serverUser.name);
                        if (serverUser.mobile_number && !mobileNumber) setMobileNumber(serverUser.mobile_number);
                        if (serverUser.place && !place) setPlace(serverUser.place);
                        if (serverUser.business && !business) setBusiness(serverUser.business);
                    }
                })
                .catch(() => {});
        }
    }, [isAuthenticated]);

    const needsName = !user?.name;
    const needsMobile = !user?.mobile_number;
    const needsPlace = !user?.place;
    const isMissingDetails = needsName || needsMobile || needsPlace;

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        setApiError(null);
        try {
            const res = await api.post('/consumer/auth/google', {
                credential: credentialResponse.credential,
            });
            const userData = res.data?.data?.user || res.data?.user;
            const userToken = res.data?.data?.token || res.data?.token;
            login(userData, userToken);
            if (userData) {
                if (userData.name) setName(userData.name);
                if (userData.mobile_number) setMobileNumber(userData.mobile_number);
                if (userData.place) setPlace(userData.place);
                if (userData.business) setBusiness(userData.business ?? '');
            }
        } catch (err: any) {
            setApiError(err.response?.data?.message || 'Failed to authenticate with Google');
        } finally {
            setIsLoading(false);
        }
    };

    const addLink = () => {
        if (links.length >= 5) return;
        setLinks([...links, { id: Math.random().toString(), platform: 'website', url: '', label: '' }]);
    };

    const removeLink = (id: string) => {
        setLinks(links.filter(l => l.id !== id));
    };

    const updateLink = (id: string, field: 'platform' | 'url' | 'label', value: string) => {
        setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        // Validation
        if (isMissingDetails) {
            if (needsName && !name.trim()) return setApiError('Please fill in your name');
            if (needsMobile && !mobileNumber.trim()) return setApiError('Please fill in your mobile number');
            if (needsPlace && !place.trim()) return setApiError('Please fill in your place');
        }

        const validLinks = links.filter(l => l.url.trim() !== '');
        if (validLinks.length === 0) {
            return setApiError('Please provide at least one valid link.');
        }

        setIsLoading(true);
        try {
            await api.post(
                '/consumer/qr/claim',
                {
                    token,
                    qr_type: 'multi_link',
                    multi_links: validLinks.map(l => ({ platform: l.platform, url: l.url.trim(), label: l.label?.trim() || undefined })),
                    name: needsName ? name.trim() : undefined,
                    mobile_number: needsMobile ? mobileNumber.trim() : undefined,
                    place: needsPlace ? place.trim() : undefined,
                    business: business.trim() || undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${useConsumerAuthStore.getState().token}`,
                    },
                }
            );

            updateUser({
                ...(needsName && name ? { name: name.trim() } : {}),
                ...(needsMobile && mobileNumber ? { mobile_number: mobileNumber.trim() } : {}),
                ...(needsPlace && place ? { place: place.trim() } : {}),
                ...(business ? { business: business.trim() } : {}),
            });

            setSuccess(true);
        } catch (err: any) {
            setApiError(err.response?.data?.message || 'Failed to assign QR');
        } finally {
            setIsLoading(false);
        }
    };

    if (!_hasHydrated) return null;

    if (success) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-[#fafafa] border border-slate-200/80 rounded-[32px] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 ring-8 ring-emerald-500/5">
                        <CheckCircle2 size={42} className="text-emerald-600" />
                    </div>
                    <h2 className="text-[24px] font-extrabold text-slate-900 mb-2 tracking-tight">QR Code Activated!</h2>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                        Your multi-link smart tag has been successfully activated.
                    </p>
                    <button
                        onClick={() => router.push('/profile')}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-600/25"
                    >
                        Go to My Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans text-slate-800">
                <div className="w-full max-w-[460px] bg-[#fafafa]/95 backdrop-blur-xl border border-slate-200/90 rounded-[32px] p-6 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.06)] text-center">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-100 text-indigo-600 shadow-xs">
                        <LogIn size={26} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Your Account</h3>
                    <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto leading-relaxed">
                        Please sign in to verify your identity and instantly set up your {categoryName} smart QR code.
                    </p>
                    <div className="flex justify-center bg-[#fafafa] p-3 rounded-2xl border border-slate-200/80">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setApiError('Google Login Failed')}
                            useOneTap
                            shape="pill"
                            theme="outline"
                            size="large"
                            width="280"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f3f0] flex flex-col md:flex-row p-4 sm:p-8 gap-8 font-sans text-slate-900 items-start justify-center">
            
            {/* LEFT FORM SIDE */}
            <div className="w-full max-w-[600px] shrink-0">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-[28px] font-black tracking-tight mb-1 text-[#111]">Set up your {categoryName}</h1>
                        <p className="text-sm text-slate-500 font-medium">Add the links you want to share. You can add up to 5 links.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* LINKS BUILDER */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-black">Add Your Links <span className="text-sm text-slate-400 font-medium">(Max 5)</span></h3>
                            <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600">{links.length} / 5</span>
                        </div>

                        <div className="space-y-3">
                            {links.map((link, index) => {
                                const selectedOption = PLATFORM_OPTIONS.find(p => p.value === link.platform) || PLATFORM_OPTIONS[5];
                                const Icon = selectedOption.icon;

                                return (
                                    <div key={link.id} className="flex gap-3 bg-[#faf9f8] p-4 rounded-2xl border border-black/5 items-start group">
                                        <div className="cursor-grab opacity-30 hover:opacity-100 px-1 mt-2.5">
                                            <GripVertical size={18} />
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col gap-3 min-w-0">
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="relative shrink-0 sm:w-48">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenDropdownId(openDropdownId === link.id ? null : link.id)}
                                                        className={`w-full h-11 pl-9 pr-10 bg-white border rounded-xl text-[13px] font-bold focus:outline-none flex items-center text-left transition-colors ${openDropdownId === link.id ? 'border-black' : 'border-black/10'}`}
                                                    >
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                                            <Icon size={16} />
                                                        </div>
                                                        <span className="flex-1 truncate">{selectedOption.label}</span>
                                                        <div className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none transition-transform ${openDropdownId === link.id ? 'rotate-180 text-black' : 'text-slate-400'}`}>
                                                            <ChevronDown size={16} />
                                                        </div>
                                                    </button>

                                                    {openDropdownId === link.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                                            <div className="absolute z-50 mt-1 w-full bg-white border border-black/10 rounded-xl shadow-xl py-1.5 overflow-hidden">
                                                                {PLATFORM_OPTIONS.map(opt => (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateLink(link.id, 'platform', opt.value);
                                                                            setOpenDropdownId(null);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-[13px] font-bold flex items-center gap-2.5 transition-colors ${link.platform === opt.value ? 'bg-black/5' : 'hover:bg-black/5'}`}
                                                                    >
                                                                        <opt.icon size={16} className={link.platform === opt.value ? 'text-black' : 'text-slate-500'} />
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={link.label || ''}
                                                    onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                                                    placeholder={`Button Text (e.g. ${selectedOption.label})`}
                                                    className="flex-1 h-11 px-4 bg-white border border-black/10 rounded-xl text-[13px] font-bold focus:outline-none focus:border-black min-w-0"
                                                />
                                            </div>
                                            
                                            <input
                                                type="url"
                                                value={link.url}
                                                onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                                                placeholder={
                                                    link.platform === 'instagram' ? 'https://instagram.com/...' :
                                                    link.platform === 'whatsapp' ? 'https://wa.me/...' :
                                                    'Destination URL (https://...)'
                                                }
                                                className="w-full h-11 px-4 bg-white border border-black/10 rounded-xl text-[13px] font-medium focus:outline-none focus:border-black min-w-0"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeLink(link.id)}
                                            className="w-10 h-10 mt-0.5 flex items-center justify-center shrink-0 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {links.length < 5 && (
                            <button
                                type="button"
                                onClick={addLink}
                                className="w-full h-12 mt-4 rounded-xl border-2 border-dashed border-black/10 hover:border-black/30 hover:bg-black/5 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 transition-colors"
                            >
                                <Plus size={16} /> Add another link
                            </button>
                        )}
                    </div>

                    {/* CUSTOMER DETAILS (if missing) */}
                    {isMissingDetails && (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
                            <h3 className="font-bold text-lg text-black mb-4">Your Details <span className="text-sm font-normal text-slate-500">(One-time setup)</span></h3>
                            <div className="space-y-4">
                                {needsName && (
                                    <input type="text" placeholder="Full Name *" value={name} onChange={e => setName(e.target.value)} className="w-full h-12 px-4 bg-[#faf9f8] border border-black/5 rounded-xl text-sm font-medium focus:outline-none focus:border-black" />
                                )}
                                {needsMobile && (
                                    <input type="tel" placeholder="Mobile Number *" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="w-full h-12 px-4 bg-[#faf9f8] border border-black/5 rounded-xl text-sm font-medium focus:outline-none focus:border-black" />
                                )}
                                {needsPlace && (
                                    <input type="text" placeholder="Place / City *" value={place} onChange={e => setPlace(e.target.value)} className="w-full h-12 px-4 bg-[#faf9f8] border border-black/5 rounded-xl text-sm font-medium focus:outline-none focus:border-black" />
                                )}
                                <input type="text" placeholder="Business Name (optional)" value={business} onChange={e => setBusiness(e.target.value)} className="w-full h-12 px-4 bg-[#faf9f8] border border-black/5 rounded-xl text-sm font-medium focus:outline-none focus:border-black" />
                            </div>
                        </div>
                    )}

                    {apiError && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center gap-2">
                            <AlertCircle size={16} /> {apiError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 bg-[#111] hover:bg-black text-white rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Generate QR Code →'}
                    </button>
                </form>
            </div>

            {/* RIGHT PREVIEW SIDE */}
            <div className="hidden md:block w-full max-w-[380px] sticky top-8">
                <div className="mb-4">
                    <h3 className="font-bold text-lg text-black">Preview</h3>
                    <p className="text-sm text-slate-500 font-medium">This is how your QR page will look.</p>
                </div>

                <div className="w-[320px] h-[640px] bg-[#f2ede7] rounded-[48px] border-[8px] border-black overflow-hidden relative shadow-2xl flex flex-col">
                    {/* Notch */}
                    <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                        <div className="w-32 h-6 bg-black rounded-b-2xl"></div>
                    </div>

                    <div className="flex-1 px-6 pt-16 pb-8 overflow-y-auto flex flex-col items-center custom-scrollbar">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-black/5">
                            <img src="/images/brand/m-logo.png" alt="Mochingo" className="w-8 h-8 object-contain opacity-90" />
                        </div>

                        <div className="w-full max-w-[240px] mt-2 mb-6">
                            <p className="text-[12px] font-medium text-black/60 text-center leading-relaxed">
                                Connect with us<br/>All your important links in one place.
                            </p>
                        </div>

                        <div className="w-full space-y-3">
                            {links.filter(l => l.url.trim() !== '').length === 0 ? (
                                <div className="text-center text-sm font-medium text-black/40 py-8 border-2 border-dashed border-black/10 rounded-2xl">
                                    Add links to see preview
                                </div>
                            ) : (
                                links.filter(l => l.url.trim() !== '').map((link, idx) => {
                                    const opt = PLATFORM_OPTIONS.find(p => p.value === link.platform) || PLATFORM_OPTIONS[5];
                                    const Icon = opt.icon;
                                    const defaultLabel = link.platform === 'instagram' ? 'Follow us on Instagram' :
                                                 link.platform === 'whatsapp' ? 'Chat on WhatsApp' :
                                                 link.platform === 'google_review' ? 'Leave a Google Review' :
                                                 link.platform === 'website' ? 'Visit our Website' :
                                                 link.platform === 'location' ? 'Get Directions' : 'View Link';
                                    
                                    return (
                                        <div key={idx} className="w-full bg-white h-14 rounded-2xl flex items-center px-4 shadow-sm border border-black/5 gap-3 opacity-90 transition-transform hover:scale-105">
                                            <Icon size={20} className="text-black shrink-0" />
                                            <span className="flex-1 text-[13px] font-bold text-black truncate">
                                                {link.label || defaultLabel}
                                            </span>
                                            <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                    
                    <div className="py-6 text-center shrink-0">
                        <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Powered by mochingo.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
