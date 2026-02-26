import React from 'react';
import { FileText, Download, Maximize2 } from 'lucide-react';

const FilePreview = ({ fileData, previewUrl }) => {
    // Determine if it's a vector/pdf format based on filename
    const isImage = previewUrl !== null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-navy-100 text-navy-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">{fileData?.file_name || 'Analyzing Document...'}</h3>
                        <p className="text-xs text-slate-500">{fileData?.resolution || 'Calculated DPI'} • {fileData?.print_method || 'Print Ready'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Maximize2 className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-grow bg-slate-100 p-6 flex items-center justify-center relative group min-h-[400px]">
                {/* Background watermarks */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <FileText className="w-64 h-64 text-slate-400" />
                </div>

                <div className="relative w-full max-w-md bg-white shadow-lg border border-slate-200 rounded animate-fade-in mx-auto transform transition-transform group-hover:scale-[1.02] overflow-hidden flex items-center justify-center min-h-[400px]">
                    {isImage ? (
                        <img 
                            src={previewUrl} 
                            alt="Uploaded Design Preview" 
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="absolute inset-4 border-2 border-dashed border-cyan-200/50 rounded flex flex-col items-center justify-center bg-cyan-50/20">
                            <span className="text-sm font-medium text-slate-400 font-mono">{fileData?.file_name.split('.').pop().toUpperCase() || 'DOCUMENT'} File</span>
                            <span className="text-xs text-slate-400 mt-2 text-center px-4">Vector formats usually require desktop rendering. Analysis data is calculated server-side.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreview;
