import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, FileBarChart, Download, Settings, Layers, LogOut, Sparkles, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const { currentUser, logout } = useAuth();
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
        { name: 'Admin Portal', path: '/admin', icon: Shield },
    ];

    return (
        <div className="w-64 bg-navy-900 min-h-screen flex flex-col border-r border-navy-800 text-slate-300 transition-all duration-300">
            <div className="h-16 flex items-center px-6 border-b border-navy-800/50 mb-6">
                <div className="flex items-center gap-2">
                    <div className="bg-cyan-500/10 p-1.5 bg-blend-lighten rounded-lg border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <Layers className="text-cyan-400 w-6 h-6" />
                    </div>
                    <span className="text-xl font-poppins font-bold text-white tracking-tight">
                        PrintGuard <span className="text-cyan-400">AI</span>
                    </span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-navy-800 text-white shadow-sm"
                                    : "text-slate-400 hover:bg-navy-800/50 hover:text-slate-200"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={clsx(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                <span>{item.name}</span>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-navy-800/50">
                <div className="flex items-center gap-3 mb-6 px-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase overflow-hidden border border-navy-600">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="User" />
                        ) : (
                            <img src={`https://ui-avatars.com/api/?name=${currentUser?.displayName || 'User'}&background=0284c7&color=fff`} alt="User" />
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{currentUser?.displayName || currentUser?.phoneNumber || 'Demo Agency'}</p>
                        <p className="text-xs text-slate-500 truncate">Pro Plan</p>
                    </div>
                </div>

                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-slate-400 hover:bg-navy-800/50 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
