import React, { useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, Sparkles } from 'lucide-react';
import { hasApiKey, extractRecipeFromImages } from '../utils/claudeSuggest';
import { fileToResizedImage, canvasToResizedImage } from '../utils/imageToBase64';

const isPdf = (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export default function OcrCapture({ onStructuredExtracted, onTextExtracted }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | reading | done | error
  const [progress, setProgress] = useState(0);
  const [pageInfo, setPageInfo] = useState('');
  const [previews, setPreviews] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const useVision = hasApiKey();

  const handleFilesWithVision = async (files) => {
    setPageInfo(files.length > 1 ? `Reading ${files.length} pages…` : 'Reading photo…');
    const images = [];
    for (const file of files) {
      if (isPdf(file)) {
        const { renderPdfToCanvases } = await import('../utils/pdfToImages');
        const canvases = await renderPdfToCanvases(file);
        canvases.forEach((c) => images.push(canvasToResizedImage(c)));
      } else {
        images.push(await fileToResizedImage(file));
      }
    }
    const result = await extractRecipeFromImages(images);
    onStructuredExtracted(result);
  };

  const handleFilesWithTesseract = async (files) => {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
      }
    });

    const sources = [];
    for (const file of files) {
      if (isPdf(file)) {
        const { renderPdfToCanvases } = await import('../utils/pdfToImages');
        const canvases = await renderPdfToCanvases(file);
        sources.push(...canvases);
      } else {
        sources.push(file);
      }
    }

    let fullText = '';
    for (let i = 0; i < sources.length; i++) {
      setPageInfo(sources.length > 1 ? `Page ${i + 1} of ${sources.length}` : '');
      setProgress(0);
      const { data } = await worker.recognize(sources[i]);
      fullText += data.text + '\n';
    }
    await worker.terminate();
    onTextExtracted(fullText);
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setStatus('reading');
    setProgress(0);
    setPageInfo('');
    setErrorMsg('');

    const imageFiles = files.filter((f) => !isPdf(f));
    setPreviews(imageFiles.map((f) => URL.createObjectURL(f)));

    try {
      if (useVision) {
        await handleFilesWithVision(files);
      } else {
        await handleFilesWithTesseract(files);
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Could not read that file.');
    }
  };

  return (
    <div>
      <div
        className="dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        {previews.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`Page ${i + 1}`} style={{ maxWidth: 120, maxHeight: 140, borderRadius: 6 }} />
            ))}
          </div>
        ) : (
          <>
            <Camera size={22} style={{ marginBottom: 6 }} />
            <div>Tap to choose photos (select all pages at once) or a PDF of the printed recipe</div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {useVision ? (
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={12} /> Reading with Claude — handles tables, side photos, and multi-page
          recipes far better than plain OCR. Select every page's photo together and they'll be
          combined into one recipe.
        </p>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
          Recipe spans more than one page? Select all the page photos together. Add an Anthropic
          key in Settings for much more reliable reading of tables, columns, and multi-page layouts.
        </p>
      )}

      {status === 'reading' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>
            {pageInfo || 'Reading…'}{!useVision && ` ${progress}%`}
          </p>
          {!useVision && <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>}
        </>
      )}

      {status === 'error' && (
        <p style={{ fontSize: 13, color: 'var(--coral)', marginTop: 8 }}>{errorMsg}</p>
      )}

      {status === 'done' && !useVision && (
        <p style={{ fontSize: 13, color: 'var(--teal)', marginTop: 8 }}>
          Text extracted below — check it over, OCR sometimes misreads handwriting or odd fonts,
          and where one page ends and the next begins may need a small nudge.
        </p>
      )}
    </div>
  );
}
