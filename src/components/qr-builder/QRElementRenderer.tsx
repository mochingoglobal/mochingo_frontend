'use client';
import { useEffect, useRef, useState } from 'react';
import { QRElement } from './types';
import { createStyledQRCodeCanvas } from '@/lib/qrCodeGenerator';

interface QRElementRendererProps {
    element: QRElement;
    tableURL: string;
    displayW: number;
    displayH: number;
}

export default function QRElementRenderer({ element, tableURL, displayW, displayH }: QRElementRendererProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const generate = async () => {
            setError(false);
            const qrCanvas = await createStyledQRCodeCanvas({
                text: tableURL || 'https://dynleaf.com',
                size: Math.round(Math.max(displayW, 80)),
                padding: Math.round(element.padding),
                logoUrl: element.centerLogoUrl,
                foregroundColor: element.fgColor,
                backgroundColor: element.bgColor,
                markerColor: element.cornerColor,
                markerInnerBackgroundColor: element.markerInnerBgColor,
                designStyle: element.designStyle,
            });

            if (cancelled || !canvasRef.current) return;

            if (!qrCanvas) {
                setError(true);
                return;
            }

            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            canvasRef.current.width = Math.round(displayW);
            canvasRef.current.height = Math.round(displayH);
            ctx.clearRect(0, 0, displayW, displayH);
            if (element.bgColor !== 'transparent') {
                ctx.fillStyle = element.bgColor;
                ctx.fillRect(0, 0, displayW, displayH);
            }
            ctx.drawImage(qrCanvas, 0, 0, displayW, displayH);
        };

        generate();
        return () => { cancelled = true; };
    }, [
        tableURL, element.fgColor, element.bgColor,
        element.cornerColor, element.centerLogoUrl,
        element.padding, element.designStyle,
        element.markerInnerBgColor, displayW, displayH,
    ]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400">
                QR Error
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
