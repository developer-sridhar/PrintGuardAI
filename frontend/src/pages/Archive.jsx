import React, { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, FileText, CheckCircle, Clock, Search, Loader2, Trash2, X, AlertTriangle, Edit3, Save } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Archive = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState(location.state?.searchQuery || '');
    const [filesData, setFilesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // Update search term if location state changes while already on the page
    useEffect(() => {
        if (location.state?.searchQuery !== undefined) {
            setSearchTerm(location.state.searchQuery);
        }
    }, [location.state?.searchQuery]);

    const fetchAnalyses = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Fetch unified history from Backend (merges Supabase & Firebase)
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/history?user_id=${currentUser.uid}`);

            if (!response.ok) throw new Error('Failed to fetch unified history');

            const data = await response.json();

            if (!data || data.length === 0) {
                setFilesData([]);
            } else {
                setFilesData(data);
            }
        } catch (error) {
            console.error("Error fetching archive from Backend:", error);
            setFilesData([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchAnalyses();
    }, [fetchAnalyses]);

    const filteredData = filesData.filter(item =>
        item.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toString().includes(searchTerm)
    );

    const handleDownloadConverted = async (path, format = 'pdf') => {
        if (!path) return;
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
            const a = document.createElement('a');
            a.href = path;
            a.download = `CMYK_Converted_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        try {
            let signedUrl = null;
            try {
                const { data } = await supabase.storage.from('uploads').createSignedUrl(path, 120);
                if (data?.signedUrl) signedUrl = data.signedUrl;
            } catch (e1) {}

            if (!signedUrl) {
                try {
                    const { data } = await supabase.storage.from('printguardai').createSignedUrl(path, 120);
                    if (data?.signedUrl) signedUrl = data.signedUrl;
                } catch (e2) {}
            }

            if (signedUrl) {
                const a = document.createElement('a');
                a.href = signedUrl;
                a.download = `CMYK_Converted_${Date.now()}.${format}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                toast.error("File link expired or missing from storage.");
            }
        } catch (error) {
            console.error("Error downloading converted file:", error);
            toast.error("Failed to download the converted file.");
        }
    };

    const handleConvertFile = async (item, format = "pdf") => {
        const storagePath = item.supabase_storage_path || item.analysis_data?.supabase_storage_path;
        const base64Preview = item.analysis_data?.rendered_pages?.[0] || item.analysis_data?.color_maps?.[0];

        try {
            setProcessingId(item.id);
            toast.loading(`Converting ${item.file_name || 'file'} to CMYK ${format.toUpperCase()}...`, { id: 'archive-convert' });

            const formData = new FormData();
            formData.append('user_id', currentUser?.uid || '');
            formData.append('analysis_id', item.job_id || item.id || '');
            formData.append('format', format);
            formData.append('file_name_param', item.file_name || 'document.pdf');
            if (storagePath) formData.append('supabase_storage_path', storagePath);
            if (base64Preview) formData.append('base64_image', base64Preview);

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/convert-analysis`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.detail || 'Conversion failed');
            }

            const blob = await response.blob();

            // Optional: Upload Converted File back to Supabase if storage is active
            let uploadPath = null;
            if (supabase && currentUser?.uid) {
                try {
                    const convertedFileName = `converted_${currentUser.uid}_${Date.now()}.${format}`;
                    const convertedFilePath = `conversions/${convertedFileName}`;
                    
                    try {
                        const { data: uploadData } = await supabase.storage
                            .from('uploads')
                            .upload(convertedFilePath, blob, { cacheControl: '3600', upsert: true });
                        if (uploadData) uploadPath = uploadData.path;
                    } catch (uErr1) {
                        try {
                            const { data: uploadData2 } = await supabase.storage
                                .from('printguardai')
                                .upload(convertedFilePath, blob, { cacheControl: '3600', upsert: true });
                            if (uploadData2) uploadPath = uploadData2.path;
                        } catch (uErr2) {}
                    }

                    // Update Supabase 'reports' table (Fix 404 error)
                    if (item.id) {
                        const isNum = !isNaN(Number(item.id));
                        await supabase
                            .from('reports')
                            .update({
                                analysis_data: {
                                    ...(item.analysis_data || {}),
                                    converted_file: {
                                        format: format,
                                        path: uploadPath || convertedFilePath,
                                        created_at: new Date().toISOString()
                                    }
                                }
                            })
                            .eq(isNum ? 'id' : 'job_id', isNum ? Number(item.id) : item.id);
                    }
                } catch (sbErr) {
                    console.error("Supabase sync optional warning:", sbErr);
                }
            }

            // Trigger Immediate Download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CMYK_${(item.file_name || 'design').split('.')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            toast.success(`File successfully converted to CMYK ${format.toUpperCase()}!`, { id: 'archive-convert' });
            fetchAnalyses();
        } catch (error) {
            console.error("Conversion error:", error);
            toast.error(error.message || "Conversion failed. Try again.", { id: 'archive-convert' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleRename = async (item, newName) => {
        if (!newName.trim() || newName === item.file_name) return;

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${item.id}?user_id=${currentUser.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_name: newName })
            });

            if (response.ok) {
                toast.success("Renamed successfully");
                fetchAnalyses();
            } else {
                throw new Error("Update failed");
            }
        } catch (err) {
            console.error("Rename error:", err);
            toast.error("Failed to rename file");
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const startEditing = (e, item) => {
        e.stopPropagation();
        setEditingId(item.id);
        setEditValue(item.file_name);
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const saveEdit = async (e, item) => {
        e.stopPropagation();
        await handleRename(item, editValue);
        setEditingId(null);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Are you sure you want to delete the analysis for "${item.file_name}" permanently?`)) {
            return;
        }

        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/analysis/${item.id}?user_id=${currentUser.uid}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("File deleted successfully!");
                fetchAnalyses(); // Refresh list
            } else {
                throw new Error("Delete failed");
            }
        } catch (error) {
            console.error("Error deleting file:", error);
            toast.error("Failed to delete the file.");
        }
    };

    const handleViewReport = (item) => {
        // Use nested analysis_data if available
        const reportData = item.analysis_data || item;
        navigate('/report', { state: { reportData } });
    };

    const getPublicStorageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
        return supabase.storage.from('uploads').getPublicUrl(path).data?.publicUrl || supabase.storage.from('printguardai').getPublicUrl(path).data?.publicUrl;
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 relative">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[rgba(var(--brand-primary),0.1)] blur-[60px] rounded-full pointer-events-none"></div>
                <h1 className="text-3xl font-bold text-white mb-2 relative z-10">Download Archive</h1>
                <p className="text-zinc-400 relative z-10">Access all your previously analyzed files and request color conversions directly.</p>
            </div>

            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-zinc-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[rgb(var(--brand-primary))] animate-pulse"></span>
                    Conversion History
                </h3>
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2.5 text-sm bg-dark-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[rgba(var(--brand-primary),0.5)] focus:ring-1 focus:ring-[rgba(var(--brand-primary),0.5)] w-full transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="bg-dark-900/40 rounded-2xl border border-zinc-800 p-16 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--brand-primary))] mb-4" />
                    <p className="text-zinc-500 font-medium">Loading archive data...</p>
                </div>
            ) : filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredData.map((file) => (
                        <div
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className="bg-dark-900/60 backdrop-blur-sm rounded-2xl border border-zinc-800/80 p-6 flex flex-col hover:border-[rgba(var(--brand-primary),0.5)] hover:shadow-glow-brand transition-all cursor-pointer overflow-hidden relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-primary))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            {/* File Header (Always Visible) */}
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-16 h-16 bg-dark-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-[rgba(var(--brand-primary),0.3)] transition-colors">
                                    {file.rendered_pages && file.rendered_pages.length > 0 ? (
                                        <img
                                            src={file.rendered_pages[0]}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (file.supabase_storage_path || file.analysis_data?.supabase_storage_path) ? (
                                        <img
                                            src={getPublicStorageUrl(file.supabase_storage_path || file.analysis_data?.supabase_storage_path)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <FileText className="w-6 h-6 text-zinc-600 group-hover:text-[rgb(var(--brand-primary))] transition-colors" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex items-center gap-2 mb-1 justify-between">
                                        {editingId === file.id ? (
                                            <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm bg-dark-950 border border-zinc-700 text-white rounded outline-none focus:border-[rgb(var(--brand-primary))]"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(e, file)}
                                                />
                                                <button onClick={(e) => saveEdit(e, file)} className="text-emerald-400 p-1 hover:bg-emerald-400/10 rounded">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={cancelEditing} className="text-zinc-500 p-1 hover:bg-zinc-800 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <h4 className="font-bold text-white truncate" title={file.file_name}>{file.file_name}</h4>
                                                <button
                                                    onClick={(e) => startEditing(e, file)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[rgb(var(--brand-primary))] transition-opacity"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="font-mono text-xs text-[rgb(var(--brand-primary))]/70 mt-1 mb-1">ID: {String(file.id).slice(0, 8).toUpperCase()}</div>
                                    <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 mt-2">
                                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                        {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2 relative z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewReport(file);
                                    }}
                                    className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    View Report
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-dark-900/40 rounded-2xl border border-zinc-800 p-16 text-center flex flex-col items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-zinc-700 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No files found</h3>
                    <p className="text-zinc-500">Your analysis history is empty or matches no search results.</p>
                </div>
            )}

            {/* Modal for Details */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div
                        className="bg-dark-950 rounded-3xl w-full max-w-lg shadow-adaptive-lg border border-zinc-800 overflow-hidden animate-slide-up relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[rgb(var(--brand-primary))]/0 via-brand-yellow to-[rgb(var(--brand-primary))]/0 opacity-50"></div>
                        <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between bg-dark-900/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-[rgb(var(--brand-primary))]">/</span> Analysis Details
                            </h3>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="p-2 text-zinc-500 hover:text-[rgb(var(--brand-primary))] hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex gap-5 mb-6">
                                <div className="w-24 h-24 bg-dark-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
                                    {selectedFile.rendered_pages && selectedFile.rendered_pages.length > 0 ? (
                                        <img
                                            src={selectedFile.rendered_pages[0]}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : selectedFile.supabase_storage_path && (selectedFile.supabase_storage_path.endsWith('.jpg') || selectedFile.supabase_storage_path.endsWith('.png') || selectedFile.supabase_storage_path.endsWith('.jpeg')) ? (
                                        <img
                                            src={getPublicStorageUrl(selectedFile.supabase_storage_path)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <FileText className="w-8 h-8 text-zinc-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="font-bold text-lg text-white truncate" title={selectedFile.file_name}>{selectedFile.file_name}</h4>
                                    <div className="font-mono text-xs text-[rgba(var(--brand-primary),0.8)] mt-1">ID: {String(selectedFile.id).slice(0, 8).toUpperCase()}</div>
                                    <div className="text-sm font-medium text-zinc-400 flex items-center gap-1.5 mt-2">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        {selectedFile.created_at ? new Date(selectedFile.created_at).toLocaleString() : '—'}
                                    </div>
                                </div>
                            </div>

                            <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Status Badges</h5>
                            <div className="flex flex-wrap gap-2 mb-8">
                                {selectedFile.has_rgb ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                        RGB Detected
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        CMYK Clean
                                    </span>
                                )}
                                {selectedFile.converted_file ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-[rgba(var(--brand-primary),0.1)] text-[rgb(var(--brand-primary))] border-[rgba(var(--brand-primary),0.2)] shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                                        <CheckCircle className="w-4 h-4" />
                                        Converted ({selectedFile.converted_file.format.toUpperCase()})
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border bg-zinc-800/50 text-zinc-400 border-zinc-700">
                                        Pending Conversion
                                    </span>
                                )}
                            </div>

                            <div className="pt-5 border-t border-zinc-800/80 flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        handleDelete(selectedFile);
                                        setSelectedFile(null);
                                    }}
                                    className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                                    title="Delete File"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>

                                <div className="flex items-center justify-end gap-2 shrink-0">
                                    {selectedFile.converted_file ? (
                                        <button
                                            onClick={() => handleDownloadConverted(selectedFile.converted_file.path, selectedFile.converted_file.format)}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[rgba(var(--brand-primary),0.1)] hover:bg-[rgba(var(--brand-primary),0.2)] text-[rgb(var(--brand-primary))] border border-[rgba(var(--brand-primary),0.3)] rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-glow-brand"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download
                                        </button>
                                    ) : (
                                        <>
                                            <select
                                                id={`format-${selectedFile.id}`}
                                                className="px-4 py-2.5 border border-zinc-700 rounded-xl text-sm font-bold bg-dark-900 text-white focus:outline-none focus:border-[rgba(var(--brand-primary),0.5)] focus:ring-1 focus:ring-[rgba(var(--brand-primary),0.5)]"
                                            >
                                                <option value="pdf">PDF</option>
                                                <option value="jpg">JPG</option>
                                                <option value="png">PNG</option>
                                            </select>
                                            <button
                                                onClick={() => handleConvertFile(selectedFile, document.getElementById(`format-${selectedFile.id}`).value)}
                                                disabled={processingId === selectedFile.id}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[rgb(var(--brand-primary))] to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-dark-950 rounded-xl font-bold transition-all shadow-glow-brand hover:shadow-glow-brand-lg group cursor-pointer"
                                            >
                                                {processingId === selectedFile.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />}
                                                Convert File
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Archive;
