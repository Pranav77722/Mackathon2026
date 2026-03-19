import React from 'react';

const CertificateList = ({ files }) => {
    if (!files || files.length === 0) return null;

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <h3 className="cert-section-title">📜 Your Certificate</h3>
            <div>
                {files.map((file, idx) => (
                    <div key={idx} className="cert-preview-card">
                        <img
                            src={`http://localhost:5000${file}`}
                            alt="Certificate Preview"
                            className="cert-preview-img"
                            loading="lazy"
                            onClick={() => window.open(`http://localhost:5000${file}`, '_blank')}
                            title="Click to open in new tab"
                        />
                        <div className="cert-actions">
                            <span className="cert-filename" title={file.split('/').pop()}>
                                {file.split('/').pop()}
                            </span>
                            <a
                                href={`http://localhost:5000${file}`}
                                download
                                className="cert-download"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
