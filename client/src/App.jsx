import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Status from './components/Status';
import CertificateList from './components/CertificateList';

function App() {
  const [status, setStatus] = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const [firstName, setFirstName] = useState('');

  const handleGeneration = async (input) => {
    // If input is 'submit', we trigger generation with current firstName state
    // If input is a string (and not 'submit'), we update state.

    if (input !== 'submit') {
      setFirstName(input);
      return;
    }

    if (!firstName) return;

    setIsUploading(true);
    setStatus(null);
    setGeneratedFiles([]);

    try {
      const response = await fetch('http://localhost:5000/api/generate-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          successCount: data.successCount,
          failureCount: data.failureCount,
          errors: data.errors
        });
        setGeneratedFiles(data.generatedFiles || []);
      } else {
        setStatus({
          successCount: 0,
          failureCount: 1,
          errors: [{ name: firstName, error: data.message || 'Unknown error' }]
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-2">
          Certificate Generator Platform
        </h1>
        <p className="text-xl text-gray-600">
          Bulk generate certificates from CSV data instantly
        </p>
      </div>

      <FileUpload
        onFileSelect={handleGeneration} // We renamed the prop in FileUpload.jsx effectively
        file={firstName} // We are passing the name string as 'file' prop
        isUploading={isUploading}
      />

      {isUploading && (
        <div className="text-center my-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
          <p className="mt-2 text-gray-600">Generating certificates...</p>
        </div>
      )}

      <Status status={status} />

      <CertificateList files={generatedFiles} />
    </div>
  );
}

export default App;
