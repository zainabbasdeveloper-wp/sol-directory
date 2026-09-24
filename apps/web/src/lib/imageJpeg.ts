/**
 * Turns a chosen image file into a small JPEG in the browser before upload,
 * so the server only ever receives a real, bounded JPEG:
 *  - "cover": centred square crop at size x size (profile photos)
 *  - "contain": whole image, longest side = size, on a white background (logos)
 */
export function toJpeg(file: File, mode: 'cover' | 'contain', size = 480): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return reject(new Error('unreadable image'));
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas'));
      if (mode === 'cover') {
        const side = Math.min(w, h);
        canvas.width = canvas.height = size;
        ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
      } else {
        const scale = Math.min(1, size / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        ctx.fillStyle = '#fff'; // JPEG has no transparency
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
    img.src = url;
  });
}
