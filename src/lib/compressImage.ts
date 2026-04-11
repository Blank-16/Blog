/**
 * Compresses an image file client-side using the Canvas API.
 *
 * Rules:
 * - GIFs are returned unchanged (canvas strips animation)
 * - Files under 100 KB are returned unchanged (not worth the processing cost)
 * - Everything else is resized to fit within maxDimension and re-encoded as JPEG
 * - If the compressed output is larger than the original, the original is returned
 * - Transparent PNGs/WebPs get a white background (JPEG has no alpha channel)
 *
 * No external libraries - pure browser Canvas API.
 */
export interface CompressOptions {
  maxDimension?: number; // default 1280
  quality?: number; // 0-1, default 0.82
  skipUnder?: number; // bytes - skip compression for files smaller than this (default 100 KB)
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxDimension = 1280,
    quality = 0.82,
    skipUnder = 100 * 1024,
  } = options;

  // Skip GIFs - canvas destroys animation frames
  if (file.type === "image/gif") return file;

  // Skip tiny files - compression overhead isn't worth it
  if (file.size < skipUnder) return file;

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

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // White background composites transparent PNGs/WebPs safely before JPEG encode
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Keep the original if compression made it larger
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          const newName = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(
            new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            }),
          );
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // always resolve, never reject
    };

    img.src = objectUrl;
  });
}
