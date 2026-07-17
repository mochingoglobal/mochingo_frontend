'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Phone, PhoneCall, Mail, MapPin, AlertTriangle, ShieldCheck, User as UserIcon, Calendar, HeartPulse, Stethoscope, Camera, Users, Globe } from 'lucide-react';
import api from '@/lib/api';

interface PetProfileData {
    // Owner Details
    full_name: string;
    phone_primary: string;
    phone_alternate?: string;
    email?: string;
    city?: string;
    state?: string;
    country?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    
    // Pet Details
    pet_name: string;
    species: string;
    breed?: string;
    color?: string;
    gender?: string;
    date_of_birth?: string;
    weight?: string;
    size?: string;
    microchip_number?: string;
    registration_number?: string;
    
    // Medical Information
    blood_group?: string;
    is_vaccinated?: boolean;
    last_vaccination_date?: string;
    allergies?: string;
    medical_conditions?: string;
    current_medications?: string;
    special_needs?: string;
    vet_name?: string;
    vet_phone?: string;
    
    // Lost Pet Information
    reward_offered?: string;
    special_instructions?: string;
    preferred_contact_method?: string;
    home_address?: string;
    
    // Media & Socials
    profile_photo_url?: string;
    social_instagram?: string;
    social_facebook?: string;
    social_website?: string;
}

export default function PublicPetProfile() {
    const params = useParams();
    const token = params.token as string;
    
    const [profile, setProfile] = useState<PetProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        
        const fetchProfile = async () => {
            try {
                const res = await api.get(`/pet-profile/public/${token}`);
                setProfile(res.data.data.profile);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load pet profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle size={64} className="text-red-500 mb-4 opacity-80" />
                <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
                <p className="text-slate-400 max-w-sm">{error || "This pet tag hasn't been set up yet or the profile was removed."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-20 selection:bg-indigo-500/30 selection:text-white">
            {/* Header Image Area */}
            <div className="relative w-full h-72 sm:h-96 bg-slate-900 overflow-hidden">
                {profile.profile_photo_url ? (
                    <>
                        <img src={profile.profile_photo_url} alt={profile.pet_name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-slate-900 flex items-center justify-center">
                        <span className="text-indigo-400/50 font-bold text-6xl">
                            {profile.pet_name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                
                {/* Pet Name & Badge */}
                <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-1">{profile.pet_name}</h1>
                            <p className="text-lg font-medium text-slate-300 drop-shadow-md">
                                {profile.breed ? `${profile.breed} • ` : ''}{profile.species}
                            </p>
                        </div>
                        {profile.is_vaccinated && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-md">
                                <ShieldCheck size={16} className="text-emerald-400" />
                                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Vaccinated</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-5 sm:px-6 -mt-2 relative z-10 space-y-6">
                
                {/* Contact Owner Quick Actions */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
                    <a href={`tel:${profile.phone_primary}`} className="flex items-center justify-center gap-2 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-colors">
                        <PhoneCall size={20} />
                        Call Owner
                    </a>
                    {profile.preferred_contact_method?.toLowerCase() === 'whatsapp' ? (
                        <a href={`https://wa.me/${profile.phone_primary.replace(/[^0-9]/g, '')}`} className="flex items-center justify-center gap-2 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold shadow-lg shadow-[#25D366]/25 transition-colors">
                            <Phone size={20} />
                            WhatsApp
                        </a>
                    ) : profile.email ? (
                        <a href={`mailto:${profile.email}`} className="flex items-center justify-center gap-2 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl font-bold transition-colors">
                            <Mail size={20} />
                            Email
                        </a>
                    ) : (
                        <a href={`sms:${profile.phone_primary}`} className="flex items-center justify-center gap-2 h-14 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl font-bold transition-colors">
                            <Mail size={20} />
                            Text
                        </a>
                    )}
                </div>

                {/* Important Instructions Alert (if any) */}
                {(profile.special_instructions || profile.reward_offered) && (
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 mt-6">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={24} />
                        <div>
                            <h3 className="text-amber-400 font-bold mb-1">Important Instructions</h3>
                            {profile.special_instructions && <p className="text-slate-300 text-sm leading-relaxed mb-2">{profile.special_instructions}</p>}
                            {profile.reward_offered && <p className="text-amber-300 text-sm font-bold bg-amber-500/10 inline-block px-2 py-1 rounded">Reward: {profile.reward_offered}</p>}
                        </div>
                    </div>
                )}

                {/* Owner Information */}
                <section className="bg-slate-900 rounded-3xl p-6 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-2 text-white mb-5">
                        <UserIcon size={20} className="text-indigo-400" />
                        <h2 className="text-lg font-bold">Owner Information</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Owner Name</p>
                            <p className="font-medium text-slate-200">{profile.full_name}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Phone</p>
                            <p className="font-medium text-slate-200">{profile.phone_primary}</p>
                        </div>
                        {(profile.city || profile.state) && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</p>
                                <p className="font-medium text-slate-200">
                                    {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        )}
                        {profile.emergency_contact_phone && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency Contact</p>
                                <p className="font-medium text-slate-200">{profile.emergency_contact_name} ({profile.emergency_contact_phone})</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Medical & Care */}
                <section className="bg-slate-900 rounded-3xl p-6 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-2 text-white mb-5">
                        <HeartPulse size={20} className="text-rose-400" />
                        <h2 className="text-lg font-bold">Medical & Care</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                        {profile.medical_conditions && (
                            <div className="col-span-full">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Medical Conditions</p>
                                <p className="font-medium text-rose-300">{profile.medical_conditions}</p>
                            </div>
                        )}
                        {profile.allergies && (
                            <div className="col-span-full">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Allergies</p>
                                <p className="font-medium text-rose-300">{profile.allergies}</p>
                            </div>
                        )}
                        {profile.current_medications && (
                            <div className="col-span-full">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Medications</p>
                                <p className="font-medium text-slate-200">{profile.current_medications}</p>
                            </div>
                        )}
                        {profile.vet_name && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Veterinarian</p>
                                <p className="font-medium text-slate-200">{profile.vet_name} {profile.vet_phone && `- ${profile.vet_phone}`}</p>
                            </div>
                        )}
                        {profile.microchip_number && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Microchip No.</p>
                                <p className="font-medium text-slate-200">{profile.microchip_number}</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Socials */}
                {(profile.social_instagram || profile.social_facebook || profile.social_website) && (
                    <div className="flex justify-center gap-4 mt-8">
                        {profile.social_instagram && (
                            <a href={`https://instagram.com/${profile.social_instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 transition-all">
                                <Camera size={22} />
                            </a>
                        )}
                        {profile.social_facebook && (
                            <a href={profile.social_facebook} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all">
                                <Users size={22} />
                            </a>
                        )}
                        {profile.social_website && (
                            <a href={profile.social_website} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                                <Globe size={22} />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
