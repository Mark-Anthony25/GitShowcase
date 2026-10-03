import { supabase, isSupabaseConfigured } from './supabase';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin' | 'webp' | 'avif';
  resize?: 'cover' | 'contain' | 'fill';
}

const DEFAULT_AVATAR_BUCKET = 'avatars';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Build an optimized Supabase Storage CDN URL with image transformation params
 */
export function getOptimizedImageUrl(
  publicUrl: string | null | undefined,
  options?: ImageTransformOptions
): string {
  if (!publicUrl) return '';

  // If already a GitHub avatar or external CDN, return as-is
  if (publicUrl.includes('githubusercontent.com') || publicUrl.includes('unsplash.com')) {
    if (options?.width && publicUrl.includes('unsplash.com')) {
      return `${publicUrl}&w=${options.width}&q=${options.quality || 80}`;
    }
    return publicUrl;
  }


  return publicUrl;
}

/**
 * Upload an avatar directly to Supabase Storage from client browser (bypassing Vercel)
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  bucket = DEFAULT_AVATAR_BUCKET
): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: 'Supabase is not configured' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { url: null, error: 'Image file size exceeds 5MB limit' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { url: null, error: 'Unsupported image format. Please use JPEG, PNG, or WebP.' };
  }

  const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = URL.createObjectURL(file);
  });
  if (!dimensions || dimensions.width > 4096 || dimensions.height > 4096) {
    return { url: null, error: 'Image dimensions must be at most 4096×4096.' };
  }

  try {
    const fileExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Failed to upload image' };
  }
}
