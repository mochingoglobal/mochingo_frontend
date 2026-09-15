'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, CheckCircle2, AlertCircle, Link2, Smartphone, Globe, LogIn, Copy, MapPin, Briefcase, User as UserIcon, HelpCircle, ArrowRight, MessageCircle, Camera, Star } from 'lucide-react';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import PetTagSetupWizard from '@/components/PetTagSetupWizard';
import MultiLinkSetupWizard from '@/components/MultiLinkSetupWizard';
import GooglePlaceSearch from '@/components/GooglePlaceSearch';
import GoogleTranslateWidget from '@/components/GoogleTranslateWidget';

// ─── Field-level error map type ─────────────────────────────────────────────
type FieldErrors = {
    name?: string;
    mobile_number?: string;
    place?: string;
    destination_url?: string;
};

// ─── Helper: Category Instructions Generator ───────────────────────────────
function getCategoryInstructions(slug: string, formattedName: string) {
    const s = slug.toLowerCase();
    if (s.includes('google')) {
        return {
            icon: Star,
            iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
            badgeText: 'Google Review Setup',
            title: 'How to configure Google Review?',
            subtitle: 'Turn QR scans into 5-star Google reviews in 3 simple steps:',
            steps: [
                {
                    title: 'Search Your Business Location',
                    desc: 'On the next screen, type your business name or location in the Google Maps search box.'
                },
                {
                    title: 'Select From Dropdown',
                    desc: 'Click your verified listing from the search results to automatically bind your Google Place ID.'
                },
                {
                    title: 'Instant 5-Star Prompt',
                    desc: 'When customers scan this smart tag, they will be taken directly to your Google review submission screen!'
                }
            ]
        };
    } else if (s.includes('whatsapp')) {
        return {
            icon: MessageCircle,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
            badgeText: 'WhatsApp Connect Setup',
            title: 'How to configure WhatsApp?',
            subtitle: 'Enable instant WhatsApp chatting or group invites in seconds:',
            steps: [
                {
                    title: 'Select Your Chat Type',
                    desc: 'Decide whether you want to link your direct WhatsApp number or a community/group invite link.'
                },
                {
                    title: 'Use Quick Start Buttons',
                    desc: 'On the next step, tap our quick link buttons and enter your mobile number with country code (e.g., https://wa.me/919876543210).'
                },
                {
                    title: 'One-Tap Chat Initiation',
                    desc: 'Anyone scanning this QR code will instantly open a WhatsApp conversation with you or join your group!'
                }
            ]
        };
    } else if (s.includes('instagram')) {
        return {
            icon: Camera,
            iconBg: 'bg-pink-50 text-pink-600 border-pink-200/80',
            badgeText: 'Instagram Profile Setup',
            title: 'How to configure Instagram?',
            subtitle: 'Grow your followers and showcase your brand instantly:',
            steps: [
                {
                    title: 'Prepare Your Profile URL',
                    desc: 'Format your link as https://instagram.com/your_username (or copy your profile URL directly from the app).'
                },
                {
                    title: 'Paste & Activate',
                    desc: 'Enter your Instagram URL into the destination box on the next screen and click Activate.'
                },
                {
                    title: 'Instant Profile Access',
                    desc: 'Scanners will be seamlessly redirected to your official Instagram page to view your posts and follow you!'
                }
            ]
        };
    } else {
        return {
            icon: Globe,
            iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
            badgeText: `${formattedName} Setup`,
            title: `How to configure ${formattedName}?`,
            subtitle: 'Link any destination website or online profile easily:',
            steps: [
                {
                    title: 'Prepare Your Destination Link',
                    desc: 'Copy the full website URL, social profile, menu, or landing page you wish to showcase.'
                },
                {
                    title: 'Enter Destination URL',
                    desc: 'On the next screen, paste your link directly into the destination URL field.'
                },
                {
                    title: 'Permanent Smart Tag Link',
                    desc: 'Once activated, scanning this tag will immediately redirect all visitors to your specified webpage!'
                }
            ]
        };
    }
}

export function CategorySetupContent({ categorySlug }: { categorySlug: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const { user, login, updateUser, isAuthenticated, _hasHydrated } = useConsumerAuthStore();

    // Decode URL characters (e.g., "google%20review" → "google review") and format cleanly!
    const decodedSlug = decodeURIComponent(categorySlug || '');
    const formattedCategory = decodedSlug
        ? decodedSlug
              .replace(/[-_]/g, ' ')
              .split(' ')
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
        : 'Category';

    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [success, setSuccess] = useState(false);

    // UX State: Show instructions before going to the assignment form
    const [showInstructions, setShowInstructions] = useState(true);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

    // Form fields — pre-filled from store if available
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [place, setPlace] = useState('');
    const [business, setBusiness] = useState('');
    const [destinationUrl, setDestinationUrl] = useState('');

    const instructions = getCategoryInstructions(decodedSlug, formattedCategory);
    const InstructionIcon = instructions.icon;

    // Automatically sync freshest profile from server so returning users aren't asked again!
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

    // Sync fields whenever store user updates
    useEffect(() => {
        if (user) {
            if (user.name) setName(user.name);
            if (user.mobile_number) setMobileNumber(user.mobile_number);
            if (user.place) setPlace(user.place);
            if (user.business) setBusiness(user.business ?? '');
        }
    }, [user]);

    // Which required fields are still missing for this user?
    const needsName = !user?.name;
    const needsMobile = !user?.mobile_number;
    const needsPlace = !user?.place;
    const isMissingDetails = needsName || needsMobile || needsPlace;

    const isGoogleCategory = decodedSlug.toLowerCase().includes('google');
    const isMultiLink = decodedSlug?.toLowerCase() === 'all-in-one' || decodedSlug?.toLowerCase() === 'linktree' || decodedSlug?.toLowerCase() === 'links' || decodedSlug?.toLowerCase() === 'multi-link';

    if (decodedSlug?.toLowerCase() === 'pet-tag' || decodedSlug?.toLowerCase() === 'pet') {
        return <PetTagSetupWizard token={token} />;
    }

    if (isMultiLink) {
        return <MultiLinkSetupWizard token={token} categoryName={formattedCategory} />;
    }

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

    const validate = (): boolean => {
        const errors: FieldErrors = {};

        if (needsName && !name.trim()) {
            errors.name = 'Please fill in your name';
        }
        if (needsMobile && !mobileNumber.trim()) {
            errors.mobile_number = 'Please fill in your mobile number';
        }
        if (needsPlace && !place.trim()) {
            errors.place = 'Please fill in your place';
        }
        if (!destinationUrl.trim()) {
            errors.destination_url = 'Please provide a valid destination link';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        if (decodedSlug?.toLowerCase()?.includes('whatsapp')) {
            const url = destinationUrl.trim();
            if (url === 'https://wa.me/' || url === 'http://wa.me/') {
                setFieldErrors(prev => ({ ...prev, destination_url: 'Please enter your mobile number after the link.' }));
                return;
            }
            if (url === 'https://chat.whatsapp.com/' || url === 'http://chat.whatsapp.com/') {
                setFieldErrors(prev => ({ ...prev, destination_url: 'Please enter the group invite code after the link.' }));
                return;
            }
        }

        setIsLoading(true);
        setApiError(null);
        try {
            await api.post(
                '/consumer/qr/claim',
                {
                    token,
                    destination_url: destinationUrl,
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

    if (!_hasHydrated) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-[#fafafa] border border-slate-200 rounded-3xl p-8 text-center shadow-xl shadow-slate-100">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
                        <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Invalid QR Code</h2>
                    <p className="text-slate-500 leading-relaxed text-sm mb-8">
                        This QR code appears to be invalid or is missing its unique verification token. Please try scanning it again.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-[#fafafa] border border-slate-200/80 rounded-[32px] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 ring-8 ring-emerald-500/5">
                        <CheckCircle2 size={42} className="text-emerald-600" />
                    </div>
                    <h2 className="text-[24px] font-extrabold text-slate-900 mb-2 tracking-tight">QR Code Activated!</h2>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                        Your <span className="font-semibold text-slate-700">{formattedCategory}</span> smart tag has been permanently linked to your business.
                    </p>

                    <div className="text-left bg-[#fafafa] border border-slate-200/80 rounded-2xl p-4 mb-8 shadow-2xs">
                        <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Active Destination</span>
                        <div className="flex items-center gap-3 text-slate-800 break-all">
                            <Globe size={18} className="shrink-0 text-indigo-600" />
                            <span className="font-mono text-sm text-slate-700 font-medium">{destinationUrl}</span>
                        </div>
                    </div>

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

    // ─── INSTRUCTION SCREEN PHASE ───────────────────────────────────────────────
    if (showInstructions) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 sm:py-12 relative overflow-hidden font-sans text-slate-800">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none -mt-32 -mr-32" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none -mb-32 -ml-32" />

                <div className="w-full max-w-[480px] relative z-10">
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-[#fafafa] border shadow-lg shadow-indigo-500/5 mb-5 ${instructions.iconBg}`}>
                            <InstructionIcon size={32} strokeWidth={2} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2.5">
                            {instructions.title}
                        </h1>
                        <p className="text-sm text-slate-500 max-w-[360px] mx-auto leading-relaxed">
                            {instructions.subtitle}
                        </p>
                    </div>

                    <div className="bg-[#fafafa]/95 backdrop-blur-xl border border-slate-200/90 rounded-[32px] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
                        <div className="space-y-6 mb-8">
                            {instructions.steps.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-[15px] text-slate-900">{step.title}</h3>
                                        <p className="text-xs sm:text-[13.5px] text-slate-500 leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-bold text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-[0_8px_20px_rgba(79,70,229,0.35)] flex items-center justify-center gap-2.5 group cursor-pointer"
                            >
                                <span>Continue to Setup</span>
                                <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4 sm:py-12 relative overflow-hidden font-sans text-slate-800">
            {/* Soft Ambient Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none -mt-32 -mr-32" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px] pointer-events-none -mb-32 -ml-32" />

            <div className="w-full max-w-[460px] relative z-10">

                {/* ── Header Area ── */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-[#fafafa] border border-slate-200/80 shadow-lg shadow-indigo-500/5 mb-4 text-indigo-600">
                        <Link2 size={32} strokeWidth={2} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Setup QR Code</h1>
                    
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                        <div className="inline-flex items-center gap-2 bg-[#fafafa] border border-slate-200/80 px-4 py-1.5 rounded-full shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                            <span className="text-sm font-semibold text-slate-700">{formattedCategory}</span>
                        </div>

                        {/* Interactive instructions trigger button */}
                        <button
                            type="button"
                            onClick={() => setShowInstructions(true)}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 px-3.5 py-1.5 rounded-full shadow-2xs font-bold text-xs transition-all transform active:scale-[0.97] cursor-pointer"
                        >
                            <HelpCircle size={14} className="shrink-0 text-indigo-600" />
                            <span>How to configure?</span>
                        </button>

                        {/* Copy Dynamic Link */}
                        <button
                            type="button"
                            onClick={() => {
                                const link = `${window.location.origin}/dq/${token}`;
                                navigator.clipboard.writeText(link);
                                setIsLinkCopied(true);
                                setTimeout(() => setIsLinkCopied(false), 2000);
                            }}
                            className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-full shadow-2xs font-bold text-xs transition-all transform active:scale-[0.97] cursor-pointer"
                        >
                            {isLinkCopied ? (
                                <>
                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                                    <span className="text-emerald-600">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Link2 size={14} className="shrink-0 text-slate-500" />
                                    <span>Copy Dynamic Link</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Main Card ── */}
                <div className="bg-[#fafafa]/95 backdrop-blur-xl border border-slate-200/90 rounded-[32px] p-6 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">

                    {!isAuthenticated ? (
                        /* ── Login State ── */
                        <div className="text-center py-6">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-indigo-100 text-indigo-600 shadow-xs">
                                <LogIn size={26} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Your Account</h3>
                            <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto leading-relaxed">
                                Please sign in to verify your identity and instantly link this <span className="font-semibold text-slate-700">{formattedCategory}</span> smart QR code.
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
                    ) : (
                        /* ── Setup Form State ── */
                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>



                            {/* ── Customer Info Section ── */}
                            {isMissingDetails && (
                                <div className="space-y-4 pt-1">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-2">
                                            Your Details (One-Time Setup)
                                        </span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>

                                    {/* Name */}
                                    {needsName && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <UserIcon size={18} className="text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    className={`w-full h-14 pl-11 pr-4 bg-[#fafafa] border rounded-2xl focus:outline-none focus:ring-4 transition-all text-slate-900 font-medium placeholder-slate-400 text-sm shadow-xs ${
                                                        fieldErrors.name
                                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                                                    }`}
                                                    placeholder="Enter your full name"
                                                    value={name}
                                                    onChange={(e) => {
                                                        setName(e.target.value);
                                                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                                                    }}
                                                />
                                            </div>
                                            {fieldErrors.name && (
                                                <p className="text-red-500 text-[12px] flex items-center gap-1.5 pl-1 font-medium">
                                                    <AlertCircle size={13} className="shrink-0" />
                                                    {fieldErrors.name}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Mobile Number */}
                                    {needsMobile && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                                                Mobile Number <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Smartphone size={18} className="text-slate-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    className={`w-full h-14 pl-11 pr-4 bg-[#fafafa] border rounded-2xl focus:outline-none focus:ring-4 transition-all text-slate-900 font-medium placeholder-slate-400 text-sm shadow-xs ${
                                                        fieldErrors.mobile_number
                                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                                                    }`}
                                                    placeholder="Enter your WhatsApp / mobile number"
                                                    value={mobileNumber}
                                                    onChange={(e) => {
                                                        setMobileNumber(e.target.value);
                                                        if (fieldErrors.mobile_number) setFieldErrors(prev => ({ ...prev, mobile_number: undefined }));
                                                    }}
                                                />
                                            </div>
                                            {fieldErrors.mobile_number && (
                                                <p className="text-red-500 text-[12px] flex items-center gap-1.5 pl-1 font-medium">
                                                    <AlertCircle size={13} className="shrink-0" />
                                                    {fieldErrors.mobile_number}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Place */}
                                    {needsPlace && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                                                Place / City <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <MapPin size={18} className="text-slate-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    className={`w-full h-14 pl-11 pr-4 bg-[#fafafa] border rounded-2xl focus:outline-none focus:ring-4 transition-all text-slate-900 font-medium placeholder-slate-400 text-sm shadow-xs ${
                                                        fieldErrors.place
                                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                                                    }`}
                                                    placeholder="e.g. Chennai, Mumbai…"
                                                    value={place}
                                                    onChange={(e) => {
                                                        setPlace(e.target.value);
                                                        if (fieldErrors.place) setFieldErrors(prev => ({ ...prev, place: undefined }));
                                                    }}
                                                />
                                            </div>
                                            {fieldErrors.place && (
                                                <p className="text-red-500 text-[12px] flex items-center gap-1.5 pl-1 font-medium">
                                                    <AlertCircle size={13} className="shrink-0" />
                                                    {fieldErrors.place}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Business Name */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                                            Business Name{' '}
                                            <span className="text-slate-400 normal-case font-medium">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Briefcase size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full h-14 pl-11 pr-4 bg-[#fafafa] border border-slate-300 rounded-2xl focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-900 font-medium placeholder-slate-400 text-sm shadow-xs"
                                                placeholder="e.g. Bakery, Salon, Restaurant…"
                                                value={business}
                                                onChange={(e) => setBusiness(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Destination URL / Place Search ── */}
                            <div className="space-y-2 pt-2">
                                {isMissingDetails && (
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-2">
                                            QR Destination
                                        </span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                )}
                                
                                {isGoogleCategory ? (
                                    <>
                                        <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wider">
                                            Find Your Business on Google <span className="text-red-500">*</span>
                                        </label>
                                        <GooglePlaceSearch 
                                            onPlaceSelected={(placeId) => {
                                                setDestinationUrl(`https://search.google.com/local/writereview?placeid=${placeId}`);
                                            }}
                                            error={fieldErrors.destination_url}
                                            clearError={() => setFieldErrors(prev => ({ ...prev, destination_url: undefined }))}
                                        />
                                        <p className="text-[12.5px] text-slate-500 leading-relaxed px-1">
                                            Select your location above. Customers who scan this tag will be directly prompted to leave a 5-star Google Review.
                                        </p>

                                        <div className="mt-5 pt-4 border-t border-slate-200/80">
                                            <label className="block text-[11.5px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                Or Enter Place ID Manually
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    <span className="text-slate-500 font-mono text-[13px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-semibold">placeid=</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    className={`w-full h-12 pl-[98px] pr-4 bg-[#fafafa]/70 border rounded-xl focus:outline-none focus:bg-[#fafafa] focus:ring-4 transition-all text-slate-900 font-mono text-[14px] ${
                                                        fieldErrors.destination_url
                                                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                                            : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                                                    }`}
                                                    placeholder="ChIJ..."
                                                    value={destinationUrl.startsWith('https://search.google.com/local/writereview?placeid=') 
                                                        ? destinationUrl.replace('https://search.google.com/local/writereview?placeid=', '') 
                                                        : ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value.trim();
                                                        setDestinationUrl(val ? `https://search.google.com/local/writereview?placeid=${val}` : '');
                                                        if (fieldErrors.destination_url) setFieldErrors(prev => ({ ...prev, destination_url: undefined }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wider">
                                            {formattedCategory} Destination URL <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Globe size={18} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="url"
                                                className={`w-full h-14 pl-11 pr-4 bg-[#fafafa] border rounded-2xl focus:outline-none focus:ring-4 transition-all text-slate-900 font-medium placeholder-slate-400 text-[14.5px] shadow-xs ${
                                                    fieldErrors.destination_url
                                                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                                        : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                                                }`}
                                                placeholder={
                                                    decodedSlug.toLowerCase().includes('whatsapp')
                                                        ? 'https://wa.me/1234567890 or https://chat.whatsapp.com/...'
                                                        : decodedSlug.toLowerCase().includes('instagram')
                                                        ? 'https://instagram.com/yourprofile'
                                                        : `https://your-${decodedSlug.toLowerCase().replace(/\s+/g, '-')}-link.com`
                                                }
                                                value={destinationUrl}
                                                onChange={(e) => {
                                                    setDestinationUrl(e.target.value);
                                                    if (fieldErrors.destination_url) setFieldErrors(prev => ({ ...prev, destination_url: undefined }));
                                                }}
                                            />
                                        </div>
                                        {fieldErrors.destination_url && (
                                            <p className="text-red-500 text-[12px] flex items-center gap-1.5 pl-1 font-medium">
                                                <AlertCircle size={13} className="shrink-0" />
                                                {fieldErrors.destination_url}
                                            </p>
                                        )}
                                        {decodedSlug.toLowerCase().includes('whatsapp') && (
                                            <div className="flex items-center gap-2 pt-1 px-1 flex-wrap">
                                                <span className="text-[11px] font-semibold text-slate-500">Quick start:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setDestinationUrl('https://wa.me/')}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono transition-colors border border-slate-200"
                                                >
                                                    https://wa.me/
                                                    <Copy size={12} className="opacity-60" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDestinationUrl('https://chat.whatsapp.com/')}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono transition-colors border border-slate-200"
                                                >
                                                    https://chat.whatsapp.com/
                                                    <Copy size={12} className="opacity-60" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 mt-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-bold text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-[0_8px_20px_rgba(79,70,229,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2.5"
                            >
                                {isLoading ? (
                                    <><Loader2 size={20} className="animate-spin" /> Saving & Activating...</>
                                ) : (
                                    'Claim & Activate Smart Tag'
                                )}
                            </button>
                        </form>
                    )}

                    {apiError && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-3 shadow-xs">
                            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-600 text-sm font-medium leading-relaxed">{apiError}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CategorySetupPage() {
    const params = useParams();
    const categorySlug = typeof params?.categorySlug === 'string' ? params.categorySlug : 'General Setup';
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={34} /></div>}>
            <GoogleTranslateWidget />
            <CategorySetupContent categorySlug={categorySlug} />
        </Suspense>
    );
}
