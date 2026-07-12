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
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>QR Categories</h1>
                <p style={{ color: '#94a3b8' }}>Manage categories for Dynamic QR groups.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Form */}
            <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    {editingId ? 'Edit Category' : 'Create New Category'}
                </h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="label">Name</label>
                        <input className="input" placeholder="e.g. Google Review" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label className="label">Slug (Optional)</label>
                        <input 
                            className="input" 
                            placeholder="e.g. google-review" 
                            value={slug} 
                            onChange={e => setSlug(e.target.value.replace(/\s+/g, '-').toLowerCase())} 
                        />
                    </div>
                    <div style={{ flex: 2, minWidth: 250 }}>
                        <label className="label">Description (Optional)</label>
                        <input className="input" placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {editingId && (
                            <button className="btn btn-outline" onClick={resetForm} style={{ height: 38 }}>
                                Cancel
                            </button>
                        )}
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSubmit} 
                            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                            style={{ height: 38 }}
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
            <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Categories</h3>
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
