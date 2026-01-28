import React, { useState, useCallback } from 'react';

const FileUpload = ({ onFileSelect, file, isUploading }) => {
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    // handleDrop and handleChange functions are removed as they are specific to file uploads.

    return (
        <div className="w-full max-w-xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Certificate Generator
                    </h3>
                    <p className="text-gray-500">
                        Enter your First Name to generate your certificate.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                            placeholder="e.g. Shruti"
                            value={file || ''} // file prop now holds the name string
                            onChange={(e) => onFileSelect(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => onFileSelect('submit')} // Trigger generation
                        disabled={isUploading || !file} // file prop holds the name string now
                        className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${isUploading || !file
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                            }`}
                    >
                        {isUploading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </span>
                        ) : (
                            'Generate Certificate'
                        )}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400">
                        Data source: HackFiesta.xlsx
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FileUpload;
