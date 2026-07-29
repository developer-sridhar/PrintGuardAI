import React from 'react';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';

const PredictionCard = ({ title, type = 'digital', result, riskLevel }) => {
    const getBorderColor = () => {
        switch (riskLevel) {
            case 'low': return 'border-emerald-500/20 bg-emerald-500/5';
            case 'medium': return 'border-amber-500/20 bg-amber-500/5';
            case 'high': return 'border-red-500/20 bg-red-500/5';
            default: return 'border-zinc-800 bg-zinc-900/40';
        }
    };

    const getTextColor = () => {
        switch (riskLevel) {
            case 'low': return 'text-emerald-400';
            case 'medium': return 'text-amber-400';
            case 'high': return 'text-red-400';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className={clsx("rounded-2xl p-6 border backdrop-blur-md transition-all duration-300 hover:scale-[1.02]", getBorderColor())}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-white flex items-center gap-2 tracking-tight">
                    <span className="text-xl">{type === 'digital' ? '🖨️' : '🗞️'}</span> {title}
                </h4>
                {riskLevel === 'low' && <Sparkles className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
            </div>

            <p className={clsx("text-sm font-medium leading-relaxed", getTextColor())}>
                {result}
            </p>

            <div className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Suitability</span>
                <span className={clsx(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                    riskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                )}>
                    {riskLevel === 'low' ? 'Excellent' : riskLevel === 'medium' ? 'Good' : 'Poor'}
                </span>
            </div>
        </div>
    );
};

export default PredictionCard;
