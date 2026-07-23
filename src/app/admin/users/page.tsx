'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Users, Search, RefreshCw, Loader2,
    Phone, MapPin, Briefcase, Mail,
    ChevronLeft, ChevronRight, QrCode,
    X, ExternalLink, ScanLine, Calendar,
    Link as LinkIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
    id: string;
    name: string;
    email: string;
    mobile_number: string | null;
    place: string | null;
    business: string | null;
    profile_picture: string | null;
    qr_count: number;
    scan_total: number;
    created_at: string;
    updated_at: string;
}

interface AdminUsersResponse {
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

interface UserQR {
    id: string;
    token: string;
    label: string;
    batch_label: string | null;
    status: 'assigned' | 'unassigned' | 'disabled';
    manual_redirect_url: string | null;
    qr_url: string;
    scan_count: number;
    last_scanned_at: string | null;
    assigned_at: string | null;
}

interface UserDetailResponse {
    user: AdminUser;
    qrs: UserQR[];
    qr_count: number;
    scan_total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState<T>(value);
    useEffect(() => {
        const h = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(h);
    }, [value, delay]);
    return dv;
}

const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    assigned: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    unassigned: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    disabled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' },
};

function Avatar({ user, size = 36 }: { user: Pick<AdminUser, 'name' | 'profile_picture'>; size?: number }) {
    if (user.profile_picture) {
        return (
            <img
                src={user.profile_picture}
                alt={user.name}
                referrerPolicy="no-referrer"
                style={{
                    width: size, height: size, borderRadius: '50%',
                    objectFit: 'cover', border: '1px solid var(--card-border)',
                    flexShrink: 0,
                }}
            />
        );
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: size * 0.38,
        }}>
            {user.name?.[0]?.toUpperCase()}
        </div>
    );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-user-detail', userId],
        queryFn: async () => {
            const res = await api.get<{ data: UserDetailResponse }>(`/admin/users/${userId}`);
            return res.data.data;
        },
        staleTime: 30_000,
    });

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const u = data?.user;
    const qrs = data?.qrs ?? [];

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#161b27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20,
                width: '100%',
                maxWidth: 640,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}>
                {/* Modal Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>User Details</span>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: 'none',
                            borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#94a3b8',
                            display: 'flex', alignItems: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ overflow: 'auto', flex: 1, padding: '24px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                            <Loader2 size={28} className="animate-spin" style={{ color: '#6366f1' }} />
                        </div>
                    ) : u ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* User Profile */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px 20px',
                                background: 'rgba(99,102,241,0.06)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                borderRadius: 14,
                            }}>
                                <Avatar user={u} size={52} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9', marginBottom: 2 }}>{u.name}</p>
                                    <p style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Mail size={12} /> {u.email}
                                    </p>
                                </div>
                                {/* Summary chips */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                                        border: '1px solid rgba(99,102,241,0.25)',
                                    }}>
                                        <QrCode size={12} /> {data?.qr_count} QR{(data?.qr_count ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                        border: '1px solid rgba(16,185,129,0.2)',
                                    }}>
                                        <ScanLine size={12} /> {data?.scan_total} scans
                                    </span>
                                </div>
                            </div>

                            {/* Detail Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { icon: <Phone size={14} />, label: 'Mobile', value: u.mobile_number },
                                    { icon: <MapPin size={14} />, label: 'Place', value: u.place },
                                    { icon: <Briefcase size={14} />, label: 'Business', value: u.business },
                                    { icon: <Calendar size={14} />, label: 'Joined', value: formatDateTime(u.created_at) },
                                ].map(({ icon, label, value }) => (
                                    <div key={label} style={{
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: 10,
                                    }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {icon} {label}
                                        </p>
                                        <p style={{ fontSize: 14, color: value ? '#e2e8f0' : '#334155', fontWeight: value ? 500 : 400 }}>
                                            {value ?? '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* QRs Section */}
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <QrCode size={14} /> QR Codes ({qrs.length})
                                </p>

                                {qrs.length === 0 ? (
                                    <div style={{
                                        padding: 32, textAlign: 'center',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px dashed rgba(255,255,255,0.08)',
                                        borderRadius: 12, color: '#475569',
                                    }}>
                                        <QrCode size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                                        <p style={{ fontSize: 13 }}>No QRs assigned yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {qrs.map(qr => {
                                            const sc = statusColors[qr.status] ?? statusColors.unassigned;
                                            return (
                                                <div key={qr.id} style={{
                                                    padding: '12px 16px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: 12,
                                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                                }}>
                                                    {/* QR icon */}
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                                        background: 'rgba(99,102,241,0.1)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <QrCode size={16} color="#818cf8" />
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        {/* Label */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                            <p style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{qr.label}</p>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 999,
                                                                fontSize: 11, fontWeight: 700,
                                                                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                                            }}>
                                                                {qr.status}
                                                            </span>
                                                        </div>

                                                        {/* Redirect URL */}
                                                        {qr.manual_redirect_url && (
                                                            <a
                                                                href={qr.manual_redirect_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                                    fontSize: 12, color: '#6366f1',
                                                                    textDecoration: 'none', marginBottom: 4,
                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                <LinkIcon size={11} />
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {qr.manual_redirect_url}
                                                                </span>
                                                                <ExternalLink size={10} style={{ flexShrink: 0 }} />
                                                            </a>
                                                        )}

                                                        {/* Stats row */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                                                                <ScanLine size={11} /> {qr.scan_count} scans
                                                            </span>
                                                            {qr.last_scanned_at && (
                                                                <span style={{ fontSize: 12, color: '#475569' }}>
                                                                    Last scanned: {formatDateTime(qr.last_scanned_at)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* QR URL link */}
                                                    <a
                                                        href={qr.qr_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open QR link"
                                                        style={{
                                                            padding: '6px 8px', borderRadius: 8, flexShrink: 0,
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            color: '#64748b', display: 'flex', alignItems: 'center',
                                                            textDecoration: 'none',
                                                            transition: 'color 0.15s',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
                                                        onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>User not found</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => { setPage(1); }, [debouncedSearch]);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['admin-users', page, debouncedSearch],
        queryFn: async () => {
            const res = await api.get<{ data: AdminUsersResponse }>(
                `/admin/users?page=${page}&limit=50&search=${encodeURIComponent(debouncedSearch)}`
            );
            return res.data.data;
        },
    });

    return (
        <>
            {/* Detail Modal */}
            {selectedUserId && (
                <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
            )}

            <div className="flex flex-col max-w-full">

                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">Users</h1>
                    <p className="text-slate-400 text-sm sm:text-base">
                        All customers who have scanned and claimed a QR code. Click any row to view details.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div className="card p-4 sm:p-5">
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Total Users</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                            {isLoading ? '—' : data?.total ?? 0}
                        </p>
                    </div>
                    <div className="card p-4 sm:p-5">
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Total QRs</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: '#818cf8', lineHeight: 1 }}>
                            {isLoading ? '—' : data?.users.reduce((s, u) => s + u.qr_count, 0) ?? 0}
                        </p>
                    </div>
                    <div className="card p-4 sm:p-5 col-span-2 sm:col-span-1">
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Total Scans</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: '#10b981', lineHeight: 1 }}>
                            {isLoading ? '—' : data?.users.reduce((s, u) => s + u.scan_total, 0) ?? 0}
                        </p>
                    </div>
                </div>

                {/* Table Card */}
                <div className="card p-4 sm:p-5">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users size={18} color="#6366f1" />
                            <h3 className="text-base font-semibold">
                                {data ? `${data.total} user${data.total !== 1 ? 's' : ''}` : 'Users'}
                            </h3>
                            {isFetching && !isLoading && <Loader2 size={14} className="animate-spin" style={{ color: '#6366f1' }} />}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-[260px]">
                                <Search size={14} className="absolute left-3 top-[11px] text-slate-500" />
                                <input
                                    className="input input-sm pl-8 w-full"
                                    placeholder="Search name, mobile, place…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-outline h-[38px]" onClick={() => refetch()} title="Refresh">
                                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Mobile</th>
                                    <th>Place</th>
                                    <th>Business</th>
                                    <th style={{ textAlign: 'center' }}>QRs</th>
                                    <th style={{ textAlign: 'center' }}>Scans</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: 56 }}>
                                            <Loader2 className="animate-spin mx-auto" style={{ color: '#6366f1' }} />
                                        </td>
                                    </tr>
                                ) : !data?.users.length ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: 56 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#475569' }}>
                                                <Users size={36} style={{ opacity: 0.25 }} />
                                                <p style={{ fontSize: 14 }}>{search ? 'No users match your search' : 'No users yet'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.users.map(u => (
                                        <tr
                                            key={u.id}
                                            onClick={() => setSelectedUserId(u.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {/* User */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Avatar user={u} size={34} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                                                            {u.name}
                                                        </p>
                                                        <p style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                                            <Mail size={11} />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{u.email}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Mobile */}
                                            <td>
                                                {u.mobile_number ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                                        <Phone size={12} color="#64748b" /> {u.mobile_number}
                                                    </span>
                                                ) : <span style={{ color: '#334155', fontSize: 13 }}>—</span>}
                                            </td>

                                            {/* Place */}
                                            <td>
                                                {u.place ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                                        <MapPin size={12} color="#64748b" /> {u.place}
                                                    </span>
                                                ) : <span style={{ color: '#334155', fontSize: 13 }}>—</span>}
                                            </td>

                                            {/* Business */}
                                            <td>
                                                {u.business ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                                        <Briefcase size={12} color="#64748b" /> {u.business}
                                                    </span>
                                                ) : <span style={{ color: '#334155', fontSize: 13 }}>—</span>}
                                            </td>

                                            {/* QR count */}
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    minWidth: 32, padding: '3px 8px', borderRadius: 999,
                                                    fontSize: 12, fontWeight: 700,
                                                    background: u.qr_count > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                                                    color: u.qr_count > 0 ? '#818cf8' : '#475569',
                                                    border: u.qr_count > 0 ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    <QrCode size={11} /> {u.qr_count}
                                                </span>
                                            </td>

                                            {/* Scan total */}
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                    minWidth: 32, padding: '3px 8px', borderRadius: 999,
                                                    fontSize: 12, fontWeight: 700,
                                                    background: u.scan_total > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                                                    color: u.scan_total > 0 ? '#10b981' : '#475569',
                                                    border: u.scan_total > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)',
                                                }}>
                                                    <ScanLine size={11} /> {u.scan_total}
                                                </span>
                                            </td>

                                            {/* Joined */}
                                            <td style={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>
                                                {formatDateTime(u.created_at)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && data.total_pages > 1 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--card-border)',
                        }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>
                                Page {data.page} of {data.total_pages} · {data.total} users
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ height: 34, padding: '0 12px', fontSize: 13 }}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={15} /> Prev
                                </button>
                                <button
                                    className="btn btn-outline"
                                    style={{ height: 34, padding: '0 12px', fontSize: 13 }}
                                    onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                                    disabled={page === data.total_pages}
                                >
                                    Next <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
