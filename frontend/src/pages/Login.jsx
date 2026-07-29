import React, { useEffect, useState } from 'react';
import { Loader2, Layers, Cpu, Sparkles, Printer, Phone, Hash, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState('DEFAULT'); // 'DEFAULT', 'PHONE', 'OTP', 'ADMIN'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpCode, setOtpCode] = useState('');

    const { loginWithGoogle, loginWithEmail, loginWithCustomToken, currentUser, userRole, isAdmin } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in and role is known
    useEffect(() => {
        const checkRedirect = async () => {
            if (currentUser && userRole) {
                if (isAdmin) {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }
        };
        checkRedirect();
    }, [currentUser, userRole, isAdmin, navigate]);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await loginWithGoogle();
            toast.success('Authentication successful!');
            // navigate will be handled by useEffect
        } catch (error) {
            console.error("Google Auth Error:", error);
            toast.error(error.message || 'Failed to authenticate with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error("Please fill in both fields");

        try {
            setLoading(true);
            await loginWithEmail(email, password);
            toast.success('Admin login successful!');
            navigate('/admin');
        } catch (error) {
            console.error("Admin Auth Error:", error);
            toast.error("Invalid admin credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!phoneNumber) return toast.error("Please enter a phone number");

        // Basic format check
        if (!phoneNumber.startsWith('+')) {
            return toast.error("Please include country code (e.g., +91...)");
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/auth/phone/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Failed to send OTP");

            toast.success("OTP sent successfully!");
            setAuthMode('OTP');
        } catch (error) {
            console.error("OTP Send Error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otpCode) return toast.error("Please enter the OTP code");

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/auth/phone/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    otp_code: otpCode
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Verification failed");

            await loginWithCustomToken(data.firebase_token);
            toast.success("Phone authentication successful!");
            // navigate will be handled by useEffect
        } catch (error) {
            console.error("OTP Verify Error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full max-w-5xl mx-auto flex flex-col md:flex-row overflow-hidden bg-dark-950 rounded-3xl shadow-2xl border border-zinc-800/50 min-h-[600px]">

            {/* Left Side: Animated AI Branding Area */}
            <div className="w-full md:w-5/12 relative bg-gradient-to-br from-dark-950 via-dark-900 to-zinc-900 p-10 flex flex-col justify-between border-r border-zinc-800/50 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-amber-500 rounded-full mix-blend-screen filter blur-[50px] animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 bg-zinc-600 rounded-full mix-blend-screen filter blur-[60px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="bg-amber-400/10 p-2 rounded-xl border border-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                            <Layers className="text-amber-400 w-8 h-8" />
                        </div>
                        <span className="text-2xl font-outfit font-bold text-white tracking-tight">
                            PrintGuard <span className="text-amber-400">AI</span>
                        </span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-outfit font-bold text-white leading-tight mb-6">
                        Intelligent Design <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                            Print Analysis
                        </span>
                    </h1>

                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        Our neural engine scans your design files for CMYK limits, DPI resolution, and risky color profiles before they ever hit the press.
                    </p>

                    <div className="hidden md:flex flex-col gap-4 text-xs font-semibold text-slate-200">
                        <div className="flex items-center gap-3 bg-navy-800/80 p-3 rounded-lg border border-navy-700 shadow-sm">
                            <Cpu className="text-amber-400 w-5 h-5" /> Auto-Correction Engine Active
                        </div>
                        <div className="flex items-center gap-3 bg-navy-800/80 p-3 rounded-lg border border-navy-700 shadow-sm">
                            <Sparkles className="text-amber-400 w-5 h-5" /> Instant Risk Prediction
                        </div>
                        <div className="flex items-center gap-3 bg-navy-800/80 p-3 rounded-lg border border-navy-700 shadow-sm">
                            <Printer className="text-amber-400 w-5 h-5" /> 100% Print-Ready Output
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full md:w-7/12 bg-white flex flex-col justify-center items-center py-16 px-8 relative text-zinc-900">

                {/* Decorative blob on light background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full filter blur-[80px] opacity-70 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                <div className="w-full max-w-sm relative z-10">
                    {authMode === 'DEFAULT' && (
                        <div className="animate-fade-in">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-bold text-navy-900 mb-2 font-outfit">Welcome Back</h2>
                                <p className="text-sm text-slate-600 font-medium">Sign in to securely access your analysis dashboard and recent print reports.</p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-200 rounded-xl shadow-sm hover:shadow-md text-sm font-semibold text-navy-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Continue with Google
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setAuthMode('PHONE')}
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 border border-slate-200 rounded-xl shadow-sm hover:shadow-md text-sm font-semibold text-zinc-900 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-800 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    <Phone className="w-5 h-5 mr-3 text-amber-500" />
                                    Continue with Phone Number
                                </button>
                            </div>

                            <div className="mt-8 text-center text-xs text-slate-600 font-medium flex flex-col gap-2">
                                <span className="text-slate-400">Secure Protocol v1.2</span>
                                <button
                                    onClick={() => setAuthMode('ADMIN')}
                                    className="text-zinc-400 hover:text-amber-500 transition-colors bg-transparent border-0 font-medium uppercase tracking-widest text-[9px]"
                                >
                                    Admin Access
                                </button>
                                <div>
                                    By signing in, you agree to our <a href="#" className="underline text-zinc-800 hover:text-amber-600 transition-colors">Terms of Service</a> and <a href="#" className="underline text-zinc-800 hover:text-amber-600 transition-colors">Privacy Policy</a>.
                                </div>
                            </div>
                        </div>
                    )}

                    {authMode === 'PHONE' && (
                        <form onSubmit={handleSendOTP} className="animate-fade-in">
                            <button type="button" onClick={() => setAuthMode('DEFAULT')} className="flex items-center text-slate-500 hover:text-zinc-800 transition-colors text-xs font-medium mb-6">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back to options
                            </button>
                            <div className="text-center mb-8">
                                <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 border border-amber-100 shadow-sm">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-zinc-900 mb-2 font-outfit">Phone Login</h2>
                                <p className="text-sm text-slate-600 font-medium">We'll send a verification code to your phone.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="appearance-none block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors text-navy-900 font-medium"
                                            placeholder="+91 00000 00000"
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] text-slate-400">Include country code (e.g., +91 for India)</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-md text-sm font-bold text-navy-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue with Phone Number"}
                                </button>
                            </div>
                        </form>
                    )}

                    {authMode === 'OTP' && (
                        <form onSubmit={handleVerifyOTP} className="animate-fade-in">
                            <button type="button" onClick={() => setAuthMode('PHONE')} className="flex items-center text-slate-500 hover:text-navy-900 transition-colors text-xs font-medium mb-6">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Change number
                            </button>
                            <div className="text-center mb-8">
                                <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                                    <Hash className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-navy-900 mb-2 font-outfit">Enter Code</h2>
                                <p className="text-sm text-slate-600 font-medium">Enter the 6-digit code sent to <span className="font-bold text-zinc-900">{phoneNumber}</span></p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Verification Code</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Hash className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                            className="appearance-none block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-center tracking-[0.5em] text-lg font-bold transition-colors text-navy-900"
                                            placeholder="000000"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-md text-sm font-bold text-navy-900 bg-amber-400 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={loading}
                                    className="w-full text-center text-xs text-slate-500 hover:text-amber-500 transition-colors py-2 bg-transparent border-0 font-semibold"
                                >
                                    Didn't receive the code? Resend
                                </button>
                            </div>
                        </form>
                    )}

                    {authMode === 'ADMIN' && (
                        <form onSubmit={handleAdminLogin} className="animate-fade-in">
                            <button type="button" onClick={() => setAuthMode('DEFAULT')} className="flex items-center text-slate-500 hover:text-navy-900 transition-colors text-xs font-medium mb-6">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back to user login
                            </button>
                            <div className="text-center mb-10">
                                <div className="mx-auto w-12 h-12 bg-navy-50 text-navy-900 rounded-full flex items-center justify-center mb-4 border border-navy-100 shadow-sm">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-bold text-navy-900 mb-2 font-outfit">Admin Portal</h2>
                                <p className="text-sm text-slate-600 font-medium">Sign in with your elevated credentials.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Email address</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors text-navy-900 font-medium"
                                        placeholder="Enter the Admin Email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors text-navy-900 font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-dark-900 hover:bg-dark-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-900 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Login"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
