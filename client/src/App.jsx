import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import Status from './components/Status';
import CertificateList from './components/CertificateList';
import './App.css';

function App() {
  const [status, setStatus] = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamLookupLoading, setTeamLookupLoading] = useState(false);
  const [teamLookupError, setTeamLookupError] = useState('');
  const debounceTimer = useRef(null);

  // Auto-fetch Team Name when Team ID changes
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!teamId.trim()) {
      setTeamName('');
      setTeamLookupError('');
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setTeamLookupLoading(true);
      setTeamLookupError('');
      setTeamName('');

      try {
        const response = await fetch(`http://localhost:5000/api/lookup-team?teamId=${encodeURIComponent(teamId.trim())}`);
        const data = await response.json();

        if (response.ok) {
          setTeamName(data.teamName);
        } else {
          setTeamLookupError(data.message || 'Team ID not found');
        }
      } catch (error) {
        setTeamLookupError('Could not connect to server');
      } finally {
        setTeamLookupLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer.current);
  }, [teamId]);

  const handleGenerate = async () => {
    if (!name || !teamId || !teamName) return;

    setIsUploading(true);
    setStatus(null);
    setGeneratedFiles([]);

    try {
      const response = await fetch('http://localhost:5000/api/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamId }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          successCount: data.successCount,
          failureCount: data.failureCount,
          errors: data.errors
        });
        const files = data.generatedFiles || [];
        setGeneratedFiles(files);

        // Auto-open certificate in a new tab
        if (files.length > 0) {
          window.open(`http://localhost:5000${files[0]}`, '_blank');
        }
      } else {
        setStatus({
          successCount: 0,
          failureCount: 1,
          errors: [{ name: name, error: data.message || 'Unknown error' }]
        });
      }
    } catch (error) {
      setStatus({
        successCount: 0,
        failureCount: 1,
        errors: [{ name: 'Network Error', error: error.message }]
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="event-badge">MATLAB Mackathon 2026</div>
        <h1 className="app-title">
          <span className="highlight">Participation</span> Certificate
        </h1>
        <p className="app-subtitle">
          Generate your participation certificate for Mackathon 2026
        </p>
        <p className="app-event-name">
          Build &bull; Simulate &bull; Innovate
        </p>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <FileUpload
          name={name}
          teamId={teamId}
          teamName={teamName}
          teamLookupLoading={teamLookupLoading}
          teamLookupError={teamLookupError}
          onNameChange={setName}
          onTeamIdChange={setTeamId}
          onGenerate={handleGenerate}
          isUploading={isUploading}
        />

        {isUploading && (
          <div className="generating-indicator">
            <div className="spinner-large"></div>
            <p>Generating your certificate...</p>
          </div>
        )}

        <Status status={status} />

        <CertificateList files={generatedFiles} />
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p className="thank-you">🎉 Thank you for participating in the event!</p>
        <p className="contact-info">
          For any queries, contact <strong>Pranav Khaire</strong><br />
          📞 <a href="tel:7028336358">7028336358</a>
        </p>
        <p className="data-source">Data source: Google Sheets (Live)</p>
      </footer>
    </div>
  );
}

export default App;
