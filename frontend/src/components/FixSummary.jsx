import React from 'react';
import { CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

const FixSummary = ({ fixes = [], score = 94 }) => {
    return (
        <div className="bg-dark-900/60 backdrop-blur-md rounded-2xl border border-zinc-800/60 p-8 h-full shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Auto Fix &amp; Suggestions</h3>
                    <p className="text-sm text-zinc-500 mt-1">AI-Powered corrections &amp; recommendations</p>
                </div>
                <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                    <Sparkles className="w-6 h-6" />
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                {/* ── Format Recommendation Suggestion ── */}
                <div className="flex items-start p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/25 shadow-sm group">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform animate-pulse" />
                    <div className="ml-3">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">Pro Suggestion</span>
                        <span className="text-zinc-200 font-medium text-xs leading-relaxed block mt-0.5">
                            <strong>Uploading PDF is best for analysis:</strong> Vector PDF files preserve crisp typography, resolution scaling, and exact 3mm bleed margins for optimal press output.
                        </span>
                    </div>
                </div>

                {fixes.map((fix, index) => (
                    <div key={index} className="flex items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-colors group">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="ml-4 text-zinc-300 font-medium text-sm">{fix}</span>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800/60 flex items-center justify-between relative z-10">
                <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Final Print Score</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white tracking-tight">{score}</span>
                        <span className="text-sm font-bold text-zinc-600 uppercase">/100</span>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white border border-zinc-700/50 rounded-xl transition-all active:scale-95 uppercase tracking-wider">
                    <RotateCcw className="w-4 h-4" />
                    Revert
                </button>
            </div>
        </div>
    );
};

export default FixSummary;
