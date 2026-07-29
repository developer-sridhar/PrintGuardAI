import React, { useState, useEffect, useRef } from 'react';
import {
    User, CreditCard, Bell, Shield, Palette,
    Sun, Moon, Check, Zap, Layers, Sparkles,
    LogOut, Edit2, Clock, Calendar, X, Plus, Trash2, Lock, CheckCircle2, Loader2,
    Wifi, RotateCw, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// ── Color Swatches ──────────────────────────────────────────────────
const COLOR_OPTIONS = [
    { id: 'yellow', label: 'Golden AI', from: 'from-amber-400', to: 'to-orange-500' },
    { id: 'emerald', label: 'Emerald', from: 'from-emerald-400', to: 'to-teal-500' },
    { id: 'blue', label: 'Ocean Blue', from: 'from-blue-400', to: 'to-indigo-500' },
    { id: 'rose', label: 'Rose', from: 'from-rose-400', to: 'to-pink-500' },
    { id: 'purple', label: 'Amethyst', from: 'from-purple-400', to: 'to-fuchsia-500' },
];

// ── Sidebar Nav Item ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const NavItem = ({ icon: Icon, label, id, activeTab, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${activeTab === id
            ? 'bg-brand-yellow/10 text-brand-yellow shadow-glow-yellow font-semibold'
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
            }`}
    >
        {activeTab === id && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-yellow rounded-r-full shadow-glow-yellow" />
        )}
        <Icon className={`w-5 h-5 transition-transform duration-200 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
        {label}
    </button>
);

// ── Main Component ────────────────────────────────────────────────────
const Settings = () => {
    const { currentUser, userPlan, userProfile } = useAuth();
    const { theme, setTheme, color, setColor } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile State
    const fileInputRef = useRef(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState(userProfile);
    const [formData, setFormData] = useState({
        display_name: '',
        company: '',
        email: ''
    });

    useEffect(() => {
        setProfileData(userProfile);
    }, [userProfile]);

    // Card Management State
    const [showCardModal, setShowCardModal] = useState(false);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isSavedCardFlipped, setIsSavedCardFlipped] = useState(false);
    const [savingCard, setSavingCard] = useState(false);
    const [cardForm, setCardForm] = useState({
        name: '',
        number: '',
        expiry: '',
        cvv: ''
    });

    const getSubscriptionExpiryString = () => {
        const rawDate = profileData?.subscription_end_date || profileData?.trial_expires_at || userProfile?.subscription_end_date || userProfile?.trial_expires_at;
        if (rawDate) {
            return new Date(rawDate).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        return userPlan === 'Pro' ? '30 Days From Purchase' : 'No Expiry (Free Plan)';
    };

    const getSubscriptionRemainingTime = () => {
        const rawDate = profileData?.subscription_end_date || profileData?.trial_expires_at || userProfile?.subscription_end_date || userProfile?.trial_expires_at;
        if (!rawDate) return userPlan === 'Pro' ? 'Active Subscription' : 'Lifetime Access';

        const expiryTime = new Date(rawDate).getTime();
        const now = new Date().getTime();
        const diff = expiryTime - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m left`;
        }
        return `${hours}h ${minutes}m left`;
    };

    const getCardBrand = (num) => {
        const clean = (num || '').replace(/\s+/g, '');
        if (/^4/.test(clean)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
        if (/^3[47]/.test(clean)) return 'Amex';
        if (/^(60|65|81-89)/.test(clean)) return 'RuPay';
        return 'Card';
    };

    const handleSaveCard = async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!cardForm.number || cardForm.number.replace(/\s/g, '').length < 12) {
            toast.error("Please enter a valid card number.");
            return;
        }
        if (!cardForm.expiry) {
            toast.error("Please enter expiry MM/YY.");
            return;
        }

        setSavingCard(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const brand = getCardBrand(cardForm.number);
            const cleanNum = cardForm.number.replace(/\s/g, '');
            const last4 = cleanNum.slice(-4) || '4242';

            const payment_method = {
                brand,
                last4,
                holder_name: cardForm.name || currentUser.displayName || 'Cardholder',
                expiry: cardForm.expiry,
                updated_at: new Date().toISOString()
            };

            const response = await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method })
            });

            if (!response.ok) throw new Error("Failed to save card");

            toast.success("Payment card saved successfully!");
            setProfileData(prev => ({ ...(prev || {}), payment_method }));
            setShowCardModal(false);
            setCardForm({ name: '', number: '', expiry: '', cvv: '' });
        } catch (err) {
            console.error("Save card error:", err);
            toast.error("Could not save card details.");
        } finally {
            setSavingCard(false);
        }
    };

    const handleRemoveCard = async () => {
        if (!currentUser || !confirm("Are you sure you want to remove this payment card?")) return;
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method: null })
            });
            toast.success("Payment card removed.");
            setProfileData(prev => ({ ...(prev || {}), payment_method: null }));
        } catch (err) {
            toast.error("Failed to remove card.");
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser?.uid) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file.");
            return;
        }

        try {
            setAvatarUploading(true);
            toast.loading("Updating profile photo...", { id: 'avatar-upload' });

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Photo = reader.result;
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo_url: base64Photo })
                });

                if (!res.ok) throw new Error("Failed to save profile photo");

                setProfileData(prev => ({ ...(prev || {}), photo_url: base64Photo }));
                toast.success("Profile photo updated successfully!", { id: 'avatar-upload' });
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Avatar upload error:", err);
            toast.error("Failed to update profile photo.", { id: 'avatar-upload' });
        } finally {
            setAvatarUploading(false);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!currentUser) return;
            setProfileLoading(true);
            try {
                const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`);
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        display_name: data.display_name || currentUser.displayName || '',
                        company: data.company || '',
                        email: data.email || currentUser.email || ''
                    });
                }
            } catch (err) {
                console.error("Profile fetch error:", err);
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, [currentUser]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!currentUser?.uid) {
            toast.error("User session missing. Please log in again.");
            return;
        }
        setSaving(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: formData.display_name,
                    company: formData.company,
                    email: formData.email
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Update failed");
            }

            setProfileData(prev => ({
                ...(prev || {}),
                display_name: formData.display_name,
                company: formData.company,
                email: formData.email
            }));

            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error("Profile save error:", err);
            toast.error(err.message || "Failed to save profile changes");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("CRITICAL: This will permanently delete your account and all analysis history. This cannot be undone. Proceed?")) return;

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/user/${currentUser.uid}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("Account and data deleted");
                // Logout the user (assuming AuthContext has a logout)
                // For now, reload or redirect
                window.location.href = '/login';
            } else {
                throw new Error("Delete failed");
            }
        } catch (err) {
            console.error("Delete account error:", err);
            toast.error("Failed to delete account");
        }
    };

    const navItems = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl shadow-glow-yellow">
                    <Layers className="w-6 h-6 text-brand-yellow" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Account Settings</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Manage your profile, billing and preferences</p>
                </div>
            </div>

            <div className="bg-dark-900/60 backdrop-blur-md rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-zinc-800 overflow-hidden flex flex-col md:flex-row min-h-[620px]">

                {/* ── Sidebar ── */}
                <div className="w-full md:w-60 bg-dark-950/70 border-b md:border-b-0 md:border-r border-zinc-800 p-3 sm:p-5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1.5 shrink-0 relative hide-scrollbar">
                    {/* Ambient glow */}
                    <div className="absolute top-0 left-0 w-full h-28 bg-brand-yellow/5 blur-3xl rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-row md:flex-col gap-1.5 shrink-0 min-w-max md:min-w-0">
                        {navItems.map(item => (
                            <NavItem key={item.id} {...item} activeTab={activeTab} onClick={setActiveTab} />
                        ))}
                    </div>
                </div>


                {/* ── Content ── */}
                <div className="flex-1 p-8 md:p-10 overflow-y-auto">

                    {/* ── Profile Tab ── */}
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in space-y-8">
                            <h2 className="text-xl font-bold text-white">Profile Information</h2>

                            {/* Avatar */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                            <div className="flex items-center gap-6">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Click to change profile photo"
                                >
                                    <div className="w-20 h-20 rounded-full bg-dark-950 border-2 border-brand-yellow/30 shadow-glow-yellow flex items-center justify-center overflow-hidden text-2xl font-bold text-brand-yellow">
                                        {avatarUploading ? (
                                            <Loader2 className="w-6 h-6 text-brand-yellow animate-spin" />
                                        ) : (profileData?.photo_url || currentUser?.photoURL) ? (
                                            <img src={profileData?.photo_url || currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            currentUser?.displayName?.charAt(0) || 'U'
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Edit2 className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{formData.display_name || currentUser?.displayName || 'PrintGuard User'}</p>
                                    <p className="text-sm text-zinc-500">{currentUser?.email}</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={avatarUploading}
                                        className="mt-2 px-4 py-1.5 border border-zinc-700 bg-dark-950 text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                                        {avatarUploading ? 'Uploading...' : 'Change Avatar'}
                                    </button>
                                </div>
                            </div>

                            <form className="space-y-5" onSubmit={handleSaveProfile}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.display_name}
                                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-950 border border-zinc-700 text-white rounded-xl focus:ring-2 focus:ring-brand-yellow/50 focus:border-brand-yellow outline-none transition-all placeholder-zinc-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Company</label>
                                        <input
                                            type="text"
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-950 border border-zinc-700 text-white rounded-xl focus:ring-2 focus:ring-brand-yellow/50 focus:border-brand-yellow outline-none transition-all placeholder-zinc-600"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                                    <input type="email" disabled value={formData.email}
                                        className="w-full px-4 py-2.5 border border-zinc-800 bg-dark-900 text-zinc-500 rounded-xl cursor-not-allowed" />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-brand-yellow to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-dark-950 font-semibold rounded-xl transition-all shadow-glow-yellow group disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── Billing Tab ── */}
                    {activeTab === 'billing' && (
                        <div className="animate-fade-in space-y-6">
                            <h2 className="text-xl font-bold text-white">Plan & Billing</h2>

                            <div className="p-6 bg-gradient-to-br from-dark-950 to-dark-900 border border-brand-yellow/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                                <div className="absolute right-0 top-0 w-40 h-40 bg-brand-yellow/10 blur-3xl rounded-full pointer-events-none" />
                                <div className="relative z-10 space-y-2">
                                    <span className="px-2.5 py-1 bg-white/5 rounded-md text-xs font-semibold tracking-wider uppercase border border-white/10 text-zinc-300">Current Plan</span>
                                    <h3 className="text-3xl font-bold text-white mt-1">{userPlan || 'Free'} Plan</h3>
                                    <p className="text-zinc-400 text-sm">
                                        {userPlan === 'Pro' ? 'Unlimited AI design scans & premium report downloads included.' : '5 AI design scans included per month.'}
                                    </p>

                                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
                                        <div className="flex items-center gap-1.5 text-amber-400">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            <span>
                                                Plan Expiry: <strong className="text-white">{getSubscriptionExpiryString()}</strong>
                                            </span>
                                        </div>
                                        {userPlan === 'Pro' && (
                                            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-full text-[11px] flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                {getSubscriptionRemainingTime()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {userPlan !== 'Pro' && (
                                    <Link to="/pricing" className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-yellow to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-dark-950 font-bold rounded-xl transition-all shadow-glow-yellow group">
                                        <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" /> Upgrade to Pro
                                    </Link>
                                )}
                            </div>

                            {/* ── Subscription & Expiry Details Section ── */}
                            <div className="p-5 bg-dark-950/80 border border-zinc-800/80 rounded-xl space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                                    <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
                                        <Shield className="w-4 h-4 text-brand-yellow" />
                                        Subscription & Expiry Details
                                    </h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${userPlan === 'Pro' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {userPlan === 'Pro' ? 'Active' : 'Free Tier'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                    <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                                        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">Plan Tier</span>
                                        <p className="text-white font-bold text-base">{userPlan || 'Free'} Plan</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-br from-amber-500/10 via-zinc-900/60 to-dark-950 border border-amber-500/30 rounded-xl shadow-lg relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Plan Expiry Date & Time
                                            </span>
                                            {userPlan === 'Pro' && (
                                                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full border border-amber-500/30">
                                                    Monthly Cycle
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-white font-extrabold text-base tracking-wide flex items-center gap-2 mt-1">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            {getSubscriptionExpiryString()}
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                                        <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider block mb-1">Time Remaining</span>
                                        <p className="text-emerald-400 font-bold text-base flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-emerald-400" />
                                            {getSubscriptionRemainingTime()}
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                                        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">Billing Cycle</span>
                                        <p className="text-zinc-300 font-semibold">{userPlan === 'Pro' ? 'Monthly Subscription' : 'N/A'}</p>
                                    </div>

                                    <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg sm:col-span-2">
                                        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider block mb-1">Scan Entitlement</span>
                                        <p className="text-zinc-300 font-semibold">{userPlan === 'Pro' ? 'Unlimited AI Scans' : '5 Scans Total'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-white">Billing Information & Saved Card</h4>
                                    {profileData?.payment_method && (
                                        <button 
                                            onClick={() => {
                                                setCardForm({
                                                    name: profileData.payment_method.holder_name || '',
                                                    number: `•••• •••• •••• ${profileData.payment_method.last4 || '4242'}`,
                                                    expiry: profileData.payment_method.expiry || '',
                                                    cvv: '•••'
                                                });
                                                setShowCardModal(true);
                                            }}
                                            className="text-xs font-semibold text-brand-yellow hover:text-yellow-400 flex items-center gap-1.5 transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> Edit Card Details
                                        </button>
                                    )}
                                </div>

                                {profileData?.payment_method ? (
                                    <div className="p-6 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 border border-zinc-800 rounded-2xl space-y-5 shadow-xl relative overflow-hidden">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                            {/* ── 3D Interactive Animated Credit Card Preview ── */}
                                            <div className="perspective-1000 w-full sm:w-80 h-44 flex-shrink-0">
                                                <div 
                                                    className={`relative w-full h-full rounded-2xl transition-transform duration-700 transform-style-3d cursor-pointer shadow-2xl ${isSavedCardFlipped ? 'rotate-y-180' : ''}`}
                                                    onClick={() => setIsSavedCardFlipped(!isSavedCardFlipped)}
                                                    title="Click to flip card"
                                                >
                                                    {/* FRONT OF CARD */}
                                                    <div className="absolute inset-0 w-full h-full rounded-2xl p-4 bg-gradient-to-br from-amber-500/20 via-zinc-900 to-dark-950 border border-amber-500/30 flex flex-col justify-between overflow-hidden backface-hidden shadow-[0_10px_30px_rgba(251,191,36,0.15)]">
                                                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-card-shimmer pointer-events-none" />

                                                        <div className="flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-6 bg-gradient-to-tr from-amber-300 via-yellow-500 to-amber-600 rounded border border-amber-200/50 shadow-inner flex flex-col justify-around p-0.5">
                                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                                </div>
                                                                <Wifi className="w-4 h-4 text-amber-400/70 rotate-90" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] font-black uppercase tracking-widest text-brand-yellow drop-shadow-md">
                                                                    {profileData.payment_method.brand || 'VISA'}
                                                                </span>
                                                                <Lock className="w-3 h-3 text-zinc-500" />
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10 font-mono text-base font-bold text-white tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                                                            •••• •••• •••• {profileData.payment_method.last4 || '4242'}
                                                        </div>

                                                        <div className="relative z-10 flex items-end justify-between text-[11px]">
                                                            <div>
                                                                <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold">Cardholder</span>
                                                                <span className="font-bold text-white uppercase tracking-wide max-w-[140px] truncate block">
                                                                    {profileData.payment_method.holder_name || 'CARDHOLDER'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold">Expires</span>
                                                                <span className="font-bold text-white font-mono">{profileData.payment_method.expiry || 'MM/YY'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* BACK OF CARD */}
                                                    <div className="absolute inset-0 w-full h-full rounded-2xl p-4 bg-gradient-to-bl from-zinc-900 via-dark-950 to-amber-950/60 border border-zinc-700 flex flex-col justify-between overflow-hidden backface-hidden rotate-y-180 shadow-2xl">
                                                        <div className="absolute top-3 left-0 w-full h-8 bg-zinc-950 border-y border-zinc-800" />

                                                        <div className="pt-9 space-y-1 relative z-10">
                                                            <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold text-right">Signature</span>
                                                            <div className="flex items-center justify-end gap-2 bg-zinc-800/80 p-1.5 rounded border border-zinc-700">
                                                                <span className="text-[8px] text-zinc-400 font-mono italic tracking-widest">PRINTGUARD AI</span>
                                                                <div className="px-2 py-0.5 bg-white text-dark-950 font-mono font-black text-xs rounded shadow-inner">
                                                                    •••
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="relative z-10 flex items-center justify-between text-[9px] text-zinc-500">
                                                            <span className="flex items-center gap-1 font-semibold text-amber-400/80">
                                                                <ShieldCheck className="w-3 h-3" /> SECURED PAYMENT CARD
                                                            </span>
                                                            <span className="text-zinc-400">Click to Flip</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Status & Actions Panel */}
                                            <div className="flex-1 space-y-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-bold text-white">Default Payment Method</span>
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full uppercase">Active</span>
                                                    </div>
                                                    <p className="text-zinc-400 text-xs">
                                                        Used for automated monthly renewals and print report upgrades.
                                                    </p>
                                                </div>

                                                <div className="pt-2 flex flex-wrap items-center gap-3">
                                                    <button 
                                                        onClick={() => {
                                                            setCardForm({
                                                                name: profileData.payment_method.holder_name || '',
                                                                number: `•••• •••• •••• ${profileData.payment_method.last4 || '4242'}`,
                                                                expiry: profileData.payment_method.expiry || '',
                                                                cvv: '•••'
                                                            });
                                                            setShowCardModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow font-semibold text-xs rounded-xl hover:bg-brand-yellow/20 transition-all flex items-center gap-1.5 shadow-glow-yellow"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit Card
                                                    </button>

                                                    <button 
                                                        onClick={handleRemoveCard}
                                                        className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remove Card
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-5 bg-dark-950 border border-zinc-800 rounded-xl flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-zinc-500" />
                                            <span className="text-zinc-400">No payment method on file.</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setCardForm({ name: '', number: '', expiry: '', cvv: '' });
                                                setShowCardModal(true);
                                            }}
                                            className="px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow font-semibold text-xs rounded-xl hover:bg-brand-yellow/20 transition-all flex items-center gap-1.5 shadow-glow-yellow"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Card
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Notifications Tab ── */}
                    {activeTab === 'notifications' && (
                        <div className="animate-fade-in flex flex-col items-center justify-center text-center h-64 text-zinc-500">
                            <Bell className="w-12 h-12 text-zinc-700 mb-4 animate-float" />
                            <p className="font-semibold text-lg text-white mb-2">Notification Preferences</p>
                            <p className="text-sm max-w-sm text-zinc-400">This section is under construction. Check back soon!</p>
                        </div>
                    )}

                    {/* ── Appearance Tab ── */}
                    {activeTab === 'appearance' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-yellow/10 border border-brand-yellow/20 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-brand-yellow animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Appearance Settings</h2>
                            </div>

                            {/* Light / Dark Mode */}
                            <div className="p-6 bg-dark-950 border border-zinc-800 rounded-2xl">
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">Interface Mode</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean bright interface' },
                                        { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Easy on the eyes at night' },
                                    ].map(({ id, label, icon: ModeIcon, desc }) => (
                                        // eslint-disable-next-line no-unused-vars
                                        <button
                                            key={id}
                                            onClick={() => setTheme(id)}
                                            className={`relative flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-300 group overflow-hidden ${theme === id
                                                ? 'border-brand-yellow bg-brand-yellow/10 shadow-glow-yellow scale-[1.02]'
                                                : 'border-zinc-800 bg-dark-900/50 hover:border-zinc-700'
                                                }`}
                                        >
                                            {/* Shimmer on active */}
                                            {theme === id && (
                                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-yellow/5 to-transparent animate-shimmer pointer-events-none" />
                                            )}
                                            <div className={`relative p-3 rounded-xl transition-all duration-300 ${theme === id ? 'bg-brand-yellow text-dark-950 shadow-glow-yellow' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'
                                                }`}>
                                                <ModeIcon className="w-6 h-6" />
                                            </div>
                                            <div className="relative">
                                                <p className={`font-bold transition-colors ${theme === id ? 'text-brand-yellow' : 'text-white'}`}>{label}</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                                            </div>
                                            {theme === id && (
                                                <div className="relative ml-auto">
                                                    <Check className="w-5 h-5 text-brand-yellow" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Themes */}
                            <div className="p-6 bg-dark-950 border border-zinc-800 rounded-2xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-yellow/5 blur-3xl rounded-full pointer-events-none" />
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6 relative z-10">Brand Color Theme</p>
                                <div className="flex flex-wrap gap-6 relative z-10">
                                    {COLOR_OPTIONS.map((c) => (
                                        <div key={c.id} className="flex flex-col items-center gap-3">
                                            <button
                                                onClick={() => setColor(c.id)}
                                                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 bg-gradient-to-br ${c.from} ${c.to} ${color === c.id
                                                    ? 'ring-4 ring-offset-4 ring-white/30 ring-offset-dark-950 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                                                    }`}
                                                title={c.label}
                                            >
                                                {color === c.id && (
                                                    <span className="absolute inset-0 rounded-2xl border-2 border-white/40 animate-pulse" />
                                                )}
                                                {color === c.id && <Check className="w-7 h-7 text-black/70 font-bold" />}
                                            </button>
                                            <span className={`text-xs font-medium transition-colors ${color === c.id ? 'text-white' : 'text-zinc-600'}`}>
                                                {c.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Live preview strip */}
                                <div className="mt-8 p-4 bg-dark-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-yellow/20 border border-brand-yellow/30 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-brand-yellow" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">Live Preview</p>
                                            <p className="text-xs text-zinc-500">This reflects the current theme</p>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 bg-gradient-to-r from-brand-yellow to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-dark-950 text-sm font-bold rounded-xl shadow-glow-yellow transition-all hover:-translate-y-0.5">
                                        Active Theme
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Security Tab ── */}
                    {activeTab === 'security' && (
                        <div className="animate-fade-in space-y-8">
                            <h2 className="text-xl font-bold text-white">Security & Account</h2>

                            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                                <div>
                                    <h3 className="text-red-400 font-bold flex items-center gap-2 text-lg">
                                        <Shield className="w-5 h-5" /> Danger Zone
                                    </h3>
                                    <p className="text-zinc-500 text-sm mt-1">Actions in this area are irreversible. Please be careful.</p>
                                </div>

                                <div className="pt-4 border-t border-red-500/10">
                                    <p className="text-white font-semibold mb-1">Delete Account</p>
                                    <p className="text-zinc-500 text-xs mb-4">Once you delete your account, there is no going back. All your analyses, reports, and settings will be permanently erased.</p>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold rounded-xl transition-all border border-red-500/30 group"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Delete My Account
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center text-center py-12 text-zinc-500 border border-zinc-800 rounded-2xl bg-dark-950/30">
                                <Shield className="w-8 h-8 text-zinc-800 mb-3" />
                                <p className="text-sm font-medium text-zinc-400">Advanced Security Features</p>
                                <p className="text-xs max-w-sm text-zinc-600 mt-1">Two-factor authentication and session management are coming soon.</p>
                            </div>
                        </div>
                    )}

            {/* ── Add/Edit Card Modal ── */}
            {showCardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md bg-dark-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-brand-yellow/10 rounded-xl border border-brand-yellow/20 text-brand-yellow">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Payment Card Information</h3>
                            </div>
                            <button 
                                onClick={() => setShowCardModal(false)}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── 3D Interactive Animated Credit Card Preview ── */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="perspective-1000 w-full h-48 my-1">
                                <div 
                                    className={`relative w-full h-full rounded-2xl transition-transform duration-700 transform-style-3d cursor-pointer shadow-2xl ${isCardFlipped ? 'rotate-y-180' : ''}`}
                                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                                    title="Click to flip card"
                                >
                                    {/* FRONT OF CARD */}
                                    <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-gradient-to-br from-amber-500/20 via-zinc-900 to-dark-950 border border-amber-500/30 flex flex-col justify-between overflow-hidden backface-hidden shadow-[0_10px_30px_rgba(251,191,36,0.15)]">
                                        {/* Shimmer Sheen Reflection */}
                                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-card-shimmer pointer-events-none" />

                                        {/* Top row: EMV Chip + Contactless Wifi + Brand Badge */}
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                {/* Metallic EMV Gold Chip */}
                                                <div className="w-10 h-7 bg-gradient-to-tr from-amber-300 via-yellow-500 to-amber-600 rounded-md border border-amber-200/50 shadow-inner flex flex-col justify-around p-1">
                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                    <div className="w-full h-0.5 bg-amber-900/30 rounded-full" />
                                                </div>
                                                <Wifi className="w-5 h-5 text-amber-400/70 rotate-90" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase tracking-widest text-brand-yellow drop-shadow-md">
                                                    {getCardBrand(cardForm.number)}
                                                </span>
                                                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                                            </div>
                                        </div>

                                        {/* Card Number */}
                                        <div className="relative z-10 font-mono text-lg font-bold text-white tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                                            {cardForm.number || '•••• •••• •••• ••••'}
                                        </div>

                                        {/* Bottom Row: Holder + Expiry */}
                                        <div className="relative z-10 flex items-end justify-between text-xs">
                                            <div>
                                                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-semibold">Cardholder Name</span>
                                                <span className="font-bold text-white uppercase tracking-wide max-w-[170px] truncate block">
                                                    {cardForm.name || 'YOUR NAME'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-semibold">Expires</span>
                                                <span className="font-bold text-white font-mono">{cardForm.expiry || 'MM/YY'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BACK OF CARD */}
                                    <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-gradient-to-bl from-zinc-900 via-dark-950 to-amber-950/60 border border-zinc-700 flex flex-col justify-between overflow-hidden backface-hidden rotate-y-180 shadow-2xl">
                                        {/* Magnetic Stripe */}
                                        <div className="absolute top-4 left-0 w-full h-9 bg-zinc-950 border-y border-zinc-800" />

                                        <div className="pt-10 space-y-2 relative z-10">
                                            <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-semibold text-right">Authorized Signature</span>
                                            <div className="flex items-center justify-end gap-3 bg-zinc-800/80 p-2 rounded-lg border border-zinc-700">
                                                <span className="text-[9px] text-zinc-400 font-mono italic tracking-widest">PRINTGUARD AI</span>
                                                <div className="px-3 py-1 bg-white text-dark-950 font-mono font-black text-sm rounded shadow-inner tracking-widest">
                                                    {cardForm.cvv || '•••'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between text-[10px] text-zinc-500">
                                            <span className="flex items-center gap-1 font-semibold text-amber-400/80">
                                                <ShieldCheck className="w-3.5 h-3.5" /> SECURED ENCRYPTED
                                            </span>
                                            <span className="text-zinc-400">Click to Flip Front</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="button" 
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                                <RotateCw className="w-3 h-3" /> Flip 3D Card ({isCardFlipped ? 'Front View' : 'Back View'})
                            </button>
                        </div>

                        {/* Card Inputs Form */}
                        <form onSubmit={handleSaveCard} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1">Cardholder Name</label>
                                <input 
                                    type="text"
                                    placeholder="John Doe"
                                    value={cardForm.name}
                                    onFocus={() => setIsCardFlipped(false)}
                                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-brand-yellow transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1">Card Number</label>
                                <input 
                                    type="text"
                                    maxLength={19}
                                    placeholder="4111 1111 1111 1111"
                                    value={cardForm.number}
                                    onFocus={() => setIsCardFlipped(false)}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                        setCardForm({ ...cardForm, number: val });
                                    }}
                                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Expiry (MM/YY)</label>
                                    <input 
                                        type="text"
                                        maxLength={5}
                                        placeholder="12/28"
                                        value={cardForm.expiry}
                                        onFocus={() => setIsCardFlipped(false)}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                                            setCardForm({ ...cardForm, expiry: val });
                                        }}
                                        className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 mb-1">CVV</label>
                                    <input 
                                        type="password"
                                        maxLength={4}
                                        placeholder="123"
                                        value={cardForm.cvv}
                                        onFocus={() => setIsCardFlipped(true)}
                                        onBlur={() => setIsCardFlipped(false)}
                                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '') })}
                                        className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-brand-yellow transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                <button 
                                    type="button"
                                    onClick={() => setShowCardModal(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={savingCard}
                                    className="px-6 py-2.5 bg-gradient-to-r from-brand-yellow to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-dark-950 font-bold rounded-xl transition-all shadow-glow-yellow disabled:opacity-50"
                                >
                                    {savingCard ? 'Saving...' : 'Save Card Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

                </div>
            </div>
        </div>
    );
};

export default Settings;
