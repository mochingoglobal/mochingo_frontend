'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { QrCode, LogOut, Loader2, LayoutDashboard, Users, Briefcase, Activity } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, checkAuth, logout, admin } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== '/portal-x/login') {
            router.replace('/portal-x/login');
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (!mounted || isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d16' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
            </div>
        );
    }

    if (!isAuthenticated && pathname !== '/portal-x/login') {
        return null;
    }

    // Don't wrap login page in sidebar
    if (pathname === '/portal-x/login') {
        return <>{children}</>;
    }

    const navigation = [
        { name: 'QR Management', href: '/portal-x/qr-management', icon: QrCode },
        { name: 'Analytics', href: '/portal-x/analytics', icon: Activity },
        { name: 'Categories', href: '/portal-x/qr-category', icon: LayoutDashboard },
        { name: 'Users', href: '/portal-x/users', icon: Users },
        { name: 'Staff', href: '/portal-x/staff', icon: Briefcase },
    ];

    return (
        <div className="min-h-screen bg-[#0a0d16] text-slate-100 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#161b27]/90 backdrop-blur-md sticky top-0 z-20">
                <Link href="/portal-x/qr-management" className="flex items-center gap-2 text-white font-bold text-lg">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <QrCode size={16} />
                    </div>
                    Mochingo
                </Link>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0d16] md:bg-[#161b27]/50 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-white/5 hidden md:block">
                    <Link href="/portal-x/qr-management" className="flex items-center gap-2 text-white font-bold text-lg">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <QrCode size={16} />
                        </div>
                        Mochingo
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-semibold shrink-0">
                            {admin?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-100 text-[13px] font-semibold truncate">{admin?.name}</p>
                            <p className="text-slate-500 text-[11px] truncate">{admin?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[13px] font-medium hover:bg-red-500/20 transition-colors"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-[calc(100vh-65px)] md:h-screen">
                <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
