import React, { useState } from 'react';
import { FileText, Download, Maximize2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker securely from CDN matching the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FilePreview = ({ fileData, previewUrl }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    
    // Determine preview capabilities based on file format
    const isImage = fileData?.file_name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    const isPdf = fileData?.file_name.match(/\.(pdf)$/i) != null;

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

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
                    {isPdf && previewUrl ? (
                         <div className="w-full flex-col flex items-center bg-slate-100 overflow-hidden">
                             <Document
                                 file={previewUrl}
                                 onLoadSuccess={onDocumentLoadSuccess}
                                 loading={<Loader2 className="w-8 h-8 text-cyan-600 animate-spin my-12" />}
                                 error={
                                    <div className="p-8 text-center border-2 border-dashed border-red-200/50 rounded flex flex-col items-center justify-center bg-red-50/20 m-4">
                                        <span className="text-sm font-medium text-slate-500 font-mono">PDF Preview Error</span>
                                        <span className="text-xs text-slate-400 mt-2">Failed to render the document visually.</span>
                                    </div>
                                 }
                             >
                                 <Page 
                                    pageNumber={pageNumber} 
                                    width={380} // Cap width to fit nicely in the max-w-md container
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                 />
                             </Document>
                             {numPages && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-navy-900/90 backdrop-blur text-white px-3 py-2 rounded-full font-medium shadow-lg flex items-center gap-4 border border-navy-700">
                                    <button 
                                        onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                                        disabled={pageNumber <= 1}
                                        className="p-1 hover:bg-white/20 hover:text-cyan-400 rounded-full disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-xs tracking-widest uppercase font-semibold text-slate-300">
                                        Page <span className="text-white">{pageNumber}</span> / {numPages}
                                    </span>
                                    <button 
                                        onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                                        disabled={pageNumber >= numPages}
                                        className="p-1 hover:bg-white/20 hover:text-cyan-400 rounded-full disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white transition-all"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                             )}
                         </div>
                    ) : isImage && previewUrl ? (
                        <img 
                            src={previewUrl} 
                            alt="Uploaded Design Preview" 
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="absolute inset-4 border-2 border-dashed border-cyan-200/50 rounded flex flex-col items-center justify-center bg-cyan-50/20">
                            <span className="text-sm font-medium text-slate-400 font-mono">{fileData?.file_name.split('.').pop().toUpperCase() || 'DOCUMENT'} File</span>
                            <span className="text-xs text-slate-400 mt-2 text-center px-4">Complex vector formulas usually require desktop rendering. Analysis data is calculated server-side.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreview;
