// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface Admin {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    is_active: boolean;
}

export interface AuthState {
    admin: Admin | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
