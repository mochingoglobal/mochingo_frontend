'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import type { ResolveQRResponse } from '@/types/qr.types';

export default function DQRedirectPage() {
    const params = useParams();
    const token = params?.token as string;
    const [status, setStatus] = useState<'loading' | 'redirecting' | 'unassigned' | 'disabled' | 'missing'>('loading');
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!token) { setStatus('missing'); return; }
        const resolve = async () => {
            try {
                const res = await api.get<{ status: boolean; data: ResolveQRResponse }>(`/qr/dynamic/${token}/resolve`);
                const data = res.data.data;
                if ((data.status === 'assigned' || data.status === 'unassigned') && data.redirect_url) {
                    setRedirectUrl(data.redirect_url);
                    setStatus('redirecting');
                    setTimeout(() => { window.location.replace(data.redirect_url); }, 500);
                } else if (data.status === 'disabled') {
                    setStatus('disabled');
                } else if (data.status === 'missing') {
                    setStatus('missing');
                } else {
                    setStatus('unassigned');
                }
            } catch {
                setStatus('missing');
            }
        };
        resolve();
    }, [token]);

    const messages: Record<string, { title: string; desc: string; icon: string; color: string }> = {
        loading: { title: 'Looking up QR code…', desc: 'Please wait a moment.', icon: '⏳', color: '#6366f1' },
        redirecting: { title: 'Redirecting you now!', desc: redirectUrl ?? '', icon: '→', color: '#10b981' },
        unassigned: { title: 'QR Not Yet Assigned', desc: 'This QR code exists but has no destination URL assigned yet.', icon: '🔗', color: '#f59e0b' },
        disabled: { title: 'QR Code Disabled', desc: 'This QR code has been disabled by the administrator.', icon: '🚫', color: '#ef4444' },
        missing: { title: 'QR Code Not Found', desc: 'This QR code doesn\'t exist or has been removed.', icon: '?', color: '#94a3b8' },
    };

    const msg = messages[status] || messages.missing;

    if (status === 'loading' || status === 'redirecting') {
        return (
            <div className="qr-loader-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <style>{`
                    .qr-loader-bg { background-color: #ffffff; }
                    .qr-spinner { border: 3px solid #f1f5f9; border-top-color: #0f172a; width: 40px; height: 40px; border-radius: 50%; animation: spin 0.8s linear infinite; }
                    .qr-powered { color: #cbd5e1; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
                
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="qr-spinner"></div>
                </div>
                
                <div style={{ paddingBottom: '10px', textAlign: 'center' }}>
                    <span className="qr-powered" style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.05em' }}>
                        powered by mochingo
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0d16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: 420,
                animation: 'fadeIn 0.3s ease',
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: `${msg.color}18`, border: `2px solid ${msg.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, margin: '0 auto 24px',
                }}>
                    {msg.icon}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 8, padding: '6px 14px',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 600 }}>mochingo</span>
                    </div>
                </div>

                <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{msg.title}</h1>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, wordBreak: 'break-all' }}>{msg.desc}</p>

                {(status === 'unassigned' || status === 'missing' || status === 'disabled') && (
                    <a href="/" style={{
                        display: 'inline-block', marginTop: 28,
                        padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                        background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.3)', textDecoration: 'none',
                    }}>
                        ← Back to Mochingo
                    </a>
                )}
            </div>
        </div>
    );
}
