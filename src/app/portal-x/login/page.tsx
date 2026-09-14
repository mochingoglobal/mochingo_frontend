'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, QrCode } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminLoginPage() {
    const router = useRouter();
    const login = useAuthStore((s) => s.login);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/portal-x/qr-management');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email.trim(), password);
            const searchParams = new URLSearchParams(window.location.search);
            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl && redirectUrl.startsWith('/portal-x')) {
                router.replace(redirectUrl);
            } else {
                router.replace('/portal-x/qr-management');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--mochingo-rich-black)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            {/* Background pattern/glow */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 600px 500px at 50% 0%, rgba(242, 237, 231, 0.05) 0%, transparent 70%)',
            }}/>

            <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }} className="animate-fade-in">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                        background: 'var(--mochingo-warm-oat)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 40px rgba(242, 237, 231, 0.1)',
                    }}>
                        <QrCode size={28} color="var(--mochingo-rich-black)" />
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--mochingo-warm-oat)', marginBottom: 6 }}>
                        Welcome back
                    </h1>
                    <p style={{ color: 'rgba(242, 237, 231, 0.6)', fontSize: 14 }}>Sign in to Mochingo Admin</p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: '28px 28px', background: 'rgba(242, 237, 231, 0.05)', borderColor: 'rgba(242, 237, 231, 0.1)' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Email */}
                        <div>
                            <label className="label" style={{ color: 'var(--mochingo-warm-oat)' }} htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                style={{ background: 'rgba(242, 237, 231, 0.05)', borderColor: 'rgba(242, 237, 231, 0.1)', color: 'var(--mochingo-warm-oat)' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="label" style={{ color: 'var(--mochingo-warm-oat)' }} htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="password"
                                    type={showPw ? 'text' : 'password'}
                                    className="input"
                                    style={{ paddingRight: 44, background: 'rgba(242, 237, 231, 0.05)', borderColor: 'rgba(242, 237, 231, 0.1)', color: 'var(--mochingo-warm-oat)' }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(242, 237, 231, 0.6)',
                                        display: 'flex', alignItems: 'center', padding: 0,
                                    }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                color: 'var(--danger)',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !email || !password}
                            style={{
                                background: 'var(--mochingo-warm-oat)',
                                color: 'var(--mochingo-rich-black)',
                                border: 'none', padding: '11px 0', fontSize: 14, fontWeight: 600,
                                boxShadow: '0 4px 14px rgba(242, 237, 231, 0.1)',
                                marginTop: 4,
                            }}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
