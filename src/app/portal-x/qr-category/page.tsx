'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { DynamicQRCategory } from '@/types/category.types';
import { formatDateTime } from '@/lib/utils';

export default function QRCategoryPage() {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data: categories, isLoading } = useQuery({
        queryKey: ['dynamic-qr-categories'],
        queryFn: async () => {
            const res = await api.get<DynamicQRCategory[]>('/admin/qr/categories');
            return res.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = { name, slug: slug || undefined, description };
            const res = await api.post('/admin/qr/categories', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dynamic-qr-categories'] });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const payload = { name, slug: slug || undefined, description };
            const res = await api.patch(`/admin/qr/categories/${editingId}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dynamic-qr-categories'] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/admin/qr/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dynamic-qr-categories'] });
        }
    });

    const resetForm = () => {
        setName('');
        setSlug('');
        setDescription('');
        setEditingId(null);
    };

    const handleEdit = (cat: DynamicQRCategory) => {
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || '');
        setEditingId(cat._id);
    };

    const handleSubmit = () => {
        if (!name.trim()) return;
        if (editingId) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    return (
        <div className="flex flex-col max-w-full">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">QR Categories</h1>
                <p className="text-slate-400 text-sm sm:text-base">Manage categories for Dynamic QR groups.</p>
            </div>

            <div className="flex flex-col gap-6">
                {/* Form */}
            <div className="card bg-[rgba(242, 237, 231, 0.05)] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20 p-4 sm:p-5">
                <h3 className="text-base font-semibold mb-4">
                    {editingId ? 'Edit Category' : 'Create New Category'}
                </h3>
                <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="label">Name</label>
                        <input className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" placeholder="e.g. Google Review" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="label">Slug (Optional)</label>
                        <input 
                            className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" 
                            placeholder="e.g. google-review" 
                            value={slug} 
                            onChange={e => setSlug(e.target.value.replace(/\s+/g, '-').toLowerCase())} 
                        />
                    </div>
                    <div className="flex-[2] min-w-[250px]">
                        <label className="label">Description (Optional)</label>
                        <input className="input bg-[#0f172a] border border-[#1e293b] text-slate-200" placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {editingId && (
                            <button className="btn btn-outline flex-1 md:flex-none justify-center h-[38px] bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200" onClick={resetForm}>
                                Cancel
                            </button>
                        )}
                        <button 
                            className="btn btn-primary flex-1 md:flex-none justify-center h-[38px] bg-mochingo-warm-oat text-mochingo-rich-black hover:bg-indigo-700 text-mochingo-warm-oat border-none shadow-md shadow-indigo-500/20" 
                            onClick={handleSubmit} 
                            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : editingId ? (
                                <Edit2 size={16} />
                            ) : (
                                <Plus size={16} />
                            )}
                            {editingId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
                {(createMutation.isError || updateMutation.isError) && (
                    <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                        {(createMutation.error || updateMutation.error) instanceof Error ? (createMutation.error || updateMutation.error)?.message : 'An error occurred'}
                    </p>
                )}
            </div>

            {/* List */}
            <div className="card bg-[rgba(242, 237, 231, 0.05)] border border-[#1e293b] rounded-xl shadow-lg shadow-black/20 p-4 sm:p-5">
                <h3 className="text-base font-semibold mb-4">Categories</h3>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Slug</th>
                                <th>Description</th>
                                <th>Created</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><Loader2 className="animate-spin mx-auto" /></td></tr>
                            ) : categories?.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No categories found</td></tr>
                            ) : (
                                categories?.map((cat) => (
                                    <tr key={cat._id}>
                                        <td style={{ fontWeight: 500 }}>{cat.name}</td>
                                        <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{cat.slug}</span></td>
                                        <td style={{ color: '#94a3b8' }}>{cat.description || '-'}</td>
                                        <td style={{ color: '#94a3b8' }}>{formatDateTime(cat.created_at)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => handleEdit(cat)}
                                                style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', marginRight: 12 }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this category?')) {
                                                        deleteMutation.mutate(cat._id);
                                                    }
                                                }}
                                                disabled={cat.in_use || (deleteMutation.isPending && deleteMutation.variables === cat._id)}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    color: cat.in_use ? '#94a3b8' : '#ef4444', 
                                                    cursor: cat.in_use ? 'not-allowed' : 'pointer',
                                                    opacity: cat.in_use ? 0.5 : 1
                                                }}
                                                title={cat.in_use ? 'Cannot delete: Category is currently assigned to one or more QR groups.' : 'Delete category'}
                                            >
                                                {deleteMutation.isPending && deleteMutation.variables === cat._id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>
    );
}
