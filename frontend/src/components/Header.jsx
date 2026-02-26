import React from 'react';
import { Bell, Search } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
            <div className="flex items-center text-slate-400 focus-within:text-navy-600 transition-colors w-96">
                <Search className="w-5 h-5 absolute ml-3 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search past reports or files..."
                    className="bg-slate-50 border-none outline-none text-sm text-slate-700 py-2 pl-10 pr-4 rounded-xl w-full focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
            </div>
        </header>
    );
};

export default Header;
