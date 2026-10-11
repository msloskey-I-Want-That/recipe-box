import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Renders every page of a PDF file to a canvas and returns them as an array
// of canvas elements, ready to feed into Tesseract one at a time. Recipes
// printed/saved as PDF are usually 1-2 pages, so this stays cheap.
export async function renderPdfToCanvases(file, { maxPages = 5, scale = 2 } = {}) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const canvases = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    canvases.push(canvas);
  }

  return canvases;
}
