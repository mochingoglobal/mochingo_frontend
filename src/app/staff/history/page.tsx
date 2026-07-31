'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, History, QrCode, ExternalLink, Calendar, MapPin, User, Pencil } from 'lucide-react';
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

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <History className="text-indigo-500" />
                        My Assignments
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        View and manage the QR codes you have assigned to customers.
                    </p>
                </div>
                <div className="bg-[#161b27] border border-white/5 rounded-2xl px-6 py-3 text-center shadow-lg">
                    <div className="text-3xl font-extrabold text-white">{count}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Assigned</div>
                </div>
            </div>

            {history.length === 0 ? (
                <div className="bg-[#161b27] border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                    <QrCode size={48} className="text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Assignments Yet</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        You haven't assigned any QR codes to customers yet. Go to the dashboard to scan and assign your first tag!
                    </p>
                    <button
                        onClick={() => router.push('/staff/dashboard')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium"
                    >
                        Scan QR Code
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {history.map((item) => (
                        <div key={item._id} className="bg-[#161b27] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{item.owner_id?.name || 'Unknown'}</h3>
                                    {item.owner_id?.business && (
                                        <p className="text-sm text-indigo-400 font-medium mt-0.5">{item.owner_id.business}</p>
                                    )}
                                </div>
                                <span className="text-xs font-mono bg-white/5 text-slate-300 px-2 py-1 rounded">
                                    {item.token}
                                </span>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <MapPin size={14} className="shrink-0" />
                                    <span className="truncate">{item.owner_id?.place || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Calendar size={14} className="shrink-0" />
                                    <span>
                                        {new Date(item.assigned_at).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <ExternalLink size={14} className="shrink-0" />
                                    <a href={item.manual_redirect_url} target="_blank" rel="noreferrer" className="truncate hover:text-indigo-400 transition-colors">
                                        {item.manual_redirect_url}
                                    </a>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <button
                                    onClick={() => router.push(`/staff/assign/${item.token}`)}
                                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors text-sm font-medium"
                                >
                                    <Pencil size={16} />
                                    Re-assign details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
