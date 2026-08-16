import React, { useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

export default function OcrCapture({ onExtracted }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | reading | done | error
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('reading');
    setProgress(0);
    setErrorMsg('');
    setPreview(URL.createObjectURL(file));

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setStatus('done');
      onExtracted(data.text, file);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Could not read text from that photo.');
    }
  };

  return (
    <div>
      <div
        className="dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Recipe preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8 }} />
        ) : (
          <>
            📷 Tap to take or choose a photo of the printed recipe
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {status === 'reading' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>
            Reading text from photo… {progress}%
          </p>
          <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>
        </>
      )}

      {status === 'error' && (
        <p style={{ fontSize: 13, color: 'var(--rust)', marginTop: 8 }}>{errorMsg}</p>
      )}

      {status === 'done' && (
        <p style={{ fontSize: 13, color: 'var(--tin)', marginTop: 8 }}>
          Text extracted below — check it over, OCR sometimes misreads handwriting or odd fonts.
        </p>
      )}
    </div>
  );
}
