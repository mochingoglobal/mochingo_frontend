'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
    onScan: (text: string) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const scanningRef = useRef<boolean>(false);

    const stopScanner = useCallback(() => {
        scanningRef.current = false;
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const scanLoop = useCallback(() => {
        if (!scanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        // Match canvas dimensions to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            if (code && code.data) {
                stopScanner();
                onScan(code.data);
                return; // Stop looping once found
            }
        } catch (_) {
            // Ignore decode errors on empty frames
        }

        rafRef.current = requestAnimationFrame(scanLoop);
    }, [onScan, stopScanner]);

    const startScanner = useCallback(async () => {
        setError(null);
        setLoading(true);

        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                });
            } catch (_) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            streamRef.current = stream;
            
            const video = videoRef.current;
            if (!video) throw new Error('Video element not found');

            video.srcObject = stream;
            video.setAttribute('playsinline', 'true'); // required for iOS Safari

            await new Promise<void>((resolve, reject) => {
                if (video.readyState >= 1) {
                    resolve();
                    return;
                }
                video.onloadedmetadata = () => resolve();
                video.onerror = (e) => reject(e);
                setTimeout(() => reject(new Error('Camera initialization timeout')), 8000);
            });

            await video.play();
            setLoading(false);
            
            scanningRef.current = true;
            rafRef.current = requestAnimationFrame(scanLoop);

        } catch (err: any) {
            console.error('Camera error:', err);
            setError('Camera access denied or unavailable.');
            setLoading(false);
        }
    }, [scanLoop]);

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, [startScanner, stopScanner]);

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            stopScanner();
            setLoading(true);
            setError(null);

            const img = new Image();
            const url = URL.createObjectURL(file);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No 2d context');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
            });

            URL.revokeObjectURL(url);

            if (code && code.data) {
                onScan(code.data);
            } else {
                throw new Error('No QR found');
            }
        } catch (err) {
            console.error('Failed to decode QR from image:', err);
            setError('No QR code found in the image. Please try another one.');
            setLoading(false);
            
            setTimeout(() => {
                startScanner();
            }, 3000);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in font-sans">
            <canvas ref={canvasRef} className="hidden" />
            
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
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full shadow-[0_0_0_4000px_rgba(0,0,0,0.6)] rounded-[32px]"></div>
                            
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500 shadow-[0_0_12px_2px_rgba(99,102,241,0.8)] animate-scan rounded-full"></div>

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
                
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                
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
