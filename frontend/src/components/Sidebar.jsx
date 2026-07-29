import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, FileBarChart, Download, Settings, Layers, LogOut, Sparkles, Shield, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ onClose }) => {
    const { currentUser, logout, isAdmin, userRole, userPlan } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Upload', path: '/upload', icon: UploadCloud },
        { name: 'Recent Reports', path: '/report', icon: FileBarChart },
        { name: 'Downloads', path: '/downloads', icon: Download },
        { name: 'Upgrade Plan', path: '/pricing', icon: Sparkles },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    // Add Admin items only if user is Admin
    if (isAdmin) {
        navItems.push({ name: 'Platform Control', path: '/admin', icon: Shield });
    }

    return (
        <div className="w-64 bg-dark-950/80 backdrop-blur-xl h-full flex flex-col border-r border-zinc-800 text-zinc-400 transition-all duration-300 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-32 bg-[rgba(var(--brand-primary),0.05)] blur-3xl rounded-full pointer-events-none"></div>

            <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/50 mb-6 shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-400/10 p-2 rounded-xl border border-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                        <Layers className="text-amber-400 w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-outfit font-bold text-white tracking-tight leading-none">
                            PrintGuard <span className="text-amber-400">AI</span>
                        </span>
                        <span className="text-[9px] text-zinc-400 font-medium tracking-widest uppercase mt-1">
                            Product of SDesignz
                        </span>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-500 hover:text-white lg:hidden rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-2 relative z-10">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden",
                                isActive
                                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/50"
                                    : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 border border-transparent"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(var(--brand-primary),0.1)] to-transparent pointer-events-none"></div>
                                )}
                                <item.icon className={clsx(
                                    "w-5 h-5 transition-colors shrink-0 relative z-10",
                                    isActive ? "text-[rgb(var(--brand-primary))] drop-shadow-[0_0_8px_rgba(var(--brand-primary),0.8)]" : "text-zinc-500 group-hover:text-zinc-300"
                                )} />
                                <span className="truncate relative z-10 font-medium">{item.name}</span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[rgb(var(--brand-primary))] rounded-r-full shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-zinc-800/50 relative z-10 bg-dark-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-6 px-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white uppercase overflow-hidden border-2 border-zinc-700/50 ring-2 ring-transparent transition-all">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <img src={`https://ui-avatars.com/api/?name=${currentUser?.displayName || 'User'}&background=27272a&color=fbbf24`} alt="User" />
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{currentUser?.displayName || currentUser?.phoneNumber || 'Demo Agency'}</p>
                        <p className="text-xs text-amber-400 truncate font-mono tracking-tight">
                            {currentUser?.email === 'admin@printguard.ai' ? 'Super Admin' : `${userPlan || 'Free'} Plan`}
                        </p>
                    </div>
                </div>

                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors group">
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
