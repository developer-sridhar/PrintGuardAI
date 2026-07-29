import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    FileText, Maximize2, Loader2,
    ChevronLeft, ChevronRight, X, Layers, Eye, EyeOff,
    FileImage, FileCode, Image, ZoomIn, Sparkles
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
const EXT_ICONS = {
    pdf: { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10' },
    psd: { icon: FileImage, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ai: { icon: FileCode, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    eps: { icon: FileCode, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    cdr: { icon: FileCode, color: 'text-green-400', bg: 'bg-green-500/10' },
    svg: { icon: FileCode, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    jpg: { icon: Image, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    jpeg: { icon: Image, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    png: { icon: Image, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    webp: { icon: Image, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    tiff: { icon: Image, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    gif: { icon: Image, color: 'text-pink-400', bg: 'bg-pink-500/10' },
};
function getExt(f) { return f ? f.split('.').pop().toLowerCase() : ''; }
function getExtIcon(ext) { return EXT_ICONS[ext] || { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-500/10' }; }

// Convert sampled RGB pixel to approximate CMYK percentages
function getCMYKFromRGB(r, g, b) {
    const rp = r / 255, gp = g / 255, bp = b / 255;
    const k = 1 - Math.max(rp, gp, bp);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }; // pure black
    const c = Math.round(((1 - rp - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gp - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bp - k) / (1 - k)) * 100);
    return { c, m, y, k: Math.round(k * 100) };
}

// Detect if the color_map pixel indicates RGB (red overlay) or CMYK (cyan overlay) region
function classifyMapPixel(r, g, b) {
    if (r > 180 && g < 80 && b < 80) return 'RGB';
    if (r < 80 && g > 180 && b > 180) return 'CMYK';
    return null;
}

// ─────────────────────────────────────────
// Canvas pixel sampler hook
// ─────────────────────────────────────────
function usePixelSampler() {
    const canvasRef = useRef(null);
    const loadedSrc = useRef(null);

    const loadImage = useCallback((src) => {
        if (loadedSrc.current === src && canvasRef.current) return;
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            canvasRef.current = canvas;
            loadedSrc.current = src;
        };
        img.src = src;
    }, []);

    const samplePixel = useCallback((relX, relY, imgRect) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const px = Math.round((relX / imgRect.width) * canvas.width);
        const py = Math.round((relY / imgRect.height) * canvas.height);
        if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return null;
        try {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const [r, g, b, a] = ctx.getImageData(px, py, 1, 1).data;
            if (a < 10) return null;
            return { r, g, b };
        } catch { return null; }
    }, []);

    return { loadImage, samplePixel };
}

// ─────────────────────────────────────────
// Print Markers Overlay (Bleed, Trim, Safe Area)
// ─────────────────────────────────────────
function PrintMarkersOverlay({ boxes, imgRect, isPdf }) {
    if (!boxes || !imgRect) return null;

    const { mediabox, trimbox, safebox } = boxes;
    if (!mediabox || !trimbox || !safebox) return null;

    const origW = isPdf ? (mediabox[2] - mediabox[0]) : (mediabox[2] - mediabox[0]);
    const origH = isPdf ? (mediabox[3] - mediabox[1]) : (mediabox[3] - mediabox[1]);

    const scaleX = imgRect.width / origW;
    const scaleY = imgRect.height / origH;

    const getRect = (box) => ({
        left: (box[0] - mediabox[0]) * scaleX,
        top: (box[1] - mediabox[1]) * scaleY,
        width: (box[2] - box[0]) * scaleX,
        height: (box[3] - box[1]) * scaleY,
    });

    const bleed = getRect(mediabox);
    const trim = getRect(trimbox);
    const safe = getRect(safebox);

    const lineStyle = (color, z) => ({
        position: 'absolute',
        pointerEvents: 'none',
        border: `1.5px solid ${color}`,
        zIndex: z,
        transition: 'all 0.3s ease',
    });

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 12 }}>
            <div style={{ ...lineStyle('#ef4444', 30), ...bleed, borderStyle: 'solid', opacity: 0.6 }} title="Bleed Area" />
            <div style={{ ...lineStyle('#3b82f6', 31), ...trim, borderStyle: 'solid' }} title="Trim Line" />
            <div style={{ ...lineStyle('#ec4899', 32), ...safe, borderStyle: 'dashed' }} title="Safe Area" />

            <div style={{ position: 'absolute', top: trim.top + 4, left: trim.left + 4, fontSize: 8, color: '#3b82f6', fontWeight: 'bold', zIndex: 33, textShadow: '0 1px 2px black' }}>TRIM</div>
            <div style={{ position: 'absolute', top: safe.top + 4, left: safe.left + 4, fontSize: 8, color: '#ec4899', fontWeight: 'bold', zIndex: 33, textShadow: '0 1px 2px black' }}>SAFE</div>
        </div>
    );
}

// ─────────────────────────────────────────
// Circular Magnifier Lens
// ─────────────────────────────────────────
const LENS_SIZE = 150;

function CircularLens({ lensData, pixelInfo, showBadge }) {
    if (!lensData) return null;
    const { src, x, y, imgRect, zoom } = lensData;

    const relX = x - imgRect.left;
    const relY = y - imgRect.top;
    const scaledW = imgRect.width * zoom;
    const scaledH = imgRect.height * zoom;
    const bgX = -(relX * zoom - LENS_SIZE / 2);
    const bgY = -(relY * zoom - LENS_SIZE / 2);

    const lensStyle = {
        position: 'fixed',
        left: x - LENS_SIZE / 2,
        top: y - LENS_SIZE / 2,
        width: LENS_SIZE,
        height: LENS_SIZE,
        borderRadius: '50%',
        border: '2.5px solid rgba(251,191,36,0.9)',
        boxShadow: '0 0 0 1.5px rgba(0,0,0,0.7), 0 8px 32px rgba(0,0,0,0.8)',
        backgroundImage: `url(${src})`,
        backgroundSize: `${scaledW}px ${scaledH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'high-quality',
        pointerEvents: 'none',
        zIndex: 9997,
        backgroundColor: '#0a0a0f',
    };

    let badge = null;
    if (showBadge && pixelInfo) {
        const { r, g, b } = pixelInfo;
        const cmyk = getCMYKFromRGB(r, g, b);
        const mapMode = classifyMapPixel(r, g, b);
        const isRgbMode = mapMode === 'RGB';
        const isCmykMode = mapMode === 'CMYK';

        const badgeStyle = {
            position: 'fixed',
            left: x - 95,
            top: y + LENS_SIZE / 2 + 6,
            zIndex: 9998,
            pointerEvents: 'none',
            width: 190,
        };

        const CMYK_CHANNELS = [
            { label: 'C', val: cmyk.c, color: '#22d3ee' },
            { label: 'M', val: cmyk.m, color: '#f472b6' },
            { label: 'Y', val: cmyk.y, color: '#facc15' },
            { label: 'K', val: cmyk.k, color: '#a1a1aa' },
        ];

        const modeLabel = isRgbMode ? '● RGB Region' : isCmykMode ? '● CMYK Region' : '● Color Values';
        const modeColor = isRgbMode ? '#f87171' : isCmykMode ? '#22d3ee' : '#a1a1aa';
        const borderColor = isRgbMode ? 'rgba(239,68,68,0.5)' : isCmykMode ? 'rgba(6,182,212,0.5)' : 'rgba(63,63,70,0.5)';

        badge = (
            <div style={badgeStyle}>
                <div style={{
                    background: 'rgba(10,10,15,0.95)',
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: 14,
                    padding: '8px 10px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: `rgb(${r},${g},${b})`,
                            border: '1.5px solid rgba(255,255,255,0.25)',
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: modeColor, letterSpacing: '0.05em' }}>
                            {modeLabel}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#52525b', marginLeft: 'auto' }}>
                            #{r.toString(16).padStart(2, '0')}{g.toString(16).padStart(2, '0')}{b.toString(16).padStart(2, '0').toUpperCase()}
                        </span>
                    </div>
                    {CMYK_CHANNELS.map(({ label, val, color }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color, width: 10, flexShrink: 0 }}>{label}</span>
                            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.15s ease' }} />
                            </div>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#71717a', width: 26, textAlign: 'right', flexShrink: 0 }}>{val}%</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div style={lensStyle} />
            {badge}
        </>
    );
}

// ─────────────────────────────────────────
// Lightbox — fullscreen with zoom inside
// ─────────────────────────────────────────
function Lightbox({ src, onClose }) {
    const [lensData, setLensData] = useState(null);
    const [pixelInfo, setPixelInfo] = useState(null);
    const ZOOM = 3;
    const { loadImage, samplePixel } = usePixelSampler();

    useEffect(() => { if (src) loadImage(src); }, [src, loadImage]);

    const handleEnter = (e) => {
        const imgEl = e.currentTarget.querySelector('img');
        const imgRect = imgEl ? imgEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
        setLensData({ src, x: e.clientX, y: e.clientY, imgRect, zoom: ZOOM });
    };
    const handleMove = (e) => {
        setLensData(prev => {
            if (!prev) return prev;
            const relX = e.clientX - prev.imgRect.left;
            const relY = e.clientY - prev.imgRect.top;
            const px = samplePixel(relX, relY, prev.imgRect);
            setPixelInfo(px);
            return { ...prev, x: e.clientX, y: e.clientY };
        });
    };
    const handleLeave = () => { setLensData(null); setPixelInfo(null); };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/96 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <CircularLens lensData={lensData} pixelInfo={pixelInfo} />
            <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-all z-[10000] shadow-xl"
            >
                <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dark-950/90 border border-zinc-700 text-zinc-400 text-[11px] px-4 py-2 rounded-full flex items-center gap-2 z-[10000] pointer-events-none">
                <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                Hover to zoom · RGB/CMYK detected at cursor · Click outside to close
            </div>
            <div
                className="relative"
                style={{ cursor: lensData ? 'none' : 'zoom-in' }}
                onMouseEnter={handleEnter}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                onClick={e => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt="Fullscreen Preview"
                    className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.9)]"
                    style={{ imageRendering: 'high-quality', userSelect: 'none', pointerEvents: 'none' }}
                    draggable={false}
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Page Navigation Bar
// ─────────────────────────────────────────
function PageNavBar({ current, total, onPrev, onNext, onSelect }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-dark-950/80 border-t border-zinc-800/60 flex-shrink-0">
            <button onClick={onPrev} disabled={current <= 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed text-white font-medium text-sm transition-all active:scale-95">
                <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar max-w-[180px]">
                {Array.from({ length: total }, (_, i) => (
                    <button key={i} onClick={() => onSelect(i)}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold transition-all ${i === current
                            ? 'bg-amber-400 text-dark-950 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                            }`}>{i + 1}</button>
                ))}
            </div>
            <button onClick={onNext} disabled={current >= total - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-25 disabled:cursor-not-allowed text-dark-950 font-bold text-sm transition-all active:scale-95 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
                Next <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────
// Thumbnail Strip
// ─────────────────────────────────────────
function ThumbnailStrip({ pages, current, onSelect }) {
    if (!pages || pages.length <= 1) return null;
    return (
        <div className="flex gap-2 overflow-x-auto py-2 px-3 bg-dark-950/60 border-t border-zinc-800/60 hide-scrollbar">
            {pages.map((src, i) => (
                <button key={i} onClick={() => onSelect(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === current
                        ? 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] scale-105'
                        : 'border-zinc-700 hover:border-zinc-500 opacity-55 hover:opacity-100'
                        }`}>
                    <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                </button>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────
// No-preview placeholder
// ─────────────────────────────────────────
function NoPreviewPlaceholder({ ext, fileData }) {
    const { icon: Icon, color, bg } = getExtIcon(ext);
    const hasDimensions = fileData?.width_px > 0;
    const w_px = fileData?.width_px || 0;
    const h_px = fileData?.height_px || 0;

    return (
        <div className="flex flex-col items-center justify-center gap-6 h-full min-h-[400px] p-10 text-center relative group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                <Icon className="w-[400px] h-[400px] rotate-12" />
            </div>

            <div className={`relative w-24 h-24 rounded-3xl ${bg} flex items-center justify-center shadow-2xl border border-white/5 transition-transform group-hover:scale-105 duration-500`}>
                <Icon className={`w-12 h-12 ${color}`} />
                {hasDimensions && (
                    <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded-md shadow-lg">
                        <Layers className="w-3 h-3 text-amber-400" />
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h4 className="text-zinc-100 font-bold text-lg tracking-tight">
                    {ext.toUpperCase()} Source Asset
                </h4>
                <p className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-[0.2em] font-mono">
                    Vector Component
                </p>

                {hasDimensions ? (
                    <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-4 text-xs font-mono">
                            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400">
                                <span className="text-zinc-500 mr-1">W:</span> {w_px}px
                            </div>
                            <div className="w-2 h-px bg-zinc-800" />
                            <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400">
                                <span className="text-zinc-500 mr-1">H:</span> {h_px}px
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500 mt-4 max-w-[260px] leading-relaxed italic">
                        Processing complete. Analysis results available in details tab.
                    </p>
                )}
            </div>

            <div className="mt-4 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Metadata Active</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Main FilePreview component
// ─────────────────────────────────────────
const FilePreview = ({ fileData, previewUrl, onPageChange }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [showColorMap, setShowColorMap] = useState(false);
    const [showMarkers, setShowMarkers] = useState(true);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [pdfNumPages, setPdfNumPages] = useState(null);
    const [pdfPage, setPdfPage] = useState(1);
    const [lensData, setLensData] = useState(null);
    const [pixelInfo, setPixelInfo] = useState(null);
    const [showCmykHover, setShowCmykHover] = useState(true);
    const [viewMode, setViewMode] = useState('native'); // 'native' (100% Raw Vector / Raw Image) or 'cmyk' (CMYK Print Proof)
    const lensTimer = useRef(null);
    const ZOOM = 2.8;

    const { loadImage, samplePixel } = usePixelSampler();

    const fileName = fileData?.file_name || '';
    const ext = getExt(fileName);
    const { icon: ExtIcon, color: extColor, bg: extBg } = getExtIcon(ext);

    const renderedPages = fileData?.rendered_pages || [];
    const colorMaps = fileData?.color_maps || [];
    const hasRenderedPages = renderedPages.length > 0;
    const totalPages = hasRenderedPages ? renderedPages.length : 0;
    const isMultiPage = totalPages > 1;
    const isImage = /\.(jpeg|jpg|gif|png|webp|tiff?|bmp)$/i.test(fileName);
    const isPdf = /\.pdf$/i.test(fileName) || (['ai', 'eps'].includes(ext) && !hasRenderedPages);
    const isSvg = ext === 'svg';

    const updatePage = useCallback((idx) => {
        const newIdx = Math.max(0, Math.min(totalPages - 1, idx));
        setCurrentPage(newIdx);
        if (onPageChange) onPageChange(newIdx);
    }, [totalPages, onPageChange]);

    const displaySrc = hasRenderedPages ? renderedPages[currentPage] : null;
    const colorMapSrc = (showColorMap && colorMaps[currentPage]) ? colorMaps[currentPage] : null;
    
    // Choose active source based on viewMode
    const rawNativeSrc = previewUrl || displaySrc;
    const activeSrc = (viewMode === 'native' && (previewUrl || isImage || isSvg)) ? (previewUrl || displaySrc) : (displaySrc || previewUrl);
    
    const currentPageData = fileData?.pages_metrics?.[currentPage] || fileData?.pages?.[currentPage] || fileData;
    const printBoxes = currentPageData?.print_boxes;

    useEffect(() => {
        if (activeSrc && !isPdf) loadImage(activeSrc);
    }, [activeSrc, isPdf, loadImage]);

    const handleMouseEnter = useCallback((e, src) => {
        clearTimeout(lensTimer.current);
        const imgEl = e.currentTarget.querySelector('img');
        const imgRect = imgEl ? imgEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
        setLensData({ src, x: e.clientX, y: e.clientY, imgRect, zoom: ZOOM });
    }, []);

    const handleMouseMove = useCallback((e, src) => {
        setLensData(prev => {
            if (!prev) return prev;
            const newData = { ...prev, x: e.clientX, y: e.clientY };
            const relX = e.clientX - prev.imgRect.left;
            const relY = e.clientY - prev.imgRect.top;
            const px = samplePixel(relX, relY, prev.imgRect);
            setPixelInfo(px);
            return newData;
        });
    }, [samplePixel]);

    const handleMouseLeave = useCallback(() => {
        clearTimeout(lensTimer.current);
        setLensData(null);
        setPixelInfo(null);
    }, []);

    if (!fileData) return <div className="animate-pulse bg-dark-900 rounded-xl h-64 border border-zinc-800" />;

    return (
        <>
            {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
            <CircularLens lensData={lensData} pixelInfo={pixelInfo} showBadge={showCmykHover} />

            <div className="bg-dark-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 overflow-hidden flex flex-col h-full shadow-2xl">

                {/* ── Header ── */}
                <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between bg-dark-950/40 flex-shrink-0 flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 ${extBg} rounded-lg flex-shrink-0`}>
                            <ExtIcon className={`w-5 h-5 ${extColor}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white text-sm truncate flex items-baseline gap-2">
                                {fileName || 'Analyzing…'}
                                {fileData?.dimensions && (() => {
                                    const [w_px, h_px] = fileData.dimensions;
                                    const dpiMatch = fileData.resolution?.match(/(\d+)/);
                                    const dpi = dpiMatch ? parseInt(dpiMatch[1], 10) : 300;
                                    const w_mm = ((w_px / dpi) * 25.4).toFixed(1);
                                    const h_mm = ((h_px / dpi) * 25.4).toFixed(1);

                                    return (
                                        <span className="text-xs text-amber-400 font-mono tracking-tight font-medium">
                                            [{w_mm} × {h_mm} mm]
                                        </span>
                                    );
                                })()}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {fileData?.resolution || '300 DPI'}&nbsp;·&nbsp;{fileData?.print_method || 'Print Ready'}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${fileData?.has_rgb
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                    }`}>
                                    {fileData?.has_rgb ? 'RGB' : 'CMYK'}
                                </span>
                                {isMultiPage && (
                                    <span className="px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/20 rounded text-amber-400 text-[10px] font-semibold">
                                        {totalPages} pages
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Mode Selector Toggle: Native Source Quality vs CMYK Proof */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                            <button
                                onClick={() => setViewMode('native')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                    viewMode === 'native'
                                        ? 'bg-amber-400 text-dark-950 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Native Quality
                            </button>
                            <button
                                onClick={() => setViewMode('cmyk')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                    viewMode === 'cmyk'
                                        ? 'bg-amber-400 text-dark-950 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                CMYK Proof
                            </button>
                        </div>

                        <div className="flex gap-1.5 flex-shrink-0">
                            {colorMaps.length > 0 && (
                                <button onClick={() => setShowColorMap(v => !v)}
                                    title={showColorMap ? 'Hide color map' : 'Show color map'}
                                    className={`p-2 rounded-lg transition-all ${showColorMap
                                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                                    <Layers className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowCmykHover(v => !v)}
                                title={showCmykHover ? 'Hide CMYK values on hover' : 'Show CMYK values on hover'}
                                className={`p-2 rounded-lg transition-all ${showCmykHover
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                                {showCmykHover ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => setShowMarkers(v => !v)}
                                title={showMarkers ? 'Hide Print Markers' : 'Show Print Markers (Bleed/Trim/Safe)'}
                                className={`p-2 rounded-lg transition-all ${showMarkers
                                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                                <Maximize2 className="w-4 h-4 rotate-45" />
                            </button>
                            {activeSrc && (
                                <button onClick={() => setLightboxSrc(activeSrc)}
                                    title="Open fullscreen"
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Preview Body ── */}
                <div className="flex-grow relative bg-dark-950/40 flex items-center justify-center overflow-hidden min-h-[420px]">

                    {/* MODE 1: NATIVE VECTOR PDF PREVIEW (100% Infinite Vector Resolution) */}
                    {viewMode === 'native' && isPdf && previewUrl ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <object
                                data={previewUrl}
                                type="application/pdf"
                                className="w-full h-[600px] rounded-xl border border-zinc-700/50 shadow-2xl bg-white/5"
                            >
                                <Document file={previewUrl} loading={<Loader2 className="w-8 h-8 text-amber-400 animate-spin my-12" />}>
                                    <Page pageNumber={pdfPage} width={720} renderTextLayer={true} renderAnnotationLayer={false} />
                                </Document>
                            </object>
                        </div>

                    /* MODE 2: NATIVE RAW UNTOUCHED IMAGE / SVG PREVIEW (100% Full Resolution Source) */
                    ) : (viewMode === 'native' && (isImage || isSvg) && previewUrl) ? (
                        <div className="w-full h-full flex items-center justify-center p-6 group relative"
                            style={{ cursor: lensData ? 'none' : 'zoom-in' }}
                            onClick={() => setLightboxSrc(previewUrl)}
                            onMouseEnter={e => handleMouseEnter(e, previewUrl)}
                            onMouseMove={e => handleMouseMove(e, previewUrl)}
                            onMouseLeave={handleMouseLeave}
                        >
                            <img src={previewUrl} alt="Untouched raw design preview"
                                className="max-h-[600px] max-w-full object-contain rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-zinc-700/40 group-hover:border-amber-400/20 transition-all select-none"
                                style={{ imageRendering: 'high-quality', userSelect: 'none', pointerEvents: 'none' }}
                                draggable={false} />
                            {showMarkers && printBoxes && lensData?.imgRect && (
                                <PrintMarkersOverlay
                                    boxes={printBoxes}
                                    imgRect={lensData.imgRect}
                                    isPdf={false}
                                />
                            )}
                            {!lensData && (
                                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all bg-dark-950/80 border border-zinc-700 text-zinc-400 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 pointer-events-none">
                                    <ZoomIn className="w-3 h-3" /> Hover to zoom + detect color · Click to expand
                                </div>
                            )}
                        </div>

                    /* MODE 3: BACKEND RENDERED LOSSLESS PNG PROOF */
                    ) : hasRenderedPages ? (
                        <div className="relative w-full h-full flex items-center justify-center p-6">
                            <div
                                className="relative group"
                                style={{ cursor: lensData ? 'none' : 'zoom-in' }}
                                onClick={() => setLightboxSrc(displaySrc)}
                                onMouseEnter={e => handleMouseEnter(e, displaySrc)}
                                onMouseMove={e => handleMouseMove(e, displaySrc)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <img
                                    src={displaySrc}
                                    alt={`Page ${currentPage + 1} proof preview`}
                                    className="max-h-[600px] max-w-full object-contain rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border border-zinc-700/40 transition-all group-hover:border-amber-400/20 select-none"
                                    style={{ imageRendering: 'high-quality', userSelect: 'none', pointerEvents: 'none' }}
                                    draggable={false}
                                />
                                {showMarkers && printBoxes && lensData?.imgRect && (
                                    <PrintMarkersOverlay
                                        boxes={printBoxes}
                                        imgRect={lensData.imgRect}
                                        isPdf={isPdf}
                                    />
                                )}
                                {!lensData && (
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all bg-dark-950/80 border border-zinc-700 text-zinc-400 text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 pointer-events-none">
                                        <ZoomIn className="w-3 h-3" /> Hover to zoom + detect color · Click to expand
                                    </div>
                                )}
                                {colorMapSrc && (
                                    <img src={colorMapSrc} alt="Color map"
                                        className="absolute inset-0 w-full h-full object-contain rounded-xl opacity-60 mix-blend-screen pointer-events-none" />
                                )}
                            </div>

                            {isMultiPage && (
                                <>
                                    <button onClick={e => { e.stopPropagation(); updatePage(currentPage - 1); }}
                                        disabled={currentPage <= 0}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 bg-dark-950/90 border border-zinc-700 hover:border-zinc-500 text-white rounded-full disabled:opacity-15 transition-all active:scale-95 shadow-xl z-10 hover:bg-zinc-800">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); updatePage(currentPage + 1); }}
                                        disabled={currentPage >= totalPages - 1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-amber-400 hover:bg-amber-300 disabled:bg-dark-950/90 disabled:border disabled:border-zinc-700 disabled:opacity-15 text-dark-950 disabled:text-white rounded-full transition-all active:scale-95 shadow-xl z-10">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                    /* MODE 4: REACT-PDF VECTOR CANVAS FALLBACK */
                    ) : isPdf && previewUrl ? (
                        <div className="w-full flex flex-col items-center overflow-auto p-4">
                            <Document file={previewUrl}
                                onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
                                loading={<Loader2 className="w-8 h-8 text-amber-400 animate-spin my-12" />}
                                error={<div className="p-8 text-center flex flex-col items-center"><FileText className="w-12 h-12 text-zinc-600 mb-3" /><p className="text-sm text-zinc-500">PDF could not be rendered in-browser.</p></div>}
                            >
                                <Page pageNumber={pdfPage} width={720} renderTextLayer={true} renderAnnotationLayer={false} />
                            </Document>
                            {pdfNumPages && pdfNumPages > 1 && (
                                <div className="flex items-center gap-3 mt-3 bg-dark-950/80 border border-zinc-800 px-4 py-2 rounded-full text-sm text-white">
                                    <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1} className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="font-mono text-xs">{pdfPage} / {pdfNumPages}</span>
                                    <button onClick={() => setPdfPage(p => Math.min(pdfNumPages, p + 1))} disabled={pdfPage >= pdfNumPages} className="p-1 hover:bg-white/10 rounded-full disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                    ) : <NoPreviewPlaceholder ext={ext} fileData={fileData} />}
                </div>

                {/* Thumbnail Strip */}
                {hasRenderedPages && <ThumbnailStrip pages={renderedPages} current={currentPage} onSelect={updatePage} />}

                {/* Page Nav Bar (multi-page only) */}
                {isMultiPage && (
                    <PageNavBar current={currentPage} total={totalPages}
                        onPrev={() => updatePage(currentPage - 1)}
                        onNext={() => updatePage(currentPage + 1)}
                        onSelect={updatePage} />
                )}

                {/* Footer */}
                {!isMultiPage && (
                    <div className="px-5 py-3 border-t border-zinc-800/60 bg-dark-950/40 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                            {fileData?.width_px > 0 && <span>{fileData.width_px} × {fileData.height_px} px</span>}
                            {ext && <span className="uppercase text-zinc-600">.{ext}</span>}
                        </div>
                        <div className="text-xs flex items-center gap-1">
                            {showColorMap
                                ? <><Eye className="w-3 h-3 text-amber-400" /> <span className="text-amber-400">Color Map ON</span></>
                                : <><EyeOff className="w-3 h-3 text-zinc-600" /> <span className="text-zinc-600">Raw Preview</span></>}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default FilePreview;
