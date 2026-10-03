import { supabase, isSupabaseConfigured } from './supabase';

export const SCREENSHOT_BUCKET = 'project-screenshots';

/**
 * Format bytes into human readable string (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Convert Blob or File to Base64 Data URL
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // Fallback for Node.js / headless test environments
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type || 'image/webp'};base64,${buffer.toString('base64')}`;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  dataUrl?: string;
}

/**
 * Native client-side image compression using HTML5 Canvas.
 * No external dependencies. Resizes to max width 800px and exports as WebP.
 */
export async function compressScreenshot(
  file: File | Blob,
  maxWidth = 800,
  quality = 0.75
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Fallback for non-browser / node environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          blob: file,
          originalSize,
          compressedSize: originalSize,
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              blob: file,
              originalSize,
              compressedSize: originalSize,
            });
            return;
          }

          resolve({
            blob,
            originalSize,
            compressedSize: blob.size,
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads compressed screenshot directly to Supabase Storage.
 * Falls back to Base64 Data URL if Supabase is offline or bucket is not yet created.
 */
export async function uploadProjectScreenshot(
  file: File | Blob,
  userId: string,
  repoFullName: string
): Promise<{ url: string; compressedSize: number; originalSize: number }> {
  const compression = await compressScreenshot(file);
  const cleanRepoName = repoFullName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filePath = `${userId}/${cleanRepoName}_${Date.now()}.webp`;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(SCREENSHOT_BUCKET)
        .upload(filePath, compression.blob, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1-year browser cache
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from(SCREENSHOT_BUCKET)
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            compressedSize: compression.compressedSize,
            originalSize: compression.originalSize,
          };
        }
      } else if (error) {
        console.warn('Supabase storage upload error, falling back to data URL:', error.message);
      }
    } catch (err) {
      console.warn('Supabase storage exception, falling back to data URL:', err);
    }
  }

  // Offline / fallback storage: Base64 data URL
  const dataUrl = await blobToDataUrl(compression.blob);
  return {
    url: dataUrl,
    compressedSize: compression.compressedSize,
    originalSize: compression.originalSize,
  };
}
