'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function SalesDashboardPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const scannerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
        return () => {
            try {
                if (scannerRef.current) {
                    // Only try to stop if it has been started
                    try { scannerRef.current.stop().catch(() => {}); } catch(e) {}
                }
            } catch (e) {}
        };
    }, []);

    const processScanResult = (decodedText: string) => {
        setIsProcessing(true);
        try {
            if (scannerRef.current) {
                try { scannerRef.current.stop().catch(() => {}); } catch(e) {}
                setIsScanning(false);
            }
        } catch (e) {}

        try {
            let token = decodedText;
            try {
                const url = new URL(decodedText);
                const param = url.searchParams.get('token');
                if (param) {
                    token = param;
                } else {
                    const parts = url.pathname.split('/');
                    token = parts[parts.length - 1];
                }
            } catch (e) {
                // Not a URL, use raw text
            }
            
            if (token) {
                router.push(`/staff/assign/${token}`);
            } else {
                alert('Could not extract token from QR code');
                setIsProcessing(false);
            }
        } catch (err) {
            alert('Error processing QR code');
            setIsProcessing(false);
        }
    };

    const startCamera = async () => {
        try {
            setIsProcessing(true);
            const { Html5Qrcode } = await import('html5-qrcode');
            
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText: string) => {
                    processScanResult(decodedText);
                },
                (errorMessage: string) => {
                    // Ignore normal scan failures
                }
            );
            setIsScanning(true);
        } catch (err: any) {
            console.error(err);
            alert("Could not start camera: " + (err.message || err));
        } finally {
            setIsProcessing(false);
        }
    };

    const stopCamera = () => {
        try {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().then(() => {
                        setIsScanning(false);
                    }).catch(() => { setIsScanning(false); });
                } catch(e) { setIsScanning(false); }
            }
        } catch (e) {
            setIsScanning(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessing(true);
            try {
                if (scannerRef.current) {
                    try { await scannerRef.current.stop().catch(() => {}); } catch(e) {}
                    setIsScanning(false);
                }
            } catch (e) {}

            const { Html5Qrcode } = await import('html5-qrcode');
            const tempScanner = new Html5Qrcode("hidden-reader");
            
            const decodedText = await tempScanner.scanFile(file, true);
            processScanResult(decodedText);
        } catch (err: any) {
            alert('Could not find a valid QR code in this image.');
            setIsProcessing(false);
        }
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!mounted) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center h-[calc(100vh-140px)] justify-center">
            
            <div className="w-full max-w-sm relative">
                
                {/* The Video Container */}
                <div 
                    className={`w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl relative border-4 border-[#161b27] ${!isScanning ? 'flex items-center justify-center' : ''}`}
                >
                    <div id="reader" className={`w-full h-full ${!isScanning ? 'hidden' : 'block'}`}></div>
                    
                    {!isScanning && !isProcessing && (
                        <div className="text-center p-6">
                            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <Camera size={32} className="text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Ready to Scan</h2>
                            <p className="text-slate-400 text-sm mb-6">Position the QR code within the frame to scan it instantly.</p>
                            
                            <button 
                                onClick={startCamera}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 w-full shadow-lg shadow-indigo-600/30"
                            >
                                Open Camera
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-indigo-500 mb-3" size={36} />
                            <p className="text-indigo-400 font-medium">Processing...</p>
                        </div>
                    )}

                    {/* Scanning Overlay UI */}
                    {isScanning && !isProcessing && (
                        <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/40">
                            {/* Scanning bracket corners */}
                            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="absolute -bottom-16 left-0 right-0 flex justify-between items-center px-4">
                    {isScanning ? (
                        <button 
                            onClick={stopCamera}
                            className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 bg-[#161b27] rounded-full border border-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#161b27] hover:bg-[#1f2638] text-white p-4 rounded-full border border-white/10 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group"
                        title="Upload from Gallery"
                    >
                        <ImageIcon size={24} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </button>
                </div>

            </div>

            {/* Hidden elements required for Html5Qrcode API */}
            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
            />
            <div id="hidden-reader" className="hidden"></div>

        </div>
    );
}
