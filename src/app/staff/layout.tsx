'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ScanLine, Clock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, checkAuth, logout, admin } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== '/staff/login') {
            const currentUrl = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : encodeURIComponent(pathname);
            router.replace(`/staff/login?redirect=${currentUrl}`);
        } else if (!isLoading && isAuthenticated && admin?.role !== 'sales_staff' && pathname !== '/staff/login') {
            router.replace('/portal-x/qr-management');
        }
    }, [isLoading, isAuthenticated, admin, pathname, router]);

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-mochingo-warm-oat flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-mochingo-rich-black" />
            </div>
        );
    }

    if (!isAuthenticated && pathname !== '/staff/login') {
        return null;
    }

    if (pathname === '/staff/login') {
        return <>{children}</>;
    }

    const navigation = [
        { name: 'Scan QR Code', href: '/staff/dashboard', icon: ScanLine },
        { name: 'My Assignments', href: '/staff/history', icon: Clock },
    ];

    const handleLogout = async () => {
        try {
            await api.post('/admin/auth/logout');
        } catch (e) {
            // Ignore errors
        } finally {
            logout();
            router.push('/staff/login');
        }
    };

    return (
        <div className="min-h-screen bg-[#F2EDE7] text-[#000000] font-sans selection:bg-black selection:text-[#F2EDE7] flex flex-col md:flex-row overflow-x-hidden">
            
            {/* ==========================================================
                MOBILE HEADER
                ========================================================== */}
            <div className="md:hidden flex items-center justify-between px-6 h-16 bg-[#F2EDE7] border-b" style={{ borderColor: '#D8D1C8' }}>
                <Link href="/staff/dashboard" className="w-24 relative h-6 hover:opacity-80 transition-opacity">
                    <Image
                        src="/images/brand/mochingo-primary-black.svg"
                        alt="Mochingo"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </Link>
                
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-black text-[#F2EDE7] flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                        {admin?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* ==========================================================
                DESKTOP SIDEBAR
                ========================================================== */}
            <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r min-h-screen sticky top-0" style={{ borderColor: '#D8D1C8' }}>
                {/* Logo Area */}
                <div className="p-8 pb-10">
                    <Link href="/staff/dashboard" className="block w-32 relative h-8 hover:opacity-80 transition-opacity">
                        <Image
                            src="/images/brand/mochingo-primary-black.svg"
                            alt="Mochingo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </Link>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${
                                    isActive 
                                    ? 'bg-[#EAE2D8] text-black shadow-sm' 
                                    : 'text-black/60 hover:bg-black/5 hover:text-black'
                                }`}
                            >
                                <item.icon size={18} className={isActive ? "opacity-100" : "opacity-70"} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info / Sign Out */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-5 px-2">
                        <div className="w-10 h-10 rounded-full bg-black text-[#F2EDE7] flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                            {admin?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold text-black truncate leading-tight">{admin?.name}</p>
                            <p className="text-[12px] text-black/60 font-medium truncate">{admin?.email}</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-2 text-[13px] font-bold text-black/60 hover:text-black transition-colors"
                    >
                        <LogOut size={16} /> Sign out &rarr;
                    </button>
                </div>
            </aside>

            {/* ==========================================================
                MAIN CONTENT
                ========================================================== */}
            <main className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-64px)] md:min-h-screen pb-20 md:pb-0">
                <div className="flex-1 p-6 sm:p-8 md:p-12 lg:p-16 max-w-[1200px] w-full mx-auto">
                    {children}
                </div>
            </main>

            {/* ==========================================================
                MOBILE BOTTOM NAV
                ========================================================== */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F2EDE7]/90 backdrop-blur-xl border-t z-50 flex items-center justify-around h-16 pb-safe" style={{ borderColor: '#D8D1C8' }}>
                {navigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                                isActive ? 'text-black' : 'text-black/40'
                            }`}
                        >
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

        </div>
    );
}
