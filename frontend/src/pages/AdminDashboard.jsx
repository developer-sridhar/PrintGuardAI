import React, { useState, useEffect } from 'react';
import { Users, Activity, CreditCard, ShieldAlert, Search, Filter, Trash2, Check, X, Eye, Mail, Phone, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const { isSuperAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_users: '0',
        active_pro_subs: '0',
        ai_jobs_processed: '0',
        system_alerts: '0'
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('users');

    const fetchAdminData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // 1. Fetch Stats
            try {
                const statsRes = await fetch(`${apiBase}/api/admin/stats`);
                if (statsRes.ok) setStats(await statsRes.json());
            } catch (e) { console.error("Stats fetch failed:", e); }

            // 2. Fetch Users (Unified Firebase + Supabase)
            const usersRes = await fetch(`${apiBase}/api/admin/users/all`);
            if (usersRes.ok) {
                const fetchedUsers = await usersRes.json();
                const mappedUsers = fetchedUsers.map(data => ({
                    id: data.uid || data.id,
                    name: data.name || data.email?.split('@')[0] || 'Unknown User',
                    email: data.email || 'No email',
                    phone: data.phone || '',
                    plan: data.plan || 'Free',
                    status: data.status || 'Active',
                    role: data.role || 'User',
                    provider: data.provider || 'Email',
                    in_supabase: data.in_supabase,
                    joined: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Just now'
                }));
                setUsersList(mappedUsers || []);
            }

            // 3. Fetch Jobs
            try {
                const jobsRes = await fetch(`${apiBase}/api/admin/jobs`);
                if (jobsRes.ok) setJobs(await jobsRes.json());
            } catch (e) { console.error("Jobs fetch failed:", e); }

            // 4. Fetch Logs
            try {
                const logsRes = await fetch(`${apiBase}/api/admin/logs`);
                if (logsRes.ok) setLogs(await logsRes.json());
            } catch (e) { console.error("Logs fetch failed:", e); }

        } catch (error) {
            console.error("fetchAdminData critical error:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        
        // Realtime Polling (Every 30 seconds for unified data)
        const pollInterval = setInterval(() => fetchAdminData(true), 30000);

        // Supabase Realtime Subscriptions
        const adminChannel = supabase
            .channel('admin-realtime-all')
            // Listen for user profile changes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAdminData(true))
            // Listen for NEW reports (Live Analysis Queue)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
                setJobs(prev => [payload.new, ...prev].slice(0, 50));
                setStats(prev => ({ ...prev, ai_jobs_processed: (parseInt(prev.ai_jobs_processed) + 1).toString() }));
                toast.success(`New analysis: ${payload.new.file_name}`, { icon: '🚀' });
            })
            .subscribe();

        return () => { 
            clearInterval(pollInterval);
            supabase.removeChannel(adminChannel); 
        };
    }, []);

    const handleSyncUser = async (user) => {
        const tId = toast.loading("Syncing Firebase identity...");
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/admin/users/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.id })
            });
            if (res.ok) {
                toast.success("User successfully synced to Database", { id: tId });
                fetchAdminData(true);
            } else {
                toast.error("Sync failed", { id: tId });
            }
        } catch (err) {
            toast.error("Network error during sync", { id: tId });
        }
    };

    const handleDeleteUser = async (user) => {
        if (user.email === 'admin@printguard.ai') return toast.error("Super Admin cannot be deleted.");
        if (!isSuperAdmin && user.role === 'Admin') return toast.error("Only Super Admin can delete other Admins.");
        if (!window.confirm(`Delete user "${user.name}"? This will remove them from Firebase and Database.`)) return;

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/user/${user.id}`, { method: 'DELETE' });
            if (res.ok) { toast.success("User deleted permanently"); fetchAdminData(true); }
        } catch (err) { toast.error("Delete failed"); }
    };

    const handleToggleRole = async (user) => {
        if (user.email === 'admin@printguard.ai') return toast.error("Super Admin role is immutable.");
        if (!isSuperAdmin) return toast.error("Only Super Admin can modify roles.");
        const newRole = user.role === 'Admin' ? 'User' : 'Admin';
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/admin/user/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) { toast.success(`User promoted to ${newRole}`); fetchAdminData(true); }
        } catch (err) { toast.error("Update failed"); }
    };

    const handleUpdateStatus = async (user) => {
        const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/admin/user/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) { toast.success(`User ${newStatus}`); fetchAdminData(true); }
        } catch (err) { toast.error("Status update failed"); }
    };

    const handleViewUser = async (user) => {
        setSelectedUser(user);
        setStatsLoading(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiBase}/api/user/${user.id}/stats`);
            if (res.ok) setUserStats(await res.json());
        } catch (error) { console.error("User stats failed:", error); }
        finally { setStatsLoading(false); }
    };

    const filteredUsers = usersList.filter(u => {
        const userName = u.name || '';
        const userEmail = u.email || '';
        const matches = (userName + userEmail).toLowerCase().includes(searchTerm.toLowerCase());
        if (u.email === 'admin@printguard.ai') return false;
        if (isSuperAdmin) return matches;
        return matches && u.role === 'User';
    });

    const systemStats = [
        { label: "Total Users", value: stats.total_users, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Pro Subs", value: stats.active_pro_subs, icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "AI Jobs", value: stats.ai_jobs_processed, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        { label: "Alerts", value: stats.system_alerts, icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" }
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        Platform Administration
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                        </div>
                    </h1>
                    <p className="text-zinc-400 text-sm">System oversight and real-time user management.</p>
                </div>
                <button onClick={() => fetchAdminData()} className="p-2 bg-dark-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
                    <Activity size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {systemStats.map((stat, i) => (
                    <div key={i} className="bg-dark-900/60 p-5 rounded-2xl border border-zinc-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon size={48} />
                        </div>
                        <div className={`p-2.5 w-fit mb-3 rounded-lg ${stat.bg} ${stat.color} border ${stat.border}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-white">{stat.value}</h3>
                        <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-dark-950 p-1 rounded-xl border border-zinc-800 w-fit">
                {['users', 'jobs', 'logs'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-amber-400 text-dark-950 shadow-lg shadow-amber-400/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        {tab === 'users' ? 'User Management' : tab === 'jobs' ? 'Analysis Queue' : 'Activity Logs'}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            {activeTab === 'users' && (
                <div className="bg-dark-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-dark-950/20">
                        <h3 className="text-sm font-bold text-white">Platform Roster</h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 text-xs bg-dark-950 border border-zinc-800 rounded-lg text-zinc-300 outline-none focus:border-amber-500/50 transition-all font-medium" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-dark-950 text-zinc-500 uppercase tracking-tighter font-extrabold text-[9px]">
                                <tr>
                                    <th className="px-6 py-4">Identity</th>
                                    <th className="px-6 py-4">Security / Status</th>
                                    <th className="px-6 py-4">Tier</th>
                                    <th className="px-6 py-4 text-right">Administrative Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading && usersList.length === 0 ? <tr><td colSpan="4" className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-zinc-500 font-bold italic">Synchronizing Global Roster...</p>
                                    </div>
                                </td></tr> :
                                 filteredUsers.length === 0 ? <tr><td colSpan="4" className="p-16 text-center text-zinc-500 font-bold">No users matches your search criteria</td></tr> :
                                 filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-dark-950 flex items-center justify-center text-amber-400 font-bold border border-zinc-800 shrink-0 capitalize shadow-inner">
                                                    {(u.name || u.email || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white flex items-center gap-2">
                                                        {u.name}
                                                        {!u.in_supabase && (
                                                            <button onClick={() => handleSyncUser(u)} className="text-[7px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-black hover:bg-amber-400 hover:text-dark-950 transition-colors flex items-center gap-1 group/sync">
                                                                <Sparkles size={8} className="group-hover/sync:animate-spin" />
                                                                Sync to DB
                                                            </button>
                                                        )}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-zinc-500 font-medium">{u.email}</span>
                                                        <span className="px-1 bg-zinc-800 text-[8px] rounded border border-zinc-700 text-zinc-400 font-black tracking-widest">{u.provider}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleUpdateStatus(u)} className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all hover:scale-105 ${u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {u.status.toUpperCase()}
                                                </button>
                                                <button onClick={() => handleToggleRole(u)} className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all hover:scale-105 ${u.role === 'Admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-lg shadow-purple-500/5' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {u.role.toUpperCase()}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-white text-[10px] tracking-tight">{u.plan.toUpperCase()}</span>
                                                <span className="text-zinc-600 text-[8px] font-bold">Member since {u.joined}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button onClick={() => handleViewUser(u)} title="View Analytics" className="p-2 bg-zinc-800/50 hover:bg-amber-400 hover:text-dark-950 rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 border border-zinc-700/50">
                                                    <Eye size={14}/>
                                                </button>
                                                <button onClick={() => handleDeleteUser(u)} title="Terminate Account" className="p-2 bg-zinc-800/50 hover:bg-red-500 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 border border-zinc-700/50 group-hover:border-red-500/20">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && (
                <div className="bg-dark-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-dark-950/20">
                        <h3 className="text-sm font-bold text-white">Analysis Queue</h3>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Watching Live</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-dark-950 text-zinc-500 uppercase tracking-tighter font-extrabold text-[9px]">
                                <tr>
                                    <th className="px-6 py-4">Job ID / File</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50 text-white">
                                {jobs.length === 0 ? <tr><td colSpan="4" className="p-10 text-center text-zinc-500 italic">No recent analysis jobs detected</td></tr> :
                                 jobs.map((job, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 font-mono font-bold text-amber-400">
                                            #{job.id.slice(0, 8)}...
                                            <p className="text-zinc-500 font-sans text-[10px] mt-0.5">{job.file_name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 font-medium">{job.user_email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black ${job.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : job.status === 'Warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {job.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 font-medium">{new Date(job.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-dark-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl p-4">
                   <div className="space-y-3">
                        {logs.map(log => (
                            <div key={log.id} className="flex gap-4 p-3 bg-dark-950/50 rounded-xl border border-zinc-800/50 hover:border-amber-400/20 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-amber-400/10 transition-colors">
                                    <Activity size={18} className="text-zinc-400 group-hover:text-amber-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-bold text-white">{log.event}</p>
                                        <span className="text-[10px] text-zinc-600 font-bold">• {log.time}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">{log.details}</p>
                                </div>
                            </div>
                        ))}
                   </div>
                </div>
            )}
            
            {/* Modal for User Details */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-dark-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center text-amber-400 text-xl font-bold capitalize">{(selectedUser.name || 'U').charAt(0)}</div>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{selectedUser.name}</h2>
                                    <p className="text-xs text-zinc-500">{selectedUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-dark-950 p-3 rounded-xl border border-zinc-800">
                                <p className="text-[10px] uppercase font-bold text-zinc-500">Account Role</p>
                                <p className="text-white font-bold">{selectedUser.role}</p>
                            </div>
                            <div className="bg-dark-950 p-3 rounded-xl border border-zinc-800">
                                <p className="text-[10px] uppercase font-bold text-zinc-500">Subscription</p>
                                <p className="text-white font-bold">{selectedUser.plan}</p>
                            </div>
                        </div>

                        {statsLoading ? <div className="p-8 text-center animate-pulse text-zinc-500 text-xs">Loading analytics...</div> : 
                         userStats && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase font-bold text-zinc-500">Real-time Usage</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-dark-950/50 p-3 rounded-xl border border-zinc-800 text-center">
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase">Reports</p>
                                        <p className="text-lg font-bold text-white">{userStats.total_files || 0}</p>
                                    </div>
                                    <div className="bg-dark-950/50 p-3 rounded-xl border border-zinc-800 text-center">
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase">Fixes</p>
                                        <p className="text-lg font-bold text-emerald-400">{userStats.total_fixes || 0}</p>
                                    </div>
                                    <div className="bg-dark-950/50 p-3 rounded-xl border border-zinc-800 text-center">
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase">Avg Score</p>
                                        <p className="text-lg font-bold text-amber-400">{userStats.avg_score || 0}%</p>
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
