'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CategorySetupPage from '../[categorySlug]/page';

export default function SetupPage() {
    // We can reuse the CategorySetupPage but pass a generic 'Uncategorized' or similar slug.
    // However, since NextJS app router passes params, we'll just render it with a generic label.
    // To make it simple, we just render the same component but mock the params.
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0f172a]"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}>
            <CategorySetupPage params={{ categorySlug: 'General Setup' }} />
        </Suspense>
    );
}
