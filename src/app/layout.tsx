import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
    title: { default: 'Mochingo — Dynamic QR Platform', template: '%s | Mochingo' },
    description: 'Create, manage and track dynamic QR codes for your business.',
    keywords: ['QR code', 'dynamic QR', 'QR management', 'Mochingo'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
