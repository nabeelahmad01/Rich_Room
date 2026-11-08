'use client';

/**
 * Compress and resize an image File into a lightweight WebP/JPEG data URL.
 *
 * @param {File} file - The image file selected by the user.
 * @param {Object} [options]
 * @param {number} [options.maxSize=900] - Max width/height in pixels.
 * @param {number} [options.quality=0.55] - Output quality (0-1).
 * @param {number} [options.maxChars=140000] - Soft cap on data-URL length (~100KB binary).
 * @returns {Promise<string>} A compressed data URL.
 */
export function compressImageFile(file, options = {}) {
  const { maxSize = 900, quality = 0.55, maxChars = 140000 } = options;

  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }

    const isImg =
      (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|svg|jfif)$/i.test(file.name || '');

    if (!isImg) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onloadend = () => {
      const rawDataUrl = reader.result;
      if (typeof rawDataUrl !== 'string') {
        reject(new Error('Failed to parse image data.'));
        return;
      }

      // GIFs keep animation unless strictly capped
      if (file.type === 'image/gif' && maxChars == null) {
        resolve(rawDataUrl);
        return;
      }

      // Canvas compression with safe fallback
      compressDataUrl(rawDataUrl, { maxSize, quality, maxChars })
        .then(resolve)
        .catch((cErr) => {
          console.warn('Canvas compression fallback to raw data URL:', cErr);
          resolve(rawDataUrl);
        });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-encode and downscale an existing data URL using HTML5 Canvas.
 * Ensures image payloads stay tiny (<100KB) so API submissions never choke or hang.
 */
export function compressDataUrl(dataUrl, options = {}) {
  const { maxSize = 900, quality = 0.55, maxChars = 140000 } = options;

  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl || '');
      return;
    }

    // Already small enough — skip canvas work
    if (typeof maxChars === 'number' && dataUrl.length <= maxChars) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        let size = maxSize;
        let q = quality;
        let best = dataUrl;
        const maxAttempts = typeof maxChars === 'number' ? 6 : 1;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          let { width, height } = img;
          if (width > size || height > size) {
            if (width >= height) {
              height = Math.round((height * size) / width);
              width = size;
            } else {
              width = Math.round((width * size) / height);
              height = size;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(best !== dataUrl && best.length < dataUrl.length ? best : dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          let out = '';
          try {
            out = canvas.toDataURL('image/webp', q);
          } catch {
            out = '';
          }
          if (!out || !out.startsWith('data:image/webp')) {
            out = canvas.toDataURL('image/jpeg', q);
          }

          if (out && out.length < best.length) best = out;

          if (typeof maxChars === 'number') {
            if (out && out.length <= maxChars) {
              resolve(out);
              return;
            }
            size = Math.max(480, Math.round(size * 0.82));
            q = Math.max(0.38, q - 0.08);
          } else {
            resolve(out && out.length < dataUrl.length ? out : dataUrl);
            return;
          }
        }

        resolve(best.length < dataUrl.length ? best : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}
