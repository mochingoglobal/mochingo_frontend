'use client';
import { create } from 'zustand';
import api from '@/lib/api';
import type { Admin } from '@/types/auth.types';

interface AuthStore {
    admin: Admin | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    admin: null,
    isAuthenticated: false,
    isLoading: true,

    checkAuth: async () => {
        try {
            const res = await api.get('/auth/me');
            set({ admin: res.data.data.admin, isAuthenticated: true, isLoading: false });
        } catch {
            set({ admin: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        set({ admin: res.data.data.admin, isAuthenticated: true, isLoading: false });
    },

    logout: async () => {
        await api.post('/auth/logout');
        set({ admin: null, isAuthenticated: false, isLoading: false });
    },
}));
