'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { ArrowLeft, Loader2, Link as LinkIcon, Camera } from 'lucide-react';
import api from '@/lib/api';

export default function ScanAssignPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [scannedUrl, setScannedUrl] = useState('');
    const [token, setToken] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [warningMsg, setWarningMsg] = useState('');
    const [replaceExisting, setReplaceExisting] = useState(false);

    useEffect(() => {
        return () => stopScan();
    }, []);

    const startScan = async () => {
        if (!videoRef.current) return;
        try {
            setError('');
            const codeReader = new BrowserQRCodeReader();
            const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
                if (result) {
                    handleScanSuccess(result.getText());
                }
            });
            controlsRef.current = controls;
            setIsScanning(true);
        } catch (err: any) {
            setError('Could not access camera. Please ensure permissions are granted.');
        }
    };

    const stopScan = () => {
        if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = (text: string) => {
        stopScan();
        setScannedUrl(text);
        try {
            const urlObj = new URL(text);
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.includes('dq')) {
                const idx = pathParts.indexOf('dq');
                const t = pathParts[idx + 1];
                if (t) {
                    setToken(decodeURIComponent(t));
                } else {
                    setError('Not a valid Mochingo QR code.');
                }
            } else {
                setError('Not a valid Mochingo QR code.');
            }
        } catch {
            setError('Invalid QR code format.');
        }
    };

    const assignMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/admin/qr/dynamic/scan-assign', {
                token,
                manual_redirect_url: manualUrl.trim(),
                replace_existing: replaceExisting
            });
            return res.data;
        },
        onSuccess: () => {
            setSuccessMsg('Successfully assigned!');
            setWarningMsg('');
            queryClient.invalidateQueries({ queryKey: ['dynamic-qrs'] });
            
            // Reset after 2s
            setTimeout(() => {
                setScannedUrl('');
                setToken('');
                setManualUrl('');
                setSuccessMsg('');
                setReplaceExisting(false);
            }, 2000);
        },
        onError: (err: any) => {
            if (err.response?.status === 409) {
                setWarningMsg(err.response.data.message || 'QR is already assigned.');
                setReplaceExisting(true);
            } else {
                setError(err.response?.data?.message || 'Assignment failed');
            }
        }
    });

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button onClick={() => router.back()} className="btn btn-outline"><ArrowLeft size={16}/></button>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Scan & Assign</h1>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Scan a printed QR code and link it instantly.</p>
                </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
                {!scannedUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                        <div style={{
                            width: '100%', maxWidth: 400, aspectRatio: '1/1', background: '#0a0d16',
                            borderRadius: 16, overflow: 'hidden', position: 'relative',
                            border: '2px solid var(--card-border)'
                        }}>
                            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {!isScanning && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                                    <Camera size={48} color="#94a3b8" style={{ marginBottom: 16 }} />
                                    <button className="btn btn-primary" onClick={startScan}>Start Camera</button>
                                </div>
                            )}
                            {isScanning && (
                                <div style={{ position: 'absolute', inset: 20, border: '2px dashed rgba(99,102,241,0.5)', borderRadius: 12, pointerEvents: 'none' }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.1)', animation: 'pulse 2s infinite' }} />
                                </div>
                            )}
                        </div>
                        {isScanning && (
                            <button className="btn btn-outline" onClick={stopScan}>Cancel Scan</button>
                        )}
                        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ padding: 16, background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Scanned QR URL:</p>
                            <p style={{ fontSize: 14, fontWeight: 500, wordBreak: 'break-all' }}>{scannedUrl}</p>
                            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 12, marginBottom: 4 }}>Extracted Token:</p>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#818cf8', fontFamily: 'monospace' }}>{token}</p>
                        </div>

                        <div>
                            <label className="label">Destination URL</label>
                            <div style={{ position: 'relative' }}>
                                <LinkIcon size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#64748b' }} />
                                <input 
                                    className="input" 
                                    style={{ paddingLeft: 36 }} 
                                    value={manualUrl} 
                                    onChange={e => setManualUrl(e.target.value)} 
                                    placeholder="https://" 
                                    autoFocus
                                />
                            </div>
                        </div>

                        {warningMsg && (
                            <div style={{ padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                <p style={{ fontWeight: 600, marginBottom: 8 }}>{warningMsg}</p>
                                <p style={{ fontSize: 13 }}>Do you want to override the existing destination?</p>
                            </div>
                        )}

                        {successMsg && (
                            <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', textAlign: 'center' }}>
                                {successMsg}
                            </div>
                        )}

                        {error && !warningMsg && (
                            <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => assignMutation.mutate()} 
                                disabled={assignMutation.isPending || !manualUrl || !!successMsg}
                                style={{ flex: 1 }}
                            >
                                {assignMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                                {warningMsg ? 'Yes, Replace Existing' : 'Assign URL'}
                            </button>
                            <button 
                                className="btn btn-outline" 
                                onClick={() => {
                                    setScannedUrl('');
                                    setToken('');
                                    setWarningMsg('');
                                    setError('');
                                }}
                                disabled={assignMutation.isPending}
                            >
                                Scan Another
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
