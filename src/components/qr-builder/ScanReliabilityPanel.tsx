'use client';
import { AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { calculateQrScanScore, QrScoreResult } from '@/lib/qrScanScore';
import { QRElement } from './types';

interface ScanReliabilityPanelProps {
    qrElement: QRElement;
}

const CURRENT_LOGO_SIZE_RATIO = 0.13;

const getScoreStyles = (score: number) => {
    if (score >= 80) {
        return {
            text: 'text-emerald-400',
            bg: 'bg-emerald-500',
            ring: 'ring-emerald-500/30',
            track: 'bg-emerald-500/20',
        };
    }

    if (score >= 50) {
        return {
            text: 'text-amber-400',
            bg: 'bg-amber-500',
            ring: 'ring-amber-500/30',
            track: 'bg-amber-500/20',
        };
    }

    return {
        text: 'text-red-400',
        bg: 'bg-red-500',
        ring: 'ring-red-500/30',
        track: 'bg-red-500/20',
    };
};

const getStatusLabel = (result: QrScoreResult) => {
    if (result.score >= 80) return 'Strong';
    if (result.score >= 50) return 'Needs care';
    return 'Hard to scan';
};

export default function ScanReliabilityPanel({ qrElement }: ScanReliabilityPanelProps) {
    const result = useMemo(
        () => calculateQrScanScore({
            foregroundColor: qrElement.fgColor,
            backgroundColor: qrElement.bgColor,
            cornerColor: qrElement.cornerColor,
            hasLogo: Boolean(qrElement.centerLogoUrl),
            logoSizeRatio: qrElement.centerLogoUrl ? CURRENT_LOGO_SIZE_RATIO : 0,
            padding: qrElement.padding,
            errorCorrectionLevel: 'H',
        }),
        [
            qrElement.fgColor,
            qrElement.bgColor,
            qrElement.cornerColor,
            qrElement.centerLogoUrl,
            qrElement.padding,
        ],
    );

    const styles = getScoreStyles(result.score);
    const statusLabel = getStatusLabel(result);

    return (
        <div className={`rounded-lg border border-gray-700 bg-gray-800/70 p-3 ring-1 ${styles.ring}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className={styles.text} />
                    <span className="text-sm font-semibold text-gray-100">Scan Reliability</span>
                    <span
                        title="Estimates QR scan reliability from contrast, finder marker visibility, error correction, logo coverage, and quiet zone padding."
                        aria-label="Scan reliability score info"
                    >
                        <Info size={13} className="text-gray-500" />
                    </span>
                </div>
                <span className={`text-xs font-medium capitalize ${styles.text}`}>{result.grade}</span>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                    <div className={`text-3xl font-bold tabular-nums transition-colors duration-300 ${styles.text}`}>
                        {result.score}%
                    </div>
                    <div className="text-xs text-gray-400">{statusLabel}</div>
                </div>
                <div className={`h-10 w-10 rounded-full ${styles.track} flex items-center justify-center`}>
                    <div className={`h-4 w-4 rounded-full ${styles.bg} transition-colors duration-300`} />
                </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-700">
                <div
                    className={`h-full rounded-full ${styles.bg} transition-all duration-300 ease-out`}
                    style={{ width: `${result.score}%` }}
                />
            </div>

            {result.warnings.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                    {result.warnings.map((warning) => (
                        <div key={warning} className="flex items-start gap-2 text-xs text-amber-200">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                            <span>{warning}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="mt-3 text-xs text-emerald-300">No scan risks detected.</p>
            )}
        </div>
    );
}
