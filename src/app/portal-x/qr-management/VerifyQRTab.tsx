'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, StopCircle, AlertTriangle, CheckCircle2, ShieldCheck, Trash2, RefreshCw } from 'lucide-react';

interface ScanHistory {
    id: string;
    text: string;
    isDuplicate: boolean;
    timestamp: number;
}

export default function VerifyQRTab() {
    const [isScanning, setIsScanning] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [uniqueCount, setUniqueCount] = useState(0);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [history, setHistory] = useState<ScanHistory[]>([]);
    const [viewFilter, setViewFilter] = useState<'all' | 'duplicates'>('all');
    const [flashState, setFlashState] = useState<'none' | 'success' | 'error'>('none');
    const [flashMessage, setFlashMessage] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Refs — values accessed inside rAF loop must be refs
    const scannedSetRef = useRef<Set<string>>(new Set());
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const scanningRef = useRef<boolean>(false);  // controls the rAF loop

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        return () => {
            stopScanner();
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerFlash = (type: 'success' | 'error', message: string) => {
        setFlashState(type);
        setFlashMessage(message);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlashState('none'), 1400);
    };

    const playBeep = (isDuplicate: boolean) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            osc.type = isDuplicate ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(isDuplicate ? 200 : 880, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + (isDuplicate ? 0.4 : 0.15));
        } catch (_) {}
    };

    const onDecodeResult = useCallback((decodedText: string) => {
        const now = Date.now();
        if (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 2500) return;
        lastScannedRef.current = { text: decodedText, time: now };

        const isDuplicate = scannedSetRef.current.has(decodedText);

        if (!isDuplicate) {
            scannedSetRef.current.add(decodedText);
            setUniqueCount(scannedSetRef.current.size);
            triggerFlash('success', 'Verified Unique ✓');
        } else {
            setDuplicateCount(c => c + 1);
            triggerFlash('error', 'ALREADY SCANNED!');
        }

        playBeep(isDuplicate);
        setHistory(prev => [{
            id: Math.random().toString(36).substring(7),
            text: decodedText,
            isDuplicate,
            timestamp: now,
        }, ...prev]);
    }, []);

    // The core scan loop — runs every animation frame, draws video to canvas, decodes with jsQR
    const scanLoop = useCallback(async () => {
        if (!scanningRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
        }

        // Ensure canvas matches actual video stream dimensions
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const jsQR = (await import('jsqr')).default;
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth', // handles both light-on-dark AND dark-on-light QRs
            });

            if (code && code.data) {
                onDecodeResult(code.data);
            }
        } catch (_) {
            // ignore decode errors — they happen every frame when no QR is present
        }

        rafRef.current = requestAnimationFrame(scanLoop);
    }, [onDecodeResult]);

    const startScanner = async () => {
        if (isStarting || isScanning) return;
        setIsStarting(true);
        setCameraError(null);

        // Stop any running scanner first
        stopScanner();

        try {
            // Request camera — prefer back camera, fall back to any
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
            } catch (_) {
                // If environment fails, try without preference
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }

            streamRef.current = stream;

            const video = videoRef.current;
            if (!video) throw new Error('Video element not mounted');

            video.srcObject = stream;
            video.setAttribute('playsinline', 'true');

            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = reject;
                setTimeout(reject, 8000); // 8s timeout
            });

            await video.play();

            scanningRef.current = true;
            setIsScanning(true);

            // Start the decode loop
            rafRef.current = requestAnimationFrame(scanLoop);

        } catch (err: any) {
            console.error('Scanner error:', err);
            const msg = (err?.message || String(err)).toLowerCase();
            if (msg.includes('permission') || msg.includes('notallowed')) {
                setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (msg.includes('notfound') || msg.includes('devicenotfound')) {
                setCameraError('No camera found on this device.');
            } else if (msg.includes('notreadable') || msg.includes('in use')) {
                setCameraError('Camera is already in use by another app.');
            } else {
                setCameraError('Could not start camera. Please try again.');
            }
            stopScanner();
        } finally {
            setIsStarting(false);
        }
    };

    const stopScanner = () => {
        // Stop the rAF loop
        scanningRef.current = false;
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        // Stop the media stream tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        // Clear video source
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    const clearData = () => {
        if (!confirm('Clear all verification data for this session?')) return;
        scannedSetRef.current = new Set();
        setUniqueCount(0);
        setDuplicateCount(0);
        setHistory([]);
        lastScannedRef.current = { text: '', time: 0 };
    };

    const formatDisplay = (text: string) => {
        try {
            const url = new URL(text);
            const token = url.searchParams.get('token');
            if (token) return `Token: ${token}`;
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length > 0) return `ID: ${parts[parts.length - 1]}`;
            return url.hostname + url.pathname;
        } catch (_) {}
        return text.length > 42 ? text.substring(0, 20) + '…' + text.substring(text.length - 12) : text;
    };

    const displayedHistory = viewFilter === 'duplicates' ? history.filter(h => h.isDuplicate) : history;

    return (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">

            {/* Hidden canvas used for frame capture — never shown to user */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl p-4 text-center">
                    <p className="text-sm text-slate-400 font-semibold mb-1">UNIQUE SCANNED</p>
                    <p className="text-4xl font-bold text-emerald-400">{uniqueCount}</p>
                </div>
                <div className={`border rounded-xl p-4 text-center transition-colors ${duplicateCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[rgba(242,237,231,0.05)] border-[#1e293b]'}`}>
                    <p className="text-sm text-slate-400 font-semibold mb-1">DUPLICATES</p>
                    <p className={`text-4xl font-bold ${duplicateCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>{duplicateCount}</p>
                </div>
            </div>

            {/* Scanner */}
            <div className="bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl overflow-hidden">

                <div className="aspect-[4/3] sm:aspect-video relative bg-[#0f172a]">

                    {/* Flash overlay */}
                    <div className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-150 flex flex-col items-center justify-center ${flashState === 'none' ? 'opacity-0' : 'opacity-100'} ${flashState === 'error' ? 'bg-red-500/85' : 'bg-emerald-500/85'}`}>
                        {flashState === 'error'
                            ? <AlertTriangle size={64} className="text-white mb-2 animate-bounce" />
                            : <CheckCircle2 size={64} className="text-white mb-2" />}
                        <p className="text-2xl font-bold text-white tracking-wider">{flashMessage}</p>
                    </div>

                    {/* Video — always mounted so getUserMedia can attach to it */}
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        autoPlay
                        style={{ display: isScanning ? 'block' : 'none' }}
                    />

                    {/* Placeholder — shown when idle */}
                    {!isScanning && !isStarting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                            <ShieldCheck size={48} className="text-slate-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Bulk Verification Mode</h3>
                            <p className="text-slate-400 text-sm max-w-sm mb-6">
                                Scan multiple QR codes sequentially. Duplicates are detected and flagged instantly.
                            </p>
                            {cameraError && (
                                <div className="mb-5 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm max-w-sm text-center leading-relaxed">
                                    {cameraError}
                                </div>
                            )}
                            <button
                                onClick={startScanner}
                                className="flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm bg-mochingo-warm-oat text-mochingo-rich-black hover:bg-white transition-colors shadow-lg"
                            >
                                <Camera size={18} /> Start Scanning
                            </button>
                        </div>
                    )}

                    {/* Starting spinner */}
                    {isStarting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <RefreshCw size={36} className="text-slate-400 animate-spin mb-3" />
                            <p className="text-slate-400 text-sm">Accessing camera…</p>
                        </div>
                    )}

                    {/* Scanning overlay */}
                    {isScanning && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            {/* Corner brackets */}
                            <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg opacity-80" />
                            <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg opacity-80" />
                            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg opacity-80" />
                            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg opacity-80" />
                            {/* Animated scan line */}
                            <div
                                className="absolute left-4 right-4 h-0.5 bg-emerald-400/80 shadow-[0_0_8px_3px_rgba(52,211,153,0.5)]"
                                style={{ animation: 'scanline 2.2s ease-in-out infinite' }}
                            />
                            <style>{`
                                @keyframes scanline {
                                    0%   { top: 10%; }
                                    50%  { top: 85%; }
                                    100% { top: 10%; }
                                }
                            `}</style>
                            {/* Live dot */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-white text-xs font-bold tracking-wider">SCANNING</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls bar */}
                <div className="p-4 border-t border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
                    <button
                        onClick={clearData}
                        disabled={uniqueCount === 0 && duplicateCount === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 border border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <Trash2 size={16} /> Clear Session
                    </button>
                    {isScanning && (
                        <button
                            onClick={stopScanner}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                        >
                            <StopCircle size={16} /> Stop Camera
                        </button>
                    )}
                </div>
            </div>

            {/* History Feed */}
            <div className="bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl p-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h4 className="text-sm font-semibold text-slate-300">Scan History</h4>
                    <div className="flex bg-[#0f172a] rounded-lg p-1 border border-[#1e293b]">
                        <button
                            onClick={() => setViewFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewFilter === 'all' ? 'bg-mochingo-warm-oat text-mochingo-rich-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            All Scans ({history.length})
                        </button>
                        <button
                            onClick={() => setViewFilter('duplicates')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewFilter === 'duplicates' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Duplicates ({duplicateCount})
                        </button>
                    </div>
                </div>

                {displayedHistory.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                        {viewFilter === 'duplicates' ? 'No duplicates found — all scans are unique 🎉' : 'No QRs scanned yet.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                        {displayedHistory.map((item) => (
                            <div
                                key={item.id}
                                className={`flex justify-between items-center p-3 rounded-lg border ${item.isDuplicate ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className={`font-mono text-sm truncate ${item.isDuplicate ? 'text-red-300' : 'text-emerald-300'}`}>
                                        {formatDisplay(item.text)}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 border ${item.isDuplicate ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                    {item.isDuplicate ? 'Duplicate' : 'Unique'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
