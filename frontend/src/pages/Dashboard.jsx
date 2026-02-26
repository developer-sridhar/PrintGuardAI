import React, { useState } from 'react';
import { Layers, FileCheck, Search, Filter, ArrowRight, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Mock History Data
    const historyData = [
        {
            id: 'PRN-8492',
            file_name: "brand_brochure_v2.pdf",
            date: "2024-03-24",
            score: 94,
            risk_level: "LOW",
            status: "Completed",
            cmyk_coverage: { c: 42, m: 38, y: 35, k: 65 },
            tac: 180,
            resolution: "300 DPI",
            auto_fixes: ["Converted RGB to CMYK", "Added 3mm safe bleed area"]
        },
        {
            id: 'PRN-8491',
            file_name: "packaging_diecut_final.ai",
            date: "2024-03-23",
            score: 82,
            risk_level: "MEDIUM",
            status: "Completed",
            cmyk_coverage: { c: 55, m: 45, y: 40, k: 80 },
            tac: 220,
            resolution: "300 DPI",
            auto_fixes: ["Embedded missing fonts"]
        },
        {
            id: 'PRN-8490',
            file_name: "event_banner_large.psd",
            date: "2024-03-22",
            score: 65,
            risk_level: "HIGH",
            status: "Needs Attention",
            cmyk_coverage: { c: 80, m: 75, y: 70, k: 95 },
            tac: 320,
            resolution: "150 DPI",
            auto_fixes: ["Reduced overall ink overload (TAC)"]
        },
        {
            id: 'PRN-8489',
            file_name: "business_cards_batch.pdf",
            date: "2024-03-21",
            score: 98,
            risk_level: "LOW",
            status: "Completed",
            cmyk_coverage: { c: 20, m: 15, y: 10, k: 100 },
            tac: 145,
            resolution: "300 DPI",
            auto_fixes: []
        },
        {
            id: 'PRN-8488',
            file_name: "magazine_spread_04.pdf",
            date: "2024-03-20",
            score: 88,
            risk_level: "LOW-MEDIUM",
            status: "Completed",
            cmyk_coverage: { c: 60, m: 50, y: 40, k: 70 },
            tac: 220,
            resolution: "300 DPI",
            auto_fixes: ["Optimized contrast for deeper blacks"]
        },
    ];

    // Derived Statistics
    const baseFiles = 137;
    const baseFixes = 84;
    const baseHours = 40;

    const totalFiles = baseFiles + historyData.length;
    const totalFixes = baseFixes + historyData.filter(item => item.auto_fixes.length > 0).length;
    const timeSaved = baseHours + Math.floor(historyData.length * 0.5); // Estimate 30 min saved per AI analysis

    const filteredData = historyData.filter(item =>
        item.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRiskBadge = (risk) => {
        if (risk.includes('LOW')) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Low Risk</span>;
        if (risk.includes('HIGH')) return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">High Risk</span>;
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Medium Risk</span>;
    };

    const handleViewReport = (data) => {
        // Map table data to the full schema Report.jsx expects
        const reportPayload = {
            ...data,
            client_name: "Internal Demo",
            paper_type: "Standard Matte",
            print_method: "Digital Press",
            safety_level: data.score > 85 ? "HIGH" : "MEDIUM",
            sharpness_score: (data.score / 10).toFixed(1),
            ink_consumption: { c: 0.03, m: 0.02, y: 0.02, k: 0.04 },
            matte_prediction: "Simulated matte prediction.",
            glossy_prediction: "Simulated glossy prediction.",
            offset_suitability: "Simulated offset prediction.",
            digital_suitability: "Simulated digital prediction."
        };
        navigate('/report', { state: { reportData: reportPayload } });
    };
    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-navy-900 mb-2">Overview</h1>
                    <p className="text-slate-500">Welcome back! Here's your print analysis summary.</p>
                </div>
                <Link
                    to="/upload"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                >
                    New Analysis
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Files Analyzed</p>
                            <h3 className="text-2xl font-bold text-navy-900">{totalFiles}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Auto-Fixed Errors</p>
                            <h3 className="text-2xl font-bold text-navy-900">{totalFixes}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Time Saved</p>
                            <h3 className="text-2xl font-bold text-navy-900">{timeSaved} hrs</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Files Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-navy-900">Recent Analyses</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-full md:w-64"
                            />
                        </div>
                        <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors tooltip" title="Filter">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Filename</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Risk Profile</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length > 0 ? filteredData.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-navy-900">{row.file_name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{row.id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full max-w-[60px] bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${row.score >= 90 ? 'bg-emerald-500' : row.score >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${row.score}%` }}
                                                ></div>
                                            </div>
                                            <span className="font-medium">{row.score}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getRiskBadge(row.risk_level)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 focus:outline-none">
                                            {row.score > 80 ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            )}
                                            {row.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleViewReport(row)}
                                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                        >
                                            <span className="sr-only">View Report</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        No analyses found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
