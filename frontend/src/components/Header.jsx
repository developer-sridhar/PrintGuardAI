import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Menu, Check, Clock, Search, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const getPageTitle = (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Overview';

    const primaryPath = segments[0].toLowerCase();

    const titles = {
        'dashboard': 'Analytics Dashboard',
        'upload': 'Analyze Design',
        'report': 'Print Quality Report',
        'downloads': 'Archive & Exports',
        'pricing': 'Subscription Plans',
        'settings': 'Account Settings',
        'admin': 'Control Center',
        'notifications': 'All Notifications',
        'archive': 'File History'
    };

    return titles[primaryPath] || 'Overview';
};

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);

        if (diffSeconds < 60) return 'Just now';
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
        if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    } catch {
        return dateStr;
    }
};

const Header = ({ onMenuClick }) => {
    const { currentUser, userPlan } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications?fetch_all=true&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Header notifications fetch error:", err);
        }
    }, [currentUser, apiBase]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Refetch when opening dropdown
    useEffect(() => {
        if (showNotifications) {
            fetchNotifications();
        }
    }, [showNotifications, fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllAsRead = async () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        if (!currentUser) return;
        try {
            await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/read-all`, {
                method: 'POST'
            });
        } catch (err) {
            console.error("Mark all read error:", err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            if (currentUser) {
                try {
                    await fetch(`${apiBase}/api/user/${currentUser.uid}/notifications/${notif.id}/read`, {
                        method: 'PATCH'
                    });
                } catch (err) {
                    console.error("Mark as read error:", err);
                }
            }
        }

        setShowNotifications(false);

        // Navigate to report if notification is linked to an analysis
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

    const title = getPageTitle(location.pathname);

    return (
        <header className="h-20 bg-dark-950/80 backdrop-blur-md border-b border-zinc-800/60 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-50 shrink-0 transition-all duration-300">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2.5 -ml-2 text-zinc-400 hover:text-white lg:hidden rounded-xl hover:bg-zinc-800/50 transition-all border border-transparent hover:border-zinc-700/50"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white hidden lg:block tracking-tight">{title}</h2>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em] hidden lg:block">PrintGuard AI Platform</p>
                </div>
            </div>

            {/* Mobile Title View */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            </div>

            <div className="flex items-center gap-5">
                {/* Search Bar */}
                <div className="hidden md:flex items-center relative group">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 transition-colors group-focus-within:text-[rgb(var(--brand-primary))]" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary),0.3)] focus:border-[rgb(var(--brand-primary))] w-48 lg:w-64 transition-all"
                    />
                </div>

                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2.5 rounded-xl transition-all border ${showNotifications ? 'bg-zinc-800 text-white border-zinc-700 shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border-transparent hover:border-zinc-700/50'}`}
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-dark-950 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 w-auto sm:w-96 bg-dark-900 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 slide-in-from-top-4">

                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-dark-950/40">
                                <h3 className="font-bold text-white text-base flex items-center gap-2">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="bg-[rgba(var(--brand-primary),0.15)] text-[rgb(var(--brand-primary))] text-[10px] py-0.5 px-2 rounded-full border border-[rgba(var(--brand-primary),0.2)] uppercase tracking-wider">{unreadCount} unread</span>
                                    )}
                                </h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                {notifications.length > 0 ? (
                                    <div className="divide-y divide-zinc-800/30">
                                        {notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`p-4 hover:bg-zinc-800/30 transition-all cursor-pointer relative group ${!notif.read ? 'bg-[rgba(var(--brand-primary),0.03)]' : ''}`}
                                            >
                                                {!notif.read && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[rgb(var(--brand-primary))] shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"></div>
                                                )}
                                                <div className="flex gap-4">
                                                    <div className="shrink-0 mt-1">
                                                        <div className={`w-2.5 h-2.5 rounded-full shadow-sm mt-1.5 ${notif.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/50' :
                                                            notif.type === 'warning' ? 'bg-amber-500 shadow-amber-500/50' :
                                                            notif.type === 'danger' ? 'bg-red-500 shadow-red-500/50' :
                                                            'bg-[rgb(var(--brand-primary))] shadow-primary-500/50'
                                                        }`}></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className={`text-sm tracking-tight ${!notif.read ? 'font-bold text-white' : 'font-semibold text-zinc-300'}`}>
                                                                {notif.title}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-medium shrink-0 ml-2">
                                                                <Clock className="w-3 h-3" /> {formatTimeAgo(notif.created_at || notif.time)}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                                                            {notif.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center flex flex-col items-center justify-center">
                                        <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4 transform rotate-6 animate-pulse">
                                            <Bell className="w-7 h-7 text-zinc-600" />
                                        </div>
                                        <p className="text-white font-bold text-base">All Caught Up!</p>
                                        <p className="text-xs text-zinc-500 mt-1 max-w-[200px] mx-auto">No notifications to show right now.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-dark-950/40 border-t border-zinc-800 text-center">
                                <button
                                    onClick={() => {
                                        setShowNotifications(false);
                                        navigate('/notifications');
                                    }}
                                    className="text-xs text-zinc-400 hover:text-white font-bold transition-all w-full py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 shadow-sm"
                                >
                                    View All Notifications
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Link */}
                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-3 p-1 pr-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all group"
                >
                    <div className="w-9 h-9 rounded-lg overflow-hidden border border-zinc-700 shadow-inner group-hover:border-[rgb(var(--brand-primary))] transition-colors">
                        <img src={`https://ui-avatars.com/api/?name=${currentUser?.displayName || currentUser?.email || 'User'}&background=c2410c&color=fff&bold=true`} alt="User avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="hidden sm:flex flex-col items-start translate-y-[1px]">
                        <span className="text-[11px] font-bold text-white leading-none uppercase tracking-wide">{currentUser?.displayName?.split(' ')[0] || 'User'}</span>
                        <span className="text-[9px] text-zinc-500 font-medium leading-none mt-1">{userPlan || 'Free'} Plan</span>
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Header;
