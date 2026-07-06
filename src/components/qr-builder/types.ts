'use client';
// ─────────────────────────────────────────────────────────────
// QR Builder – Shared Types
// ─────────────────────────────────────────────────────────────

export type ElementType = 'text' | 'qr' | 'image';

export type QRCornerStyle = 'square' | 'rounded' | 'dot';

// ── Individual Element Definitions ──────────────────────────

export interface BaseElement {
    id: string;
    type: ElementType;
    x: number;        // px from left (within canvas)
    y: number;        // px from top  (within canvas)
    width: number;    // px
    height: number;   // px
    rotation: number; // degrees
    locked: boolean;
    zIndex: number;
    opacity: number;  // 0-1
}

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: '400' | '500' | '600' | '700' | '800' | '900';
    color: string;
    textAlign: 'left' | 'center' | 'right';
    letterSpacing: number; // px
    lineHeight: number;    // multiplier
    textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface QRElement extends BaseElement {
    type: 'qr';
    // QR visual options
    fgColor: string;
    bgColor: string;
    cornerStyle: QRCornerStyle;
    cornerColor: string;  // color for the 3 position marker squares
    centerLogoUrl?: string;
    padding: number; // px internal padding
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string;
    borderRadius: number; // px
    objectFit: 'contain' | 'cover' | 'fill';
}

export type DesignElement = TextElement | QRElement | ImageElement;

// ── Background / Card Style ──────────────────────────────────

export type GradientDirection = 'to bottom' | 'to right' | 'to bottom right' | 'to bottom left' | '135deg' | '45deg';

export interface BackgroundStyle {
    // Solid / gradient
    useGradient: boolean;
    backgroundColor: string;
    gradientColor1: string;
    gradientColor2: string;
    gradientDirection: GradientDirection;
    // Border
    borderColor: string;
    borderWidth: number;  // px
    borderRadius: number; // px
    // Shadow
    shadowDepth: number;  // 0-4 (preset levels)
    // Scan corner indicators
    showScanCorners: boolean;
    scanCornerColor: string;
    scanCornerOffsetX: number; // px from QR edge (when mode='qr') or card edge (when mode='card')
    scanCornerOffsetY: number;
    scanCornerSize: number;    // bracket arm length in px
    scanCornerThickness: number; // stroke width in px
    scanCornerBend: number; // inner bend radius in px
    scanCornerMode: 'qr' | 'card';
}

// ── Builder Global State ─────────────────────────────────────

export interface BuilderState {
    elements: DesignElement[];
    background: BackgroundStyle;
    canvasWidth: number;  // logical px (design scale)
    canvasHeight: number;
    selectedId: string | null;
    // Outlet context (read-only)
    outletName: string;
    tableURL: string; // used when generating QR
}

// ── Preview Mode ─────────────────────────────────────────────

export type PreviewMode = 'card' | 'a4' | 'stand';

// ── Font list ────────────────────────────────────────────────

export const FONT_FAMILIES = [
    'Inter',
    'Arial',
    'Helvetica',
    'Georgia',
    'Playfair Display',
    'Montserrat',
    'Poppins',
    'Oswald',
    'Raleway',
    'Nunito',
    'Lato',
    'Roboto',
    'Open Sans',
    'Source Sans Pro',
    'Merriweather',
] as const;

export type FontFamily = typeof FONT_FAMILIES[number];

// ── Default values ────────────────────────────────────────────

export const DEFAULT_BACKGROUND: BackgroundStyle = {
    useGradient: false,
    backgroundColor: '#ffffff',
    gradientColor1: '#1a56db',
    gradientColor2: '#0d9488',
    gradientDirection: 'to bottom right',
    borderColor: '#000000',
    borderWidth: 8,
    borderRadius: 24,
    shadowDepth: 2,
    showScanCorners: true,
    scanCornerColor: '#000000',
    scanCornerOffsetX: 12,
    scanCornerOffsetY: 12,
    scanCornerSize: 32,
    scanCornerThickness: 3,
    scanCornerBend: 10,
    scanCornerMode: 'qr',
};

export const DEFAULT_QR_ELEMENT: Omit<QRElement, 'id' | 'x' | 'y'> = {
    type: 'qr',
    width: 200,
    height: 200,
    rotation: 0,
    locked: false,
    zIndex: 10,
    opacity: 1,
    fgColor: '#000000',
    bgColor: '#ffffff',
    cornerStyle: 'rounded',
    cornerColor: '#000000',
    padding: 10,
};

export const SHADOW_PRESETS = [
    'none',
    '0 2px 8px rgba(0,0,0,0.12)',
    '0 4px 20px rgba(0,0,0,0.18)',
    '0 8px 32px rgba(0,0,0,0.24)',
    '0 16px 64px rgba(0,0,0,0.32)',
] as const;
