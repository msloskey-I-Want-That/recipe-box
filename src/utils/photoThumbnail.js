// Compresses/resizes a photo down to a small thumbnail stored directly as a
// base64 data URL in the Firestore document itself -- no Firebase Storage
// (which requires the paid Blaze plan) needed. Kept deliberately small
// (480px, JPEG 0.6 quality => roughly 30-60KB each) since a cook log with
// several photo slots still needs to fit under Firestore's 1MB/document cap.

const MAX_DIMENSION = 480;
const QUALITY = 0.6;

export function fileToThumbnail(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read that photo.'));
    img.src = URL.createObjectURL(file);
  });
}
