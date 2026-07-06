export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrScoreConfig {
    foregroundColor: string;
    backgroundColor: string;
    cornerColor: string;
    hasLogo: boolean;
    logoSizeRatio: number;
    padding: number;
    errorCorrectionLevel: QrErrorCorrectionLevel;
}

export type QrScoreGrade = 'excellent' | 'good' | 'risky' | 'bad';

export interface QrScoreResult {
    score: number;
    grade: QrScoreGrade;
    warnings: string[];
}

const MAX_SCORE = 100;
const MIN_SCORE = 0;
const CONTRAST_HEAVY_THRESHOLD = 0.4;
const CONTRAST_MEDIUM_THRESHOLD = 0.7;
const RECOMMENDED_PADDING_PX = 16;
const MIN_ACCEPTABLE_PADDING_PX = 8;
const MAX_SAFE_LOGO_RATIO = 0.3;

const PENALTIES = {
    foregroundContrastHeavy: 38,
    foregroundContrastMedium: 18,
    cornerContrastHeavy: 24,
    cornerContrastMedium: 12,
    errorCorrection: 12,
    largeLogo: 18,
    lowPadding: 14,
    tightPadding: 7,
} as const;

const FALLBACK_COLOR = '#000000';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHexColor = (color: string): string => {
    const trimmed = color.trim();
    const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;

    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        return `#${hex.split('').map(char => `${char}${char}`).join('')}`;
    }

    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `#${hex}`;
    }

    return FALLBACK_COLOR;
};

const hexToRgb = (color: string) => {
    const hex = normalizeHexColor(color).slice(1);
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    };
};

const toLinearChannel = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
};

export const getLuminance = (color: string): number => {
    const { r, g, b } = hexToRgb(color);
    return (
        0.2126 * toLinearChannel(r) +
        0.7152 * toLinearChannel(g) +
        0.0722 * toLinearChannel(b)
    );
};

export const getContrast = (colorA: string, colorB: string): number => {
    const l1 = getLuminance(colorA);
    const l2 = getLuminance(colorB);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const wcagRatio = (lighter + 0.05) / (darker + 0.05);

    return clamp((wcagRatio - 1) / 20, 0, 1);
};

const getGrade = (score: number): QrScoreGrade => {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'risky';
    return 'bad';
};

export const calculateQrScanScore = (config: QrScoreConfig): QrScoreResult => {
    let score = MAX_SCORE;
    const warnings: string[] = [];

    const foregroundContrast = getContrast(config.foregroundColor, config.backgroundColor);
    if (foregroundContrast < CONTRAST_HEAVY_THRESHOLD) {
        score -= PENALTIES.foregroundContrastHeavy;
        warnings.push('Low contrast between foreground and background');
    } else if (foregroundContrast < CONTRAST_MEDIUM_THRESHOLD) {
        score -= PENALTIES.foregroundContrastMedium;
        warnings.push('Improve foreground/background contrast');
    }

    const cornerContrast = getContrast(config.cornerColor, config.backgroundColor);
    if (cornerContrast < CONTRAST_HEAVY_THRESHOLD) {
        score -= PENALTIES.cornerContrastHeavy;
        warnings.push('Corner markers are hard to detect');
    } else if (cornerContrast < CONTRAST_MEDIUM_THRESHOLD) {
        score -= PENALTIES.cornerContrastMedium;
        warnings.push('Corner markers need stronger contrast');
    }

    if (config.errorCorrectionLevel !== 'H') {
        score -= PENALTIES.errorCorrection;
        warnings.push('Use high error correction for customized QR codes');
    }

    if (config.hasLogo && config.logoSizeRatio > MAX_SAFE_LOGO_RATIO) {
        score -= PENALTIES.largeLogo;
        warnings.push('Logo size may affect scan');
    }

    if (config.padding < MIN_ACCEPTABLE_PADDING_PX) {
        score -= PENALTIES.lowPadding;
        warnings.push('Increase padding for better scanning');
    } else if (config.padding < RECOMMENDED_PADDING_PX) {
        score -= PENALTIES.tightPadding;
        warnings.push('Increase padding for better scanning');
    }

    const finalScore = Math.round(clamp(score, MIN_SCORE, MAX_SCORE));

    return {
        score: finalScore,
        grade: getGrade(finalScore),
        warnings,
    };
};
