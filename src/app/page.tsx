import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Mochingo — Dynamic QR Platform',
    description: 'Create permanent QR codes whose destination you can change anytime. Social links, web pages, and more.',
};

export default function LandingPage() {
    return (
        <main className="min-h-screen flex flex-col" style={{ background: '#0a0d16' }}>
            {/* ── Nav ── */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM18 21h3v3h-3z" fill="white" stroke="none"/>
                        </svg>
                    </div>
                    <span className="font-bold text-white text-lg tracking-tight">mochingo</span>
                </div>
                <Link
                    href="/admin/login"
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                >
                    Admin Portal →
                </Link>
            </nav>

            {/* ── Hero ── */}
            <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
                {/* Glow orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div style={{
                        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
                        width: 600, height: 600, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                    }}/>
                    <div style={{
                        position: 'absolute', bottom: '20%', left: '20%',
                        width: 400, height: 400, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    }}/>
                </div>

                <div className="relative z-10 max-w-3xl mx-auto animate-fade-in">
                    {/* Pill badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
                        style={{
                            background: 'rgba(99,102,241,0.12)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            color: '#a5b4fc',
                        }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }}/>
                        Dynamic QR Management Platform
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
                        <span style={{ color: '#f1f5f9' }}>QR codes that</span>
                        <br />
                        <span className="gradient-text">never go stale</span>
                    </h1>

                    <p className="text-lg md:text-xl mb-12 max-w-xl mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
                        Print once, redirect forever. Assign any URL — social media, websites, campaigns —
                        to a permanent physical QR code. Change the destination anytime.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <Link href="/admin/login"
                            className="btn btn-primary btn-lg"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', minWidth: 180 }}>
                            Get Started →
                        </Link>
                        <a href="#features"
                            className="btn btn-outline btn-lg"
                            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                            Learn more
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-4" style={{ color: '#f1f5f9' }}>
                        Everything you need
                    </h2>
                    <p className="text-center mb-16" style={{ color: '#64748b' }}>
                        A complete toolkit for professional QR code management
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: '⚡',
                                title: 'Dynamic QR Codes',
                                desc: 'Create permanent QR codes with editable destinations. Redirect to any URL — change anytime without reprinting.',
                                color: '#6366f1',
                            },
                            {
                                icon: '🎨',
                                title: 'Custom QR Builder',
                                desc: 'Generate branded QR codes with custom colors, logos, and styles. Export in PNG or high-resolution JPEG.',
                                color: '#8b5cf6',
                            },
                            {
                                icon: '📱',
                                title: 'Scan & Assign',
                                desc: 'Use your device camera to scan a printed QR and instantly assign a new URL to it. No typing tokens manually.',
                                color: '#a78bfa',
                            },
                            {
                                icon: '📦',
                                title: 'Batch Management',
                                desc: 'Generate hundreds of QR codes at once. Apply URL templates across an entire batch in one click.',
                                color: '#06b6d4',
                            },
                            {
                                icon: '📄',
                                title: 'PDF Export',
                                desc: 'Export individual or entire batches of QR codes as print-ready PDF files — 60×60mm per page.',
                                color: '#10b981',
                            },
                            {
                                icon: '🔗',
                                title: 'Link Tracking',
                                desc: 'See scan counts and last-scanned timestamps for every dynamic QR code you\'ve deployed.',
                                color: '#f59e0b',
                            },
                        ].map((f) => (
                            <div key={f.title} className="card p-6 hover:border-indigo-500/30 transition-all duration-200"
                                style={{ background: 'rgba(22,27,39,0.7)' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                                    style={{ background: `${f.color}18` }}>
                                    {f.icon}
                                </div>
                                <h3 className="font-semibold mb-2 text-white">{f.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-20 px-6 text-center">
                <div className="max-w-xl mx-auto">
                    <h2 className="text-3xl font-bold mb-4 text-white">Ready to manage your QRs?</h2>
                    <p className="mb-8" style={{ color: '#64748b' }}>
                        Log in to the admin panel to create and manage your QR codes.
                    </p>
                    <Link href="/admin/login"
                        className="btn btn-primary btn-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
                        Open Admin Panel →
                    </Link>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="px-6 py-8 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', color: '#475569' }}>
                <p className="text-sm">© 2025 Mochingo. All rights reserved.</p>
            </footer>
        </main>
    );
}
