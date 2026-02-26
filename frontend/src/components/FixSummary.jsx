import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

const FixSummary = ({ fixes = [], score = 94 }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-navy-900">Auto Fix Summary</h3>
                    <p className="text-sm text-slate-500 mt-1">Corrections applied before final output</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
            </div>

            <div className="space-y-4">
                {fixes.map((fix, index) => (
                    <div key={index} className="flex items-start">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="ml-3 text-slate-700">{fix}</span>
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 mb-1">Final Print Score</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-navy-900">{score}</span>
                        <span className="text-sm font-medium text-slate-400">/100</span>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <RotateCcw className="w-4 h-4" />
                    Revert Original
                </button>
            </div>
        </div>
    );
};

export default FixSummary;
