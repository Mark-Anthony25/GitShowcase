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
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  // If Supabase Storage URL
  if (isSupabaseConfigured && publicUrl.includes('/storage/v1/object/public/')) {
    if (!options) return publicUrl;

    const params = new URLSearchParams();
    if (options.width) params.set('width', String(options.width));
    if (options.height) params.set('height', String(options.height));
    if (options.quality) params.set('quality', String(options.quality));
    if (options.format) params.set('format', options.format);
    if (options.resize) params.set('resize', options.resize);

    const qs = params.toString();
    if (!qs) return publicUrl;

    // Convert `/object/public/` to `/render/image/public/` for Supabase Image Transformation if supported
    const transformedUrl = publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    return `${transformedUrl}?${qs}`;
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

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

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
