import React, { useState } from 'react';
import { Ruler } from 'lucide-react';

const DesignDimensions = ({ widthPx, heightPx, dpi = 300, isPdf = false }) => {
    const [unit, setUnit] = useState('mm');

    // Prevent division by zero
    const safeDpi = dpi > 0 ? dpi : 300;

    // Calculate different units
    const widthInches = widthPx / safeDpi;
    const heightInches = heightPx / safeDpi;

    const dimensions = {
        px: { w: Math.round(widthPx), h: Math.round(heightPx), symbol: 'px' },
        in: { w: Number(widthInches.toFixed(2)), h: Number(heightInches.toFixed(2)), symbol: 'in' },
        cm: { w: Number((widthInches * 2.54).toFixed(2)), h: Number((heightInches * 2.54).toFixed(2)), symbol: 'cm' },
        mm: { w: Math.round(widthInches * 25.4), h: Math.round(heightInches * 25.4), symbol: 'mm' },
        ft: { w: Number((widthInches / 12).toFixed(2)), h: Number((heightInches / 12).toFixed(2)), symbol: 'ft' },
    };

    const currentDim = dimensions[unit];

    // Format Prediction based on mm
    const w = dimensions.mm.w;
    const h = dimensions.mm.h;

    // Helper to check if dimensions match (allowing 5px/mm tolerance)
    const matches = (w1, h1, targetW, targetH, tol = 5) => {
        return (Math.abs(w1 - targetW) <= tol && Math.abs(h1 - targetH) <= tol) ||
            (Math.abs(w1 - targetH) <= tol && Math.abs(h1 - targetW) <= tol);
    };

    let predictedFormat = "Custom Size";
    if (widthPx === 0 || heightPx === 0) {
        predictedFormat = "Unknown";
    }
    else if (matches(w, h, 210, 297)) predictedFormat = "A4 Standard";
    else if (matches(w, h, 148, 210)) predictedFormat = "A5 Standard";
    else if (matches(w, h, 105, 148)) predictedFormat = "A6 Standard";
    else if (matches(w, h, 297, 420)) predictedFormat = "A3 Standard";
    else if (matches(w, h, 420, 594)) predictedFormat = "A2 Standard";
    else if (matches(w, h, 85, 55)) predictedFormat = "Business Card (EU)";
    else if (matches(w, h, 89, 51)) predictedFormat = "Business Card (US)";
    else if (matches(w, h, 216, 279)) predictedFormat = "US Letter";
    else if (matches(w, h, 216, 356)) predictedFormat = "US Legal";

    if (widthPx === 0 || heightPx === 0) return null;

    return (
        <div className={`mt-6 ${!isPdf ? 'bg-dark-950/50 p-4 rounded-xl border border-zinc-800/50' : 'bg-slate-50 p-4 rounded-xl border border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Ruler className={`w-5 h-5 ${!isPdf ? 'text-zinc-400' : 'text-slate-500'}`} />
                    <h3 className={`font-semibold ${!isPdf ? 'text-white' : 'text-slate-900'}`}>Original Complete Design Size</h3>
                </div>
                {!isPdf && (
                    <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="bg-dark-900 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-2 py-1 outline-none focus:border-[rgb(var(--brand-primary))]"
                    >
                        <option value="mm">Millimeters (mm)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="in">Inches (in)</option>
                        <option value="px">Pixels (px)</option>
                        <option value="ft">Feet (ft)</option>
                    </select>
                )}
                {isPdf && (
                    <span className="text-sm text-slate-500 font-medium">Physical Size Limit</span>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${!isPdf ? 'text-[rgb(var(--brand-primary))]' : 'text-emerald-600'}`}>
                        {currentDim.w} × {currentDim.h}
                    </span>
                    <span className={`text-sm font-medium ${!isPdf ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {currentDim.symbol}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-md ${!isPdf ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'} font-medium`}>
                        Format Prediction: {predictedFormat}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-md ${!isPdf ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'}`}>
                        @ {safeDpi} DPI
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DesignDimensions;
