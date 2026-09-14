'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, QrCode } from 'lucide-react';
import api from '@/lib/api';

type HistoryItem = {
    _id: string;
    token: string;
    label: string;
    status: string;
    manual_redirect_url: string;
    assigned_at: string;
    last_reassigned_at: string | null;
    owner_id?: {
        name: string;
        mobile_number: string;
        place: string;
        business: string;
    };
};

export default function StaffHistoryPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        api.get('/admin/sales/history')
            .then(res => {
                setHistory(res.data.data.history);
                setCount(res.data.data.count);
            })
            .catch(err => {
                setError(err.response?.data?.message || 'Failed to fetch history');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const formatTimeAgo = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        const hrs = Math.floor(diff / 60);
        if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
        const days = Math.floor(hrs / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const getDestinationCategory = (url: string) => {
        if (!url) return 'Unknown';
        const l = url.toLowerCase();
        if (l.includes('instagram.com')) return 'Instagram';
        if (l.includes('wa.me') || l.includes('whatsapp')) return 'WhatsApp';
        if (l.includes('search.google.com') || l.includes('g.page')) return 'Google Review';
        return 'Website';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 font-medium p-4 rounded-xl text-center">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-[28px] sm:text-[34px] font-black text-black leading-none mb-3">
                    My assignments
                </h1>
                <p className="text-[13px] font-medium text-black/60 max-w-sm">
                    QR codes assigned by you.
                </p>
                <div className="mt-6 flex items-center gap-3">
                    <div className="px-4 py-2 bg-black text-white rounded-lg inline-flex items-center gap-2">
                        <span className="text-xl font-black leading-none">{count}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total</span>
                    </div>
                </div>
            </div>

            {/* List / Table */}
            {history.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center bg-white/40 border rounded-2xl" style={{ borderColor: '#D8D1C8' }}>
                    <QrCode size={40} className="text-black/20 mb-4" />
                    <h3 className="text-[16px] font-bold text-black mb-2">No Assignments Yet</h3>
                    <p className="text-[13px] text-black/60 mb-6 max-w-sm mx-auto leading-relaxed">
                        You haven't assigned any QR codes to customers yet. Go to the dashboard to scan and assign your first tag!
                    </p>
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className="bg-black hover:bg-black/80 text-white px-6 py-3.5 rounded-xl transition-all font-bold text-[14px] shadow-md active:scale-[0.98]"
                    >
                        Scan QR Code &rarr;
                    </button>
                </div>
            ) : (
                <div className="w-full">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: '#D8D1C8' }}>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 pr-4">QR ID</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 hidden sm:table-cell">CUSTOMER</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 hidden md:table-cell">DESTINATION</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 text-right sm:text-left">ASSIGNED AT</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 pl-4 text-right hidden sm:table-cell">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr 
                                        key={item._id} 
                                        className="border-b border-black/5 hover:bg-black/[0.02] transition-colors group cursor-pointer" 
                                        onClick={() => router.push(`/staff/assign/${item.token}`)}
                                    >
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[#EAE2D8] flex items-center justify-center shrink-0">
                                                    <QrCode size={14} className="text-black" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-black">{item.token}</div>
                                                    <div className="text-[11px] text-black/60 sm:hidden mt-0.5">{item.owner_id?.name || 'Unknown'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="py-4 px-4 hidden sm:table-cell">
                                            <div className="text-[13px] font-medium text-black">{item.owner_id?.name || 'Unknown'}</div>
                                        </td>
                                        
                                        <td className="py-4 px-4 hidden md:table-cell">
                                            <div className="text-[13px] font-medium text-black/70">{getDestinationCategory(item.manual_redirect_url)}</div>
                                        </td>
                                        
                                        <td className="py-4 px-4 text-right sm:text-left">
                                            <div className="text-[12px] font-medium text-black/60">{formatTimeAgo(item.assigned_at)}</div>
                                        </td>
                                        
                                        <td className="py-4 pl-4 text-right hidden sm:table-cell">
                                            <div className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                <span className="text-[12px] font-medium text-black/70">Assigned</span>
                                            </div>
                                        </td>

                                        <td className="py-4 pl-2 text-right sm:hidden">
                                            <ChevronRight size={16} className="text-black/30 inline-block" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
