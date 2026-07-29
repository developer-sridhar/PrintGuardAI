import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const ScoreGauge = ({ score }) => {
    let color = '#10b981'; // emerald-500
    let text = 'HIGH';
    if (score < 60) {
        color = '#ef4444'; // red-500
        text = 'LOW';
    } else if (score < 80) {
        color = '#f59e0b'; // amber-500
        text = 'MEDIUM';
    }

    return (
        <div className="bg-navy-900 rounded-2xl p-6 text-white flex flex-col items-center justify-center h-full relative overflow-hidden">
            {/* Decorative background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl rounded-full pointer-events-none"></div>

            <div className="w-32 h-32 mb-6 relative z-10">
                <CircularProgressbar
                    value={score}
                    text={`${score}`}
                    styles={buildStyles({
                        pathColor: color,
                        textColor: color,
                        trailColor: 'rgba(255, 255, 255, 0.1)',
                        textSize: '28px',
                        pathTransitionDuration: 1.5,
                    })}
                />
            </div>

            <h3 className="text-xl font-poppins font-semibold mb-1">Print Safety Level</h3>

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mt-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-sm font-medium tracking-wide" style={{ color }}>{text}</span>
            </div>
        </div>
    );
};

export default ScoreGauge;
