'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Briefcase } from 'lucide-react';

export default function StaffLoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, isLoading, checkAuth, admin } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && isAuthenticated && admin?.role === 'sales_staff') {
            router.replace('/staff/dashboard');
        } else if (!isLoading && isAuthenticated && (admin?.role === 'admin' || admin?.role === 'super_admin')) {
            router.replace('/portal-x/qr-management'); // Redirect real admins out of here
        }
    }, [isLoading, isAuthenticated, admin, router]);

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0d16] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            // Redirection is handled by the useEffect above
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0d16] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161b27] border border-white/5 rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                        <Briefcase className="text-white" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Staff Portal</h1>
                    <p className="text-slate-400 mt-2">Sign in to your sales account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="sales@example.com"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0a0d16] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
