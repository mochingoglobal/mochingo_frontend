'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Building2, User, Phone, MapPin, Check, Link2, Smartphone, Star, Camera, Globe } from 'lucide-react';
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
                if (!data || !data.qr) {
                    throw new Error('QR code not found in the system.');
                }
                setQrDetails(data);
                if (data.qr.status === 'assigned') {
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
                setError(err.response?.data?.message || err.message || 'Failed to fetch QR details');
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
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    if (error && !qrDetails) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto animate-fade-in">
                <div className="w-16 h-16 bg-[#EAE2D8] rounded-full flex items-center justify-center mb-6 border" style={{ borderColor: '#D8D1C8' }}>
                    <span className="text-2xl font-black text-black">?</span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-2">
                    SCAN FAILED
                </p>
                <h2 className="text-2xl font-black text-black mb-2">{token}</h2>
                <p className="text-[14px] font-medium text-black/60 mb-10 leading-relaxed max-w-[280px]">
                    This QR code could not be found in your database. It may have been deleted.
                </p>
                
                <button
                    onClick={() => router.push('/staff/dashboard')}
                    className="w-full sm:w-auto bg-black text-white hover:bg-black/80 px-8 py-3.5 rounded-xl transition-all font-bold text-[14px] shadow-md active:scale-[0.98] flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft size={18} />
                    Scan Another QR
                </button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-[#EAE2D8] rounded-full flex items-center justify-center mb-6 border" style={{ borderColor: '#D8D1C8' }}>
                    <Check size={28} className="text-black" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-2">
                    QR ASSIGNED
                </p>
                <h2 className="text-2xl font-black text-black mb-1">{token}</h2>
                <p className="text-sm font-medium text-black/60 mb-10 leading-relaxed">
                    Successfully assigned to:<br/><span className="text-black font-bold">{formData.name}</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className="flex-1 bg-black text-white hover:bg-black/80 px-6 py-3.5 rounded-xl transition-all font-bold text-[14px] shadow-md active:scale-[0.98]"
                    >
                        Scan Another QR
                    </button>
                    <button
                        onClick={() => router.push('/staff/history')}
                        className="flex-1 bg-transparent border border-black/20 text-black hover:bg-black/5 px-6 py-3.5 rounded-xl transition-all font-bold text-[14px] active:scale-[0.98]"
                    >
                        View History
                    </button>
                </div>
            </div>
        );
    }

    const CategoryIcon = isGoogle ? Star : isWhatsapp ? Smartphone : isInstagram ? Camera : Globe;

    return (
        <div className="max-w-2xl mx-auto pb-12">
            
            {/* Header Area */}
            <div className="mb-10">
                <button 
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white/50 border hover:bg-white flex items-center justify-center text-black mb-6 transition-colors shadow-sm"
                    style={{ borderColor: '#D8D1C8' }}
                >
                    <ArrowLeft size={18} />
                </button>
                
                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-2">
                    {isReassign ? 'QR CODE ALREADY ASSIGNED' : 'QR CODE FOUND'}
                </p>
                <h1 className="text-[28px] sm:text-[34px] font-black text-black leading-none mb-4">
                    {token}
                </h1>
                
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-widest border border-black/10 flex items-center gap-1.5 ${isReassign ? 'bg-black/5 text-black/70' : 'bg-black text-white'}`}>
                        <CategoryIcon size={12} />
                        {qrDetails?.category_name || 'Standard QR'}
                    </span>
                    <span className="text-[13px] font-bold text-black/50">
                        Status: <span className={isReassign ? 'text-black' : 'text-[#10b981]'}>{isReassign ? 'ASSIGNED' : 'UNASSIGNED'}</span>
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 font-medium text-sm p-4 rounded-xl mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    {error}
                </div>
            )}

            {/* Assignment Form */}
            <form onSubmit={handleSubmit} className="bg-white/40 border rounded-2xl p-6 sm:p-8" style={{ borderColor: '#D8D1C8' }}>
                
                <h3 className="text-[16px] font-bold text-black mb-6">
                    {isReassign ? 'Update assignment' : 'Assign to customer'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                    <div>
                        <label className="block text-[12px] font-bold text-black/70 mb-1.5 uppercase tracking-wide">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                            <input
                                type="text"
                                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-4 text-[14px] text-black focus:outline-none transition-colors shadow-sm ${fieldErrors.name ? 'border-red-500/50' : 'border-[#D8D1C8] focus:border-black'}`}
                                value={formData.name}
                                onChange={e => {
                                    setFormData(p => ({...p, name: e.target.value}));
                                    if (fieldErrors.name) setFieldErrors(p => ({...p, name: undefined}));
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-black/70 mb-1.5 uppercase tracking-wide">Mobile Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                            <input
                                type="tel"
                                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-4 text-[14px] text-black focus:outline-none transition-colors shadow-sm ${fieldErrors.mobile_number ? 'border-red-500/50' : 'border-[#D8D1C8] focus:border-black'}`}
                                value={formData.mobile_number}
                                onChange={e => {
                                    setFormData(p => ({...p, mobile_number: e.target.value}));
                                    if (fieldErrors.mobile_number) setFieldErrors(p => ({...p, mobile_number: undefined}));
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-black/70 mb-1.5 uppercase tracking-wide">Place / City</label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                            <input
                                type="text"
                                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-4 text-[14px] text-black focus:outline-none transition-colors shadow-sm ${fieldErrors.place ? 'border-red-500/50' : 'border-[#D8D1C8] focus:border-black'}`}
                                value={formData.place}
                                onChange={e => {
                                    setFormData(p => ({...p, place: e.target.value}));
                                    if (fieldErrors.place) setFieldErrors(p => ({...p, place: undefined}));
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-black/70 mb-1.5 uppercase tracking-wide">Business Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                            <input
                                type="text"
                                className="w-full bg-white border rounded-xl py-3 pl-10 pr-4 text-[14px] text-black focus:outline-none focus:border-black transition-colors border-[#D8D1C8] shadow-sm"
                                value={formData.business}
                                placeholder="Optional"
                                onChange={e => setFormData(p => ({...p, business: e.target.value}))}
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-[12px] font-bold text-black/70 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <CategoryIcon size={14} />
                        Destination Link *
                    </label>
                    
                    {isGoogle ? (
                        <div className="space-y-4 bg-black/5 p-5 rounded-xl border border-black/5">
                            <p className="text-[13px] font-medium text-black/70">Search Google Maps Place</p>
                            
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderColor: '#D8D1C8', borderWidth: 1 }}>
                                <GooglePlaceSearch 
                                    onPlaceSelected={(placeId) => {
                                        setFormData(p => ({...p, destination_url: `https://search.google.com/local/writereview?placeid=${placeId}`}));
                                    }}
                                    error={fieldErrors.destination_url}
                                    clearError={() => setFieldErrors(p => ({...p, destination_url: undefined}))}
                                />
                            </div>
                            
                            <div className="pt-4 border-t border-black/10">
                                <label className="block text-[11px] font-bold uppercase text-black/50 mb-2 tracking-wide">Or Enter URL Manually</label>
                                <input
                                    type="url"
                                    className={`w-full bg-white border rounded-xl py-2.5 px-4 text-black focus:outline-none transition-colors text-[13px] shadow-sm ${fieldErrors.destination_url ? 'border-red-500/50' : 'border-[#D8D1C8] focus:border-black'}`}
                                    placeholder="https://g.page/r/..."
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
                            <div className="relative">
                                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30" size={16} />
                                <input
                                    type="url"
                                    className={`w-full bg-white border rounded-xl py-3.5 pl-10 pr-4 text-[14px] font-mono text-black focus:outline-none transition-colors shadow-sm ${fieldErrors.destination_url ? 'border-red-500/50' : 'border-[#D8D1C8] focus:border-black'}`}
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
                                        className="text-[12px] font-mono font-medium bg-black/5 hover:bg-black/10 text-black/70 px-3 py-1.5 rounded-lg border border-black/5 transition-colors"
                                    >
                                        https://wa.me/
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-black/90 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] shadow-md text-[14px]"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={18} className="animate-spin" /> Saving...</>
                        ) : (
                            <>{isReassign ? 'Update Assignment' : 'Assign QR Code'} &rarr;</>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
}
