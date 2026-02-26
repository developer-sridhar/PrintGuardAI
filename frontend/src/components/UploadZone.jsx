import React, { useState } from 'react';
import { UploadCloud, File, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const UploadZone = () => {
    const navigate = useNavigate();
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            toast.error("Please select a file first");
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);

            const host = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
            const response = await fetch(`${host}/api/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            toast.success("Analysis complete!");

            // Navigate to report and pass the fetched data via React Router state
            navigate('/report', { state: { reportData: data } });

        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to analyze file. Is the backend running?");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto rounded-3xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 isolate">
            <div className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 mx-auto bg-cyan-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-cyan-50/50">
                    <UploadCloud className="w-10 h-10 text-cyan-500" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-navy-900 mb-2">
                    Upload Design File
                </h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                    Drag & drop your PDF, AI, PSD, or EPS file here. We'll analyze color profiles, layout safety, and print readiness.
                </p>

                <form onSubmit={handleUpload} className="relative group cursor-pointer border-2 border-dashed border-slate-300 hover:border-cyan-400 bg-slate-50 hover:bg-cyan-50/30 transition-all rounded-2xl py-12 px-6">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={isUploading}
                    />

                    <div className="flex flex-col items-center justify-center group-hover:transform group-hover:-translate-y-1 transition-transform">
                        {isUploading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mb-4" />
                                <span className="font-medium text-navy-900">Neural Engine Analyzing...</span>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-navy-900 text-white font-semibold text-sm shadow-md mb-4 group-hover:bg-cyan-600 transition-colors z-20 relative pointer-events-auto"
                                >
                                    {selectedFile ? `Analyze: ${selectedFile.name}` : 'Browse Files'}
                                </button>
                                <p className="text-sm text-slate-400 font-medium tracking-wide">
                                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Max file size: 50MB'}
                                </p>
                            </>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-center text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>Secure & Private</span>
                </div>
                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-slate-400" />
                    <span>PDF, SVG, AI, TIFF</span>
                </div>
                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <span>Auto-fixes available</span>
                </div>
            </div>
        </div>
    );
};

export default UploadZone;
