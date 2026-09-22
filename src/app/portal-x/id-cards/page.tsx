'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CreditCard, Search, CheckSquare, Square, Download, CheckCircle2,
    Loader2, Users, Clock, ChevronRight, RefreshCw, User, AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { IOnboardingRecord, OnboardingListResponse } from '@/types/onboarding.types';

function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState<T>(value);
    useState(() => {
        const t = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(t);
    });
    return dv;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, downloadedAt }: { status: IOnboardingRecord['status']; downloadedAt?: string | null }) {
    if (status === 'new') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                New
            </span>
        );
    }
    if (status === 'downloaded') {
        return (
            <span
                title={downloadedAt ? `Downloaded: ${formatDateTime(downloadedAt)}` : 'Downloaded'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-default"
            >
                <Download size={11} />
                Downloaded
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/20">
            <CheckCircle2 size={11} />
            Done
        </span>
    );
}

// ── Active Tab (New + Downloaded) ─────────────────────────────────────────────

function ActiveTab() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [fromIdx, setFromIdx] = useState<string>('');
    const [toIdx, setToIdx] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const LIMIT = 100;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['onboardings-active', page, search],
        queryFn: async () => {
            const res = await api.get<{ data: OnboardingListResponse }>(
                `/admin/onboarding?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`
            );
            return res.data.data;
        },
    });

    const records = data?.records ?? [];

    const markDownloadedMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            await api.patch('/admin/onboarding/mark-downloaded', { ids });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboardings-active'] }),
    });

    const markDoneMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            await api.patch('/admin/onboarding/mark-done', { ids });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboardings-active'] });
            queryClient.invalidateQueries({ queryKey: ['onboardings-done'] });
            queryClient.invalidateQueries({ queryKey: ['onboarding-count'] });
            setSelectedIds(new Set());
        },
    });

    // Checkbox helpers
    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r._id)));
        }
    };

    const handleSelectRange = () => {
        const from = Math.max(1, parseInt(fromIdx) || 1) - 1;
        const to = Math.min(records.length, parseInt(toIdx) || records.length) - 1;
        if (from > to) return;
        const slice = records.slice(from, to + 1).map(r => r._id);
        setSelectedIds(new Set(slice));
    };

    const openBuilder = (ids: string[]) => {
        router.push(`/portal-x/id-cards/builder?ids=${ids.join(',')}`);
    };

    const selectedList = Array.from(selectedIds);
    const allChecked = records.length > 0 && selectedIds.size === records.length;
    const someChecked = selectedIds.size > 0 && selectedIds.size < records.length;

    return (
        <div className="flex flex-col gap-4">
            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-[11px] text-slate-500" />
                    <input
                        className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 pl-8 w-full text-sm"
                        placeholder="Search name, reg no, area…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>

                {/* Range selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 text-xs font-medium">Select range:</span>
                    <input
                        type="number" min="1"
                        className="w-16 input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 text-center text-sm"
                        placeholder="From"
                        value={fromIdx}
                        onChange={e => setFromIdx(e.target.value)}
                    />
                    <span className="text-slate-500 text-xs">to</span>
                    <input
                        type="number" min="1"
                        className="w-16 input input-sm bg-[#0f172a] border border-[#1e293b] text-slate-200 text-center text-sm"
                        placeholder="To"
                        value={toIdx}
                        onChange={e => setToIdx(e.target.value)}
                    />
                    <button
                        onClick={handleSelectRange}
                        className="btn btn-sm btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs h-[34px] px-3"
                    >
                        Select
                    </button>
                    <button onClick={() => refetch()} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card bg-[rgba(242,237,231,0.03)] border border-[#1e293b] rounded-xl overflow-hidden">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 40, paddingLeft: 16 }}>
                                    <button onClick={toggleAll} className="text-slate-400 hover:text-slate-200 transition-colors">
                                        {allChecked ? <CheckSquare size={16} className="text-indigo-400" /> :
                                            someChecked ? <CheckSquare size={16} className="text-indigo-400/50" /> :
                                                <Square size={16} />}
                                    </button>
                                </th>
                                <th style={{ width: 48 }}>#</th>
                                <th>Name</th>
                                <th>Qualification</th>
                                <th>Reg No</th>
                                <th>Service Area</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>
                                    <Loader2 size={24} className="animate-spin mx-auto text-indigo-400" />
                                </td></tr>
                            ) : records.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                                    <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                                    <p>No onboarding records yet</p>
                                </td></tr>
                            ) : (
                                records.map((record, idx) => {
                                    const isSelected = selectedIds.has(record._id);
                                    const rowNum = (page - 1) * LIMIT + idx + 1;
                                    return (
                                        <tr
                                            key={record._id}
                                            className={isSelected ? 'bg-indigo-500/5' : ''}
                                            style={{ cursor: 'default' }}
                                        >
                                            <td style={{ paddingLeft: 16 }}>
                                                <button onClick={() => toggleRow(record._id)} className="text-slate-400 hover:text-slate-200 transition-colors">
                                                    {isSelected
                                                        ? <CheckSquare size={16} className="text-indigo-400" />
                                                        : <Square size={16} />}
                                                </button>
                                            </td>
                                            <td className="text-slate-500 text-xs">{rowNum}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {record.photo_url
                                                        ? <img src={record.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                                                        : <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-500"><User size={12} /></div>
                                                    }
                                                    <span className="font-medium text-sm">{record.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-slate-400 text-sm">{record.qualification || '—'}</td>
                                            <td className="font-mono text-xs text-slate-300">{record.registration_no || '—'}</td>
                                            <td className="text-slate-400 text-sm">{record.service_area || '—'}</td>
                                            <td className="text-slate-500 text-xs">{formatDateTime(record.created_at)}</td>
                                            <td>
                                                <StatusBadge status={record.status} downloadedAt={record.downloaded_at} />
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1.5">
                                                    {/* Single person builder */}
                                                    <button
                                                        onClick={() => openBuilder([record._id])}
                                                        title="Open in builder (single)"
                                                        className="p-1.5 rounded-md hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-400 transition-colors"
                                                    >
                                                        <CreditCard size={14} />
                                                    </button>
                                                    {/* Mark done */}
                                                    <button
                                                        onClick={() => markDoneMutation.mutate([record._id])}
                                                        disabled={markDoneMutation.isPending}
                                                        title="Mark as done"
                                                        className="p-1.5 rounded-md hover:bg-emerald-500/15 text-slate-500 hover:text-emerald-400 transition-colors"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {data && data.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e293b]">
                        <span className="text-slate-500 text-xs">{data.total} total records</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-sm btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 disabled:opacity-40 h-8 px-3 text-xs"
                            >
                                Prev
                            </button>
                            <span className="text-slate-400 text-xs self-center">Page {page} / {data.total_pages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                                disabled={page === data.total_pages}
                                className="btn btn-sm btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 disabled:opacity-40 h-8 px-3 text-xs"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            {selectedList.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/30 bg-[#0d1424] backdrop-blur-xl">
                    <span className="text-indigo-300 text-sm font-semibold flex items-center gap-2">
                        <CheckSquare size={16} className="text-indigo-400" />
                        {selectedList.length} selected
                    </span>
                    <div className="w-px h-5 bg-white/10" />
                    <button
                        onClick={() => openBuilder(selectedList)}
                        className="btn btn-sm bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-lg shadow-indigo-500/20 h-8 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                        <CreditCard size={13} />
                        Open in Builder
                        <ChevronRight size={13} />
                    </button>
                    <button
                        onClick={() => markDoneMutation.mutate(selectedList)}
                        disabled={markDoneMutation.isPending}
                        className="btn btn-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 h-8 px-4 text-xs font-semibold flex items-center gap-1.5"
                    >
                        {markDoneMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Mark Done
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-slate-500 hover:text-slate-300 text-xs transition-colors px-1"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Done Tab ──────────────────────────────────────────────────────────────────

function DoneTab() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['onboardings-done', page, search],
        queryFn: async () => {
            const res = await api.get<{ data: OnboardingListResponse }>(
                `/admin/onboarding?status=done&page=${page}&limit=100&search=${encodeURIComponent(search)}`
            );
            return res.data.data;
        },
    });

    const records = data?.records ?? [];

    return (
        <div className="flex flex-col gap-4">
            <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-[11px] text-slate-500" />
                <input
                    className="input bg-[#0f172a] border border-[#1e293b] text-slate-200 pl-8 w-full text-sm"
                    placeholder="Search…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            <div className="card bg-[rgba(242,237,231,0.03)] border border-[#1e293b] rounded-xl overflow-hidden">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Qualification</th>
                                <th>Reg No</th>
                                <th>Service Area</th>
                                <th>Received</th>
                                <th>Completed</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}>
                                    <Loader2 size={24} className="animate-spin mx-auto text-indigo-400" />
                                </td></tr>
                            ) : records.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                                    <p>No completed records</p>
                                </td></tr>
                            ) : (
                                records.map(record => (
                                    <tr key={record._id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {record.photo_url
                                                    ? <img src={record.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                                                    : <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-slate-500"><User size={12} /></div>
                                                }
                                                <span className="font-medium text-sm">{record.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-slate-400 text-sm">{record.qualification || '—'}</td>
                                        <td className="font-mono text-xs text-slate-300">{record.registration_no || '—'}</td>
                                        <td className="text-slate-400 text-sm">{record.service_area || '—'}</td>
                                        <td className="text-slate-500 text-xs">{formatDateTime(record.created_at)}</td>
                                        <td className="text-slate-500 text-xs">{record.done_at ? formatDateTime(record.done_at) : '—'}</td>
                                        <td>
                                            <button
                                                onClick={() => router.push(`/portal-x/id-cards/builder?ids=${record._id}`)}
                                                title="Open in builder"
                                                className="p-1.5 rounded-md hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-400 transition-colors"
                                            >
                                                <CreditCard size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {data && data.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e293b]">
                        <span className="text-slate-500 text-xs">{data.total} total</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="btn btn-sm btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 disabled:opacity-40 h-8 px-3 text-xs">Prev</button>
                            <span className="text-slate-400 text-xs self-center">Page {page} / {data.total_pages}</span>
                            <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                                className="btn btn-sm btn-outline bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-300 disabled:opacity-40 h-8 px-3 text-xs">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IDCardsPage() {
    const [tab, setTab] = useState<'active' | 'done'>('active');

    const { data: countData } = useQuery({
        queryKey: ['onboarding-count'],
        queryFn: async () => {
            const res = await api.get<{ data: { count: number } }>('/admin/onboarding/count');
            return res.data.data;
        },
    });

    const newCount = countData?.count ?? 0;

    return (
        <div className="flex flex-col max-w-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">ID Cards</h1>
                    {newCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold bg-emerald-500 text-white animate-pulse">
                            {newCount}
                        </span>
                    )}
                </div>
                <p className="text-slate-400 text-sm sm:text-base">
                    Onboarding records from external apps. Select, build, and download ID cards in bulk.
                </p>
            </div>

            {/* Tabs */}
            <div className="inline-flex bg-white/5 p-1 rounded-lg mb-6 gap-1 self-start">
                {([
                    { key: 'active' as const, label: 'Active', icon: Users, count: newCount },
                    { key: 'done'   as const, label: 'Done',   icon: CheckCircle2, count: undefined },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex items-center gap-2"
                        style={{
                            padding: '6px 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                            background: tab === t.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                            color: tab === t.key ? '#818cf8' : '#94a3b8',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        <t.icon size={15} />
                        {t.label}
                        {t.count != null && t.count > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {tab === 'active' && <ActiveTab />}
            {tab === 'done'   && <DoneTab />}
        </div>
    );
}
