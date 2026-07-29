import React, { useState, useEffect } from 'react';
import { Layers, FileCheck, Clock, Search, Filter, ArrowRight, AlertTriangle, CheckCircle, UploadCloud, Sparkles, TrendingUp, Trash2, Edit3, Save, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const navigate = useNavigate();
    const { currentUser, isAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Auto-redirect Admins to the Admin Portal
    useEffect(() => {
        if (isAdmin) {
            navigate('/admin');
        }
    }, [isAdmin, navigate]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [realStats, setRealStats] = useState({ total_files: 0, total_fixes: 0, avg_score: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async () => {
        if (!currentUser) return;
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    const dismissNotification = async (notifId) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/${notifId}/read`, { method: 'PATCH' });
            setNotifications(prev => prev.filter(n => n.id !== notifId));
        } catch (err) {
            console.error("Error dismissing notification:", err);
        }
    };

    const fetchHistory = async () => {
        if (!currentUser) return;
        setLoading(true);
        setStatsLoading(true);
        try {
            // Fetch unified history from Backend (merges Supabase & Firebase)
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            
            // Parallel fetch history and stats
            const [histRes, statsRes] = await Promise.all([
                fetch(`${apiBase}/api/history?user_id=${currentUser.uid}&t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
                }),
                fetch(`${apiBase}/api/user/${currentUser.uid}/stats`)
            ]);

            if (!histRes.ok) throw new Error('Failed to fetch unified history');

            const histData = await histRes.json();
            setHistoryData(histData || []);

            if (statsRes.ok) {
                const sData = await statsRes.json();
                setRealStats(sData);
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setHistoryData([]);
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
        await fetchNotifications();
    };

    const totalFiles = realStats.total_files;
    const totalFixes = realStats.total_fixes;
    const avgScore = realStats.avg_score;

    const filteredData = historyData.filter(item => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            item.file_name?.toLowerCase().includes(search) ||
            item.id?.toString().toLowerCase().includes(search)
        );
    });

    const getRiskBadge = (risk) => {
        const r = (risk || '').toUpperCase();
        if (r.includes('LOW')) return (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Low Risk</span>
        );
        if (r.includes('HIGH')) return (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">High Risk</span>
        );
        return (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium Risk</span>
        );
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this analysis?")) return;
        if (!currentUser) {
            import('react-hot-toast').then(m => m.default.error("User not authenticated"));
            return;
        }

        setActionLoading(true);
        console.log(`Deleting analysis ${id} for user ${currentUser.uid}`);

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${id}?user_id=${currentUser.uid}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log("Delete result:", result);

            if (response.ok) {
                import('react-hot-toast').then(m => m.default.success("Analysis deleted successfully"));
                await fetchHistory(); // Refresh with await
            } else {
                const errorMsg = result.detail || "Failed to delete";
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("Delete error:", err);
            import('react-hot-toast').then(m => m.default.error(`Failed to delete: ${err.message}`));
        } finally {
            setActionLoading(false);
        }
    };

    const startEditing = (row) => {
        setEditingId(row.id);
        setEditValue(row.file_name || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValue('');
    };

    const saveEdit = async (id) => {
        if (!editValue.trim()) return;

        setActionLoading(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${id}?user_id=${currentUser.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: editValue })
            });

            if (response.ok) {
                import('react-hot-toast').then(m => m.default.success("Analysis renamed successfully"));
                setEditingId(null);
                fetchHistory(); // Refresh
            } else {
                throw new Error("Failed to update");
            }
        } catch (err) {
            console.error("Update error:", err);
            import('react-hot-toast').then(m => m.default.error("Failed to update analysis"));
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [currentUser]);

    const handleViewReport = (row) => {
        // If it's a supabase row, the full analysis is in the 'analysis_data' jsonb column
        const reportData = row.analysis_data || row;
        navigate('/report', { state: { reportData } });
    };

    const statCards = [
        {
            label: 'Total Files Analyzed', value: totalFiles,
            icon: Layers, color: 'from-[rgba(var(--brand-primary),0.15)] to-[rgba(var(--brand-primary),0.05)]',
            iconColor: 'text-[rgb(var(--brand-primary))]', border: 'border-[rgba(var(--brand-primary),0.2)]'
        },
        {
            label: 'Auto-Fixed Errors', value: totalFixes,
            icon: FileCheck, color: 'from-emerald-500/15 to-emerald-500/5',
            iconColor: 'text-emerald-400', border: 'border-emerald-500/20'
        },
        {
            label: 'Avg. Print Score', value: totalFiles > 0 ? `${avgScore}/100` : '—',
            icon: TrendingUp, color: 'from-blue-500/15 to-blue-500/5',
            iconColor: 'text-blue-400', border: 'border-blue-500/20'
        },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Overview</h1>
                    <p className="text-zinc-400 text-sm">Welcome back, {currentUser?.displayName?.split(' ')[0] || 'User'}! Here's your analysis summary.</p>
                </div>
                <Link
                    to="/upload"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 text-dark-950 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(var(--brand-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand-primary),0.5)] hover:-translate-y-0.5 group text-sm self-stretch sm:self-auto justify-center"
                >
                    <UploadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" /> New Analysis
                </Link>
            </div>


            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="mb-6 space-y-3">
                    {notifications.map(notif => (
                        <div key={notif.id} className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                                <div>
                                    <h4 className="text-white font-bold">{notif.title}</h4>
                                    <p className="text-sm text-emerald-200">{notif.message}</p>
                                </div>
                            </div>
                            <button onClick={() => dismissNotification(notif.id)} className="text-emerald-400 hover:text-emerald-300 p-2">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {statCards.map((card) => (
                    <div key={card.label} className={`relative bg-gradient-to-br ${card.color} p-6 rounded-2xl border ${card.border} overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 blur-2xl -translate-x-4 -translate-y-4 pointer-events-none" />
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-dark-950/50 border ${card.border}`}>
                                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-400">{card.label}</p>
                                <h3 className="text-2xl font-bold text-white">{statsLoading ? '...' : card.value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Analyses Table */}
            <div className="bg-dark-900/60 backdrop-blur-md rounded-2xl border border-zinc-800 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.4)]">
                <div className="p-6 border-b border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[rgb(var(--brand-primary))]" />
                        <h3 className="text-lg font-semibold text-white">Recent Analyses</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary),0.4)] w-full sm:w-56 transition-all"
                            />
                        </div>
                        <button className="p-2 border border-zinc-800 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-zinc-500">
                        <div className="w-8 h-8 border-2 border-[rgb(var(--brand-primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        Loading your analyses...
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="p-16 text-center">
                        {historyData.length === 0 ? (
                            <>
                                <UploadCloud className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-400 font-medium">No analyses yet.</p>
                                <p className="text-zinc-500 text-sm mt-1 mb-6">Upload your first design file to get started.</p>
                                <Link to="/upload" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 text-dark-950 font-bold rounded-xl text-sm shadow-[0_0_20px_rgba(var(--brand-primary),0.3)]">
                                    <UploadCloud className="w-4 h-4" /> Upload Now
                                </Link>
                            </>
                        ) : (
                            <p className="text-zinc-500">No files found matching "{searchTerm}"</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-dark-950/60 text-zinc-500 text-xs uppercase font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Filename</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4">Risk</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredData.map((row, idx) => (
                                    <tr key={row.id || `row-${idx}-${Math.random()}`} className="hover:bg-zinc-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            {editingId === row.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded px-2 py-1 outline-none focus:ring-1 focus:ring-[rgb(var(--brand-primary))]"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEdit(row.id)} className="text-emerald-400 hover:text-emerald-300">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={cancelEditing} className="text-zinc-500 hover:text-zinc-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/title">
                                                    <div className="font-medium text-white truncate max-w-[180px]">{row.file_name || 'Unknown File'}</div>
                                                    <button
                                                        onClick={() => startEditing(row)}
                                                        className="opacity-0 group-hover/title:opacity-100 p-1 text-zinc-500 hover:text-[rgb(var(--brand-primary))] transition-opacity"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="text-xs text-zinc-500 mt-0.5">#{String(row.id || idx).slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-14 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${(row.score || 0) >= 90 ? 'bg-emerald-500' : (row.score || 0) >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${row.score || 0}%` }}
                                                    />
                                                </div>
                                                <span className="font-semibold text-white">{row.score ?? '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getRiskBadge(row.risk_level)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-zinc-300">
                                                {(row.score || 0) > 80
                                                    ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                                    : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                                                <span className="text-sm">{row.status || 'Completed'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewReport(row)}
                                                    className="p-2 text-zinc-500 hover:text-[rgb(var(--brand-primary))] hover:bg-[rgba(var(--brand-primary),0.1)] rounded-lg transition-all"
                                                    title="View Report"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(row.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
