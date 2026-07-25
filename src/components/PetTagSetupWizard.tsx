import React, { useState, useEffect } from 'react';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';
import { Loader2, Camera, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

interface PetTagSetupWizardProps {
    token: string | null;
}

export default function PetTagSetupWizard({ token }: PetTagSetupWizardProps) {
    const { user, login, isAuthenticated } = useConsumerAuthStore();
    const [step, setStep] = useState(1);
    
    // Auth & Loading States
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form Data
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        // Owner Details
        full_name: user?.name || '',
        phone_primary: user?.mobile_number || '',
        phone_alternate: '',
        email: user?.email || '',
        city: '',
        state: '',
        country: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        
        // Pet Details
        pet_name: '',
        species: 'Dog',
        breed: '',
        color: '',
        gender: '',
        date_of_birth: '',
        weight: '',
        size: '',
        microchip_number: '',
        registration_number: '',
        
        // Medical Info
        blood_group: '',
        is_vaccinated: 'false',
        last_vaccination_date: '',
        allergies: '',
        medical_conditions: '',
        current_medications: '',
        special_needs: '',
        vet_name: '',
        vet_phone: '',
        
        // Lost Pet Info & Socials
        reward_offered: '',
        special_instructions: '',
        preferred_contact_method: 'Phone',
        home_address: '',
        social_instagram: '',
        social_facebook: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (token && isAuthenticated) {
            api.get(`/pet-profile/public/${token}`).then(res => {
                if (res.data?.data?.profile) {
                    const p = res.data.data.profile;
                    setIsEditing(true);
                    setFormData(prev => ({
                        ...prev,
                        ...p,
                        is_vaccinated: p.is_vaccinated ? 'true' : 'false'
                    }));
                    if (p.profile_photo_url) {
                        setPhotoPreview(p.profile_photo_url);
                    }
                }
            }).catch(() => {});
        }
    }, [token, isAuthenticated]);

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.post('/consumer/auth/google', {
                credential: credentialResponse.credential
            });
            const userData = res.data.data.user;
            const userToken = res.data.data.token;
            login(userData, userToken);
            setFormData(prev => ({
                ...prev,
                full_name: userData.name || '',
                email: userData.email || '',
                phone_primary: userData.mobile_number || prev.phone_primary
            }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to authenticate');
        } finally {
            setIsLoading(false);
        }
    };

    const submitForm = async () => {
        if (!token) return setError('Invalid QR token');
        if (!formData.pet_name) return setError('Pet Name is required');
        if (!formData.full_name) return setError('Owner Name is required');
        if (!formData.phone_primary) return setError('Primary Phone is required');

        setIsLoading(true);
        setError(null);

        try {
            const submitData = new FormData();
            submitData.append('token', token);
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });
            if (photo) {
                submitData.append('profile_photo', photo);
            }

            await api.post('/pet-profile/setup', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${useConsumerAuthStore.getState().token}`
                }
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create pet profile');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="bg-slate-900 rounded-3xl p-8 border border-emerald-500/20 max-w-md w-full">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Pet Profile Created!</h2>
                    <p className="text-slate-400 mb-6">Your pet's smart tag is now fully active. Anyone who scans it will see their profile and your contact info.</p>
                    <a href="/profile" className="inline-flex h-12 items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold px-6 w-full transition-colors">
                        Go to My Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 py-12 px-4 sm:px-6 flex justify-center">
            <div className="max-w-xl w-full bg-slate-900/80 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl">
                
                {/* Header / Steps Indicator */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">{isEditing ? 'Edit Pet Profile' : 'Setup Pet Tag'}</h1>
                    {!isAuthenticated ? (
                        <p className="text-sm text-slate-400">Please sign in to link this tag to your account.</p>
                    ) : (
                        <div className="flex gap-2 mt-4">
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                {/* Authentication Step */}
                {!isAuthenticated ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <img src="/icons/google.svg" alt="Google" className="w-8 h-8 opacity-50" />
                        </div>
                        <h2 className="text-lg font-medium text-white mb-6">Sign in to continue</h2>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Login Failed')}
                            useOneTap
                        />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Step 1: Basic Pet Info */}
                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">Basic Pet Info</h3>
                                
                                {/* Photo Upload */}
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <label className="relative group cursor-pointer">
                                        <div className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${photoPreview ? 'border-indigo-500' : 'border-slate-700 bg-slate-800 hover:border-indigo-400'}`}>
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-500 group-hover:text-indigo-400">
                                                    <Camera size={28} className="mb-1" />
                                                    <span className="text-xs font-medium">Add Photo</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pet Name *</label>
                                    <input name="pet_name" value={formData.pet_name} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Max" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Species *</label>
                                        <select name="species" value={formData.species} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none">
                                            <option>Dog</option><option>Cat</option><option>Bird</option><option>Rabbit</option><option>Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Breed</label>
                                        <input name="breed" value={formData.breed} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" placeholder="e.g. Golden Retriever" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gender</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none">
                                            <option value="">Select</option><option>Male</option><option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Age / DOB</label>
                                        <input name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" placeholder="e.g. 3 years or YYYY-MM-DD" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Owner Info */}
                        {step === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">Owner Contact Details</h3>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name *</label>
                                    <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Phone *</label>
                                    <input name="phone_primary" value={formData.phone_primary} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alternate Phone</label>
                                    <input name="phone_alternate" value={formData.phone_alternate} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">City</label>
                                        <input name="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">State</label>
                                        <input name="state" value={formData.state} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Medical Info */}
                        {step === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">Medical & Care Info</h3>
                                <div>
                                    <label className="flex items-center gap-3 p-4 border border-slate-700 bg-slate-950 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                                        <input type="checkbox" name="is_vaccinated" checked={formData.is_vaccinated === 'true'} onChange={(e) => setFormData({...formData, is_vaccinated: e.target.checked ? 'true' : 'false'})} className="w-5 h-5 accent-indigo-500" />
                                        <span className="text-sm font-medium text-white">Pet is Vaccinated</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies / Medical Conditions</label>
                                    <textarea name="medical_conditions" value={formData.medical_conditions} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none h-24 resize-none" placeholder="e.g. Allergic to chicken, requires daily medication..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vet Name</label>
                                        <input name="vet_name" value={formData.vet_name} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vet Phone</label>
                                        <input name="vet_phone" value={formData.vet_phone} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Lost Info */}
                        {step === 4 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">Lost Pet Instructions</h3>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Special Instructions for Finders</label>
                                    <textarea name="special_instructions" value={formData.special_instructions} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-indigo-500 outline-none h-24 resize-none" placeholder="e.g. Very friendly but easily scared. Do not chase, lure with food." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reward Offered (Optional)</label>
                                    <input name="reward_offered" value={formData.reward_offered} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" placeholder="e.g. $100 or 'Cash Reward'" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instagram Username (Optional)</label>
                                    <input name="social_instagram" value={formData.social_instagram} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl h-12 px-4 text-white focus:border-indigo-500 outline-none" placeholder="@yourpet" />
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-4 pt-4 border-t border-white/5 mt-8">
                            {step > 1 && (
                                <button type="button" onClick={() => setStep(step - 1)} className="h-14 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center transition-colors">
                                    <ChevronLeft size={20} className="mr-1" /> Back
                                </button>
                            )}
                            {step < 4 ? (
                                <button type="button" onClick={() => setStep(step + 1)} className="h-14 flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition-colors">
                                    Next Step <ChevronRight size={20} className="ml-1" />
                                </button>
                            ) : (
                                <button type="button" onClick={submitForm} disabled={isLoading} className="h-14 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-50">
                                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : isEditing ? 'Update Profile' : 'Complete Setup'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
