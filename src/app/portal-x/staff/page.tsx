'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Plus, Search, Trash2, Edit2, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Staff {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    created_at: string;
}

export default function StaffManagementPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState<string | null>(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/staff');
            setStaffList(res.data?.data || []);
        } catch (err: any) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const filteredStaff = staffList.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        try {
            await api.post('/admin/staff', formData);
            setFormData({ name: '', email: '', password: '' });
            setIsModalOpen(false);
            fetchStaff();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create staff');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this staff member?')) return;
        try {
            await api.delete(`/admin/staff/${id}`);
            fetchStaff();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete staff');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-mochingo-warm-oat flex items-center gap-2">
                        <Briefcase className="text-mochingo-warm-oat" />
                        Sales Staff Management
                    </h1>
                    <p className="text-mochingo-warm-oat/60 text-sm mt-1">Create and manage sales staff accounts.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-mochingo-warm-oat hover:bg-mochingo-warm-oat/90 text-mochingo-rich-black px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-mochingo-warm-oat/10"
                >
                    <Plus size={18} />
                    Add Staff
                </button>
            </div>

            <div className="bg-[rgba(242,237,231,0.02)] border border-mochingo-warm-oat/10 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-mochingo-warm-oat/10 bg-mochingo-warm-oat/5">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mochingo-warm-oat/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-lg pl-10 pr-4 py-2 text-sm text-mochingo-warm-oat placeholder:text-mochingo-warm-oat/40 focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-mochingo-warm-oat" size={32} />
                    </div>
                ) : (
                    <>
                        {filteredStaff.length === 0 ? (
                            <div className="px-6 py-12 text-center text-mochingo-warm-oat/50">
                                No sales staff found.
                            </div>
                        ) : (
                            <div className="divide-y divide-mochingo-warm-oat/10">
                                {/* Desktop Table Header */}
                                <div className="hidden md:grid grid-cols-4 px-6 py-3 bg-mochingo-warm-oat/5 text-xs uppercase text-mochingo-warm-oat/50 font-semibold border-b border-mochingo-warm-oat/10">
                                    <div>Name</div>
                                    <div>Email</div>
                                    <div>Status</div>
                                    <div className="text-right">Actions</div>
                                </div>

                                {/* List Items (Cards on Mobile, Rows on Desktop) */}
                                {filteredStaff.map((staff) => (
                                    <div key={staff.id} className="flex flex-col md:grid md:grid-cols-4 gap-4 md:gap-0 p-4 md:px-6 md:py-4 hover:bg-mochingo-warm-oat/5 transition-colors items-start md:items-center">
                                        <div className="flex flex-col min-w-0">
                                            <span className="md:hidden text-xs text-mochingo-warm-oat/50 font-medium mb-1">Name</span>
                                            <span className="font-medium text-mochingo-warm-oat truncate">{staff.name}</span>
                                        </div>
                                        <div className="flex flex-col min-w-0 w-full">
                                            <span className="md:hidden text-xs text-mochingo-warm-oat/50 font-medium mb-1">Email</span>
                                            <span className="text-mochingo-warm-oat/70 truncate text-sm md:text-base">{staff.email}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="md:hidden text-xs text-mochingo-warm-oat/50 font-medium mb-1">Status</span>
                                            <div>
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${staff.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {staff.is_active ? 'Active' : 'Blocked'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex md:justify-end w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-mochingo-warm-oat/10 md:border-0 justify-between items-center">
                                            <span className="md:hidden text-xs text-mochingo-warm-oat/50 font-medium">Actions</span>
                                            <div className="flex items-center">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.patch(`/admin/staff/${staff.id}`, { is_active: !staff.is_active });
                                                            fetchStaff();
                                                        } catch (err: any) {
                                                            alert(err.response?.data?.message || 'Failed to update staff status');
                                                        }
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors mr-2 text-sm font-medium ${
                                                        staff.is_active 
                                                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10' 
                                                            : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10'
                                                    }`}
                                                >
                                                    {staff.is_active ? 'Block' : 'Unblock'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(staff.id)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete Staff"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-mochingo-rich-black border border-mochingo-warm-oat/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-mochingo-warm-oat/10">
                            <h3 className="text-xl font-bold text-mochingo-warm-oat">Add Sales Staff</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    placeholder="sales@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-mochingo-warm-oat/70 mb-1.5">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-[rgba(242,237,231,0.03)] border border-mochingo-warm-oat/10 rounded-xl px-4 py-2.5 text-mochingo-warm-oat focus:outline-none focus:border-mochingo-warm-oat/30 transition-colors"
                                    placeholder="Enter a secure password"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-mochingo-warm-oat/10 text-mochingo-warm-oat/70 hover:bg-mochingo-warm-oat/5 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-mochingo-warm-oat text-mochingo-rich-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-mochingo-warm-oat/90"
                                >
                                    {isSaving ? <Loader2 className="animate-spin text-mochingo-rich-black" size={18} /> : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
