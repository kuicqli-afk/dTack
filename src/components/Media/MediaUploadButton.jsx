import React, { useRef, useState } from 'react';
import './MediaUploadButton.css';

const MediaUploadButton = ({ onUpload, disabled }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size must not exceed 25 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      e.target.value = ''; 
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="media-upload-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        title="Attach media"
      >
        {uploading ? '⏳' : '📎'}
      </button>
    </>
  );
};

export default MediaUploadButton;