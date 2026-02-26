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
                borderWidth: 2,
                borderRadius: 4,
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
                callbacks: {
                    label: (context) => `${context.parsed.x}%`,
                }
            }
        },
        scales: {
            x: {
                max: 100,
                grid: {
                    color: '#f1f5f9'
                }
            },
            y: {
                grid: {
                    display: false
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Ink Coverage Analysis</h3>

            <div className="flex-grow min-h-[200px] w-full relative">
                <Bar options={options} data={data} />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Area Coverage (TAC)</p>
                    <p className="text-2xl font-bold text-navy-900">{tac}%</p>
                </div>
                <div className={`px-3 py-1 text-sm font-medium rounded-full ${tac > 300 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {tac > 300 ? 'Warning: High Ink Load' : 'Safe Limit'}
                </div>
            </div>
        </div>
    );
};

export default InkCoverageChart;
