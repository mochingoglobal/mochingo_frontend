'use client';
import { useRef, useState } from 'react';
import {
    Type, QrCode, Image, Layers, Layout,
    Plus, ChevronUp, ChevronDown, Lock, Unlock, Upload, Trash2,
} from 'lucide-react';
import { BuilderHook } from './useBuilderState';
import ScanReliabilityPanel from './ScanReliabilityPanel';
import {
    TextElement, QRElement, ImageElement,
    FONT_FAMILIES, GradientDirection,
} from './types';

type SidebarTab = 'background' | 'qr' | 'text' | 'images' | 'layers';

interface BuilderSidebarProps {
    builder: BuilderHook;
}

// ── Reusable small components ────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
        {children}
    </label>
);

const Row = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>{children}</div>
);

const ColorSwatch = ({
    color,
    onChange,
    label,
}: {
    color: string;
    onChange: (c: string) => void;
    label?: string;
}) => (
    <div className="flex items-center gap-2">
        {label && <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>}
        <label className="cursor-pointer">
            <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
            />
            <div
                className="w-8 h-8 rounded border-2 border-gray-600 hover:scale-110 transition-transform shadow"
                style={{ backgroundColor: color }}
                title={color}
            />
        </label>
        <span className="text-xs font-mono text-gray-400">{color.toUpperCase()}</span>
    </div>
);

const Slider = ({
    label, value, min, max, step = 1, onChange, unit = '',
}: {
    label: string; value: number; min: number; max: number;
    step?: number; onChange: (v: number) => void; unit?: string;
}) => (
    <div>
        <Row className="justify-between mb-1">
            <Label>{label}</Label>
            <span className="text-xs text-gray-300 font-mono">{value}{unit}</span>
        </Row>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 accent-blue-500"
        />
    </div>
);

const SectionDivider = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 my-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500 uppercase tracking-widest">{title}</span>
        <div className="flex-1 h-px bg-gray-700" />
    </div>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <Row className="justify-between">
        <Label>{label}</Label>
        <button
            onClick={() => onChange(!value)}
            className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#fcfcfc] transition-transform ${value ? 'translate-x-5' : ''}`}
            />
        </button>
    </Row>
);

// ── Main Sidebar ─────────────────────────────────────────────
export default function BuilderSidebar({ builder }: BuilderSidebarProps) {
    const { state, updateBackground, updateElement, addTextElement, addImageElement,
        deleteElement, bringForward, sendBackward, toggleLock, selectElement, sortedElements,
        hasNFC, toggleNFC, updateNFCColor } = builder;
    const { background, selectedId } = state;
    const selectedEl = state.elements.find(e => e.id === selectedId) ?? null;

    const [activeTab, setActiveTab] = useState<SidebarTab>('background');
    const imageInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const qrLogoInputRef = useRef<HTMLInputElement>(null);

    // ── Tab config ────────────────────────────────────────────
    const tabs: Array<{ id: SidebarTab; icon: React.ReactNode; label: string }> = [
        { id: 'background', icon: <Layout size={16} />, label: 'Card' },
        { id: 'qr', icon: <QrCode size={16} />, label: 'QR Code' },
        { id: 'text', icon: <Type size={16} />, label: 'Text' },
        { id: 'images', icon: <Image size={16} />, label: 'Images' },
        { id: 'layers', icon: <Layers size={16} />, label: 'Layers' },
    ];

    // ── Image upload helpers ──────────────────────────────────
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) addImageElement(ev.target.result as string);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleQRLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const qrEl = state.elements.find(el => el.type === 'qr');
            if (qrEl && ev.target?.result) {
                updateElement<QRElement>(qrEl.id, { centerLogoUrl: ev.target.result as string });
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const qrElement = state.elements.find(el => el.type === 'qr') as QRElement | undefined;
    const selectedText = selectedEl?.type === 'text' ? selectedEl as TextElement : null;
    const selectedImage = selectedEl?.type === 'image' ? selectedEl as ImageElement : null;

    // Quick color presets
    const colorPresets = ['#ffffff', '#1d4ed8', '#000000', '#ef4444', '#16a34a', '#9333ea', '#f97316', '#0891b2'];
    const gradientDirections: GradientDirection[] = ['to bottom', 'to right', 'to bottom right', 'to bottom left', '135deg', '45deg'];

    return (
        <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col h-full text-white shrink-0">
            {/* Tab bar */}
            <div className="flex border-b border-gray-700 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${activeTab === tab.id
                            ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                            : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* ── BACKGROUND TAB ── */}
                {activeTab === 'background' && (
                    <>
                        <SectionDivider title="Fill" />
                        <Toggle label="Use Gradient" value={background.useGradient} onChange={v => updateBackground({ useGradient: v })} />

                        {background.useGradient ? (
                            <>
                                <ColorSwatch color={background.gradientColor1} onChange={c => updateBackground({ gradientColor1: c })} label="Color 1" />
                                <ColorSwatch color={background.gradientColor2} onChange={c => updateBackground({ gradientColor2: c })} label="Color 2" />
                                <div>
                                    <Label>Direction</Label>
                                    <div className="grid grid-cols-3 gap-1 mt-1">
                                        {gradientDirections.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => updateBackground({ gradientDirection: d })}
                                                className={`text-xs px-1.5 py-1 rounded border transition-colors ${background.gradientDirection === d ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-gray-600 text-gray-400 hover:border-gray-400'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <ColorSwatch color={background.backgroundColor} onChange={c => updateBackground({ backgroundColor: c })} label="Background" />
                                <div className="flex gap-1.5 flex-wrap">
                                    {colorPresets.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => updateBackground({ backgroundColor: c })}
                                            className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${background.backgroundColor === c ? 'border-blue-400' : 'border-gray-600'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <SectionDivider title="Border" />
                        <ColorSwatch color={background.borderColor} onChange={c => updateBackground({ borderColor: c })} label="Border Color" />
                        <Slider label="Border Width" value={background.borderWidth} min={0} max={24} onChange={v => updateBackground({ borderWidth: v })} unit="px" />
                        <Slider label="Border Radius" value={background.borderRadius} min={0} max={80} onChange={v => updateBackground({ borderRadius: v })} unit="px" />

                        <SectionDivider title="Shadow" />
                        <Slider label="Shadow Depth" value={background.shadowDepth} min={0} max={4} onChange={v => updateBackground({ shadowDepth: v })} />

                        <SectionDivider title="NFC" />
                        <Row className="justify-between">
                            <div>
                                <Label>NFC Icon</Label>
                                <p className="text-[10px] text-gray-500 mt-0.5">Adds a draggable WiFi/NFC icon to the card</p>
                            </div>
                            <button
                                onClick={toggleNFC}
                                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${hasNFC ? 'bg-blue-600' : 'bg-gray-600'}`}
                            >
                                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#fcfcfc] transition-transform shadow ${hasNFC ? 'translate-x-6' : ''}`} />
                            </button>
                        </Row>
                        {hasNFC && (
                            <div className="space-y-2">
                                <p className="text-[10px] text-blue-400">✦ NFC icon added — drag it anywhere on the canvas.</p>
                                <ColorSwatch
                                    color={
                                        (() => {
                                            const nfcEl = state.elements.find(e => e.id === 'nfc_element_singleton');
                                            // extract color from src data-url
                                            if (nfcEl && 'src' in nfcEl) {
                                                const m = decodeURIComponent((nfcEl as { src: string }).src).match(/fill="([^"]+)"/);
                                                if (m) return m[1];
                                            }
                                            return background.borderColor;
                                        })()
                                    }
                                    onChange={(c) => updateNFCColor(c)}
                                    label="Icon Color"
                                />
                            </div>
                        )}

                        <SectionDivider title="Scan Frame" />
                        <Toggle label="Show Scan Corners" value={background.showScanCorners} onChange={v => updateBackground({ showScanCorners: v })} />
                        {background.showScanCorners && (
                            <>
                                {/* Mode toggle */}
                                <div>
                                    <Label>Frame Mode</Label>
                                    <div className="flex gap-1 mt-1">
                                        {(['qr', 'card'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => updateBackground({ scanCornerMode: m })}
                                                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${(background.scanCornerMode ?? 'qr') === m ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {m === 'qr' ? '⊡  Frame QR' : '▭  Frame Card'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        {(background.scanCornerMode ?? 'qr') === 'qr'
                                            ? 'Corners auto-align around the QR code.'
                                            : 'Corners sit at the card edges.'}
                                    </p>
                                </div>
                                <ColorSwatch color={background.scanCornerColor} onChange={c => updateBackground({ scanCornerColor: c })} label="Corner Color" />
                                <Slider label="Offset X" value={background.scanCornerOffsetX ?? 12} min={0} max={80} onChange={v => updateBackground({ scanCornerOffsetX: v })} unit="px" />
                                <Slider label="Offset Y" value={background.scanCornerOffsetY ?? 12} min={0} max={80} onChange={v => updateBackground({ scanCornerOffsetY: v })} unit="px" />
                                <Slider label="Corner Size" value={background.scanCornerSize ?? 32} min={10} max={80} onChange={v => updateBackground({ scanCornerSize: v })} unit="px" />
                                <Slider label="Thickness" value={background.scanCornerThickness ?? 3} min={1} max={12} onChange={v => updateBackground({ scanCornerThickness: v })} unit="px" />
                                <Slider label="Bend" value={background.scanCornerBend ?? 10} min={0} max={32} onChange={v => updateBackground({ scanCornerBend: v })} unit="px" />
                            </>
                        )}
                    </>
                )}

                {/* ── QR CODE TAB ── */}
                {activeTab === 'qr' && qrElement && (
                    <>
                        <SectionDivider title="QR Colors" />
                        <ColorSwatch color={qrElement.fgColor} onChange={c => updateElement<QRElement>(qrElement.id, { fgColor: c })} label="Foreground" />
                        <ColorSwatch color={qrElement.bgColor} onChange={c => updateElement<QRElement>(qrElement.id, { bgColor: c })} label="Background" />
                        <ColorSwatch color={qrElement.cornerColor} onChange={c => updateElement<QRElement>(qrElement.id, { cornerColor: c })} label="Corner Eyes" />

                        {/* Corner eye presets */}
                        <div className="flex gap-1.5 flex-wrap">
                            {['#298000', '#1d4ed8', '#dc2626', '#9333ea', '#ea580c', '#000000'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => updateElement<QRElement>(qrElement.id, { cornerColor: c })}
                                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${qrElement.cornerColor === c ? 'border-blue-400' : 'border-gray-600'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <SectionDivider title="QR Size" />
                        <Slider label="Padding" value={qrElement.padding} min={0} max={40} onChange={v => updateElement<QRElement>(qrElement.id, { padding: v })} unit="px" />
                        <Slider label="Opacity" value={Math.round(qrElement.opacity * 100)} min={0} max={100} onChange={v => updateElement<QRElement>(qrElement.id, { opacity: v / 100 })} unit="%" />

                        <SectionDivider title="Scan Reliability" />
                        <ScanReliabilityPanel qrElement={qrElement} />

                        <SectionDivider title="Center Logo" />
                        <div className="space-y-2">
                            {qrElement.centerLogoUrl ? (
                                <div className="flex items-center gap-3">
                                    <img src={qrElement.centerLogoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border border-gray-600 bg-[#fcfcfc] p-1" />
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => qrLogoInputRef.current?.click()}
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >Change Logo</button>
                                        <button
                                            onClick={() => updateElement<QRElement>(qrElement.id, { centerLogoUrl: undefined })}
                                            className="text-xs text-red-400 hover:text-red-300 underline"
                                        >Remove</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => qrLogoInputRef.current?.click()}
                                    className="w-full h-16 border-2 border-dashed border-gray-600 rounded flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-900/20 transition-colors"
                                >
                                    <Upload size={16} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">Upload Center Logo</span>
                                </button>
                            )}
                            <input ref={qrLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleQRLogoUpload} />
                        </div>
                    </>
                )}
                {activeTab === 'qr' && !qrElement && (
                    <p className="text-xs text-gray-500 text-center py-8">No QR element found in this design.</p>
                )}

                {/* ── TEXT TAB ── */}
                {activeTab === 'text' && (
                    <>
                        <button
                            onClick={addTextElement}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm transition-colors"
                        >
                            <Plus size={16} />
                            Add Text Block
                        </button>

                        {selectedText ? (
                            <>
                                <SectionDivider title="Selected Text" />

                                <div>
                                    <Label>Content</Label>
                                    <textarea
                                        value={selectedText.content}
                                        onChange={e => updateElement<TextElement>(selectedText.id, { content: e.target.value })}
                                        rows={2}
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label>Font Family</Label>
                                    <select
                                        value={selectedText.fontFamily}
                                        onChange={e => updateElement<TextElement>(selectedText.id, { fontFamily: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                    >
                                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>

                                <Slider
                                    label="Font Size"
                                    value={selectedText.fontSize}
                                    min={8}
                                    max={72}
                                    onChange={v => updateElement<TextElement>(selectedText.id, { fontSize: v })}
                                    unit="px"
                                />

                                <div>
                                    <Label>Font Weight</Label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {(['400', '500', '600', '700', '800', '900'] as const).map(w => (
                                            <button
                                                key={w}
                                                onClick={() => updateElement<TextElement>(selectedText.id, { fontWeight: w })}
                                                className={`py-1 rounded text-xs transition-colors ${selectedText.fontWeight === w ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                                style={{ fontWeight: w }}
                                            >
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <ColorSwatch
                                    color={selectedText.color}
                                    onChange={c => updateElement<TextElement>(selectedText.id, { color: c })}
                                    label="Text Color"
                                />

                                <div>
                                    <Label>Alignment</Label>
                                    <div className="flex gap-1">
                                        {(['left', 'center', 'right'] as const).map(a => (
                                            <button
                                                key={a}
                                                onClick={() => updateElement<TextElement>(selectedText.id, { textAlign: a })}
                                                className={`flex-1 py-1 rounded text-xs capitalize transition-colors ${selectedText.textAlign === a ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>Transform</Label>
                                    <div className="flex gap-1">
                                        {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => updateElement<TextElement>(selectedText.id, { textTransform: t })}
                                                className={`flex-1 py-1 rounded text-[9px] capitalize transition-colors ${selectedText.textTransform === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {t === 'none' ? 'As-is' : t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Slider label="Letter Spacing" value={selectedText.letterSpacing} min={-2} max={20} onChange={v => updateElement<TextElement>(selectedText.id, { letterSpacing: v })} unit="px" />
                                <Slider label="Line Height" value={selectedText.lineHeight * 10} min={8} max={30} step={1} onChange={v => updateElement<TextElement>(selectedText.id, { lineHeight: v / 10 })} />
                                <Slider label="Opacity" value={Math.round(selectedText.opacity * 100)} min={0} max={100} onChange={v => updateElement<TextElement>(selectedText.id, { opacity: v / 100 })} unit="%" />

                            </>
                        ) : (
                            <p className="text-xs text-gray-500 text-center py-4">
                                Select a text element on the canvas to edit its properties.
                            </p>
                        )}
                    </>
                )}

                {/* ── IMAGES TAB ── */}
                {activeTab === 'images' && (
                    <>
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-sm transition-colors"
                        >
                            <Upload size={16} />
                            Upload Image / Sticker
                        </button>
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                        <p className="text-xs text-gray-500 text-center">
                            Images are draggable and resizable on the canvas.
                        </p>

                        {selectedImage && (
                            <>
                                <SectionDivider title="Size & Position" />
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Width (px)</Label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedImage.width)}
                                            min={10} max={400}
                                            onChange={e => builder.resizeElement(selectedImage.id, +e.target.value, selectedImage.height)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <Label>Height (px)</Label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedImage.height)}
                                            min={10} max={400}
                                            onChange={e => builder.resizeElement(selectedImage.id, selectedImage.width, +e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <Slider
                                    label="Rotation"
                                    value={Math.round(selectedImage.rotation)}
                                    min={-180} max={180}
                                    onChange={v => builder.rotateElement(selectedImage.id, v)}
                                    unit="°"
                                />

                                <SectionDivider title="Image Options" />
                                <div>
                                    <Label>Fit Mode</Label>
                                    <div className="flex gap-1">
                                        {(['contain', 'cover', 'fill'] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => updateElement<ImageElement>(selectedImage.id, { objectFit: f })}
                                                className={`flex-1 py-1 rounded text-xs capitalize transition-colors ${selectedImage.objectFit === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Slider label="Border Radius" value={selectedImage.borderRadius} min={0} max={100} onChange={v => updateElement<ImageElement>(selectedImage.id, { borderRadius: v })} unit="px" />
                                <Slider label="Opacity" value={Math.round(selectedImage.opacity * 100)} min={0} max={100} onChange={v => updateElement<ImageElement>(selectedImage.id, { opacity: v / 100 })} unit="%" />
                            </>
                        )}
                    </>
                )}

                {/* ── LAYERS TAB ── */}
                {activeTab === 'layers' && (
                    <>
                        <p className="text-xs text-gray-500">Click a layer to select it. Drag to reorder (coming soon).</p>
                        <div className="space-y-1">
                            {[...sortedElements].reverse().map((el) => {
                                const isSelected = el.id === selectedId;
                                const icon = el.type === 'qr' ? <QrCode size={12} />
                                    : el.type === 'text' ? <Type size={12} />
                                        : <Image size={12} />;
                                const label = el.type === 'qr' ? 'QR Code'
                                    : el.type === 'text' ? `"${(el as TextElement).content.slice(0, 20)}"`
                                        : 'Image';

                                return (
                                    <div
                                        key={el.id}
                                        onClick={() => selectElement(el.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/50 border border-blue-600' : 'bg-gray-800 border border-gray-700 hover:border-gray-500'}`}
                                    >
                                        <span className="text-gray-400">{icon}</span>
                                        <span className="flex-1 text-xs text-gray-200 truncate">{label}</span>
                                        <span className="text-xs text-gray-500">z:{el.zIndex}</span>
                                        <button onClick={(e) => { e.stopPropagation(); bringForward(el.id); }} className="hover:text-blue-400 text-gray-500" title="Bring Forward">
                                            <ChevronUp size={12} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); sendBackward(el.id); }} className="hover:text-blue-400 text-gray-500" title="Send Backward">
                                            <ChevronDown size={12} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }} className="hover:text-yellow-400 text-gray-500" title="Toggle Lock">
                                            {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="hover:text-red-400 text-gray-500" title="Delete">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Hidden file inputs */}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" />
        </div>
    );
}
