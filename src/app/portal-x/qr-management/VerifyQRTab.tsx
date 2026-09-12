'use client';

import { useEffect, useState, useRef } from 'react';
import { Camera, StopCircle, AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';

interface ScanHistory {
    id: string;
    text: string;
    isDuplicate: boolean;
    timestamp: number;
}

export default function VerifyQRTab() {
    const [isScanning, setIsScanning] = useState(false);
    const [uniqueCount, setUniqueCount] = useState(0);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [history, setHistory] = useState<ScanHistory[]>([]);
    const [viewFilter, setViewFilter] = useState<'all' | 'duplicates'>('all');
    const [flashState, setFlashState] = useState<'none' | 'success' | 'error'>('none');
    const [flashMessage, setFlashMessage] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Use a ref for the scanned set so the html5-qrcode callback always sees fresh data
    const scannedSetRef = useRef<Set<string>>(new Set());
    const scannerRef = useRef<any>(null);
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isStartingRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerFlash = (type: 'success' | 'error', message: string) => {
        setFlashState(type);
        setFlashMessage(message);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlashState('none'), 1200);
    };

    const playBeep = (isDuplicate: boolean) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            if (isDuplicate) {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
            }
        } catch (_) {}
    };

    // This callback is passed to html5-qrcode — uses refs so it never goes stale
    const onScanSuccess = (decodedText: string) => {
        const now = Date.now();
        // Anti-bounce: ignore same QR within 2 s
        if (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 2000) return;
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
    };

    const startCamera = async () => {
        if (isStartingRef.current || isScanning) return;
        isStartingRef.current = true;
        setCameraError(null);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            // Always create a fresh instance
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch (_) {}
                try { scannerRef.current.clear(); } catch (_) {}
                scannerRef.current = null;
            }

            const el = document.getElementById('verify-reader');
            if (!el) {
                setCameraError('Scanner element not found. Please refresh the page.');
                return;
            }

            // Enumerate all available cameras and pick the best one
            // (environment/back preferred, front as fallback — important for laptops)
            let cameraId: string | { facingMode: string } | undefined;
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (cameras && cameras.length > 0) {
                    // Prefer back camera, but use whatever is available
                    const backCam = cameras.find(c =>
                        c.label.toLowerCase().includes('back') ||
                        c.label.toLowerCase().includes('rear') ||
                        c.label.toLowerCase().includes('environment')
                    );
                    const chosen = backCam || cameras[0];
                    cameraId = chosen.id;
                }
            } catch (_) {
                // getCameras() can fail if permissions not yet granted; fall through to facingMode
                cameraId = { facingMode: 'environment' };
            }

            if (!cameraId) {
                cameraId = { facingMode: 'environment' };
            }

            scannerRef.current = new Html5Qrcode('verify-reader');

            // Dynamic qrbox: 70% of the smaller dimension so it works at any size
            const containerW = el.clientWidth || 300;
            const containerH = el.clientHeight || 300;
            const boxSize = Math.floor(Math.min(containerW, containerH) * 0.72);

            await scannerRef.current.start(
                cameraId,
                {
                    fps: 15,
                    qrbox: { width: boxSize, height: boxSize },
                    aspectRatio: containerW / containerH,
                },
                onScanSuccess,
                (_errorMsg: string) => { /* ignore per-frame non-decode errors */ }
            );

            setIsScanning(true);
        } catch (err: any) {
            console.error('Camera start error:', err);
            const msg = (err?.message || String(err)).toLowerCase();
            if (msg.includes('permission') || msg.includes('notallowed')) {
                setCameraError('Camera permission denied. Please allow camera access and try again.');
            } else if (msg.includes('notfound') || msg.includes('no camera') || msg.includes('devicenotfound')) {
                setCameraError('No camera found on this device.');
            } else {
                setCameraError('Could not start camera: ' + (err?.message || err));
            }
        } finally {
            isStartingRef.current = false;
        }
    };

    const stopCamera = () => {
        if (!scannerRef.current) { setIsScanning(false); return; }
        try {
            scannerRef.current.stop()
                .then(() => {
                    try { scannerRef.current?.clear(); } catch (_) {}
                    scannerRef.current = null;
                    setIsScanning(false);
                })
                .catch(() => {
                    scannerRef.current = null;
                    setIsScanning(false);
                });
        } catch (_) {
            scannerRef.current = null;
            setIsScanning(false);
        }
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
        } catch (_) {}
        return text.length > 40 ? text.substring(0, 18) + '…' + text.substring(text.length - 12) : text;
    };

    const displayedHistory = viewFilter === 'duplicates' ? history.filter(h => h.isDuplicate) : history;

    return (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
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

            {/* Scanner Viewfinder */}
            <div className="bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl overflow-hidden relative">

                {/* Flash overlay */}
                <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-200 flex flex-col items-center justify-center ${flashState === 'none' ? 'opacity-0' : 'opacity-100'} ${flashState === 'error' ? 'bg-red-500/80' : 'bg-emerald-500/80'}`}>
                    {flashState === 'error'
                        ? <AlertTriangle size={64} className="text-white mb-2 animate-bounce" />
                        : <CheckCircle2 size={64} className="text-white mb-2" />}
                    <p className="text-2xl font-bold text-white tracking-wider">{flashMessage}</p>
                </div>

                <div className="aspect-[4/3] sm:aspect-video relative bg-black">
                    {/* 
                      IMPORTANT: #verify-reader must ALWAYS be in the DOM and visible.
                      html5-qrcode needs a real rendered element to attach the video stream.
                      We hide the placeholder overlay instead of hiding this div.
                    */}
                    <div
                        id="verify-reader"
                        className="w-full h-full"
                        style={{ minHeight: '200px' }}
                    />

                    {/* Placeholder shown when NOT scanning — sits on top of the (empty) reader div */}
                    {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#0f172a]">
                            <ShieldCheck size={48} className="text-slate-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Bulk Verification Mode</h3>
                            <p className="text-slate-400 text-sm max-w-sm mb-6">
                                Scan multiple QR codes sequentially. The system will alert you if any duplicates are detected.
                            </p>
                            {cameraError && (
                                <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm max-w-sm text-center">
                                    {cameraError}
                                </div>
                            )}
                            <button
                                onClick={startCamera}
                                className="btn btn-primary bg-mochingo-warm-oat text-mochingo-rich-black hover:bg-white border-none shadow-md flex items-center gap-2 px-6 py-3 rounded-full font-bold"
                            >
                                <Camera size={18} /> Start Scanning
                            </button>
                        </div>
                    )}

                    {/* Scanning corner brackets + animated scan line */}
                    {isScanning && (
                        <div className="absolute inset-0 z-10 pointer-events-none border-[30px] border-black/50">
                            <div className="absolute top-2 left-2 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-xl opacity-70" />
                            <div className="absolute top-2 right-2 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-xl opacity-70" />
                            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-xl opacity-70" />
                            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-xl opacity-70" />
                            {/* Animated scan line */}
                            <div
                                className="absolute left-2 right-2 h-0.5 bg-emerald-400/80"
                                style={{
                                    animation: 'scanline 2s ease-in-out infinite',
                                }}
                            />
                            <style>{`
                                @keyframes scanline {
                                    0%   { top: 10%; }
                                    50%  { top: 85%; }
                                    100% { top: 10%; }
                                }
                            `}</style>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
                    <button
                        onClick={clearData}
                        className="btn btn-outline text-slate-400 border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                        disabled={uniqueCount === 0 && duplicateCount === 0}
                    >
                        <Trash2 size={16} /> Clear Session
                    </button>

                    {isScanning && (
                        <button
                            onClick={stopCamera}
                            className="btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 border border-red-500/30 hover:bg-red-500/20"
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
                        {viewFilter === 'duplicates' ? 'No duplicates found. All scans are unique! 🎉' : 'No QRs scanned yet.'}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
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
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${item.isDuplicate ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
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
