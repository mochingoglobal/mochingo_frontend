'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart2, Loader2, QrCode, User, MapPin, Building2, Link2, Calendar, Search, Edit2 } from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsData {
    total_assigned: number;
    assigned_qrs: Array<{
        _id: string;
        token: string;
        status: string;
        assigned_at: string;
        manual_redirect_url: string;
        owner_id?: {
            name?: string;
            mobile_number?: string;
            place?: string;
            business?: string;
        };
    }>;
}

export default function StaffAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search & Edit states
    const [search, setSearch] = useState('');
    const [editingQr, setEditingQr] = useState<any>(null);
    const [editForm, setEditForm] = useState({ name: '', mobile_number: '', place: '', business: '', destination_url: '' });
    const [saving, setSaving] = useState(false);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/admin/staff/${params.id}/analytics`);
            setData(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) fetchAnalytics();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-mochingo-warm-oat" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {error}
            </div>
        );
    }

    const filteredQrs = data?.assigned_qrs.filter(qr => 
        qr.token.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => router.push('/portal-x/staff')}
                    className="p-2.5 bg-[rgba(242,237,231,0.05)] hover:bg-[rgba(242,237,231,0.1)] text-mochingo-warm-oat rounded-xl transition-colors border border-mochingo-warm-oat/10"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-mochingo-warm-oat flex items-center gap-2">
                        <BarChart2 className="text-mochingo-warm-oat" />
                        Staff Analytics
                    </h1>
                    <p className="text-mochingo-warm-oat/60 text-sm mt-1">
                        Viewing performance and assignment history
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-mochingo-warm-oat/60 mb-2 font-medium">
                        <QrCode size={18} />
                        Total QRs Configured
                    </div>
                    <div className="text-4xl font-black text-mochingo-warm-oat">
                        {data?.total_assigned || 0}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 rounded-2xl overflow-hidden mt-8">
                <div className="p-5 border-b border-mochingo-warm-oat/10 bg-mochingo-warm-oat/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="font-bold text-mochingo-warm-oat">Configuration History</h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mochingo-warm-oat/40" size={16} />
                        <input
                            type="text"
                            placeholder="Search by QR token..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-lg pl-9 pr-3 py-2 text-sm text-mochingo-warm-oat placeholder:text-mochingo-warm-oat/40 focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                        />
                    </div>
                </div>
                
                {filteredQrs.length === 0 ? (
                    <div className="p-12 text-center text-mochingo-warm-oat/50">
                        {search ? 'No QR codes match your search.' : 'No QR codes configured yet.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-mochingo-warm-oat/10 bg-mochingo-warm-oat/[0.02] text-xs uppercase tracking-wider text-mochingo-warm-oat/50">
                                    <th className="p-4 font-semibold">QR Token & Date</th>
                                    <th className="p-4 font-semibold">Customer Details</th>
                                    <th className="p-4 font-semibold">Shop / Place</th>
                                    <th className="p-4 font-semibold text-right">Destination & Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-mochingo-warm-oat/5">
                                {filteredQrs.map((qr) => (
                                    <tr key={qr._id} className="hover:bg-mochingo-warm-oat/[0.02] transition-colors">
                                        <td className="p-4 align-top">
                                            <div className="font-mono text-sm text-mochingo-warm-oat mb-1">{qr.token}</div>
                                            <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/40">
                                                <Calendar size={12} />
                                                {new Date(qr.assigned_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-1">
                                            <div className="flex items-center gap-1.5 text-sm text-mochingo-warm-oat">
                                                <User size={14} className="text-mochingo-warm-oat/40" />
                                                {qr.owner_id?.name || <span className="italic text-mochingo-warm-oat/40">N/A</span>}
                                            </div>
                                            <div className="text-xs text-mochingo-warm-oat/60 ml-5">
                                                {qr.owner_id?.mobile_number || 'No number'}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-1">
                                            <div className="flex items-center gap-1.5 text-sm text-mochingo-warm-oat">
                                                <Building2 size={14} className="text-mochingo-warm-oat/40" />
                                                {qr.owner_id?.business || <span className="italic text-mochingo-warm-oat/40">N/A</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-mochingo-warm-oat/60">
                                                <MapPin size={12} className="text-mochingo-warm-oat/40 ml-0.5" />
                                                {qr.owner_id?.place || 'No place'}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-right space-y-2">
                                            <a 
                                                href={qr.manual_redirect_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-mochingo-warm-oat/10 hover:bg-mochingo-warm-oat/20 rounded-lg text-mochingo-warm-oat text-xs transition-colors border border-mochingo-warm-oat/10 w-full justify-center"
                                            >
                                                <Link2 size={12} />
                                                Visit Link
                                            </a>
                                            <button
                                                onClick={() => {
                                                    setEditingQr(qr);
                                                    setEditForm({
                                                        name: qr.owner_id?.name || '',
                                                        mobile_number: qr.owner_id?.mobile_number || '',
                                                        place: qr.owner_id?.place || '',
                                                        business: qr.owner_id?.business || '',
                                                        destination_url: qr.manual_redirect_url || ''
                                                    });
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs transition-colors border border-indigo-500/20 w-full justify-center font-medium"
                                            >
                                                <Edit2 size={12} />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingQr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-mochingo-warm-oat/10">
                            <h3 className="text-xl font-bold text-mochingo-warm-oat">Edit QR: {editingQr.token}</h3>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            setSaving(true);
                            try {
                                await api.post('/admin/sales/assign-qr', {
                                    qr_token: editingQr.token,
                                    isReassign: true,
                                    ...editForm
                                });
                                fetchAnalytics(); // Refresh table
                                setEditingQr(null);
                            } catch (err: any) {
                                alert(err.response?.data?.message || 'Failed to update QR');
                            } finally {
                                setSaving(false);
                            }
                        }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={editForm.mobile_number}
                                    onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Place</label>
                                    <input
                                        type="text"
                                        value={editForm.place}
                                        onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}
                                        className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Business</label>
                                    <input
                                        type="text"
                                        value={editForm.business}
                                        onChange={(e) => setEditForm({ ...editForm, business: e.target.value })}
                                        className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Destination URL *</label>
                                <input
                                    type="url"
                                    required
                                    value={editForm.destination_url}
                                    onChange={(e) => setEditForm({ ...editForm, destination_url: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingQr(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-mochingo-warm-oat/10 text-mochingo-warm-oat/70 hover:bg-mochingo-warm-oat/5 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-mochingo-warm-oat text-mochingo-rich-black font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-mochingo-warm-oat/90"
                                >
                                    {saving ? <Loader2 className="animate-spin text-mochingo-rich-black" size={18} /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
