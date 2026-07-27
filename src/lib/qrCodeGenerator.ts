import QRCode from 'qrcode';

interface QRGeneratorOptions {
    text: string;
    size: number;
    padding?: number;
    logoUrl?: string;
    foregroundColor?: string;
    backgroundColor?: string;
    markerColor?: string;
    markerInnerBackgroundColor?: string;
    designStyle?: 'dots' | 'squares';
}

const addLogoToCanvas = async (canvas: HTMLCanvasElement, logoUrl: string): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    try {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.src = logoUrl;
        await new Promise<void>((resolve, reject) => {
            logo.onload = () => resolve();
            logo.onerror = reject;
        });
        const logoSize = size * 0.13;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;
        const logoPadding = logoSize * 0.15;
        const bgSize = logoSize + logoPadding * 2;
        const bgX = logoX - logoPadding;
        const bgY = logoY - logoPadding;
        const borderRadius = bgSize * 0.15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(bgX, bgY, bgSize, bgSize, borderRadius);
        ctx.fill();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    } catch {
        // logo failed — ignore
    }
};

export const createStyledQRCodeCanvas = async ({
    text,
    size,
    padding = 40,
    logoUrl,
    foregroundColor = '#000000',
    backgroundColor = '#ffffff',
    markerColor = '#000000',
    markerInnerBackgroundColor,
    designStyle = 'dots',
}: QRGeneratorOptions): Promise<HTMLCanvasElement | null> => {
    const bgColor = backgroundColor || '#ffffff';
    const markerBgColor = markerInnerBackgroundColor ?? bgColor;
    try {
        const qrData = await QRCode.create(text, { errorCorrectionLevel: 'H' });
        const modules = qrData.modules;
        const moduleCount = modules.size;
        const usableSize = size - padding * 2;
        const cellSize = Math.max(1, Math.floor(usableSize / moduleCount));
        const qrSize = cellSize * moduleCount;
        const actualTotalSize = qrSize + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = actualTotalSize;
        canvas.height = actualTotalSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const dotRadius = cellSize * 0.4;
        if (bgColor === 'transparent') {
            ctx.clearRect(0, 0, actualTotalSize, actualTotalSize);
        } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, actualTotalSize, actualTotalSize);
        }
        ctx.save();
        ctx.translate(padding, padding);
        ctx.fillStyle = foregroundColor;

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules.get(row, col)) {
                    const isMarker =
                        (row < 7 && col < 7) ||
                        (row < 7 && col >= moduleCount - 7) ||
                        (row >= moduleCount - 7 && col < 7);
                    if (!isMarker) {
                        if (designStyle === 'squares') {
                            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                        } else {
                            const x = col * cellSize + cellSize / 2;
                            const y = row * cellSize + cellSize / 2;
                            ctx.beginPath();
                            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }

        const drawPositionMarker = (x: number, y: number) => {
            const ms = cellSize * 7;
            
            if (designStyle === 'squares') {
                ctx.fillStyle = markerColor;
                ctx.fillRect(x, y, ms, ms);
                if (markerBgColor === 'transparent') {
                    ctx.clearRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
                } else {
                    ctx.fillStyle = markerBgColor;
                    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
                }
                ctx.fillStyle = markerColor;
                ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
            } else {
                const br = cellSize * 1.5;
                const ibr = cellSize * 0.8;
                const cdr = cellSize * 1.8;
                ctx.fillStyle = markerColor;
                ctx.beginPath();
                ctx.roundRect(x, y, ms, ms, br);
                ctx.fill();
                
                if (markerBgColor === 'transparent') {
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.roundRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5, ibr);
                    ctx.fill();
                    ctx.restore();
                } else {
                    ctx.fillStyle = markerBgColor;
                    ctx.beginPath();
                    ctx.roundRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5, ibr);
                    ctx.fill();
                }

                ctx.fillStyle = markerColor;
                ctx.beginPath();
                ctx.arc(x + ms / 2, y + ms / 2, cdr, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        drawPositionMarker(0, 0);
        drawPositionMarker(qrSize - cellSize * 7, 0);
        drawPositionMarker(0, qrSize - cellSize * 7);
        ctx.restore();

        if (logoUrl) await addLogoToCanvas(canvas, logoUrl);
        return canvas;
    } catch {
        return null;
    }
};

export const generateQRCodeDataURL = async (options: QRGeneratorOptions): Promise<string | null> => {
    const canvas = await createStyledQRCodeCanvas(options);
    return canvas ? canvas.toDataURL('image/png') : null;
};

/** Build the permanent printed URL for a Mochingo dynamic QR */
export const buildMochingoDynamicQRURL = (token: string): string => {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mochingo.com';
    return `${base}/dq/${encodeURIComponent(token)}`;
};

/**
 * Build an id value string from prefix and number, e.g. "room%100"
 */
export const buildIdValue = (prefix: string, number: number): string => {
    return `${prefix}%${number}`;
};

/**
 * Parse an id value string back to prefix and number
 * e.g. "room%100" => { prefix: "room", number: 100 }
 */
export const parseIdValue = (idValue: string): { prefix: string; number: number } | null => {
    const idx = idValue.indexOf('%');
    if (idx === -1) return null;
    const prefix = idValue.substring(0, idx);
    const num = parseInt(idValue.substring(idx + 1), 10);
    if (isNaN(num)) return null;
    return { prefix, number: num };
};

/**
 * Format an id value for display, e.g. "room%100" => "Room 100"
 */
export const formatIdLabel = (idValue: string): string => {
    const parsed = parseIdValue(idValue);
    if (!parsed) return idValue;
    return `${parsed.prefix.charAt(0).toUpperCase() + parsed.prefix.slice(1)} ${parsed.number}`;
};
