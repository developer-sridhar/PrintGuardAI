import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const InkCoverageChart = ({ cmyk_coverage = { c: 42, m: 38, y: 35, k: 65 }, tac = 180 }) => {
    const options = {
        indexAxis: 'y',
        elements: {
            bar: {
                borderWidth: 0,
                borderRadius: 8,
            },
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#18181b',
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                borderColor: '#27272a',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (context) => ` ${context.parsed.x}% Coverage`,
                }
            }
        },
        scales: {
            x: {
                max: 100,
                grid: {
                    color: '#27272a',
                    drawBorder: false
                },
                ticks: {
                    color: '#71717a',
                    font: { size: 10 }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#e4e4e7',
                    font: { weight: '600' }
                }
            }
        }
    };

    const labels = ['Cyan', 'Magenta', 'Yellow', 'Black'];

    const data = {
        labels,
        datasets: [
            {
                label: 'Coverage %',
                data: [cmyk_coverage.c, cmyk_coverage.m, cmyk_coverage.y, cmyk_coverage.k],
                borderColor: [
                    '#06b6d4', // Cyan
                    '#ec4899', // Magenta
                    '#eab308', // Yellow
                    '#1e293b', // Black (Dark Slate)
                ],
                backgroundColor: [
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(30, 41, 59, 0.8)',
                ],
            },
        ],
    };

    return (
        <div className="bg-dark-900/60 backdrop-blur-md rounded-2xl border border-zinc-800/60 p-8 h-full flex flex-col shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(var(--brand-primary),0.05)] blur-3xl rounded-full pointer-events-none"></div>
            <h3 className="text-lg font-bold text-white mb-6 tracking-tight">Ink Analytics (CMYK)</h3>

            <div className="flex-grow min-h-[220px] w-full relative z-10">
                <Bar options={options} data={data} />
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800/60 flex items-center justify-between relative z-10">
                <div>
                    <p className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-1">Total Area Coverage</p>
                    <p className="text-3xl font-black text-white tracking-tighter">{tac}%</p>
                </div>
                <div className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 ${tac > 300 ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                    {tac > 300 ? 'High Ink Overload' : 'Optimal Limit'}
                </div>
            </div>
        </div>
    );
};

export default InkCoverageChart;
