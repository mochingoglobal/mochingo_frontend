import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ConsumerUser {
    id: string;
    name: string;
    email: string;
    mobile_number?: string;
    place?: string;
    business?: string;
    profile_picture?: string;
}

interface ConsumerAuthState {
    user: ConsumerUser | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: ConsumerUser, token: string) => void;
    updateUser: (data: Partial<ConsumerUser>) => void;
    logout: () => void;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useConsumerAuthStore = create<ConsumerAuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (user, token) => set({ user, token, isAuthenticated: true }),
            updateUser: (data) => set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'mochingo-consumer-auth',
            onRehydrateStorage: () => (state) => {
                if (state) state.setHasHydrated(true);
            },
        }
    )
);
