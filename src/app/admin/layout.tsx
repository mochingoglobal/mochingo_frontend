'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { QrCode, LogOut, Loader2, LayoutDashboard, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, checkAuth, logout, admin } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
            router.replace('/admin/login');
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (!mounted || isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d16' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
            </div>
        );
    }

    if (!isAuthenticated && pathname !== '/admin/login') {
        return null;
    }

    // Don't wrap login page in sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const navigation = [
        { name: 'QR Management', href: '/admin/qr-management', icon: QrCode },
        { name: 'Categories', href: '/admin/qr-category', icon: LayoutDashboard },
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0d16', color: '#f1f5f9' }}>
            {/* Sidebar */}
            <aside style={{
                width: 'var(--sidebar-width)', flexShrink: 0,
                borderRight: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(22,27,39,0.5)',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Link href="/admin/qr-management" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <QrCode size={16} color="white" />
                        </div>
                        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>Mochingo</span>
                    </Link>
                </div>

                <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.name} href={item.href} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px', borderRadius: 8,
                                background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                                color: isActive ? '#818cf8' : '#94a3b8',
                                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                                transition: 'all 0.15s'
                            }}>
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                            {admin?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{admin?.name}</p>
                            <p style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{admin?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => logout()}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                        }}
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
