import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Allow images from any domain for QR logos etc.
    images: {
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'https', hostname: '**' },
        ],
    },
};

export default nextConfig;
