// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface Admin {
    id: string;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'sales_staff';
    is_active: boolean;
}

export interface AuthState {
    admin: Admin | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
