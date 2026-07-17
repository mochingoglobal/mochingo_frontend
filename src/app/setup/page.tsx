'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CategorySetupContent } from '../[categorySlug]/page';

export default function SetupPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#0f172a]"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}>
            <CategorySetupContent categorySlug="General Setup" />
        </Suspense>
    );
}
