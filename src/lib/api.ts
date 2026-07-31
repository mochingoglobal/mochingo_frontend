import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // send JWT cookie
});

// Redirect to login on 401
let isRedirecting = false;
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (
            error.response?.status === 401 &&
            typeof window !== 'undefined' &&
            !isRedirecting
        ) {
            const pathname = window.location.pathname;
            const search = window.location.search;
            const currentUrl = encodeURIComponent(pathname + search);

            if (pathname.startsWith('/portal-x') && !pathname.includes('/portal-x/login')) {
                isRedirecting = true;
                window.location.href = `/portal-x/login?redirect=${currentUrl}`;
            } else if (pathname.startsWith('/staff') && !pathname.includes('/staff/login')) {
                isRedirecting = true;
                window.location.href = `/staff/login?redirect=${currentUrl}`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
