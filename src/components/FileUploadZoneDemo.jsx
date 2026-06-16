import { useState } from 'react';
import FileUploadZone from './FileUploadZone';

export default function FileUploadZoneDemo() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFilesSelected = (newFiles) => {
    setFiles(Array.from(newFiles));
    setError('');
    // Simulate upload
    setIsUploading(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsUploading(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#1c1b1b] p-12">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">FileUploadZone Demo</h1>

      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-white">
          {error}
        </div>
      )}

      <FileUploadZone
        onFilesSelected={handleFilesSelected}
        onError={setError}
        accept="image/*,.pdf"
        maxSizeMB={5}
        progress={progress}
        isUploading={isUploading}
      />

      {files.length > 0 && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 text-white">
          <h3 className="text-xl font-semibold mb-4">Selected Files:</h3>
          <ul className="list-disc pl-5">
            {files.map((file, i) => (
              <li key={i}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
