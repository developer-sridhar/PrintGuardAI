import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ArrowLeft, Clock, Search, Trash2, CheckCircle, AlertTriangle, Info, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Notifications = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications?fetch_all=true&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching notifications page data:", err);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }, [currentUser, apiBase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const filteredNotifications = notifications.filter(n =>
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        if (currentUser) {
            try {
                await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/${id}/read`, {
                    method: 'PATCH'
                });
            } catch (err) {
                console.error("Error marking read:", err);
            }
        }
    };

    const markAllAsRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        if (currentUser) {
            try {
                await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/read-all`, {
                    method: 'POST'
                });
                toast.success("All notifications marked as read");
            } catch (err) {
                console.error("Error marking all read:", err);
            }
        }
    };

    const deleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        setNotifications(notifications.filter(n => n.id !== id));
        if (currentUser) {
            try {
                await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/${id}`, {
                    method: 'DELETE'
                });
                toast.success("Notification removed");
            } catch (err) {
                console.error("Error deleting notification:", err);
            }
        }
    };

    const clearAll = async () => {
        if (window.confirm('Are you sure you want to clear all notifications?')) {
            setNotifications([]);
            if (currentUser) {
                try {
                    await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications`, {
                        method: 'DELETE'
                    });
                    toast.success("Notification history cleared");
                } catch (err) {
                    console.error("Error clearing notifications:", err);
                }
            }
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.read) {
            markAsRead(notif.id);
        }
        if (notif.job_id || notif.file_name) {
            navigate('/report', {
                state: {
                    reportData: notif.analysis_data || {
                        file_name: notif.file_name || 'Design File',
                        score: notif.score || 85,
                        job_id: notif.job_id
                    }
                }
            });
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'danger': return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'info': return <Info className="w-5 h-5 text-cyan-400" />;
            default: return <Bell className="w-5 h-5 text-zinc-400" />;
        }
    };

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return 'Recent';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-xs bg-[rgba(var(--brand-primary),0.15)] text-[rgb(var(--brand-primary))] border border-[rgba(var(--brand-primary),0.3)] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    {unreadCount} unread
                                </span>
                            )}
                        </h1>
                        <p className="text-zinc-400 text-sm sm:text-base mt-0.5">History and logs of your print analyses and account alerts</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find notifications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2.5 text-sm border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary),0.3)] focus:border-[rgb(var(--brand-primary))] w-full bg-zinc-900/60 text-white transition-all shadow-sm"
                        />
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="p-2.5 text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
                            title="Mark all as read"
                        >
                            <Check className="w-4 h-4 text-[rgb(var(--brand-primary))]" />
                            <span className="hidden sm:inline">Mark All Read</span>
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="p-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl border border-zinc-800 hover:border-red-900/50 transition-all"
                            title="Clear All"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-dark-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-zinc-800/80 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-2 border-[rgb(var(--brand-primary))] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-zinc-400 text-sm">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="divide-y divide-zinc-800/60">
                        {filteredNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 sm:p-5 hover:bg-zinc-800/40 transition-all cursor-pointer group flex gap-4 relative ${!notif.read ? 'bg-[rgba(var(--brand-primary),0.03)]' : ''}`}
                            >
                                {!notif.read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[rgb(var(--brand-primary))] shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"></div>
                                )}
                                <div className="shrink-0 mt-1">
                                    <div className={`p-2.5 rounded-xl border ${!notif.read ? 'bg-dark-950 border-zinc-700' : 'bg-dark-950/50 border-zinc-800'}`}>
                                        {getTypeIcon(notif.type)}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className={`text-base mb-1 ${!notif.read ? 'font-bold text-white' : 'font-semibold text-zinc-300'}`}>
                                                {notif.title}
                                            </h3>
                                            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                                                {notif.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            {!notif.read && (
                                                <button
                                                    onClick={(e) => markAsRead(notif.id, e)}
                                                    className="p-1.5 text-zinc-400 hover:text-[rgb(var(--brand-primary))] hover:bg-zinc-800 rounded-lg transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => deleteNotification(notif.id, e)}
                                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete notification"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDateDisplay(notif.created_at || notif.date || notif.time)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-dark-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4 transform rotate-6">
                            <Bell className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">All caught up!</h3>
                        <p className="text-zinc-500 text-sm max-w-[260px] mx-auto">
                            {searchTerm ? `No notifications found matching "${searchTerm}"` : "You don't have any notifications right now."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
