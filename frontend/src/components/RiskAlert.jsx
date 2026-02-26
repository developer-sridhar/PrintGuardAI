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
        high: 'bg-red-50 border-red-200 text-red-800',
        medium: 'bg-amber-50 border-amber-200 text-amber-800',
        low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        safe: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        info: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    };

    return (
        <div className={clsx(
            "flex items-start p-4 mb-3 border rounded-xl",
            bgMap[type] || bgMap.info,
            className
        )}>
            {iconMap[type] || iconMap.info}
            <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
            </div>
        </div>
    );
};

export default RiskAlert;
