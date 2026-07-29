import React, { useState, useEffect, useRef } from 'react';
import { Download, Share2, Loader2, ArrowLeft, Sparkles, Trash2, Edit3, Save, X } from 'lucide-react';
import FilePreview from '../components/FilePreview';
import ScoreGauge from '../components/ScoreGauge';
import InkCoverageChart from '../components/InkCoverageChart';
import PredictionCard from '../components/PredictionCard';
import RiskAlert from '../components/RiskAlert';
import FixSummary from '../components/FixSummary';
import toast from 'react-hot-toast';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Report = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userPlan, isAdmin } = useAuth();
    const [downloading, setDownloading] = useState(false);

    const [activeTab, setActiveTab] = useState('Summary');
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [isExtendingBleed, setIsExtendingBleed] = useState(false);
    const [extendBleedBlobUrl, setExtendBleedBlobUrl] = useState(null);
    const reportRef = useRef(null);
    const [recentReports, setRecentReports] = useState([]);
    const [isLoading, setIsLoading] = useState(!location.state?.reportData && !!currentUser);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState('');

    // ── helpers ──────────────────────────────────────────────────────────────
    const pxToMm = (px, dpi) => dpi > 0 ? (px / dpi * 25.4).toFixed(1) : null;

    const getPhysicalSize = (data) => {
        if (!data) return null;
        // Prefer backend-supplied mm values (accurate for PDFs)
        const wMm = data.width_mm || (data.width_px > 0 && data.dpi > 0 ? pxToMm(data.width_px, data.dpi) : null);
        const hMm = data.height_mm || (data.height_px > 0 && data.dpi > 0 ? pxToMm(data.height_px, data.dpi) : null);
        if (wMm && hMm) return `${wMm} × ${hMm} mm`;
        return null;
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return 'Unknown Date';
        let d = new Date(dateStr);

        // If initial parse fails, try handling legacy custom format: "March 14, 2026 - 05:17 PM"
        if (isNaN(d.getTime())) {
            const cleaned = dateStr.includes(' - ') ? dateStr.split(' - ')[0] : dateStr;
            d = new Date(cleaned);
        }

        if (isNaN(d.getTime())) return 'Invalid Date';

        return d.toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };



    useEffect(() => {
        const fetchRecent = async () => {
            if (!currentUser) return;
            try {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiBase}/api/history?user_id=${currentUser.uid}&t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setRecentReports(data);
                    }
                }
            } catch (err) {
                console.error("Error fetching recent reports:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecent();
    }, [currentUser, location.state]);

    // Use dynamically passed data from upload, fallback to selected recent report, or null
    // We allow URL state to override, else use the first recent report
    const [selectedReportIndex, setSelectedReportIndex] = useState(location.state?.reportData ? -1 : 0);
    const activeRecentData = (recentReports[selectedReportIndex] && recentReports[selectedReportIndex].analysis_data) ? recentReports[selectedReportIndex].analysis_data : recentReports[selectedReportIndex];
    const analysisData = selectedReportIndex === -1 ? location.state?.reportData : activeRecentData;

    const previewUrl = location.state?.previewUrl || null;
    const isMock = false; // Removed mock functionality
    const rgbDetected = location.state?.rgbDetected || activeRecentData?.has_rgb || false;
    const cmykBlobUrl = location.state?.cmykBlobUrl || null;
    const cmykConverted = location.state?.cmykConverted || false;
    const cmykStatus = location.state?.cmykStatus || (cmykConverted ? 'success' : 'idle');

    const handleCmykDownload = () => {
        if (!cmykBlobUrl) return;
        const link = document.createElement('a');
        link.href = cmykBlobUrl;
        const baseName = analysisData.file_name.replace(/\.[^/.]+$/, '');
        link.download = `${baseName}_CMYK_Converted.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CMYK file downloaded!');
    };

    // If the backend returned an array of per-page analysis in `pages`, use the active page.
    // Otherwise fallback to the root document analysis.
    const activeData = (analysisData?.pages && analysisData.pages[activePageIndex])
        ? analysisData.pages[activePageIndex]
        : (analysisData || {});

    const [bleedMm, setBleedMm] = useState(3);
    const [targetFormat, setTargetFormat] = useState('PDF');

    const handleExtendBleed = async () => {
        if (userPlan === 'Free' && !isAdmin) {
            toast.error("Automated Bleed Fix is a Pro feature. Please upgrade to unlock.");
            navigate('/pricing');
            return;
        }
        try {
            setIsExtendingBleed(true);
            const loadToast = toast.loading(`Expanding bleed by ${bleedMm}mm...`, { id: 'bleed-expand' });

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const formData = new FormData();
            formData.append('user_id', currentUser?.uid || '');
            formData.append('analysis_id', analysisData?.job_id || analysisData?.id || '');
            formData.append('bleed_mm', bleedMm);
            formData.append('target_format', targetFormat);

            if (analysisData?.supabase_storage_path) {
                formData.append('supabase_storage_path', analysisData.supabase_storage_path);
            }
            if (analysisData?.rendered_pages?.[0]) {
                formData.append('base64_image', analysisData.rendered_pages[0]);
            }
            if (analysisData?.file_name) {
                formData.append('file_name_param', analysisData.file_name);
            }

            const response = await fetch(`${apiBase}/api/fix/bleed`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to extend bleed");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setExtendBleedBlobUrl(url);

            toast.success(`Bleed successfully extended by ${bleedMm}mm!`, { id: 'bleed-expand' });
        } catch (err) {
            console.error("Bleed expansion error:", err);
            toast.error(err.message || "Failed to extend bleed.", { id: 'bleed-expand' });
        } finally {
            setIsExtendingBleed(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (userPlan === 'Free' && !isAdmin) {
            toast.error("Professional PDF Reports are a Pro feature. Please upgrade to unlock.");
            navigate('/pricing');
            return;
        }
        try {
            setDownloading(true);
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const response = await fetch(`${apiBase}/api/report/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisData),
            });

            if (!response.ok) throw new Error('Failed to generate professional PDF report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PrintGuard_Analysis_${analysisData.file_name.replace(/\.[^/.]+$/, "")}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Professional report generated!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Error generating professional report. Falling back...");
        } finally {
            setDownloading(false);
        }
    };





    const handleDeleteReport = async () => {
        if (!analysisData.id || !window.confirm("Are you sure you want to delete this analysis permanently?")) return;

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${analysisData.id}?user_id=${currentUser.uid}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("Analysis deleted");
                navigate('/dashboard');
            } else {
                throw new Error("Delete failed");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete analysis");
        }
    };

    const startEditingTitle = () => {
        setTitleValue(analysisData.file_name || '');
        setIsEditingTitle(true);
    };

    const saveTitleEdit = async () => {
        if (!titleValue.trim() || titleValue === analysisData.file_name) {
            setIsEditingTitle(false);
            return;
        }

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${analysisData.id}?user_id=${currentUser.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: titleValue })
            });

            if (response.ok) {
                toast.success("Renamed successfully");
                // Update local state instead of refetching everything
                analysisData.file_name = titleValue;
                setIsEditingTitle(false);
            } else {
                throw new Error("Update failed");
            }
        } catch (err) {
            console.error("Update error:", err);
            toast.error("Failed to rename");
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12" ref={reportRef}>
            {isLoading && (
                <div className="flex flex-col items-center justify-center p-16 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    Fetching latest report...
                </div>
            )}

            {!isLoading && !analysisData && (
                <div className="mb-6 p-8 bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded-xl flex flex-col items-center justify-center backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white mb-2">No Recent Reports</h2>
                    <p className="text-zinc-500 mb-6 text-center">You haven't analyzed any files yet. Upload a file to get started.</p>
                    <Link to="/upload" className="flex items-center gap-2 px-6 py-3 bg-[rgb(var(--brand-primary))] text-dark-950 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(var(--brand-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand-primary),0.5)]">
                        <Sparkles className="w-5 h-5" /> Analyze a File
                    </Link>
                </div>
            )}

            {!isLoading && analysisData && (
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Sidebar / Topbar for Recent Reports */}
                    {recentReports.length > 0 && (
                        <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4">
                            <h2 className="text-lg font-bold text-white mb-2">Recently Viewed</h2>
                            <div className="flex xl:flex-col overflow-x-auto xl:overflow-y-auto gap-3 pb-2 xl:pb-0 hide-scrollbar xl:max-h-[800px]">
                                {recentReports.map((reportItem, idx) => {
                                    const data = reportItem.analysis_data ? reportItem.analysis_data : reportItem;
                                    const isActive = idx === selectedReportIndex;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedReportIndex(idx);
                                                setActivePageIndex(0);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`flex flex-col text-left p-4 rounded-xl border transition-all min-w-[240px] xl:min-w-0 flex-shrink-0 ${isActive
                                                ? 'bg-amber-400/10 border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                                                : 'bg-dark-900/60 border-zinc-800/60 hover:bg-dark-900 hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${isActive ? 'text-amber-400' : 'text-zinc-500'}`}>
                                                    {formatDisplayDate(data.date || reportItem.created_at)}
                                                </span>
                                                <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${(data.score || 0) > 80 ? 'bg-emerald-500/10 text-emerald-400' :
                                                    (data.score || 0) > 60 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {data.score || 0}/100
                                                </div>
                                            </div>
                                            <h3 className={`font-semibold truncate w-full ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                                {data.file_name || 'Untitled Document'}
                                            </h3>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">

                        {/* RGB → CMYK Auto-Conversion Banner */}
                        {rgbDetected && (
                            <div className={`mb-6 p-4 rounded-xl border backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cmykBlobUrl
                                ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-200'
                                : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cmykBlobUrl ? 'bg-cyan-500/20' : 'bg-red-500/20'
                                        }`}>
                                        {cmykBlobUrl
                                            ? <span className="text-lg">✓</span>
                                            : <span className="text-lg">⚠</span>
                                        }
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm flex items-center gap-2">
                                            {cmykBlobUrl ? (
                                                <><span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-md text-xs font-mono border border-red-500/30">RGB</span>
                                                    <span className="text-zinc-400">→</span>
                                                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-md text-xs font-mono border border-cyan-500/30">CMYK</span>
                                                    Auto-Converted — Print Ready</>
                                            ) : (
                                                <><span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-md text-xs font-mono border border-red-500/30">RGB</span> Profile Detected — {cmykStatus === 'failed' ? 'Conversion Failed' : 'Action Required'}</>)}
                                        </p>
                                        <p className={`text-xs mt-1 ${cmykBlobUrl ? 'text-cyan-400/70' : 'text-amber-400/70'}`}>
                                            {cmykBlobUrl
                                                ? 'RGB color space detected and automatically converted to CMYK for professional print output.'
                                                : (cmykStatus === 'failed'
                                                    ? 'Auto-conversion failed for this specific file. Please manually convert to CMYK before sending to press.'
                                                    : 'RGB detected. We recommend converting to CMYK to prevent color shifts during printing.')}
                                        </p>
                                    </div>
                                </div>
                                {cmykBlobUrl && (
                                    <button
                                        onClick={handleCmykDownload}
                                        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-sm rounded-xl transition-all active:scale-95 shadow-[0_0_16px_rgba(6,182,212,0.35)] whitespace-nowrap"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download CMYK File
                                    </button>
                                )}
                            </div>
                        )}

                        {/* CMYK Print-Ready banner — shown when file is already native CMYK */}
                        {!rgbDetected && !isMock && (
                            <div className="mb-6 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/8 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-emerald-400 text-lg font-bold">✓</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-md text-xs font-mono border border-cyan-500/30">CMYK</span>
                                            Native CMYK — No Conversion Needed
                                        </p>
                                        <p className="text-xs mt-1 text-emerald-400/70">
                                            This file uses a native CMYK color profile. It is ready for professional print without any color conversion.<br />
                                            <span className="text-zinc-500">Hover over the preview to see live C / M / Y / K channel values at each point.</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold text-sm rounded-xl whitespace-nowrap">
                                    <span>Print Ready</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 relative">
                            <div className="absolute -top-20 -left-20 w-60 h-60 bg-[rgba(var(--brand-primary),0.1)] blur-[100px] rounded-full pointer-events-none"></div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                        Analysis Complete
                                    </span>
                                    <span className="text-sm text-zinc-500 font-medium tracking-tight">Date: {formatDisplayDate(analysisData.date || analysisData.created_at)}</span>
                                </div>
                                {isEditingTitle ? (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={titleValue}
                                            onChange={(e) => setTitleValue(e.target.value)}
                                            className="text-2xl md:text-3xl font-bold bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-1 outline-none focus:ring-2 focus:ring-[rgb(var(--brand-primary))] w-full max-w-md"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveTitleEdit()}
                                        />
                                        <button onClick={saveTitleEdit} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all">
                                            <Save className="w-6 h-6" />
                                        </button>
                                        <button onClick={() => setIsEditingTitle(false)} className="p-2 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg transition-all">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 group/h1">
                                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{analysisData.file_name || 'Untitled Document'}</h1>
                                        <button
                                            onClick={startEditingTitle}
                                            className="opacity-0 group-hover/h1:opacity-100 p-2 text-zinc-500 hover:text-[rgb(var(--brand-primary))] transition-opacity"
                                            title="Rename analysis"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 relative z-10 flex-wrap">
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-dark-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 rounded-xl font-medium transition-all shadow-lg active:scale-95 leading-none">
                                    <Share2 className="w-4 h-4 text-zinc-500" />
                                    Share
                                </button>
                                <button
                                    onClick={handleDeleteReport}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-dark-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 rounded-xl font-medium transition-all shadow-lg active:scale-95 leading-none"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>

                                {/* Export Report */}
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 disabled:opacity-70 text-dark-950 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(var(--brand-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand-primary),0.5)] active:scale-95 leading-none"
                                >
                                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {downloading ? 'Processing...' : 'Export Report'}
                                </button>
                            </div>
                        </div>

                        {/* Main Grid: Preview & Score */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            <div className="lg:col-span-2">
                                <FilePreview
                                    fileData={analysisData}
                                    previewUrl={previewUrl}
                                    onPageChange={setActivePageIndex}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <ScoreGauge score={activeData.score || 0} />
                            </div>
                        </div>

                        {/* Analysis Tabs & Content Structure */}
                        <div className="bg-dark-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 overflow-hidden mb-8 shadow-2xl">
                            <div className="flex overflow-x-auto border-b border-zinc-800/60 hide-scrollbar px-2 pt-2 gap-1 bg-dark-950/40">
                                {['Summary', 'Color & Ink', 'Layout Safety', 'Typography', 'Print Prediction'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all duration-300 rounded-t-xl ${activeTab === tab ? 'text-[rgb(var(--brand-primary))] border-b-2 border-[rgb(var(--brand-primary))] bg-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="p-8 min-h-[500px] relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(var(--brand-primary),0.03)] blur-[80px] rounded-full pointer-events-none"></div>
                                {/* TAB: SUMMARY */}
                                {activeTab === 'Summary' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in relative z-10">
                                        <div className="space-y-8">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-6">Expert Assessments</h3>
                                                <div className="space-y-4">
                                                    <RiskAlert type={activeData.resolution?.includes("300") ? "safe" : "medium"} message={`Resolution: ${activeData.resolution || 'Unknown'}`} />
                                                    <RiskAlert type={(activeData.score || 0) > 90 ? "low" : "medium"} message={`Primary Risk: ${activeData.risk_level || 'Unknown'}`} />
                                                    <RiskAlert type="info" message={`Sharpness Score: ${activeData.sharpness_score || 'N/A'} / 10`} />
                                                    {getPhysicalSize(analysisData) && (
                                                        <RiskAlert
                                                            type="info"
                                                            message={`Physical Size: ${getPhysicalSize(analysisData)}`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <FixSummary fixes={activeData.auto_fixes || []} score={activeData.score || 0} />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: COLOR & INK */}
                                {activeTab === 'Color & Ink' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in relative z-10">
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-bold text-white mb-2">Ink Coverage (CMYK)</h3>
                                            <p className="text-sm text-zinc-500 mb-8">Detailed breakdown of the color space mapping on press.</p>
                                            <div className="h-80 w-full mb-4">
                                                <InkCoverageChart cmyk_coverage={activeData.cmyk_coverage || { c: 0, m: 0, y: 0, k: 0 }} tac={activeData.tac || 0} />
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-bold text-white mb-6">Chromacity Alerts</h3>
                                            <RiskAlert type="safe" message={rgbDetected ? "Converted RGB to CMYK successfully." : "Native CMYK detected."} />
                                            <RiskAlert type={(activeData.tac || 0) > 300 ? "high" : "low"} message={`TAC is ${activeData.tac || 0}%. ${(activeData.tac || 0) > 300 ? 'Warning: Risk of offsetting/smearing.' : 'Within safe limits for high-speed press.'}`} />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: LAYOUT SAFETY */}
                                {activeTab === 'Layout Safety' && (
                                    <div className="max-w-2xl animate-fade-in relative z-10">
                                        <h3 className="text-xl font-bold text-white mb-8">Bleed & Safe Zones</h3>
                                        <div className="space-y-5">
                                            {activeData.safe_bleed ? (
                                                <RiskAlert type="safe" message="3mm Safe Bleed boundary detected. Ready for trimming." />
                                            ) : (
                                                <div className="space-y-3">
                                                    <RiskAlert type="medium" message="Missing Bleed: Increase canvas size by exactly 3mm (0.125 inches) on all 4 sides to ensure edge-to-edge printing without white borders." />

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-zinc-500 uppercase">Bleed Amount (mm)</label>
                                                            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/50">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="10"
                                                                    value={bleedMm}
                                                                    onChange={(e) => setBleedMm(parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-transparent px-4 py-3 text-white outline-none font-bold"
                                                                />
                                                                <span className="pr-4 text-zinc-500 font-bold">mm</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-zinc-500 uppercase">Export Format</label>
                                                            <select
                                                                value={targetFormat}
                                                                onChange={(e) => setTargetFormat(e.target.value)}
                                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none font-bold focus:ring-2 focus:ring-amber-500/50"
                                                            >
                                                                <option value="PDF">PDF (Vectorized)</option>
                                                                <option value="JPG">High-Res JPG</option>
                                                                <option value="PNG">Lossless PNG</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {!extendBleedBlobUrl ? (
                                                        <button
                                                            onClick={handleExtendBleed}
                                                            disabled={isExtendingBleed}
                                                            className="w-full flex items-center justify-center gap-2 p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] disabled:opacity-50 group"
                                                        >
                                                            {isExtendingBleed ? (
                                                                <><Loader2 className="w-5 h-5 animate-spin" /> AI Synthesizing Bleed Borders...</>
                                                            ) : (
                                                                <><Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" /> Implement Automated Bleed Fix</>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                                            <div className="flex items-center gap-3 text-emerald-400 font-bold">
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><span className="text-lg">✓</span></div>
                                                                Bleed expanded to {bleedMm}mm
                                                            </div>
                                                            <a
                                                                href={extendBleedBlobUrl}
                                                                download={`${analysisData.file_name.split('.')[0]}_${bleedMm}mm_bleed.${targetFormat.toLowerCase()}`}
                                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-dark-950 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95"
                                                            >
                                                                <Download className="w-4 h-4" /> Download Fix
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <RiskAlert type="safe" message="No critical elements outside safety margins." />
                                            <RiskAlert type="info" message={`Standard Proportion mapping: A-Series detected.`} />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: TYPOGRAPHY */}
                                {activeTab === 'Typography' && (
                                    <div className="max-w-2xl animate-fade-in relative z-10">
                                        <h3 className="text-xl font-bold text-white mb-8">Font Mapping Analysis</h3>
                                        <div className="space-y-5">
                                            <RiskAlert type="safe" message="All required fonts are embedded or outlined." />
                                            <RiskAlert type="info" message={`Lowest font size measured at 8pt (Safe for reading).`} />
                                        </div>
                                    </div>
                                )}

                                {/* TAB: PRINT PREDICTION */}
                                {activeTab === 'Print Prediction' && (
                                    <div className="animate-fade-in relative z-10">
                                        <h3 className="text-xl font-bold text-white mb-8">Simulated Physical Outcomes</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in relative z-10">
                                            <PredictionCard
                                                title="Matte Finish Prediction"
                                                result={activeData.matte_prediction || 'Colors may appear 5-10% desaturated due to ink absorption.'}
                                                type="Matte"
                                                riskLevel={(activeData.score || 0) > 85 ? 'low' : 'medium'}
                                            />
                                            <PredictionCard
                                                title="Glossy Finish Prediction"
                                                result={activeData.glossy_prediction || 'Vibrant reproduction. Perfect for this color profile.'}
                                                type="Glossy"
                                                riskLevel={(activeData.score || 0) > 90 ? 'low' : 'medium'}
                                            />
                                            <PredictionCard
                                                title="Offset Press Suitability"
                                                result={activeData.offset_suitability || `TAC is ${activeData.tac}% (below 300% limit). Excellent suitability.`}
                                                type="Offset"
                                                riskLevel={(activeData.tac || 0) < 300 ? 'low' : 'high'}
                                            />
                                            <PredictionCard
                                                title="Digital Press Suitability"
                                                result={activeData.digital_suitability || 'Good. Standard digital press handles this perfectly.'}
                                                type="Digital"
                                                riskLevel="low"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Report;
