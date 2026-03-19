import React from 'react';

const FileUpload = ({ name, teamId, teamName, teamLookupLoading, teamLookupError, onNameChange, onTeamIdChange, onGenerate, isUploading }) => {
    const canGenerate = name && teamId && teamName && !teamLookupLoading && !isUploading;

    return (
        <div className="glass-card">
            <div className="form-group">
                <label htmlFor="name" className="form-label">Your Name</label>
                <input
                    type="text"
                    id="name"
                    className="form-input"
                    placeholder="your name"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="teamId" className="form-label">Team ID</label>
                <input
                    type="text"
                    id="teamId"
                    className="form-input"
                    placeholder="Team id"
                    value={teamId}
                    onChange={(e) => onTeamIdChange(e.target.value)}
                />

                <div className={`team-feedback ${teamLookupLoading ? 'loading' : ''} ${teamName ? 'success' : ''} ${teamLookupError ? 'error' : ''}`}>
                    {teamLookupLoading && (
                        <>
                            <div className="spinner-small"></div>
                            <span>Looking up team...</span>
                        </>
                    )}
                    {teamName && !teamLookupLoading && (
                        <span>✅ Team: <strong>{teamName}</strong></span>
                    )}
                    {teamLookupError && !teamLookupLoading && (
                        <span>❌ {teamLookupError}</span>
                    )}
                </div>
            </div>

            <button
                onClick={onGenerate}
                disabled={!canGenerate}
                className={`btn-generate ${canGenerate ? 'active' : 'disabled'}`}
            >
                {isUploading ? (
                    <span className="btn-spinner">
                        <div className="spinner-small"></div>
                        Generating...
                    </span>
                ) : (
                    '🎓 Generate Certificate'
                )}
            </button>

            <div className="form-note">
                <p>⚠️ <strong>Note:</strong> Please provide the name and team id that you filled in the <strong>Google Form</strong>.</p>
            </div>
        </div>
    );
};

export default FileUpload;
