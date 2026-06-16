import React, { useState, useRef, useCallback } from 'react';

// Memoized custom upload icon to prevent input lag as per architecture notes
const UploadIcon = React.memo(({ isDragging }) => (
  <svg
    className={`w-12 h-12 mb-3 text-primary transition-transform duration-300 ${
      isDragging ? 'scale-110' : 'scale-100'
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
));

export default function FileUploadZone({
  onFilesSelected,
  onError,
  accept = '*',
  maxSizeMB = 10,
  progress = 0,
  isUploading = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      if (onError) onError(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
      return false;
    }

    // If accept is '*', anything goes
    if (accept === '*') return true;

    // Check MIME type or extension based on accept string (comma separated)
    const acceptedTypes = accept.split(',').map((type) => type.trim().toLowerCase());
    const fileExt = `.${file.name.split('.').pop()}`.toLowerCase();
    const fileMime = file.type.toLowerCase();

    const isValid = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExt === type;
      }
      if (type.endsWith('/*')) {
        const baseMime = type.replace('/*', '');
        return fileMime.startsWith(baseMime);
      }
      return fileMime === type;
    });

    if (!isValid) {
      if (onError) onError(`File ${file.name} is not an accepted format (${accept}).`);
      return false;
    }

    return true;
  };

  const processFiles = (files) => {
    if (!files || files.length === 0) return;

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      if (validateFile(files[i])) {
        validFiles.push(files[i]);
      }
    }

    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [accept, maxSizeMB, onFilesSelected, onError]);

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClick = () => {
    if (!isUploading && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative overflow-hidden w-full p-8 md:p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center
          ${
            isDragging
              ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.2)]'
              : 'border-white/20 bg-black/40 hover:bg-black/50 hover:border-primary/50'
          }
          backdrop-blur-xl
        `}
      >
        <UploadIcon isDragging={isDragging} />

        <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 tracking-tight">
          Drag & drop files here
        </h3>

        <p className="text-white/60 text-sm md:text-base mb-6">
          or click to browse from your computer
        </p>

        <div className="flex gap-3 text-xs font-medium text-white/50 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <span>Max Size: {maxSizeMB}MB</span>
          <span>•</span>
          <span>Formats: {accept === '*' ? 'All Files' : accept}</span>
        </div>

        {/* Progress Bar Container - only visible when uploading */}
        <div
          className={`absolute bottom-0 left-0 w-full h-1.5 bg-white/10 transition-opacity duration-300 ${
            isUploading ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
        multiple
      />
    </div>
  );
}
