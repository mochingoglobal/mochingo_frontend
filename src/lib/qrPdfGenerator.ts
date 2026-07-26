import jsPDF from 'jspdf';
import { createStyledQRCodeCanvas } from './qrCodeGenerator';

const QR_PAGE_SIZE_MM = 60;

export interface MochingoQREntry {
    label: string;
    qrUrl: string;
    displayLabel?: string | null;
    idValue?: string | null;
}

interface BulkPDFOptions {
    title?: string;
    entries: MochingoQREntry[];
    fileName?: string;
    logoUrl?: string;
    markerColor?: string;
    showTitle?: boolean;
    showLabel?: boolean;
    qrDesignStyle?: 'dots' | 'squares';
    qrColorTheme?: 'black' | 'white';
}

interface PlainBulkPDFOptions {
    entries: Array<{ qrUrl: string }>;
    fileName?: string;
    logoUrl?: string;
    qrDesignStyle?: 'dots' | 'squares';
    qrColorTheme?: 'black' | 'white';
}

// ─── Plain QR-only PDF ───────────────────────────────────────────────────────

export const generatePlainBulkQRPDF = async ({
    entries,
    logoUrl,
    qrDesignStyle = 'dots',
    qrColorTheme = 'black'
}: PlainBulkPDFOptions): Promise<Blob> => {
    const pageSizeMM = QR_PAGE_SIZE_MM;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageSizeMM, pageSizeMM],
        compress: true,
    });

    for (let i = 0; i < entries.length; i++) {
        if (i > 0) pdf.addPage([pageSizeMM, pageSizeMM]);
        const qrCanvas = await createStyledQRCodeCanvas({
            text: entries[i].qrUrl,
            size: 2200,
            padding: 140,
            logoUrl,
            foregroundColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
            backgroundColor: qrColorTheme === 'white' ? '#000000' : '#ffffff',
            markerColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
            designStyle: qrDesignStyle,
        });
        if (!qrCanvas) continue;

        const wrapper = document.createElement('canvas');
        wrapper.width = 2400;
        wrapper.height = 2400;
        const ctx = wrapper.getContext('2d')!;
        ctx.fillStyle = qrColorTheme === 'white' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, 2400, 2400);
        ctx.drawImage(qrCanvas, (2400 - qrCanvas.width) / 2, (2400 - qrCanvas.height) / 2);
        pdf.addImage(wrapper.toDataURL('image/png'), 'PNG', 0, 0, pageSizeMM, pageSizeMM);
    }

    return pdf.output('blob');
};

export const downloadPlainBulkQRPDF = async (options: PlainBulkPDFOptions): Promise<void> => {
    const blob = await generatePlainBulkQRPDF(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(options.fileName || 'qr-batch').replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ─── Branded / Titled Bulk PDF ───────────────────────────────────────────────

export const generateMochingoBulkQRPDF = async ({
    title = '',
    entries,
    logoUrl,
    markerColor = '#000000',
    showTitle = true,
    showLabel = true,
    qrDesignStyle = 'dots',
    qrColorTheme = 'black'
}: BulkPDFOptions): Promise<Blob> => {
    const pageSizeMM = QR_PAGE_SIZE_MM;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageSizeMM, pageSizeMM],
        compress: true,
    });

    for (let i = 0; i < entries.length; i++) {
        if (i > 0) pdf.addPage([pageSizeMM, pageSizeMM]);
        const entry = entries[i];
        const outputSize = 2400;
        const wrapper = document.createElement('canvas');
        wrapper.width = outputSize;
        wrapper.height = outputSize;
        const ctx = wrapper.getContext('2d')!;
        ctx.fillStyle = qrColorTheme === 'white' ? '#000000' : '#ffffff';
        ctx.fillRect(0, 0, outputSize, outputSize);

        // Header text region (if title enabled)
        const hasTopText = showTitle && title;
        const hasBottomText = showLabel && (entry.displayLabel || entry.idValue);
        const topReserve = hasTopText ? outputSize * 0.1 : 0;
        const bottomReserve = hasBottomText ? outputSize * 0.1 : 0;
        const qrAreaSize = outputSize - topReserve - bottomReserve;
        const qrPaddedSize = Math.floor(qrAreaSize * 0.9);

        const qrCanvas = await createStyledQRCodeCanvas({
            text: entry.qrUrl,
            size: qrPaddedSize,
            padding: Math.floor(qrPaddedSize * 0.04),
            logoUrl,
            markerColor: qrColorTheme === 'white' ? '#ffffff' : markerColor,
            foregroundColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
            backgroundColor: qrColorTheme === 'white' ? '#000000' : '#ffffff',
            designStyle: qrDesignStyle,
        });
        if (!qrCanvas) continue;

        const qrX = (outputSize - qrCanvas.width) / 2;
        const qrY = topReserve + (qrAreaSize - qrCanvas.height) / 2;
        ctx.drawImage(qrCanvas, qrX, qrY);

        if (hasTopText) {
            const fontSize = Math.round(outputSize * 0.045);
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = qrColorTheme === 'white' ? '#ffffff' : '#111827';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(title.toUpperCase(), outputSize / 2, topReserve / 2);
        }

        if (hasBottomText) {
            const labelText = String(entry.displayLabel || entry.idValue || '');
            const fontSize = Math.round(outputSize * 0.038);
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = qrColorTheme === 'white' ? '#d1d5db' : '#6b7280';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, outputSize / 2, outputSize - bottomReserve / 2);
        }

        pdf.addImage(wrapper.toDataURL('image/png'), 'PNG', 0, 0, pageSizeMM, pageSizeMM);
    }

    return pdf.output('blob');
};

export const downloadMochingoBulkQRPDF = async (options: BulkPDFOptions): Promise<void> => {
    const blob = await generateMochingoBulkQRPDF(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(options.fileName || options.title || 'mochingo-qr').replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ─── Single QR PDF ───────────────────────────────────────────────────────────

export const downloadSingleDynamicQRPDF = async (
    qrUrl: string,
    label: string,
    logoUrl?: string,
    qrDesignStyle: 'dots' | 'squares' = 'dots',
    qrColorTheme: 'black' | 'white' = 'black'
): Promise<void> => {
    const pageSizeMM = QR_PAGE_SIZE_MM;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageSizeMM, pageSizeMM], compress: true });
    const qrCanvas = await createStyledQRCodeCanvas({ 
        text: qrUrl, 
        size: 2200, 
        padding: 140, 
        logoUrl,
        foregroundColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
        backgroundColor: qrColorTheme === 'white' ? '#000000' : '#ffffff',
        markerColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
        designStyle: qrDesignStyle
    });
    if (!qrCanvas) return;
    const wrapper = document.createElement('canvas');
    wrapper.width = 2400;
    wrapper.height = 2400;
    const ctx = wrapper.getContext('2d')!;
    ctx.fillStyle = qrColorTheme === 'white' ? '#000000' : '#ffffff';
    ctx.fillRect(0, 0, 2400, 2400);
    ctx.drawImage(qrCanvas, (2400 - qrCanvas.width) / 2, (2400 - qrCanvas.height) / 2);
    pdf.addImage(wrapper.toDataURL('image/png'), 'PNG', 0, 0, pageSizeMM, pageSizeMM);
    pdf.save(`${(label || 'qr').replace(/[\\/:*?"<>|]/g, '-')}.pdf`);
};

// ─── Stand PDF ───────────────────────────────────────────────────────────────

const QR_STAND_PAGE_WIDTH_MM = 102;
const QR_STAND_PAGE_HEIGHT_MM = 150;

interface StandBulkQREntry {
    qrUrl: string;
    identificationLabel?: string | null;
}

interface StandBulkQRPDFOptions {
    entries: StandBulkQREntry[];
    fileName?: string;
    backgroundUrl?: string;
    logoUrl?: string;
    qrDesignStyle?: 'dots' | 'squares';
    qrColorTheme?: 'black' | 'white';
}

const loadImage = async (src: string): Promise<HTMLImageElement> => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        image.src = src;
    });
    return image;
};

const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
) => {
    const imageRatio = image.width / image.height;
    const targetRatio = targetWidth / targetHeight;
    let sourceX = 0, sourceY = 0, sourceWidth = image.width, sourceHeight = image.height;

    if (imageRatio > targetRatio) {
        sourceWidth = image.height * targetRatio;
        sourceX = (image.width - sourceWidth) / 2;
    } else {
        sourceHeight = image.width / targetRatio;
        sourceY = (image.height - sourceHeight) / 2;
    }

    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
};

export const generateStandBulkQRPDF = async ({
    entries,
    backgroundUrl = '/qr-stand-background.jpg',
    logoUrl,
    qrDesignStyle = 'dots',
    qrColorTheme = 'black'
}: StandBulkQRPDFOptions): Promise<Blob> => {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [QR_STAND_PAGE_WIDTH_MM, QR_STAND_PAGE_HEIGHT_MM],
        compress: true,
    });
    const backgroundImage = await loadImage(backgroundUrl);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (i > 0) pdf.addPage([QR_STAND_PAGE_WIDTH_MM, QR_STAND_PAGE_HEIGHT_MM], 'portrait');

        const wrapperCanvas = document.createElement('canvas');
        wrapperCanvas.width = 2040;
        wrapperCanvas.height = 3000;
        const ctx = wrapperCanvas.getContext('2d')!;

        drawImageCover(ctx, backgroundImage, wrapperCanvas.width, wrapperCanvas.height);

        const qrCanvas = await createStyledQRCodeCanvas({
            text: entry.qrUrl,
            size: 1280,
            padding: 74,
            logoUrl,
            markerColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
            foregroundColor: qrColorTheme === 'white' ? '#ffffff' : '#000000',
            backgroundColor: 'transparent',
            markerInnerBackgroundColor: qrColorTheme === 'white' ? 'transparent' : '#ffffff',
            designStyle: qrDesignStyle,
        });

        if (qrCanvas) {
            const qrX = Math.round((wrapperCanvas.width - qrCanvas.width) / 2);
            const qrY = Math.round((wrapperCanvas.height - qrCanvas.height) / 2 - wrapperCanvas.height * 0.04);
            ctx.drawImage(qrCanvas, qrX, qrY, qrCanvas.width, qrCanvas.height);
        }

        const identificationLabel = String(entry.identificationLabel || '').trim() || `#${String(i + 1).padStart(2, '0')}`;
        ctx.save();
        ctx.fillStyle = 'rgba(17, 24, 39, 0.42)';
        ctx.font = '500 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(identificationLabel, wrapperCanvas.width / 2, wrapperCanvas.height - 44);
        ctx.restore();

        pdf.addImage(wrapperCanvas.toDataURL('image/png'), 'PNG', 0, 0, QR_STAND_PAGE_WIDTH_MM, QR_STAND_PAGE_HEIGHT_MM);
    }

    return pdf.output('blob');
};

export const downloadStandBulkQRPDF = async (options: StandBulkQRPDFOptions) => {
    const blob = await generateStandBulkQRPDF(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (options.fileName || 'dynamic-qr-batch-stand').replace(/[\\/:*?"<>|]+/g, '-').trim();
    link.download = `${safeTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
