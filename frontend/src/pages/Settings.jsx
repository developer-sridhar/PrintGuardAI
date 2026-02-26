import React, { useState } from 'react';
import { User, CreditCard, Bell, Shield, Mail, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Settings = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-navy-900 mb-8">Account Settings</h1>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Navigation Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-cyan-50 text-cyan-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <User className="w-5 h-5" /> Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'billing' ? 'bg-cyan-50 text-cyan-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <CreditCard className="w-5 h-5" /> Billing & Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'notifications' ? 'bg-cyan-50 text-cyan-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Bell className="w-5 h-5" /> Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-colors ${activeTab === 'security' ? 'bg-cyan-50 text-cyan-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Shield className="w-5 h-5" /> Security
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 md:p-10">
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-navy-900 mb-6">Profile Information</h2>
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow flex items-center justify-center overflow-hidden text-2xl font-bold text-slate-500">
                                    {currentUser?.photoURL ? (
                                        <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        currentUser?.displayName?.charAt(0) || 'U'
                                    )}
                                </div>
                                <div>
                                    <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors bg-white shadow-sm">
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            <form className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                        <input type="text" defaultValue={currentUser?.displayName || 'PrintGuard User'} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                                        <input type="text" defaultValue="Design Agency LLC" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <input type="email" disabled defaultValue={currentUser?.email || 'user@example.com'} className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed" />
                                </div>
                                <div className="pt-4">
                                    <button type="button" className="px-6 py-2.5 bg-navy-900 text-white font-medium rounded-xl hover:bg-navy-800 transition-all shadow-md">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-navy-900 mb-6">Plan & Billing</h2>

                            <div className="p-6 bg-gradient-to-br from-navy-900 to-navy-800 rounded-2xl text-white mb-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/20 blur-2xl rounded-full"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2.5 py-1 bg-white/10 rounded-md text-xs font-semibold tracking-wider uppercase border border-white/20">Current Plan</span>
                                    </div>
                                    <h3 className="text-3xl font-bold flex items-center gap-2">Free Tier</h3>
                                    <p className="text-slate-300 text-sm mt-2">14/20 AI analyses used this month.</p>
                                </div>
                                <div className="relative z-10">
                                    <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/30">
                                        <Zap className="w-4 h-4" /> Upgrade to Pro
                                    </Link>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-800">Billing Information</h4>
                                <div className="p-5 border border-slate-200 rounded-xl flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-slate-400" />
                                        <span className="text-slate-600">No payment method on file.</span>
                                    </div>
                                    <button className="text-cyan-600 font-medium hover:text-cyan-700">Add Card</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'notifications' || activeTab === 'security') && (
                        <div className="animate-fade-in flex flex-col items-center justify-center text-center h-64 text-slate-500">
                            <Shield className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="font-medium text-lg text-slate-600 mb-2">{activeTab === 'notifications' ? 'Notification Preferences' : 'Security Settings'}</p>
                            <p className="text-sm max-w-sm">This section is currently under construction. Check back soon for updates!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
