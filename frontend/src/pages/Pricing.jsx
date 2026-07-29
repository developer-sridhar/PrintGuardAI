import React, { useState } from 'react';
import { Check, X, Zap, Shield, Sparkles, CreditCard, Loader2, Layers, Gift, Clock, Star, Crown, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const loadScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const Pricing = () => {
    const [showCheckout, setShowCheckout] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const { userPlan, updatePlan, currentUser } = useAuth();
    const navigate = useNavigate();

    const handleUpgrade = (tierName) => {
        if (!currentUser) {
            toast.error("Please log in to upgrade your plan.");
            return;
        }

        if (tierName === userPlan) {
            toast(`You are already on the ${tierName} plan.`, { icon: 'ℹ️' });
            return;
        }

        if (tierName === 'Pro') {
            setShowCheckout(true);
        } else if (tierName === 'Enterprise') {
            toast.success("Sales team notified. We'll reach out shortly!");
        } else if (tierName === 'Free') {
            toast('You are already on the Free plan.', { icon: 'ℹ️' });
        }
    };

    const handleRazorpayPayment = async () => {
        if (!currentUser || !currentUser.uid) {
            toast.error("User session expired. Please log in again.");
            return;
        }

        setIsProcessing(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

            // 1. Load Razorpay Script
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                toast.error("Razorpay SDK failed to load. Are you online?");
                setIsProcessing(false);
                return;
            }

            // 2. Create Order in Backend
            const response = await fetch(`${apiBase}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.uid,
                    email: currentUser.email || '',
                    plan: 'Pro',
                    amount: 999
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create order');
            }

            const order = await response.json();

            // 3. Open Razorpay Checkout
            const options = {
                key: order.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "PrintGuard AI",
                description: "Pro Plan Subscription (7-Day Trial)",
                image: "https://printguard-ai.web.app/logo.png", // Use your actual logo URL
                order_id: order.id,
                handler: async function (response) {
                    // 4. Verify Payment in Backend
                    try {
                        const verifyRes = await fetch(`${apiBase}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                user_id: currentUser.uid,
                                plan: 'Pro'
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {
                            setShowCheckout(false);
                            setShowSuccess(true);

                            // Refresh plan status
                            if (updatePlan) updatePlan('Pro');

                            // Small delay before redirect
                            setTimeout(() => {
                                navigate('/dashboard');
                            }, 3500);
                        } else {
                            throw new Error(verifyData.detail || "Payment verification failed");
                        }
                    } catch (err) {
                        console.error("Verification Error:", err);
                        // toast.error(err.message || "Could not verify payment. Please contact support.");
                        setErrorMessage(err.message || "Could not verify the transaction with our servers.");
                        setShowError(true);
                    } finally {
                        setIsProcessing(false);
                        setShowCheckout(false);
                    }
                },
                prefill: {
                    name: currentUser.displayName || "",
                    email: currentUser.email || "",
                },
                notes: {
                    user_id: currentUser.uid
                },
                theme: {
                    color: "#FBBF24" // Amber-400
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false);
                        // Show "failed" state if they closed without paying, as requested for "failed animation"
                        setErrorMessage("Payment was cancelled or dismissed.");
                        setShowError(true);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            setShowCheckout(false); // Fix: Close custom modal to prevent focus/overlay conflicts with Razorpay
            rzp.open();

        } catch (error) {
            console.error("Razorpay Error:", error);
            // toast.error(error.message || "Failed to initiate payment. Please try again.");
            setErrorMessage(error.message || "Something went wrong while initiating the payment.");
            setShowError(true);
            setIsProcessing(false);
        }
    };

    const tiers = [
        {
            name: 'Free',
            price: '₹0',
            description: 'Essential prepress tools for individuals.',
            icon: Zap,
            features: [
                { name: '5 monthly scans', included: true },
                { name: 'Standard resolution check', included: true },
                { name: 'Basic color profile scan', included: true },
                { name: 'Community support', included: true },
                { name: 'Advanced PDF export', included: false },
            ],
            buttonText: 'Current Plan',
            popular: false,
            color: 'zinc',
            accent: 'zinc-500',
            gradient: 'from-zinc-800/50 to-zinc-900/50'
        },
        {
            name: 'Pro',
            price: '₹999',
            period: '/mo',
            description: 'The ultimate AI engine for print production.',
            icon: Crown,
            features: [
                { name: 'Unlimited file scans', included: true },
                { name: '1-Click Bleed Synthesis', included: true },
                { name: 'Premium PDF Reports', included: true },
                { name: 'AI Color Correction', included: true },
                { name: 'Priority Engine access', included: true },
            ],
            buttonText: 'Start 7-Day Trial',
            popular: true,
            color: 'amber',
            accent: 'amber-400',
            gradient: 'from-amber-400/20 via-orange-500/10 to-transparent',
            rotateAnimation: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Access all the features with your brand report',
            icon: Shield,
            features: [
                { name: 'Everything in Pro', included: true },
                { name: 'Multi-user collaboration', included: true },
                { name: 'Custom Brand presets', included: true },
                { name: 'Dedicated API access', included: true },
                { name: '24/7 VIP Support', included: true },
            ],
            buttonText: 'Contact Sales',
            popular: false,
            color: 'orange',
            accent: 'orange-500',
            gradient: 'from-orange-600/15 to-transparent'
        }
    ];

    return (
        <div className="relative min-h-[90vh] w-full py-20 px-6 overflow-hidden bg-dark-950 font-outfit">
            <style>{`
                @keyframes rotate-bg {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes shine {
                    0% { transform: translateX(-200%) skewX(-30deg); }
                    20% { transform: translateX(200%) skewX(-30deg); }
                    100% { transform: translateX(200%) skewX(-30deg); }
                }
                .animate-rotate-bg {
                    animation: rotate-bg 10s linear infinite;
                }
                .animate-shine {
                    animation: shine 4s ease-in-out infinite;
                }
            `}</style>
            {/* Unique Brand Background Elements */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-400/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-600/5 blur-[150px] rounded-full pointer-events-none -z-10"></div>

            {/* Geometric Grid Overlay - Cleaned up external asset */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"></div>

            <div className="text-center max-w-4xl mx-auto mb-24 relative">
                <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                        <Flame className="w-4 h-4 animate-bounce" />
                        Limited Time Offer
                    </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tight">
                    Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Premium AI</span>
                    <span className="ml-4 text-xs font-mono text-zinc-600">v1.2-rzp</span>
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
                    Unlock professional prepress tools, unlimited scans, and automated fixes.
                    Start your <span className="text-white border-b-2 border-amber-400/30">7-day free trial</span> today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto relative px-2">
                {tiers.map((tier) => (
                    <div
                        key={tier.name}
                        className={clsx(
                            "group relative flex flex-col p-10 rounded-[3rem] transition-all duration-700 bg-zinc-900/40 backdrop-blur-2xl border overflow-hidden shrink-0",
                            tier.popular
                                ? "border-amber-400/30 shadow-[0_0_60px_rgba(251,191,36,0.08)] ring-1 ring-amber-400/20 scale-[1.05] z-10"
                                : "border-zinc-800 shadow-2xl hover:border-zinc-700"
                        )}
                    >
                        {/* Premium Rotating Background (Pro Only) */}
                        {tier.rotateAnimation && (
                            <div className="absolute inset-0 overflow-hidden -z-20 pointer-events-none opacity-50">
                                <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(251,191,36,0.2)_15%,transparent_30%,rgba(249,115,22,0.1)_50%,transparent_70%,rgba(251,191,36,0.2)_85%,transparent_100%)] animate-rotate-bg"></div>
                            </div>
                        )}

                        {/* Shine Effect Sweep (Pro Only) */}
                        {tier.name === 'Pro' && (
                            <div className="absolute inset-0 overflow-hidden rounded-[3rem] pointer-events-none z-10">
                                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-30deg] animate-shine"></div>
                            </div>
                        )}

                        {/* Static Glow Border */}
                        {tier.popular && (
                            <div className="absolute inset-0 p-[1px] rounded-[3rem] bg-amber-400/20 -z-10"></div>
                        )}

                        {/* Background Gradient Hint */}
                        <div className={clsx(
                            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10",
                            tier.gradient
                        )}></div>

                        {/* Top Badge */}
                        {tier.popular && (
                            <div className="absolute top-6 right-8">
                                <div className="bg-amber-400 text-dark-950 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-tight shadow-lg shadow-amber-400/20">
                                    Trial Available
                                </div>
                            </div>
                        )}

                        <div className="relative z-10 h-full flex flex-col">
                            <div className={clsx(
                                "w-16 h-16 rounded-3xl flex items-center justify-center mb-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                                tier.color === 'amber' ? 'bg-amber-400 text-dark-950 shadow-[0_10px_25px_rgba(251,191,36,0.3)]' :
                                    tier.color === 'orange' ? 'bg-orange-500 text-white shadow-orange-500/20' :
                                        'bg-zinc-800 text-zinc-400'
                            )}>
                                <tier.icon className="w-8 h-8" />
                            </div>

                            <div className="mb-8">
                                <h2 className="text-3xl font-black text-white mb-2">{tier.name}</h2>
                                <div className="flex items-baseline gap-1.5 grayscale-0 transition-all duration-300 group-hover:translate-x-1">
                                    <span className="text-5xl font-black text-white tracking-tighter">{tier.price}</span>
                                    {tier.period && (
                                        <span className="text-zinc-500 font-bold text-lg">{tier.period}</span>
                                    )}
                                </div>
                                <p className="mt-4 text-zinc-400 text-sm font-medium leading-relaxed">
                                    {tier.description}
                                </p>
                            </div>

                            <div className="w-full h-px bg-zinc-800/60 mb-10"></div>

                            <ul className="space-y-5 mb-12 flex-1">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-4">
                                        <div className={clsx(
                                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                                            feature.included
                                                ? tier.color === 'amber' ? 'bg-amber-400/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                                : "bg-zinc-800 text-zinc-600"
                                        )}>
                                            {feature.included ? <Check className="w-3 h-3 stroke-[4]" /> : <X className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <span className={clsx(
                                            "text-[0.95rem] font-semibold",
                                            feature.included ? "text-zinc-200" : "text-zinc-500"
                                        )}>
                                            {feature.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(tier.name)}
                                disabled={tier.name === userPlan}
                                className={clsx(
                                    "relative group overflow-hidden w-full py-5 rounded-[2rem] font-black text-sm tracking-widest uppercase transition-all duration-500",
                                    tier.name === userPlan
                                        ? "bg-zinc-800 text-zinc-500 cursor-default"
                                        : tier.popular
                                            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-dark-950 shadow-[0_20px_40px_rgba(251,191,36,0.2)] hover:shadow-[0_25px_50px_rgba(251,191,36,0.4)] hover:-translate-y-1 active:translate-y-0"
                                            : "bg-zinc-800 hover:bg-zinc-700 text-white"
                                )}>
                                <span className={clsx(
                                    "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-1000",
                                    tier.name !== userPlan && "group-hover:translate-x-full"
                                )}></span>
                                {tier.name === userPlan ? 'Active Plan' : tier.buttonText}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Unique Vertical Brand Accents */}
            <div className="mt-32 pt-20 border-t border-zinc-900 text-center max-w-5xl mx-auto">
                <div className="flex flex-col items-center gap-10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em]">Global Industry Standards</p>
                    <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-20 grayscale saturate-0 contrast-[0.5]">
                        <div className="flex items-center gap-2 font-bold text-2xl text-white"><Sparkles className="w-6 h-6 text-amber-400" />Vistaprint</div>
                        <div className="flex items-center gap-2 font-bold text-2xl text-white"><Layers className="w-6 h-6 text-amber-400" />Moo.com</div>
                        <div className="flex items-center gap-2 font-bold text-2xl text-white"><Zap className="w-6 h-6 text-amber-400" />Printful</div>
                        <div className="flex items-center gap-2 font-bold text-2xl text-white"><Shield className="w-6 h-6 text-amber-400" />FedEx</div>
                    </div>
                </div>
            </div>

            {/* Premium Payment Success Animation Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-dark-950/98 backdrop-blur-3xl animate-in fade-in duration-500">
                    <style>{`
                        @keyframes scale-check {
                            0% { transform: scale(0); opacity: 0; }
                            50% { transform: scale(1.2); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        @keyframes premium-confetti {
                            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                        }
                        @keyframes success-pulse {
                            0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
                            70% { box-shadow: 0 0 0 40px rgba(251, 191, 36, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
                        }
                        .animate-scale-check {
                            animation: scale-check 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                        }
                        .animate-success-pulse {
                            animation: success-pulse 2s infinite;
                        }
                        .confetti-piece {
                            position: absolute;
                            width: 12px;
                            height: 12px;
                            background: #FBBF24;
                            top: -10%;
                            animation: premium-confetti 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
                        }
                    `}</style>

                    {/* Enhanced Floating Confetti Particles */}
                    {[...Array(35)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti-piece"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 4}s`,
                                backgroundColor: i % 3 === 0 ? '#FBBF24' : i % 2 === 0 ? '#F97316' : '#FFFFFF',
                                borderRadius: i % 4 === 0 ? '50%' : '3px',
                                width: `${Math.random() * 10 + 5}px`,
                                height: `${Math.random() * 10 + 5}px`,
                                opacity: 0.8
                            }}
                        />
                    ))}

                    <div className="text-center relative max-w-xl">
                        <div className="relative mb-12 inline-block">
                            <div className="absolute inset-0 bg-amber-400 blur-[80px] opacity-40 animate-pulse"></div>
                            <div className="w-40 h-40 bg-gradient-to-br from-amber-400 via-orange-400 to-orange-600 rounded-full flex items-center justify-center text-dark-950 shadow-[0_0_60px_rgba(251,191,36,0.6)] animate-scale-check animate-success-pulse relative z-10">
                                <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-white animate-bounce" />
                                <Check className="w-20 h-20 stroke-[4]" />
                            </div>
                        </div>

                        <h2 className="text-6xl md:text-7xl font-black text-white mb-8 tracking-tighter animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                            Success! <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-orange-500 underline decoration-amber-400/30 underline-offset-8">Plan Upgraded</span>
                        </h2>

                        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
                            <p className="text-2xl text-zinc-300 font-bold max-w-sm mx-auto leading-tight uppercase tracking-tight">
                                Welcome to the <span className="text-amber-400">PRO Engine</span> ecosystem.
                            </p>
                            <p className="text-zinc-500 font-medium max-w-xs mx-auto italic">
                                Your account is being provisioned with enterprise-grade print analysis tools.
                            </p>
                        </div>

                        <div className="mt-14 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
                            <div className="h-1 w-48 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 animate-[loading_3.5s_ease-in-out_forwards]"></div>
                            </div>
                            <div className="flex items-center gap-3 py-2 px-6 rounded-2xl bg-amber-400/10 border border-amber-400/20">
                                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">Preparing your Dashboard</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Payment Failed Animation Modal */}
            {showError && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-dark-950/98 backdrop-blur-3xl animate-in fade-in duration-500">
                    <style>{`
                        @keyframes error-shake {
                            0%, 100% { transform: translateX(0); }
                            25% { transform: translateX(-10px); }
                            75% { transform: translateX(10px); }
                        }
                        @keyframes error-glow {
                            0% { opacity: 0.3; transform: scale(1); }
                            50% { opacity: 0.6; transform: scale(1.1); }
                            100% { opacity: 0.3; transform: scale(1); }
                        }
                        .animate-error-shake {
                            animation: error-shake 0.4s ease-in-out 3;
                        }
                        .animate-error-glow {
                            animation: error-glow 3s infinite;
                        }
                    `}</style>

                    <div className="text-center relative max-w-md w-full">
                        <div className="relative mb-10 inline-block group">
                            <div className="absolute inset-0 bg-red-600 blur-[80px] opacity-30 animate-error-glow"></div>
                            <div className="w-32 h-32 bg-zinc-900 border-2 border-red-500/50 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-in zoom-in-50 duration-500 relative z-10">
                                <X className="w-16 h-16 stroke-[3] animate-error-shake" />
                            </div>
                        </div>

                        <h2 className="text-4xl font-black text-white mb-4 tracking-tighter animate-in slide-in-from-top-4 duration-700">
                            Oops! <span className="text-red-500">Payment Failed</span>
                        </h2>

                        <p className="text-zinc-400 font-medium mb-10 animate-in slide-in-from-top-4 duration-700 delay-100 fill-mode-both">
                            {errorMessage || "We couldn't process your payment. This could be due to a network error or a cancelled session."}
                        </p>

                        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                            <button
                                onClick={() => {
                                    setShowError(false);
                                    setShowCheckout(true);
                                }}
                                className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-3xl transition-all uppercase tracking-widest text-xs border border-zinc-700"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => setShowError(false)}
                                className="w-full py-4 text-zinc-500 hover:text-zinc-300 font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Brand Checkout */}
            {showCheckout && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-dark-950/90 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden relative">
                        {/* Glow Circle */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 blur-[60px] rounded-full"></div>

                        <div className="p-10">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-dark-950 shadow-[0_8px_20px_rgba(251,191,36,0.4)]">
                                        <Crown className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white leading-tight">Pro Plan Trial</h3>
                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1">₹999/mo after 7 days</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCheckout(false)} className="p-3 text-zinc-500 hover:bg-zinc-800 rounded-full transition-all group/close">
                                    <X className="w-6 h-6 group-hover/close:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 rounded-3xl bg-zinc-800/50 border border-zinc-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Clock className="w-5 h-5 text-amber-400" />
                                        <p className="text-sm font-bold text-white uppercase tracking-tighter">7-Day Free Trial</p>
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium leading-relaxed italic">
                                        Support for all payment methods including **UPI, Cards, and Net Banking**.
                                        You won't be charged for the first 7 days. Cancel anytime.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={handleRazorpayPayment}
                                        disabled={isProcessing}
                                        className="w-full py-6 bg-amber-400 text-dark-950 font-black rounded-3xl shadow-xl shadow-amber-400/20 hover:shadow-amber-400/40 hover:-translate-y-1 active:translate-y-0 transition-all text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3"
                                    >
                                        {isProcessing ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Preparing Secure Checkout...</>
                                        ) : (
                                            <><CreditCard className="w-5 h-5" /> Proceed to Secure Payment</>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest pt-2">
                                        <Shield className="w-4 h-4" />
                                        Powered by Razorpay • Secured by 256-bit SSL
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pricing;
