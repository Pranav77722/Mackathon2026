import React from 'react';

const CertificateList = ({ files }) => {
    if (!files || files.length === 0) return null;

    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 px-2">
                Generated Certificates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map((file, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center overflow-hidden">

                            <img
                                src={`http://localhost:5000${file}`}
                                alt="Certificate Preview"
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 truncate flex-1 mr-2" title={file.split('/').pop()}>
                                {file.split('/').pop()}
                            </span>
                            <a
                                href={`http://localhost:5000${file}`}
                                download
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CertificateList;
