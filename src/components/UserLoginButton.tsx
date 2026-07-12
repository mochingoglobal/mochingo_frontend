'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';

export default function UserLoginButton() {
    const { isAuthenticated, user, login, logout } = useConsumerAuthStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        setIsHydrated(true);
    }, []);


    const handleGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            const res = await api.post('/consumer/auth/google', {
                credential: credentialResponse.credential
            });
            const { user: userData, token: userToken } = res.data.data;
            login(userData, userToken);
            setShowLoginModal(false);
            router.push('/profile');
        } catch (err) {
            alert('Failed to login. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isHydrated) {
        return null; // Do not render until hydrated to prevent mismatch
    }

    if (isLoading) {
        return <Loader2 className="animate-spin text-slate-400" size={24} />;
    }

    if (isAuthenticated && user) {
        return (
            <div className="relative">
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-colors overflow-hidden"
                >
                    {user.profile_picture ? (
                        <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="font-bold text-white">{user.name?.[0]}</span>
                    )}
                </button>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-slate-800">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowDropdown(false);
                                router.push('/profile');
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <User size={16} /> My Dashboard
                        </button>
                        <button 
                            onClick={() => {
                                setShowDropdown(false);
                                api.post('/consumer/auth/logout').finally(() => {
                                    logout();
                                    router.push('/');
                                });
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-indigo-500 transition-colors text-slate-300 hover:text-indigo-400"
            >
                <User size={20} />
            </button>

            {showLoginModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-sm relative">
                        <button 
                            onClick={() => setShowLoginModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-400 text-sm">Login to manage your QRs and view your dashboard</p>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => alert('Google Login Failed')}
                                shape="pill"
                                theme="filled_black"
                                size="large"
                                width="250"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
