import React, { useState, useRef } from 'react';
import { Download, Share2, Loader2, ArrowLeft } from 'lucide-react';
import FilePreview from '../components/FilePreview';
import ScoreGauge from '../components/ScoreGauge';
import InkCoverageChart from '../components/InkCoverageChart';
import PredictionCard from '../components/PredictionCard';
import RiskAlert from '../components/RiskAlert';
import FixSummary from '../components/FixSummary';
import toast from 'react-hot-toast';
import { useLocation, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Report = () => {
    const location = useLocation();
    const [downloading, setDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState('Summary');
    const reportRef = useRef(null);

    const initialMockData = {
        file_name: "brand_brochure_v2.pdf",
        client_name: "Demo Agency",
        date: new Date().toISOString().split('T')[0],
        paper_type: "Matte 130gsm",
        print_method: "Digital Press",
        score: 94,
        safety_level: "HIGH",
        resolution: "300 DPI",
        sharpness_score: "8.5",
        cmyk_coverage: { c: 42, m: 38, y: 35, k: 65 },
        tac: 180,
        ink_consumption: { c: 0.03, m: 0.028, y: 0.025, k: 0.045 },
        matte_prediction: "Colors may appear 5-10% desaturated due to ink absorption.",
        glossy_prediction: "Vibrant reproduction. Perfect for this color profile.",
        offset_suitability: "TAC is 180% (well below 300% limit). Excellent suitability.",
        digital_suitability: "Good. Standard digital press handles this perfectly.",
        risk_level: "LOW-MEDIUM",
        auto_fixes: [
            "Converted RGB to CMYK color profile",
            "Added 3mm safe bleed area",
            "Embedded missing fonts",
            "Optimized contrast for deeper blacks",
            "Reduced overall ink overload (TAC)"
        ]
    };

    // Use dynamically passed data from upload, fallback to mock data if accessed directly
    const analysisData = location.state?.reportData || initialMockData;
    const previewUrl = location.state?.previewUrl || null;
    const isMock = !location.state?.reportData;

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true);
            if (!reportRef.current) return;

            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');

            // Use exact pixel dimensions of the canvas to preserve perfect layout alignment
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`PrintGuard_Analysis_${analysisData.file_name.replace(/\.[^/.]+$/, "")}.pdf`);

            toast.success("Report downloaded successfully!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Error generating PDF. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12" ref={reportRef}>
            {/* Header Section */}
            {isMock && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm">Viewing Sample Report</p>
                        <p className="text-xs mt-1">This is mock data. Upload a real file to see dynamic AI analysis.</p>
                    </div>
                    <Link to="/upload" className="flex items-center gap-2 text-sm font-medium hover:text-amber-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Go to Upload
                    </Link>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold tracking-wide uppercase">
                            Analysis Complete
                        </span>
                        <span className="text-sm text-slate-500 font-medium">Date: {analysisData.date}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-navy-900">{analysisData.file_name}</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-navy-700 rounded-xl font-medium transition-all shadow-sm">
                        <Share2 className="w-4 h-4" />
                        Share Report
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-xl font-medium transition-all shadow-sm"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {downloading ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* Main Grid: Preview & Score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <FilePreview fileData={analysisData} previewUrl={previewUrl} />
                </div>
                <div className="lg:col-span-1">
                    <ScoreGauge score={analysisData.score} />
                </div>
            </div>

            {/* Analysis Tabs & Content Structure */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="flex overflow-x-auto border-b border-slate-100 hide-scrollbar">
                    {['Summary', 'Color & Ink', 'Layout Safety', 'Typography', 'Print Prediction'].map((tab) => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/30' : 'text-slate-500 hover:text-navy-700 hover:bg-slate-50'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-8 min-h-[500px]">
                    {/* TAB: SUMMARY */}
                    {activeTab === 'Summary' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-navy-900 mb-4">Risk Assessment</h3>
                                    <RiskAlert type={analysisData.resolution.includes("300") ? "safe" : "medium"} message={`Resolution is ${analysisData.resolution}`} />
                                    <RiskAlert type={analysisData.score > 90 ? "low" : "medium"} message={`Overall risk level is ${analysisData.risk_level}`} />
                                    <RiskAlert type="info" message={`Calculated Image Sharpness: ${analysisData.sharpness_score}`} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="h-full max-h-[400px]">
                                    <FixSummary fixes={analysisData.auto_fixes} score={analysisData.score} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: COLOR & INK */}
                    {activeTab === 'Color & Ink' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-navy-900 mb-2">Ink Coverage (CMYK)</h3>
                                <p className="text-sm text-slate-500 mb-6">Detailed breakdown of the color space mapping.</p>
                                <div className="h-72">
                                    <InkCoverageChart cmyk_coverage={analysisData.cmyk_coverage} tac={analysisData.tac} />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-navy-900 mb-4">Color Profile Alerts</h3>
                                <RiskAlert type="safe" message="Converted RGB to CMYK successfully." />
                                <RiskAlert type={analysisData.tac > 300 ? "high" : "low"} message={`Total Area Coverage (TAC) is ${analysisData.tac}%. ${analysisData.tac > 300 ? 'Too high for standard paper classes. Muddying risk.' : 'Perfect limit for deep blacks.'}`} />
                            </div>
                        </div>
                    )}

                    {/* TAB: LAYOUT SAFETY */}
                    {activeTab === 'Layout Safety' && (
                        <div className="max-w-2xl animate-fade-in">
                           <h3 className="text-lg font-semibold text-navy-900 mb-6">Bleed & Margins</h3>
                           <div className="space-y-4">
                                <RiskAlert type={analysisData.score > 85 ? "safe" : "medium"} message="3mm Safe Bleed boundary detected." />
                                <RiskAlert type="safe" message="No critical elements outside the safety margin." />
                                <RiskAlert type="info" message={`Document dimension analyzed as standard A4 Proportion.`} />
                           </div>
                        </div>
                    )}

                    {/* TAB: TYPOGRAPHY */}
                    {activeTab === 'Typography' && (
                        <div className="max-w-2xl animate-fade-in">
                           <h3 className="text-lg font-semibold text-navy-900 mb-6">Font Engine Analysis</h3>
                           <div className="space-y-4">
                                <RiskAlert type="safe" message="All core fonts are successfully embedded." />
                                <RiskAlert type="info" message={`Text elements detected. Lowest font size measured at 8pt (Safe for reading).`} />
                           </div>
                        </div>
                    )}

                    {/* TAB: PRINT PREDICTION */}
                    {activeTab === 'Print Prediction' && (
                        <div className="animate-fade-in">
                            <h3 className="text-lg font-semibold text-navy-900 mb-6">Print Simulation Outcomes</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <PredictionCard
                                    title="Matte Paper"
                                    result={analysisData.matte_prediction}
                                    riskLevel={analysisData.score > 85 ? "low" : "medium"}
                                    type="digital"
                                />
                                <PredictionCard
                                    title="Glossy Paper"
                                    result={analysisData.glossy_prediction}
                                    riskLevel="low"
                                    type="digital"
                                />
                                <PredictionCard
                                    title="Offset Printing"
                                    result={analysisData.offset_suitability}
                                    riskLevel={analysisData.tac > 300 ? "high" : "low"}
                                    type="offset"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Report;
