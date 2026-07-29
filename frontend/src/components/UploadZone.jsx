import React, { useState, useEffect } from 'react';
import { UploadCloud, File, AlertCircle, RefreshCw, Loader2, Sparkles, Layers, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────
const MATERIALS = [
    'Art Paper', 'Glossy Coated', 'Matte Coated', 'Uncoated Bond',
    'Kraft', 'Cardboard', 'Photo Paper', 'Canvas', 'Synthetic (PP)',
];

const PAPER_SIZES = [
    { label: 'A3 (297 × 420 mm)', value: 'A3' },
    { label: 'A4 (210 × 297 mm)', value: 'A4' },
    { label: 'A5 (148 × 210 mm)', value: 'A5' },
    { label: 'A6 (105 × 148 mm)', value: 'A6' },
    { label: 'Business Card (85 × 54 mm)', value: 'Business Card' },
    { label: 'DL Envelope (110 × 220 mm)', value: 'DL Envelope' },
];

const ANALYSIS_PIPELINE_STEPS = [
    "Parsing design asset format & structural metadata...",
    "Inspecting page dimensions & vector MediaBox boundaries...",
    "Analyzing native color profiles (RGB vs CMYK spaces)...",
    "Evaluating resolution DPI & image pixel sharpness...",
    "Calculating Total Ink Coverage (TAC) overload thresholds...",
    "Verifying 3mm safe bleed margins & trim safety zones...",
    "Generating AI preflight score & CMYK color map proof..."
];

// ── Sub-component: Print Material Modal ──────────────────────────────────────
const PrintMaterialModal = ({ onConfirm }) => {
    const [material, setMaterial] = useState('Art Paper');
    const [paperSize, setPaperSize] = useState('A4');
    const [gsm, setGsm] = useState(150);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-dark-950/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-900 border border-zinc-700 p-8 rounded-3xl max-w-sm w-full shadow-2xl scale-up-center">
                <div className="w-14 h-14 bg-amber-400/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                    <Layers className="w-7 h-7 text-amber-400" />
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-1">Print Specifications</h3>
                <p className="text-zinc-500 text-center text-xs mb-6 leading-relaxed">
                    Specify the print material before analysis so we can generate accurate UPS and die line files.
                </p>

                {/* Material */}
                <div className="mb-4">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
                        Print Material
                    </label>
                    <select
                        value={material}
                        onChange={e => setMaterial(e.target.value)}
                        className="w-full bg-dark-950 border border-zinc-800 text-white text-sm py-2.5 px-3 rounded-xl outline-none focus:border-amber-400 cursor-pointer"
                    >
                        {MATERIALS.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {/* Paper Size */}
                <div className="mb-4">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
                        Paper Size
                    </label>
                    <select
                        value={paperSize}
                        onChange={e => setPaperSize(e.target.value)}
                        className="w-full bg-dark-950 border border-zinc-800 text-white text-sm py-2.5 px-3 rounded-xl outline-none focus:border-amber-400 cursor-pointer"
                    >
                        {PAPER_SIZES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* GSM */}
                <div className="mb-6">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">
                        Paper GSM (g/m²)
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="70"
                            max="400"
                            step="5"
                            value={gsm}
                            onChange={e => setGsm(Number(e.target.value))}
                            className="flex-1 accent-amber-400 cursor-pointer"
                        />
                        <span className="text-white font-mono font-bold text-sm w-16 text-right">
                            {gsm} gsm
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => onConfirm({ material, paperSize, gsm })}
                    className="w-full py-3.5 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 text-dark-950 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--brand-primary),0.3)]"
                >
                    <span>Start Neural Analysis</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ── Main UploadZone Component ──────────────────────────────────────────────────
const UploadZone = () => {
    const { currentUser, userPlan, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState(null);
    const [showPrompt, setShowPrompt] = useState(null);
    const [bleedMm, setBleedMm] = useState(3.0);
    const [pendingData, setPendingData] = useState(null);
    const [statusLogs, setStatusLogs] = useState([]);
    const [pipelineStep, setPipelineStep] = useState(0);

    // Print material state (from modal)
    const [printMaterial, setPrintMaterial] = useState('Art Paper');
    const [paperSize, setPaperSize] = useState('A4');
    const [gsm, setGsm] = useState(150);

    // Live Step Pipeline Timer Effect
    useEffect(() => {
        let interval;
        if (isUploading && uploadStep === 'analyzing') {
            setPipelineStep(0);
            interval = setInterval(() => {
                setPipelineStep((prev) => (prev < ANALYSIS_PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
            }, 300);
        } else {
            setPipelineStep(0);
        }
        return () => clearInterval(interval);
    }, [isUploading, uploadStep]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onloadend = () => setPreviewUrl(reader.result);
                reader.readAsDataURL(file);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleGenerateClick = () => {
        if (!selectedFile) {
            toast.error('Please select a file first');
            return;
        }
        setShowPrompt('material');
    };

    const handleMaterialConfirm = ({ material, paperSize: size, gsm: g }) => {
        setPrintMaterial(material);
        setPaperSize(size);
        setGsm(g);
        setShowPrompt(null);
        handleUpload(null, material, size, g);
    };

    const handleUpload = async (e, materialOverride, sizeOverride, gsmOverride) => {
        if (e) e.preventDefault();
        if (!selectedFile) {
            toast.error('Please select a file first');
            return;
        }

        const mat = materialOverride || printMaterial;
        const sz = sizeOverride || paperSize;
        const g = gsmOverride ?? gsm;

        if (userPlan === 'Free' && !isAdmin) {
            try {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const statsRes = await fetch(`${apiBase}/api/user/${currentUser.uid}/stats`);
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    if (stats.total_files >= 5) {
                        toast.error("You've reached the Free plan limit of 5 scans. Upgrade to Pro for unlimited scans!", { duration: 5000 });
                        navigate('/pricing');
                        return;
                    }
                }
            } catch (err) {
                console.error("Plan limit check failed:", err);
            }
        }

        try {
            setIsUploading(true);
            setShowPrompt(null);
            setUploadStep('analyzing');

            const formData = new FormData();
            formData.append('file', selectedFile);

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analyze`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.status_log) setStatusLogs(data.status_log);

            if (!response.ok) {
                const errorDetail = data.detail || 'Analysis failed';
                if (typeof errorDetail === 'object' && errorDetail.status_log) {
                    setStatusLogs(errorDetail.status_log);
                    throw new Error(errorDetail.error || 'Analysis failed');
                }
                throw new Error(errorDetail);
            }

            data.paper_material = mat;
            data.paper_size = sz;
            data.gsm = g;
            data.bleed_mm = bleedMm;

            setPendingData(data);

            if (data.has_rgb) {
                setShowPrompt('rgb');
                setUploadStep(null);
                setIsUploading(false);
                return;
            }

            if (!data.has_sufficient_bleed) {
                setShowPrompt('bleed');
                setUploadStep(null);
                setIsUploading(false);
                return;
            }

            await finalizeUpload(data);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to analyze file. Is the backend running?');
            setIsUploading(false);
            setUploadStep(null);
        }
    };

    const handleRgbDecision = async (convert) => {
        setShowPrompt(null);
        setIsUploading(true);
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        let currentData = pendingData;
        let cmykBlobUrl = null;
        let cmykStatus = 'none';

        if (convert) {
            cmykStatus = 'failed';
            try {
                setUploadStep('converting');
                toast.loading('RGB detected — Converting to CMYK…', { id: 'cmyk-convert' });
                const convertForm = new FormData();
                convertForm.append('file', selectedFile);
                convertForm.append('format', 'pdf');
                const convertRes = await fetch(`${apiBase}/api/convert`, { method: 'POST', body: convertForm });
                if (convertRes.ok) {
                    const blob = await convertRes.blob();
                    cmykBlobUrl = URL.createObjectURL(blob);
                    cmykStatus = 'success';
                    toast.success('CMYK conversion complete!', { id: 'cmyk-convert' });
                } else {
                    toast.error('CMYK conversion failed.', { id: 'cmyk-convert' });
                }
            } catch (convErr) {
                console.error('CMYK conversion error:', convErr);
                toast.dismiss('cmyk-convert');
            }
        }

        if (!currentData.has_sufficient_bleed) {
            setShowPrompt('bleed');
            setIsUploading(false);
            setUploadStep(null);
            setPendingData({ ...currentData, _cmykBlobUrl: cmykBlobUrl, _cmykStatus: cmykStatus });
            return;
        }

        await finalizeUpload(currentData, cmykBlobUrl, cmykStatus);
    };

    const handleBleedDecision = async (apply, mm) => {
        setShowPrompt(null);
        setIsUploading(true);
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        let currentData = pendingData;
        const cmykBlobUrl = pendingData._cmykBlobUrl || null;
        const cmykStatus = pendingData._cmykStatus || 'none';

        if (apply) {
            try {
                setUploadStep('synthesizing');
                toast.loading(`Synthesizing ${mm}mm bleed...`, { id: 'bleed-extend' });
                const bleedForm = new FormData();
                bleedForm.append('file', selectedFile);
                bleedForm.append('bleed_mm', mm);
                const bleedRes = await fetch(`${apiBase}/api/extend-bleed`, { method: 'POST', body: bleedForm });
                if (bleedRes.ok) {
                    currentData.has_sufficient_bleed = true;
                    currentData.bleed_mm = mm;
                    currentData.auto_fixes = [
                        `Extra ${mm}mm bleed synthesized by AI Engine`,
                        ...(currentData.auto_fixes || []),
                    ];
                    toast.success('Bleed extended successfully!', { id: 'bleed-extend' });
                } else {
                    toast.error('Bleed extension failed.', { id: 'bleed-extend' });
                }
            } catch (err) {
                console.error('Bleed extension error:', err);
                toast.dismiss('bleed-extend');
            }
        }

        await finalizeUpload(currentData, cmykBlobUrl, cmykStatus);
    };

    const finalizeUpload = async (data, cmykBlobUrl = null, cmykStatus = 'none') => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const jobId = data.job_id || crypto.randomUUID();
        data.job_id = jobId;
        data.id = jobId;

        if (currentUser) {
            try {
                setUploadStep('saving');
                await fetch(`${apiBase}/api/save-analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.uid,
                        file_name: selectedFile.name,
                        score: data.score || 0,
                        risk_level: data.risk_level || 'UNKNOWN',
                        status: 'Completed',
                        analysis_data: data,
                        supabase_storage_path: data.supabase_storage_path || null,
                        job_id: jobId,
                    }),
                });
            } catch (dbErr) {
                console.error('DB save error:', dbErr);
            }
        }

        setIsUploading(false);
        setUploadStep(null);
        toast.success('Analysis complete!');

        navigate('/report', {
            state: {
                reportData: data,
                previewUrl,
                fileName: selectedFile.name,
                rgbDetected: !!data.has_rgb,
                cmykBlobUrl,
                cmykStatus,
            },
        });
    };

    const progressPercent = Math.min(100, Math.round(((pipelineStep + 1) / ANALYSIS_PIPELINE_STEPS.length) * 100));

    return (
        <div className="w-full max-w-3xl mx-auto rounded-3xl overflow-hidden bg-dark-900/60 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.4)] border border-zinc-800 isolate relative">

            {/* ── Decision Overlays ─────────────────────────────────────── */}
            {showPrompt === 'material' && (
                <PrintMaterialModal onConfirm={handleMaterialConfirm} />
            )}

            {showPrompt && showPrompt !== 'material' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-dark-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl scale-up-center">
                        <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <AlertCircle className="w-8 h-8 text-amber-400" />
                        </div>

                        {showPrompt === 'rgb' ? (
                            <>
                                <h3 className="text-xl font-bold text-white text-center mb-2">RGB Profile Detected</h3>
                                <p className="text-zinc-400 text-center text-sm mb-6">
                                    Your file uses RGB colors. For professional print, we recommend converting to CMYK to prevent color shifts.
                                </p>
                                <div className="space-y-3">
                                    <button onClick={() => handleRgbDecision(true)} className="w-full py-3 bg-amber-400 text-dark-950 font-bold rounded-xl hover:bg-amber-300 transition-colors">
                                        Convert to CMYK
                                    </button>
                                    <button onClick={() => handleRgbDecision(false)} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors">
                                        Keep RGB (Not Recommended)
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-white text-center mb-2">Missing Bleed Area</h3>
                                <p className="text-zinc-400 text-center text-sm mb-4">
                                    No safety margins detected. Should we auto-synthesize bleed borders?
                                </p>
                                <div className="mb-6">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 text-center">Bleed Amount (mm)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={bleedMm}
                                            onChange={e => setBleedMm(parseFloat(e.target.value))}
                                            step="0.1"
                                            className="flex-1 bg-dark-950 border border-zinc-800 text-white text-center py-2 rounded-lg outline-none focus:border-amber-400"
                                        />
                                        <span className="text-zinc-500 font-bold">mm</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <button onClick={() => handleBleedDecision(true, bleedMm)} className="w-full py-3 bg-[rgb(var(--brand-primary))] text-dark-950 font-bold rounded-xl hover:opacity-90 transition-opacity">
                                        Synthesize {bleedMm}mm Bleed
                                    </button>
                                    <button onClick={() => handleBleedDecision(false, 0)} className="w-full py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors">
                                        Skip Bleed Check
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Main Upload Area ─────────────────────────────────────── */}
            <div className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 mx-auto bg-amber-400/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-amber-400/5">
                    <UploadCloud className="w-10 h-10 text-amber-400" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
                    Upload Design File
                </h2>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                    Drag &amp; drop your design file here. We'll analyze color profiles, bleed safety, and print readiness.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-medium mb-8">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                    <span><strong>Pro Suggestion:</strong> Uploading PDF is best for preflight analysis &amp; vector precision</span>
                </div>

                <form onSubmit={handleUpload} className="relative group cursor-pointer border-2 border-dashed border-zinc-800 hover:border-amber-400/50 bg-dark-950/40 hover:bg-amber-400/5 transition-all rounded-2xl py-12 px-6 mb-4">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                    />

                    <div className="flex flex-col items-center justify-center group-hover:transform group-hover:-translate-y-1 transition-transform">
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-3 w-full max-w-md">
                                <Loader2 className="w-9 h-9 text-amber-400 animate-spin mb-1" />

                                {uploadStep === 'converting' ? (
                                    <>
                                        <span className="font-bold text-amber-400 text-lg">Converting RGB → CMYK…</span>
                                        <span className="text-xs text-zinc-500">Auto-correcting color profile for print</span>
                                    </>
                                ) : uploadStep === 'synthesizing' ? (
                                    <>
                                        <span className="font-bold text-amber-400 text-lg">Synthesizing Bleed Borders…</span>
                                        <span className="text-xs text-zinc-500">Expanding design to safety margins</span>
                                    </>
                                ) : uploadStep === 'saving' ? (
                                    <>
                                        <span className="font-bold text-amber-400 text-lg">Storing Results…</span>
                                        <span className="text-xs text-zinc-500">Updating your analysis history</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-bold text-white text-lg tracking-tight">Neural Engine Analyzing…</span>
                                        <span className="text-xs text-zinc-400 mb-2">Real-time Preflight Analysis &amp; Ink Coverage Check</span>

                                        {/* ── LIVE STEP PIPELINE TICKER BELOW NEURAL ENGINE ANALYZING ── */}
                                        <div className="w-full bg-dark-950/90 border border-zinc-800 rounded-2xl p-4 text-left shadow-2xl space-y-3">
                                            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                                    <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">Neural Pipeline Active</span>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                                                    {progressPercent}%
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>

                                            {/* Live Step Checklist */}
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pt-1">
                                                {ANALYSIS_PIPELINE_STEPS.map((stepText, idx) => {
                                                    const isDone = idx < pipelineStep;
                                                    const isActive = idx === pipelineStep;
                                                    return (
                                                        <div key={idx} className={`flex items-center gap-2.5 px-2 py-1 rounded-lg transition-all ${isActive ? 'bg-amber-400/10 border border-amber-400/20' : ''}`}>
                                                            {isDone ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                            ) : isActive ? (
                                                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                                                            ) : (
                                                                <Circle className="w-3.5 h-3.5 text-zinc-700 flex-shrink-0" />
                                                            )}
                                                            <span className={`text-[11px] font-mono leading-tight ${
                                                                isDone ? 'text-zinc-400 opacity-80' :
                                                                isActive ? 'text-amber-400 font-bold animate-pulse' :
                                                                'text-zinc-600'
                                                            }`}>
                                                                {stepText}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {statusLogs.length > 0 && (
                                                <div className="pt-2 border-t border-zinc-800/60">
                                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Engine Logs</p>
                                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                                                        {statusLogs.map((log, i) => (
                                                            <p key={i} className="text-[10px] text-zinc-400 font-mono">{log}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-dark-900 border border-zinc-800 text-white font-semibold text-sm shadow-sm mb-4 group-hover:border-amber-400/30 transition-colors pointer-events-none">
                                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Browse Files to Upload'}
                                </div>
                                <p className="text-sm text-zinc-500 font-medium tracking-wide">
                                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Max file size: 50MB'}
                                </p>
                            </>
                        )}
                    </div>
                </form>

                {/* Generate Button */}
                {selectedFile && !isUploading && (
                    <div className="animate-fade-in-up mt-6">
                        <button
                            onClick={handleGenerateClick}
                            className="relative group overflow-hidden px-10 py-4 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 text-dark-950 rounded-2xl font-bold tracking-wide shadow-[0_0_20px_rgba(var(--brand-primary),0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(var(--brand-primary),0.5)] hover:scale-[1.02] active:scale-95 w-full sm:w-auto flex items-center justify-center gap-3 mx-auto"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                            <Sparkles className="w-5 h-5" />
                            Generate AI Analysis
                        </button>
                    </div>
                )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="bg-dark-950/60 p-6 border-t border-zinc-800/60 flex flex-wrap gap-4 items-center justify-center text-xs font-medium text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-zinc-600" />
                    <span>Secure &amp; Private</span>
                </div>
                <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-800"></div>
                <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-zinc-600" />
                    <span>PDF, CDR, AI, TIFF</span>
                </div>
                <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-800"></div>
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-zinc-600" />
                    <span>Auto-fixes available</span>
                </div>
            </div>
        </div>
    );
};

export default UploadZone;
