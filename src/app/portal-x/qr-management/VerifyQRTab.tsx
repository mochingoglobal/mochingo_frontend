'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, StopCircle, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';

interface ScanHistory {
    id: string;
    text: string;
    isDuplicate: boolean;
    timestamp: number;
}

export default function VerifyQRTab() {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedSet, setScannedSet] = useState<Set<string>>(new Set());
    const [history, setHistory] = useState<ScanHistory[]>([]);
    const [viewFilter, setViewFilter] = useState<'all' | 'duplicates'>('all');
    const [duplicateCount, setDuplicateCount] = useState(0);
    
    // UI Flash state for immediate feedback
    const [flashState, setFlashState] = useState<'none' | 'success' | 'error'>('none');
    const [flashMessage, setFlashMessage] = useState('');

    const scannerRef = useRef<any>(null);
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
    const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clean up scanner on unmount
    useEffect(() => {
        return () => {
            try {
                if (scannerRef.current) {
                    try { scannerRef.current.stop().catch(() => {}); } catch(e) {}
                }
            } catch (e) {}
        };
    }, []);

    const triggerFlash = (type: 'success' | 'error', message: string) => {
        setFlashState(type);
        setFlashMessage(message);
        
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => {
            setFlashState('none');
        }, 1200);
    };

    const processScan = useCallback((decodedText: string) => {
        const now = Date.now();
        
        // Anti-bounce: Ignore exact same QR if scanned within 2 seconds
        if (lastScannedRef.current.text === decodedText && now - lastScannedRef.current.time < 2000) {
            return; 
        }

        lastScannedRef.current = { text: decodedText, time: now };

        // Play a very subtle beep if possible (browsers might block this if not interacted, 
        // but since they clicked "Start Scanning", we usually have audio context)
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            // Error buzz vs Success beep
            const isDuplicate = scannedSet.has(decodedText);
            
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
        } catch (e) {
            // Ignore audio context errors
        }

        setScannedSet((prev) => {
            const newSet = new Set(prev);
            const isDuplicate = prev.has(decodedText);

            if (isDuplicate) {
                setDuplicateCount(c => c + 1);
                triggerFlash('error', 'ALREADY SCANNED!');
            } else {
                newSet.add(decodedText);
                triggerFlash('success', 'Verified Unique');
            }

            setHistory(prevHistory => {
                const newRecord: ScanHistory = {
                    id: Math.random().toString(36).substring(7),
                    text: decodedText,
                    isDuplicate,
                    timestamp: now
                };
                return [newRecord, ...prevHistory]; // Store all for review
            });

            return newSet;
        });
    }, [scannedSet]);

    const startCamera = async () => {
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("verify-reader");
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText: string) => {
                    processScan(decodedText);
                },
                (errorMessage: string) => {
                    // Ignore normal scan failures
                }
            );
            setIsScanning(true);
        } catch (err: any) {
            console.error(err);
            alert("Could not start camera: " + (err.message || err));
        }
    };

    const stopCamera = () => {
        try {
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    setIsScanning(false);
                }).catch(() => { setIsScanning(false); });
            }
        } catch (e) {
            setIsScanning(false);
        }
    };

    const clearData = () => {
        if (confirm('Are you sure you want to clear all verification data?')) {
            setScannedSet(new Set());
            setHistory([]);
            setDuplicateCount(0);
            lastScannedRef.current = { text: '', time: 0 };
        }
    };

    return (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {/* Top Stats Board */}
            <div className="grid grid-cols-2 gap-4">
                <div className="card bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-slate-400 font-semibold mb-1">UNIQUE SCANNED</p>
                    <p className="text-4xl font-bold text-emerald-400">{scannedSet.size}</p>
                </div>
                <div className={`card border rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors duration-300 ${duplicateCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[rgba(242,237,231,0.05)] border-[#1e293b]'}`}>
                    <p className="text-sm text-slate-400 font-semibold mb-1">DUPLICATES</p>
                    <p className={`text-4xl font-bold ${duplicateCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>{duplicateCount}</p>
                </div>
            </div>

            {/* Scanner Viewfinder */}
            <div className="card bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl overflow-hidden relative">
                
                {/* Visual Flash Overlay */}
                <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-200 flex flex-col items-center justify-center ${flashState === 'none' ? 'opacity-0' : 'opacity-100'} ${flashState === 'error' ? 'bg-red-500/80' : 'bg-emerald-500/80'}`}>
                    {flashState === 'error' ? (
                        <AlertTriangle size={64} className="text-white mb-2 animate-bounce" />
                    ) : (
                        <CheckCircle2 size={64} className="text-white mb-2" />
                    )}
                    <p className="text-2xl font-bold text-white tracking-wider">{flashMessage}</p>
                </div>

                <div className="aspect-[4/3] sm:aspect-video relative bg-black flex flex-col items-center justify-center">
                    <div id="verify-reader" className={`w-full h-full ${!isScanning ? 'hidden' : 'block'}`}></div>
                    
                    {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#0f172a]">
                            <ShieldCheck size={48} className="text-slate-400 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Bulk Verification Mode</h3>
                            <p className="text-slate-400 text-sm max-w-sm mb-6">Scan multiple QR codes sequentially. The system will alert you if any duplicates are detected in the current session.</p>
                            
                            <button 
                                onClick={startCamera}
                                className="btn btn-primary bg-mochingo-warm-oat text-mochingo-rich-black hover:bg-white hover:text-mochingo-rich-black border-none shadow-md"
                            >
                                <Camera size={18} /> Start Scanning
                            </button>
                        </div>
                    )}

                    {isScanning && (
                        <div className="absolute inset-0 z-10 pointer-events-none border-[30px] border-black/50">
                            {/* Scanning bracket corners */}
                            <div className="absolute top-2 left-2 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-xl opacity-70" />
                            <div className="absolute top-2 right-2 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-xl opacity-70" />
                            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-xl opacity-70" />
                            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-xl opacity-70" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
                    <button 
                        onClick={clearData}
                        className="btn btn-outline text-slate-400 border-slate-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                        disabled={scannedSet.size === 0 && duplicateCount === 0}
                    >
                        <Trash2 size={16} /> Clear Session
                    </button>

                    {isScanning && (
                        <button 
                            onClick={stopCamera}
                            className="btn btn-danger text-red-400 border-red-500/30 hover:bg-red-500/20"
                        >
                            <StopCircle size={16} /> Stop Camera
                        </button>
                    )}
                </div>
            </div>

            {/* History Feed */}
            <div className="card bg-[rgba(242,237,231,0.05)] border border-[#1e293b] rounded-xl p-4 flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <h4 className="text-sm font-semibold text-slate-300">
                        Scan History
                    </h4>
                    <div className="flex bg-[#0f172a] rounded-lg p-1 border border-[#1e293b]">
                        <button 
                            onClick={() => setViewFilter('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewFilter === 'all' ? 'bg-mochingo-warm-oat text-mochingo-rich-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            All Scans ({history.length})
                        </button>
                        <button 
                            onClick={() => setViewFilter('duplicates')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${viewFilter === 'duplicates' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Duplicates ({duplicateCount})
                        </button>
                    </div>
                </div>
                
                {history.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                        No QRs scanned yet.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {history.filter(item => viewFilter === 'all' || item.isDuplicate).map((item) => {
                            // Extract just the token or last part of URL if it's long
                            let displayTxt = item.text;
                            try {
                                const url = new URL(item.text);
                                const token = url.searchParams.get('token');
                                if (token) displayTxt = `Token: ${token}`;
                                else {
                                    const parts = url.pathname.split('/').filter(Boolean);
                                    if (parts.length > 0) displayTxt = `ID: ${parts[parts.length - 1]}`;
                                }
                            } catch (e) {
                                // Not a URL, keep original text
                                if (displayTxt.length > 30) {
                                    displayTxt = displayTxt.substring(0, 15) + '...' + displayTxt.substring(displayTxt.length - 10);
                                }
                            }

                            return (
                                <div 
                                    key={item.id} 
                                    className={`flex justify-between items-center p-3 rounded-lg border ${
                                        item.isDuplicate 
                                            ? 'bg-red-500/10 border-red-500/20' 
                                            : 'bg-emerald-500/5 border-emerald-500/10'
                                    }`}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-mono text-sm truncate ${item.isDuplicate ? 'text-red-300' : 'text-emerald-300'}`}>
                                            {displayTxt}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    
                                    {item.isDuplicate ? (
                                        <span className="badge bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0 ml-2">Duplicate</span>
                                    ) : (
                                        <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 ml-2">Unique</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
