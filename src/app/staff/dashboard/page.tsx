'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, Loader2, ArrowRight, ChevronRight, QrCode } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import jsQR from 'jsqr';

type HistoryItem = {
    _id: string;
    token: string;
    label: string;
    status: string;
    manual_redirect_url: string;
    assigned_at: string;
    owner_id?: { name: string; business: string; };
};

export default function SalesDashboardPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number | null>(null);
    const scanningRef = useRef<boolean>(false);

    // Recent assignments
    const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        
        // Fetch recent assignments
        api.get('/admin/sales/history')
            .then(res => {
                const allHistory = res.data.data.history || [];
                setRecentHistory(allHistory.slice(0, 6)); // Top 6
            })
            .catch(() => {})
            .finally(() => setHistoryLoading(false));

        return () => {
            stopCamera();
        };
    }, []);

    const processScanResult = (decodedText: string) => {
        setIsProcessing(true);
        stopCamera();

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

    const stopCamera = () => {
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
        setIsScanning(false);
    };

    const scanLoop = () => {
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
                processScanResult(code.data);
                return; 
            }
        } catch (_) {}

        rafRef.current = requestAnimationFrame(scanLoop);
    };

    const startCamera = async () => {
        try {
            setIsProcessing(true);
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
            video.setAttribute('playsinline', 'true'); 

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
            setIsProcessing(false);
            setIsScanning(true);
            
            scanningRef.current = true;
            rafRef.current = requestAnimationFrame(scanLoop);

        } catch (err: any) {
            console.error('Camera error:', err);
            alert("Could not start camera: " + (err.message || err));
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            stopCamera();
            setIsProcessing(true);

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
                processScanResult(code.data);
            } else {
                throw new Error('No QR found');
            }
        } catch (err: any) {
            alert('Could not find a valid QR code in this image.');
            setIsProcessing(false);
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000); // minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        const hrs = Math.floor(diff / 60);
        if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
        const days = Math.floor(hrs / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const getDestinationCategory = (url: string) => {
        if (!url) return 'Unknown';
        const l = url.toLowerCase();
        if (l.includes('instagram.com')) return 'Instagram';
        if (l.includes('wa.me') || l.includes('whatsapp')) return 'WhatsApp';
        if (l.includes('search.google.com') || l.includes('g.page')) return 'Google Review';
        return 'Website';
    };

    if (!mounted) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-black" size={32} />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-12 sm:gap-16 max-w-full">
            
            {/* Header & Hero Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 md:gap-16">
                
                {/* Hero Titles */}
                <div className="flex-1 max-w-xl">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-black/60 mb-5">
                        SCAN & ASSIGN
                    </p>
                    <h1 className="text-4xl sm:text-[52px] font-black leading-[0.95] tracking-tight mb-6 text-black">
                        Assign a QR code<br />in seconds.
                    </h1>
                    <p className="text-sm font-medium text-black/70 max-w-sm leading-relaxed">
                        Scan an unassigned QR code to connect it to a customer account.
                    </p>
                </div>

                {/* Optional Decorative Text (Right Aligned on desktop) */}
                <div className="hidden lg:flex flex-col items-end text-right justify-start pt-6 opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                        GOOD<br/>PRODUCTS<br/>BRIGHTER<br/>DAYS.
                    </p>
                </div>
            </div>

            {/* Scanner Workspace Area */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full">
                
                {/* Scanner Container (Left) */}
                <div className="w-full lg:w-[460px] shrink-0 bg-transparent sm:bg-white border-0 sm:border rounded-[24px] p-0 sm:p-8 flex flex-col shadow-none sm:shadow-sm" style={{ borderColor: '#D8D1C8' }}>
                    
                    <div className="w-full aspect-[4/4] sm:aspect-square relative flex items-center justify-center bg-white sm:bg-transparent rounded-3xl sm:rounded-none shadow-xl sm:shadow-none mb-6">
                        
                        {/* Video Element */}
                        <canvas ref={canvasRef} className="hidden" />
                        <video 
                            ref={videoRef} 
                            className={`absolute inset-0 w-full h-full object-cover rounded-3xl ${!isScanning ? 'opacity-0 pointer-events-none' : 'opacity-100 z-10'}`}
                            playsInline 
                            muted
                        />

                        {isProcessing && (
                            <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
                                <Loader2 className="animate-spin text-black mb-3" size={32} />
                                <p className="text-sm font-bold tracking-wide">Processing...</p>
                            </div>
                        )}

                        {!isScanning && !isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20">
                                <div className="w-16 h-16 rounded-full bg-[#F2EDE7] flex items-center justify-center mb-5">
                                    <Camera size={24} className="text-black" />
                                </div>
                                <h3 className="text-[17px] font-bold text-black mb-2">Ready to scan</h3>
                                <p className="text-[13px] text-black/60 max-w-[200px] leading-relaxed">
                                    Position the QR code within the frame to identify it.
                                </p>
                            </div>
                        )}

                        {/* Scanner Corner Brackets (Visual only) */}
                        <div className="absolute inset-4 sm:inset-6 z-20 pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-black" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-black" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-black" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-black" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-auto">
                        {!isScanning ? (
                            <button 
                                onClick={startCamera}
                                className="w-full h-14 bg-black text-white rounded-xl font-bold text-[14px] transition-all hover:bg-black/90 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                Open Camera &rarr;
                            </button>
                        ) : (
                            <button 
                                onClick={stopCamera}
                                className="w-full h-14 bg-[#EAE2D8] text-black rounded-xl font-bold text-[14px] transition-all hover:bg-[#D8D1C8] active:scale-[0.98] flex items-center justify-center"
                            >
                                Stop Camera
                            </button>
                        )}
                        
                        <div className="flex items-center justify-center gap-4">
                            <span className="h-px w-12 bg-black/10"></span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-black/40">or</span>
                            <span className="h-px w-12 bg-black/10"></span>
                        </div>
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2.5 w-full h-12 text-[13px] font-bold text-black hover:opacity-70 transition-opacity"
                        >
                            <ImageIcon size={18} />
                            <span className="underline underline-offset-4 decoration-black/30">Upload QR image</span>
                        </button>
                    </div>
                </div>

                {/* How It Works (Right) */}
                <div className="flex-1 bg-transparent border-0 rounded-[24px] p-0 sm:p-8 flex flex-col" style={{ borderColor: '#D8D1C8' }}>
                    <h2 className="text-[19px] font-bold text-black mb-8">How it works</h2>
                    
                    <div className="flex flex-col gap-8 flex-1">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#EAE2D8] flex items-center justify-center text-sm font-bold shrink-0 text-black">1</div>
                            <div>
                                <h4 className="text-[14px] font-bold text-black mb-1">Scan QR code</h4>
                                <p className="text-[13px] text-black/60 leading-relaxed">Use your camera or upload an image to identify the QR code.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#EAE2D8] flex items-center justify-center text-sm font-bold shrink-0 text-black">2</div>
                            <div>
                                <h4 className="text-[14px] font-bold text-black mb-1">Check status</h4>
                                <p className="text-[13px] text-black/60 leading-relaxed">We'll verify if the QR code is unassigned or already assigned.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-[#EAE2D8] flex items-center justify-center text-sm font-bold shrink-0 text-black">3</div>
                            <div>
                                <h4 className="text-[14px] font-bold text-black mb-1">Assign to user</h4>
                                <p className="text-[13px] text-black/60 leading-relaxed">Search for the customer and assign the QR code.</p>
                            </div>
                        </div>

                        {/* Decorative spacing */}
                        <div className="flex-1 min-h-[40px]"></div>
                    </div>
                </div>

            </div>

            {/* Recent Assignments Table */}
            <div className="w-full">
                <div className="flex items-center justify-between border-b pb-4 mb-2" style={{ borderColor: '#D8D1C8' }}>
                    <h3 className="text-[17px] font-bold text-black">Recent assignments</h3>
                    <Link href="/staff/history" className="text-[12px] font-bold text-black flex items-center gap-1 hover:opacity-70 transition-opacity">
                        View all &rarr;
                    </Link>
                </div>
                
                {historyLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="animate-spin text-black/30" size={24} />
                    </div>
                ) : recentHistory.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-[13px] text-black/60">No recent assignments found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 pr-4">QR ID</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 hidden sm:table-cell">CUSTOMER</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 hidden md:table-cell">DESTINATION</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 px-4 text-right sm:text-left">ASSIGNED AT</th>
                                    <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 pl-4 text-right hidden sm:table-cell">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentHistory.map((item) => (
                                    <tr key={item._id} className="border-t border-black/5 hover:bg-black/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/staff/assign/${item.token}`)}>
                                        
                                        {/* Mobile format wraps customer/ID together */}
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[#EAE2D8] flex items-center justify-center shrink-0">
                                                    <QrCode size={14} className="text-black" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-black">{item.token}</div>
                                                    <div className="text-[11px] text-black/60 sm:hidden mt-0.5">{item.owner_id?.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="py-4 px-4 hidden sm:table-cell">
                                            <div className="text-[13px] font-medium text-black">{item.owner_id?.name || 'Unknown'}</div>
                                        </td>
                                        
                                        <td className="py-4 px-4 hidden md:table-cell">
                                            <div className="text-[13px] font-medium text-black/70">{getDestinationCategory(item.manual_redirect_url)}</div>
                                        </td>
                                        
                                        <td className="py-4 px-4 text-right sm:text-left">
                                            <div className="text-[12px] font-medium text-black/60">{formatTimeAgo(item.assigned_at)}</div>
                                        </td>
                                        
                                        <td className="py-4 pl-4 text-right hidden sm:table-cell">
                                            <div className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                                <span className="text-[12px] font-medium text-black/70">Assigned</span>
                                            </div>
                                        </td>

                                        {/* Arrow for mobile row click */}
                                        <td className="py-4 pl-2 text-right sm:hidden">
                                            <ChevronRight size={16} className="text-black/30 inline-block" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
            />
            
        </div>
    );
}
