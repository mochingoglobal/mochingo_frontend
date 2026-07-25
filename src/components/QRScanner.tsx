'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';

interface QRScannerProps {
    onScan: (text: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [controls, setControls] = useState<IScannerControls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const startScanning = useCallback(async () => {
        const codeReader = new BrowserQRCodeReader();
        let scannerControls: IScannerControls | null = null;
        
        setError(null);
        setLoading(true);

        try {
            if (videoRef.current) {
                await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, c) => {
                    if (mountedRef.current && c && !scannerControls) {
                        scannerControls = c;
                        setControls(c);
                        setLoading(false);
                    }
                    if (result) {
                        if (scannerControls) scannerControls.stop();
                        onScan(result.getText());
                    }
                });
            }
        } catch (err: any) {
            console.error('Camera error:', err);
            if (mountedRef.current) {
                setError('Camera access denied or unavailable.');
                setLoading(false);
            }
        }
        return scannerControls;
    }, [onScan]);

    useEffect(() => {
        mountedRef.current = true;
        let currentControls: IScannerControls | null = null;

        startScanning().then(c => {
            if (mountedRef.current) currentControls = c;
        });

        return () => {
            mountedRef.current = false;
            if (currentControls) {
                currentControls.stop();
            } else if (controls) {
                controls.stop();
            }
        };
    }, [startScanning]);

    const handleClose = () => {
        if (controls) controls.stop();
        onClose();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            if (controls) {
                controls.stop();
                setControls(null);
            }
            setLoading(true);
            setError(null);

            const reader = new BrowserQRCodeReader();
            const url = URL.createObjectURL(file);
            const result = await reader.decodeFromImageUrl(url);
            
            onScan(result.getText());
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to decode QR from image:', err);
            setError('No QR code found in the image. Please try another one.');
            setLoading(false);
            
            // Restart camera after showing error for a bit
            setTimeout(() => {
                if (mountedRef.current) {
                    startScanning();
                }
            }, 3000);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in font-sans">
            <div className="flex justify-between items-center p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-20">
                <h2 className="text-white font-bold text-lg drop-shadow-md">Scan QR Code</h2>
                <button 
                    onClick={handleClose} 
                    className="p-2.5 bg-[#fcfcfc]/10 hover:bg-[#fcfcfc]/20 transition-colors rounded-full text-white backdrop-blur-md active:scale-95"
                    aria-label="Close Scanner"
                >
                    <X size={20} strokeWidth={2.5} />
                </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {loading && <Loader2 className="animate-spin text-indigo-500 absolute z-30" size={40} />}
                
                {error && (
                    <div className="absolute z-30 bg-slate-900/90 px-6 py-4 rounded-2xl backdrop-blur-xl border border-slate-700 mx-4 max-w-sm text-center shadow-2xl">
                        <p className="text-red-400 font-medium text-sm leading-relaxed">{error}</p>
                    </div>
                )}
                
                <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline 
                    muted
                />
                
                {/* Scanner Overlay Frame */}
                {!loading && !error && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/60"></div>
                        <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]">
                            {/* The transparent cutout */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full shadow-[0_0_0_4000px_rgba(0,0,0,0.6)] rounded-[32px]"></div>
                            
                            {/* Scanning line animation */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_12px_2px_rgba(99,102,241,0.8)] animate-scan rounded-full"></div>

                            {/* Corners */}
                            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-[32px]"></div>
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-[32px]"></div>
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-[32px]"></div>
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-[32px]"></div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-6 pt-8 pb-10 sm:pb-12 bg-black flex flex-col items-center z-20">
                <p className="text-white font-bold text-lg mb-1.5 tracking-tight">Point at the QR Code</p>
                <p className="text-slate-400 text-sm text-center max-w-[280px] mb-8 leading-relaxed">
                    Align the QR code within the frame to automatically scan and claim it.
                </p>
                
                {/* Hidden File Input */}
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                
                {/* Upload Button */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2.5 px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-white rounded-2xl transition-all active:scale-[0.98] shadow-xl"
                >
                    <ImageIcon size={20} className="text-indigo-400" />
                    <span className="font-bold text-[15px]">Upload from Gallery</span>
                </button>
            </div>
        </div>
    );
}
