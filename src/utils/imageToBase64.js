// Resizes an image down to a reasonable max dimension before sending it to
// Claude's vision API -- keeps token usage (and cost) down without losing
// enough detail to read a recipe card. 1568px matches Anthropic's own
// guidance for the point past which larger images stop improving accuracy.
const MAX_DIMENSION = 1568;

function canvasToJpegBase64(canvas, quality = 0.85) {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.split(',')[1];
}

function drawScaled(source, width, height) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function fileToResizedImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight);
      resolve({ mediaType: 'image/jpeg', data: canvasToJpegBase64(canvas) });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = URL.createObjectURL(file);
  });
}

export function canvasToResizedImage(canvas) {
  const scaled = drawScaled(canvas, canvas.width, canvas.height);
  return { mediaType: 'image/jpeg', data: canvasToJpegBase64(scaled) };
}
