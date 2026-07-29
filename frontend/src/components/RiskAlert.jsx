import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const RiskAlert = ({ type, message, className }) => {
    const iconMap = {
        high: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />,
        medium: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
        low: <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />,
        safe: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
        info: <Info className="w-5 h-5 text-cyan-500 shrink-0" />,
    };

    const bgMap = {
        high: 'bg-red-500/10 border-red-500/20 text-red-300',
        medium: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        low: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
        safe: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
        info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    };

    return (
        <div className={clsx(
            "flex items-start p-4 mb-3 border rounded-xl backdrop-blur-md transition-all duration-300",
            bgMap[type] || bgMap.info,
            className
        )}>
            {iconMap[type] || iconMap.info}
            <div className="ml-3">
                <p className="text-sm font-semibold tracking-tight leading-snug">{message}</p>
            </div>
        </div>
    );
};

export default RiskAlert;
