import React, { useState } from 'react';
import { Check, X, Zap, Shield, Sparkles, X as XIcon, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const Pricing = () => {
    const [showCheckout, setShowCheckout] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleUpgrade = (tierName) => {
        if (tierName === 'Pro') {
            setShowCheckout(true);
        } else if (tierName === 'Enterprise') {
            toast.success("Sales team notified. We'll reach out shortly!");
        } else {
            toast('You are already on the Free plan.', { icon: 'ℹ️' });
        }
    };

    const handleMockPayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setShowCheckout(false);
            toast.success("Payment Successful! Welcome to PrintGuard Pro.");
        }, 1500);
    };
    const tiers = [
        {
            name: 'Free',
            price: '$0',
            description: 'Essential tools for casual designers',
            icon: Zap,
            features: [
                { name: 'Up to 5 file scans/month', included: true },
                { name: 'Basic CMYK & DPI Analysis', included: true },
                { name: 'Matte/Glossy Predictions', included: true },
                { name: 'Download PDF Report', included: false },
                { name: 'Auto-Fix Corrections', included: false },
                { name: 'API Access', included: false }
            ],
            buttonText: 'Current Plan',
            popular: false,
            color: 'slate'
        },
        {
            name: 'Pro',
            price: '$29',
            period: '/mo',
            description: 'Advanced AI features for print shops',
            icon: Sparkles,
            features: [
                { name: 'Unlimited file scans', included: true },
                { name: 'Advanced TAC & Ink Analysis', included: true },
                { name: 'ALL Surface Predictions', included: true },
                { name: 'Download Premium PDF Report', included: true },
                { name: '1-Click Auto-Fix Corrections', included: true },
                { name: 'API Access', included: false }
            ],
            buttonText: 'Upgrade to Pro',
            popular: true,
            color: 'cyan'
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Volume processing for large agencies',
            icon: Shield,
            features: [
                { name: 'Everything in Pro', included: true },
                { name: 'Custom Branding on PDF', included: true },
                { name: 'Dedicated Account Manager', included: true },
                { name: 'On-Premise Deployment options', included: true },
                { name: 'SLA Support', included: true },
                { name: 'Full API Access', included: true }
            ],
            buttonText: 'Contact Sales',
            popular: false,
            color: 'navy'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fade-in pb-24">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-3xl font-poppins font-bold text-navy-900 mb-4 tracking-tight">
                    Simple, transparent pricing
                </h1>
                <p className="text-lg text-slate-500">
                    No hidden fees. Choose the plan that best fits your design workflow or print agency size.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {tiers.map((tier) => (
                    <div
                        key={tier.name}
                        className={clsx(
                            "relative flex flex-col p-8 rounded-3xl bg-white border transition-all duration-300",
                            tier.popular
                                ? "border-cyan-500 shadow-xl shadow-cyan-500/10 scale-105 z-10"
                                : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                        )}
                    >
                        {tier.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                <span className="bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                    Most Popular
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                            <div className={clsx(
                                "p-2 rounded-xl",
                                tier.color === 'cyan' ? 'bg-cyan-50 text-cyan-600' :
                                    tier.color === 'navy' ? 'bg-navy-50 text-navy-900' : 'bg-slate-50 text-slate-600'
                            )}>
                                <tier.icon className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-navy-900">{tier.name}</h2>
                        </div>

                        <div className="mb-6">
                            <span className="text-4xl font-extrabold text-navy-900">{tier.price}</span>
                            {tier.period && (
                                <span className="text-slate-500 font-medium">{tier.period}</span>
                            )}
                        </div>

                        <p className="text-slate-500 text-sm mb-8 flex-1">
                            {tier.description}
                        </p>

                        <ul className="space-y-4 mb-8">
                            {tier.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    {feature.included ? (
                                        <Check className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                                    )}
                                    <span className={clsx(
                                        "text-sm",
                                        feature.included ? "text-slate-700" : "text-slate-400"
                                    )}>
                                        {feature.name}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(tier.name)}
                            className={clsx(
                                "w-full py-3 px-6 rounded-xl font-medium transition-all duration-200",
                                tier.popular
                                    ? "bg-navy-900 text-white hover:bg-navy-800 shadow-lg shadow-navy-900/20"
                                    : tier.name === 'Free'
                                        ? "bg-slate-100 text-navy-900 hover:bg-slate-200"
                                        : "border-2 border-navy-900 text-navy-900 hover:bg-navy-50"
                            )}>
                            {tier.buttonText}
                        </button>
                    </div>
                ))}
            </div>

            {/* Enterprise Logos Section */}
            <div className="mt-24 pt-12 border-t border-slate-200 text-center">
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-8">
                    Trusted by innovative print teams globally
                </p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
                    {/* Placeholder placeholders for beautiful logos */}
                    <div className="flex items-center gap-2 font-bold text-xl text-navy-900"><Sparkles className="w-6 h-6" />Vistaprint</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-navy-900"><Layers className="w-6 h-6" />Moo</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-navy-900"><Zap className="w-6 h-6" />Printful</div>
                    <div className="flex items-center gap-2 font-bold text-xl text-navy-900"><Shield className="w-6 h-6" />FedEx Office</div>
                </div>
            </div>

            {/* Mock Stripe Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-navy-900 text-lg">Subscribe to Pro</span>
                            </div>
                            <button
                                onClick={() => setShowCheckout(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-500 font-medium">Billed Monthly</p>
                                <h2 className="text-4xl font-extrabold text-navy-900 mt-1">$29<span className="text-lg text-slate-400 font-medium">.00</span></h2>
                            </div>

                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input type="email" defaultValue="user@example.com" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Card Information</label>
                                    <div className="relative">
                                        <CreditCard className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input type="text" placeholder="Card number" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-t-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="flex">
                                        <input type="text" placeholder="MM / YY" className="w-1/2 px-4 py-2 border border-t-0 border-r-0 border-slate-300 rounded-bl-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <input type="text" placeholder="CVC" className="w-1/2 px-4 py-2 border border-t-0 border-slate-300 rounded-br-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name on card</label>
                                    <input type="text" placeholder="John Doe" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>

                                <button
                                    onClick={handleMockPayment}
                                    disabled={isProcessing}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                    ) : (
                                        "Subscribe"
                                    )}
                                </button>

                                <p className="text-xs text-center text-slate-400 mt-4">
                                    Trusted by Stripe • Secured with 256-bit encryption
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pricing;
