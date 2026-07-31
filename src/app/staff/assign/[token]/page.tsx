'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Building2, User, Phone, MapPin, CheckCircle2, Link2, Search, Smartphone, Star, Camera, Globe } from 'lucide-react';
import api from '@/lib/api';
import GooglePlaceSearch from '@/components/GooglePlaceSearch';

type FieldErrors = {
    name?: string;
    mobile_number?: string;
    place?: string;
    destination_url?: string;
};

export default function StaffAssignPage() {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrDetails, setQrDetails] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [formData, setFormData] = useState({
        name: '',
        mobile_number: '',
        place: '',
        business: '',
        destination_url: '',
    });

    useEffect(() => {
        if (!token) return;

        api.get(`/qr/dynamic/${token}/resolve`)
            .then(res => {
                const data = res.data.data;
                setQrDetails(data);
                if (data.qr.status === 'assigned') {
                    // Pre-fill data if already assigned (for re-assignment)
                    setFormData({
                        name: data.qr.owner_id?.name || '',
                        mobile_number: data.qr.owner_id?.mobile_number || '',
                        place: data.qr.owner_id?.place || '',
                        business: data.qr.owner_id?.business || '',
                        destination_url: data.qr.manual_redirect_url || '',
                    });
                }
            })
            .catch(err => {
                setError(err.response?.data?.message || 'Failed to fetch QR details');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [token]);

    const isReassign = qrDetails?.qr?.status === 'assigned';
    const categorySlug = (qrDetails?.category_slug || '').toLowerCase();
    const isGoogle = categorySlug.includes('google');
    const isWhatsapp = categorySlug.includes('whatsapp');
    const isInstagram = categorySlug.includes('instagram');

    const validate = () => {
        const errors: FieldErrors = {};
        if (!formData.name.trim()) errors.name = 'Required';
        if (!formData.mobile_number.trim()) errors.mobile_number = 'Required';
        if (!formData.place.trim()) errors.place = 'Required';
        if (!formData.destination_url.trim()) errors.destination_url = 'Required';
        
        if (isWhatsapp) {
            const url = formData.destination_url.trim();
            if (url === 'https://wa.me/' || url === 'http://wa.me/') {
                errors.destination_url = 'Please enter mobile number';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await api.post('/admin/sales/assign-qr', {
                qr_token: token,
                name: formData.name,
                mobile_number: formData.mobile_number,
                place: formData.place,
                business: formData.business,
                destination_url: formData.destination_url,
                isReassign,
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign QR code');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (error && !qrDetails) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
                    {error}
                </div>
                <button onClick={() => router.push('/staff/dashboard')} className="mt-4 text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 w-full">
                    <ArrowLeft size={16} /> Back to Scanner
                </button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Successfully {isReassign ? 'Re-assigned' : 'Assigned'}!</h2>
                <p className="text-slate-400 mb-8 max-w-sm">
                    The QR code has been successfully linked and is now active for {formData.name}.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className="bg-[#161b27] hover:bg-[#1f2638] text-white px-6 py-3 rounded-xl transition-colors border border-white/10"
                    >
                        Scan Another QR
                    </button>
                    <button
                        onClick={() => router.push('/staff/history')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition-colors"
                    >
                        View History
                    </button>
                </div>
            </div>
        );
    }

    const CategoryIcon = isGoogle ? Star : isWhatsapp ? Smartphone : isInstagram ? Camera : Globe;
    const categoryColor = isGoogle ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                        : isWhatsapp ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                        : isInstagram ? 'text-pink-500 bg-pink-500/10 border-pink-500/20'
                        : 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.back()}
                    className="p-2 bg-[#161b27] border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-slate-300 hover:text-white"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        {isReassign ? 'Re-assign QR Code' : 'Assign QR Code'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 font-mono text-sm">{token}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${categoryColor}`}>
                            {qrDetails?.category_name || 'Standard QR'}
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-[#161b27] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-xl space-y-8">
                
                {/* Customer Details */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                        Customer Details
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    className={`w-full bg-[#0a0d16] border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 transition-colors ${fieldErrors.name ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
                                    value={formData.name}
                                    onChange={e => {
                                        setFormData(p => ({...p, name: e.target.value}));
                                        if (fieldErrors.name) setFieldErrors(p => ({...p, name: undefined}));
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Mobile Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="tel"
                                    className={`w-full bg-[#0a0d16] border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 transition-colors ${fieldErrors.mobile_number ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
                                    value={formData.mobile_number}
                                    onChange={e => {
                                        setFormData(p => ({...p, mobile_number: e.target.value}));
                                        if (fieldErrors.mobile_number) setFieldErrors(p => ({...p, mobile_number: undefined}));
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Place / City *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    className={`w-full bg-[#0a0d16] border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 transition-colors ${fieldErrors.place ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
                                    value={formData.place}
                                    onChange={e => {
                                        setFormData(p => ({...p, place: e.target.value}));
                                        if (fieldErrors.place) setFieldErrors(p => ({...p, place: undefined}));
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Business Name (Optional)</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-[#0a0d16] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                                    value={formData.business}
                                    onChange={e => setFormData(p => ({...p, business: e.target.value}))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Destination Details */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                        <CategoryIcon size={16} className={categoryColor.split(' ')[0]} />
                        Destination Link
                    </h3>
                    
                    {isGoogle ? (
                        <div className="space-y-4 bg-[#0a0d16] p-4 rounded-xl border border-white/5">
                            <label className="block text-sm font-medium text-slate-400">Search Google Maps Place *</label>
                            <div className="bg-[#161b27] rounded-lg border border-white/10 p-1">
                                <GooglePlaceSearch 
                                    onPlaceSelected={(placeId) => {
                                        setFormData(p => ({...p, destination_url: `https://search.google.com/local/writereview?placeid=${placeId}`}));
                                    }}
                                    error={fieldErrors.destination_url}
                                    clearError={() => setFieldErrors(p => ({...p, destination_url: undefined}))}
                                />
                            </div>
                            
                            <div className="pt-2 border-t border-white/5">
                                <label className="block text-xs font-medium text-slate-500 mb-1.5">Or Enter Place ID Manually</label>
                                <input
                                    type="text"
                                    className={`w-full bg-[#161b27] border rounded-xl py-3 px-4 text-white focus:outline-none transition-colors font-mono text-sm ${fieldErrors.destination_url ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500'}`}
                                    placeholder="placeid="
                                    value={formData.destination_url}
                                    onChange={e => {
                                        setFormData(p => ({...p, destination_url: e.target.value}));
                                        if (fieldErrors.destination_url) setFieldErrors(p => ({...p, destination_url: undefined}));
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">
                                {qrDetails?.category_name} URL *
                            </label>
                            <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="url"
                                    className={`w-full bg-[#0a0d16] border rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 transition-colors ${fieldErrors.destination_url ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'}`}
                                    placeholder={
                                        isWhatsapp ? 'https://wa.me/1234567890' :
                                        isInstagram ? 'https://instagram.com/username' :
                                        'https://example.com'
                                    }
                                    value={formData.destination_url}
                                    onChange={e => {
                                        setFormData(p => ({...p, destination_url: e.target.value}));
                                        if (fieldErrors.destination_url) setFieldErrors(p => ({...p, destination_url: undefined}));
                                    }}
                                />
                            </div>
                            {isWhatsapp && (
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, destination_url: 'https://wa.me/'}))}
                                        className="text-xs bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg border border-white/5 transition-colors font-mono"
                                    >
                                        https://wa.me/
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-white/10">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={20} className="animate-spin" /> Saving...</>
                        ) : (
                            <>{isReassign ? 'Save Changes' : 'Complete Assignment'} <ArrowLeft className="rotate-180" size={18} /></>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
}
