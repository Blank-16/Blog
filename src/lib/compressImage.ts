/**
 * Compresses an image file client-side using the Canvas API.
 * - Converts everything to JPEG (best compression for photos/blog images)
 * - Resizes to a max dimension (default 1280px) keeping aspect ratio
 * - GIFs are returned unchanged (canvas kills animation)
 * - If the compressed output is larger than the original, the original
 *   is returned unchanged.
 *
 * No external libraries — pure browser Canvas API.
 */
export interface CompressOptions {
  maxDimension?: number; // default 1280
  quality?: number;      // 0–1, default 0.82
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxDimension = 1280, quality = 0.82 } = options;

  // Skip GIFs — canvas strips animation
  if (file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions, preserving aspect ratio
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      // White background handles PNG/WebP transparency gracefully
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }

          // If compressed is larger than original, keep original
          if (blob.size >= file.size) { resolve(file); return; }

          // Rename extension to .jpg, keep rest of filename
          const newName = file.name.replace(/\.[^.]+$/, '.jpg');
          const compressed = new File([blob], newName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // always resolve, never reject
    };

    img.src = objectUrl;
  });
}
