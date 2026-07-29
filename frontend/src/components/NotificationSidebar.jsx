import React, { useEffect, useState } from 'react';
import { X, Bell, Clock, Check, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const NotificationSidebar = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !isOpen) return;

        setLoading(true);
        const analysesRef = collection(db, 'users', currentUser.uid, 'analyses');
        const q = query(analysesRef, orderBy('created_at', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach((docSnap) => {
                const docData = docSnap.data();
                data.push({
                    id: docSnap.id,
                    title: docData.score >= 80 ? 'Analysis Complete' : 'High Risk Detected',
                    message: `${docData.file_name} analysis is ready. Score: ${docData.score}/100`,
                    time: docData.date || 'Just now',
                    read: docData.read_notification || false,
                    type: docData.score >= 80 ? 'success' : 'warning',
                    docData: docData
                });
            });
            setNotifications(data);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser, isOpen]);

    const markAllAsRead = async () => {
        if (!currentUser) return;
        try {
            const unread = notifications.filter(n => !n.read);
            if (unread.length === 0) return;
            
            const batch = writeBatch(db);
            unread.forEach(notif => {
                const docRef = doc(db, 'users', currentUser.uid, 'analyses', notif.id);
                batch.update(docRef, { read_notification: true });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read", error);
        }
    };

    const markAsRead = async (id) => {
        if (!currentUser) return;
        try {
            const docRef = doc(db, 'users', currentUser.uid, 'analyses', id);
            await updateDoc(docRef, { read_notification: true });
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Sidebar panel */}
            <div className="relative w-full max-w-sm sm:max-w-md bg-dark-900 h-full border-l border-zinc-800 shadow-2xl flex flex-col pointer-events-auto animate-slide-left">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-dark-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[rgba(var(--brand-primary),0.1)] rounded-xl text-[rgb(var(--brand-primary))]">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg leading-tight">Notification History</h2>
                            <p className="text-xs text-zinc-400">All system alerts and analysis updates</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Actions bar */}
                <div className="px-5 py-3 border-b border-zinc-800/50 flex items-center justify-between bg-dark-900/50">
                    <span className="text-sm font-medium text-zinc-400">
                        {notifications.length} Total {unreadCount > 0 && <span className="text-[rgb(var(--brand-primary))]">({unreadCount} unread)</span>}
                    </span>
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="text-xs font-semibold text-[rgb(var(--brand-primary))] hover:text-yellow-400 flex items-center gap-1.5 transition-colors bg-[rgba(var(--brand-primary),0.1)] hover:bg-[rgba(var(--brand-primary),0.2)] px-3 py-1.5 rounded-lg"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <div className="w-8 h-8 border-2 border-[rgb(var(--brand-primary))] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-zinc-800/50">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    className={`p-5 transition-colors relative group ${!notif.read ? 'bg-[rgba(var(--brand-primary),0.03)] hover:bg-[rgba(var(--brand-primary),0.05)]' : 'hover:bg-zinc-800/30'}`}
                                >
                                    {!notif.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[rgb(var(--brand-primary))] shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"></div>
                                    )}
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 mt-1">
                                            {notif.type === 'success' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/10"></div>}
                                            {notif.type === 'warning' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] ring-4 ring-amber-500/10"></div>}
                                            {notif.type === 'info' && <div className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--brand-primary))] shadow-[0_0_10px_rgba(var(--brand-primary),0.5)] ring-4 ring-[rgb(var(--brand-primary))]/10"></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-base tracking-tight pr-4 ${!notif.read ? 'font-bold text-white' : 'font-semibold text-zinc-300'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] sm:text-xs font-medium text-zinc-500 shrink-0 whitespace-nowrap mt-1">
                                                    {notif.time.split(' - ')[0]}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            
                                            {/* Action Button */}
                                            <Link 
                                                to="/report" 
                                                state={{ reportData: notif.docData }}
                                                onClick={onClose}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-dark-950 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors group/btn"
                                            >
                                                View Full Report
                                                <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all text-[rgb(var(--brand-primary))]" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                            <div className="w-16 h-16 bg-dark-950 border border-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <Bell className="w-8 h-8 opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No History Found</h3>
                            <p className="max-w-[250px] text-sm">You don't have any past notifications or system alerts on record.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationSidebar;
