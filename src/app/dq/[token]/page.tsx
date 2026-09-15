'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import type { ResolveQRResponse, IMultiLink } from '@/types/qr.types';
import { Camera, MessageCircle, Star, Globe, MapPin, Link2 } from 'lucide-react';
import { IconWhatsApp, IconGoogle, IconInstagram } from '@/components/BrandIcons';

export default function DQRedirectPage() {
    const params = useParams();
    const token = params?.token as string;
    const [status, setStatus] = useState<'loading' | 'redirecting' | 'unassigned' | 'disabled' | 'missing' | 'multi_link_view'>('loading');
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
    const [multiLinks, setMultiLinks] = useState<IMultiLink[]>([]);

    useEffect(() => {
        if (!token) { setStatus('missing'); return; }
        const resolve = async () => {
            try {
                const res = await api.get<{ status: boolean; data: ResolveQRResponse }>(`/qr/dynamic/${token}/resolve`);
                const data = res.data.data;
                
                if (data.status === 'assigned') {
                    if (data.qr_type === 'multi_link') {
                        setMultiLinks(data.multi_links || []);
                        setStatus('multi_link_view');
                    } else if (data.redirect_url) {
                        setRedirectUrl(data.redirect_url);
                        setStatus('redirecting');
                        setTimeout(() => { window.location.replace(data.redirect_url); }, 500);
                    } else {
                        setStatus('unassigned');
                    }
                } else if (data.status === 'unassigned' && data.redirect_url) {
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

    if (status === 'multi_link_view') {
        return (
            <div className="min-h-screen bg-[#f2ede7] flex flex-col font-sans">
                <div className="flex-1 max-w-[420px] w-full mx-auto bg-[#f2ede7] px-6 pt-16 pb-12 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-black/5">
                        <img src="/images/brand/m-logo.png" alt="Mochingo" className="w-8 h-8 object-contain opacity-90" />
                    </div>

                    <div className="w-full text-center mt-2 mb-8">
                        <p className="text-[14px] font-medium text-black/60 leading-relaxed">
                            Connect with us<br/>All your important links in one place.
                        </p>
                    </div>

                    <div className="w-full space-y-3">
                        {multiLinks.map((link, idx) => {
                            let Icon: any = Link2;
                            let defaultLabel = 'View Link';
                            
                            if (link.platform === 'instagram') { Icon = IconInstagram; defaultLabel = 'Follow us on Instagram'; }
                            else if (link.platform === 'whatsapp') { Icon = IconWhatsApp; defaultLabel = 'Chat on WhatsApp'; }
                            else if (link.platform === 'google_review') { Icon = IconGoogle; defaultLabel = 'Leave a Google Review'; }
                            else if (link.platform === 'website') { Icon = Globe; defaultLabel = 'Visit our Website'; }
                            else if (link.platform === 'location') { Icon = MapPin; defaultLabel = 'Get Directions'; }

                            return (
                                <a 
                                    key={idx} 
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-white min-h-[60px] rounded-2xl flex items-center px-5 shadow-sm border border-black/5 gap-4 transition-transform hover:scale-105 active:scale-95"
                                >
                                    <Icon size={22} className="text-black shrink-0" />
                                    <span className="flex-1 text-[14px] font-bold text-black truncate py-2">
                                        {link.label || defaultLabel}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
                <div className="py-8 text-center bg-[#f2ede7]">
                    <span className="text-[11px] font-bold text-black/40 uppercase tracking-widest">Powered by mochingo.</span>
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
