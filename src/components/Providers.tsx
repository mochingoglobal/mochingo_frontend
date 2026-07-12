'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { useConsumerAuthStore } from '@/store/consumerAuthStore';
import api from '@/lib/api';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'mock-client-id';

function AuthInit() {
    const { token, logout, updateUser } = useConsumerAuthStore();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (isHydrated && token) {
            api.get('/consumer/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                if (res.data?.data?.user) {
                    updateUser(res.data.data.user);
                }
            }).catch(() => {
                logout(); // clear state if invalid
            });
        }
    }, [isHydrated, token, logout, updateUser]);

    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                retry: 1,
            },
        },
    }));

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <QueryClientProvider client={queryClient}>
                <AuthInit />
                {children}
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}
