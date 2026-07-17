'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, CheckCircle2, AlertCircle, Link2, Smartphone, Globe, LogIn, Copy } from 'lucide-react';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import PetTagSetupWizard from '@/components/PetTagSetupWizard';

export function CategorySetupContent({ categorySlug }: { categorySlug: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const { user, login, updateUser, isAuthenticated } = useConsumerAuthStore();
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [mobileNumber, setMobileNumber] = useState(user?.mobile_number || '');
    const [destinationUrl, setDestinationUrl] = useState('');

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
        if (!token) {
            setError('Invalid or missing QR token.');
        }
    }, [token]);

    if (categorySlug?.toLowerCase() === 'pet-tag' || categorySlug?.toLowerCase() === 'pet') {
        return <PetTagSetupWizard token={token} />;
    }

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.post('/consumer/auth/google', {
                credential: credentialResponse.credential
            });
            login(res.data.user, res.data.token);
            if (res.data.user.mobile_number) {
                setMobileNumber(res.data.user.mobile_number);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to authenticate with Google');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!destinationUrl) {
            setError('Please enter a destination URL');
            return;
        }
        if (!user?.mobile_number && !mobileNumber) {
            setError('Please enter your mobile number');
            return;
        }

        if (categorySlug?.toLowerCase()?.includes('whatsapp')) {
            const url = destinationUrl.trim();
            if (url === 'https://wa.me/' || url === 'http://wa.me/') {
                setError('Please enter your mobile number after the link.');
                return;
            }
            if (url === 'https://chat.whatsapp.com/' || url === 'http://chat.whatsapp.com/') {
                setError('Please enter the group invite code after the link.');
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        try {
            // First time saving mobile number to store
            if (!user?.mobile_number && mobileNumber) {
                updateUser({ mobile_number: mobileNumber });
            }

            await api.post('/consumer/qr/claim', {
                token,
                destination_url: destinationUrl,
                mobile_number: mobileNumber
            }, {
                headers: {
                    Authorization: `Bearer ${useConsumerAuthStore.getState().token}`
                }
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign QR');
        } finally {
            setIsLoading(false);
        }
    };

    // Format category slug for display (e.g., "google-review" -> "Google Review")
    const formattedCategory = categorySlug ? categorySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Category';

    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Invalid QR Code</h2>
                    <p className="text-slate-400 leading-relaxed mb-8">This QR code seems to be invalid or missing its unique identification token. Please try scanning it again.</p>
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-emerald-500/10">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-500/5">
                        <CheckCircle2 size={40} className="text-emerald-400" />
                    </div>
                    <h2 className="text-[22px] font-bold text-white mb-2 tracking-tight">QR Assigned Successfully!</h2>
                    <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
                        Your {formattedCategory} QR code has been permanently assigned.
                    </p>
                    
                    <div className="text-left bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-8">
                        <span className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Destination</span>
                        <div className="flex items-center gap-3 text-slate-300 break-all">
                            <Globe size={16} className="shrink-0 text-emerald-400" />
                            <span className="font-mono text-sm">{destinationUrl}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => router.push('/profile')}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                        Go to My Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none -mt-32 -mr-32" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -mb-32 -ml-32" />

            <div className="w-full max-w-[440px] relative z-10">
                
                {/* ── Header Area ── */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-indigo-500/10 border border-indigo-500/20 shadow-inner mb-6">
                        <Link2 size={32} className="text-indigo-400" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-3">
                        Setup QR Code
                    </h1>
                    <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        <span className="text-sm font-medium text-slate-300">
                            {formattedCategory}
                        </span>
                    </div>
                </div>

                {/* ── Main Card ── */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[32px] p-6 sm:p-8 shadow-2xl">
                    
                    {!isAuthenticated ? (
                        /* ── Login State ── */
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <LogIn size={24} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
                            <p className="text-sm text-slate-400 mb-8 max-w-[280px] mx-auto leading-relaxed">
                                Please sign in to configure and claim this {formattedCategory} QR code.
                            </p>
                            <div className="flex justify-center bg-slate-950 p-2 rounded-2xl border border-slate-800/80">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google Login Failed')}
                                    useOneTap
                                    shape="pill"
                                    theme="filled_black"
                                />
                            </div>
                        </div>
                    ) : (
                        /* ── Setup Form State ── */
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* User Info Bar */}
                            <div className="flex items-center gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt="Profile" className="w-11 h-11 rounded-full object-cover border border-slate-700" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                                        {user?.name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
                                    <p className="text-[13px] text-slate-500 truncate">{user?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Mobile Number Input (Only if not already set) */}
                                {!user?.mobile_number && (
                                    <div className="space-y-2">
                                        <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                                            Mobile Number
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Smartphone size={18} className="text-slate-500" />
                                            </div>
                                            <input 
                                                type="tel"
                                                className="w-full h-14 pl-11 pr-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600 text-sm"
                                                placeholder="Enter your mobile number"
                                                value={mobileNumber}
                                                onChange={(e) => setMobileNumber(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Destination URL Input */}
                                <div className="space-y-2">
                                    <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                                        {formattedCategory} URL
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Globe size={18} className="text-slate-500" />
                                        </div>
                                        <input 
                                            type="url"
                                            className="w-full h-14 pl-11 pr-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600 text-[15px] font-mono"
                                            placeholder={
                                                categorySlug.toLowerCase().includes('whatsapp') ? 'https://wa.me/1234567890 or https://chat.whatsapp.com/...' 
                                                : categorySlug.toLowerCase().includes('instagram') ? 'https://instagram.com/yourprofile' 
                                                : categorySlug.toLowerCase().includes('google') ? 'https://g.page/review/...' 
                                                : `https://your-${categorySlug}-link.com`
                                            }
                                            value={destinationUrl}
                                            onChange={(e) => setDestinationUrl(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <p className="text-[12.5px] text-slate-500 leading-relaxed pt-1 px-1">
                                        When someone scans this QR code, they will be instantly redirected to this link.
                                    </p>
                                    {categorySlug.toLowerCase().includes('whatsapp') && (
                                        <div className="flex items-center gap-2 pt-1 px-1 flex-wrap">
                                            <span className="text-[11px] text-slate-400">Quick start:</span>
                                            <button 
                                                type="button"
                                                onClick={() => setDestinationUrl('https://wa.me/')}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono transition-colors"
                                            >
                                                https://wa.me/
                                                <Copy size={12} className="opacity-70" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setDestinationUrl('https://chat.whatsapp.com/')}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono transition-colors"
                                            >
                                                https://chat.whatsapp.com/
                                                <Copy size={12} className="opacity-70" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading || (!destinationUrl)}
                                className="w-full h-14 mt-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <><Loader2 size={20} className="animate-spin" /> Claiming...</>
                                ) : (
                                    'Claim & Assign URL'
                                )}
                            </button>
                        </form>
                    )}
                    
                    {error && (
                        <div className="mt-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useParams } from 'next/navigation';

export default function CategorySetupPage() {
    const params = useParams();
    const categorySlug = typeof params?.categorySlug === 'string' ? params.categorySlug : 'General Setup';
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}>
            <CategorySetupContent categorySlug={categorySlug} />
        </Suspense>
    );
}
