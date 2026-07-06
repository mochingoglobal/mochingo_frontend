import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatDateTime = (value?: string | null): string => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const getStatusColor = (status: string): string => {
    switch (status) {
        case 'assigned': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        case 'unassigned': return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
        case 'disabled': return 'bg-red-500/15 text-red-400 border-red-500/30';
        case 'mixed': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
};
