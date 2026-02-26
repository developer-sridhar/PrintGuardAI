import React from 'react';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';

const PredictionCard = ({ title, type = 'digital', result, riskLevel }) => {
    const getBorderColor = () => {
        switch (riskLevel) {
            case 'low': return 'border-emerald-200 bg-emerald-50/50';
            case 'medium': return 'border-amber-200 bg-amber-50/50';
            case 'high': return 'border-red-200 bg-red-50/50';
            default: return 'border-slate-200';
        }
    };

    const getTextColor = () => {
        switch (riskLevel) {
            case 'low': return 'text-emerald-700';
            case 'medium': return 'text-amber-700';
            case 'high': return 'text-red-700';
            default: return 'text-slate-700';
        }
    };

    return (
        <div className={clsx("rounded-xl p-4 border transition-colors", getBorderColor())}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    {type === 'digital' ? '🖨️' : '🗞️'} {title}
                </h4>
                {riskLevel === 'low' && <Sparkles className="w-4 h-4 text-emerald-500" />}
            </div>

            <p className={clsx("text-sm font-medium", getTextColor())}>
                {result}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-between items-center text-xs">
                <span className="text-slate-500 uppercase tracking-wider font-semibold">Suitability</span>
                <span className={clsx(
                    "px-2 py-1 rounded-md font-bold",
                    riskLevel === 'low' ? 'bg-emerald-100 text-emerald-800' :
                        riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                )}>
                    {riskLevel === 'low' ? 'Excellent' : riskLevel === 'medium' ? 'Good' : 'Poor'}
                </span>
            </div>
        </div>
    );
};

export default PredictionCard;
