import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
    title: { default: 'Mochingo — Dynamic QR Platform', template: '%s | Mochingo' },
    description: 'Create, manage and track dynamic QR codes for your business.',
    keywords: ['QR code', 'dynamic QR', 'QR management', 'Mochingo'],
    icons: {
        icon: [
            { url: '/favicons/favicon.svg', type: 'image/svg+xml' },
            { url: '/favicons/favicon.ico', sizes: 'any' }
        ],
        apple: '/favicons/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    themeColor: '#000000'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body className="overflow-x-hidden max-w-full">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
