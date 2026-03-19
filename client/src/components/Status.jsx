import React from 'react';

const Status = ({ status }) => {
    if (!status) return null;

    const { successCount, failureCount, errors } = status;

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div className="status-grid">
                <div className="status-card success">
                    <div className="status-label">Generated</div>
                    <div className="status-value">{successCount}</div>
                </div>
                <div className="status-card fail">
                    <div className="status-label">Failed</div>
                    <div className="status-value">{failureCount}</div>
                </div>
            </div>

            {errors && errors.length > 0 && (
                <div className="error-log">
                    <div className="error-log-title">Error Log</div>
                    {errors.map((err, idx) => (
                        <div key={idx} className="error-item">
                            <span className="error-item-name">{err.name}</span>
                            <span className="error-item-message">{err.error}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Status;
