import React from 'react';
import UploadZone from '../components/UploadZone';

const Upload = () => {
    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-navy-900 mb-2">Upload File</h1>
                <p className="text-slate-500">Submit your design for AI-powered print analysis and auto-correction.</p>
            </div>

            <div className="mt-8">
                <UploadZone />
            </div>
        </div>
    );
};

export default Upload;
