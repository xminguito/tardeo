/**
 * Image Compression Utility
 * 
 * Reusable image optimization for web uploads using browser-image-compression.
 * Converts to WebP, resizes, and compresses for optimal delivery.
 */

import imageCompression from 'browser-image-compression';

// ============================================
// Configuration
// ============================================

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: 'image/webp' | 'image/jpeg' | 'image/png';
  initialQuality?: number;
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxSizeMB: 0.5,           // Target ~500KB
  maxWidthOrHeight: 1920,   // Full HD max dimension
  useWebWorker: true,       // Avoid freezing UI
  fileType: 'image/webp',   // Modern format
  initialQuality: 0.8,
};

// Avatar-specific options (smaller target size)
export const AVATAR_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 0.2,           // Target ~200KB for avatars
  maxWidthOrHeight: 512,    // Avatars don't need high res
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.85,
};

// Gallery/Activity image options
export const GALLERY_OPTIONS: ImageCompressionOptions = {
  maxSizeMB: 0.5,           // Target ~500KB
  maxWidthOrHeight: 1920,   // Full HD
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.8,
};

// ============================================
// Main Function
// ============================================

/**
 * Compresses an image file for optimal web delivery.
 * 
 * @param file - The original image File to compress
 * @param options - Optional compression settings (uses defaults if not provided)
 * @returns Promise<File> - The compressed file (or original if compression fails/not needed)
 * 
 * @example
 * const optimized = await compressImage(file);
 * const avatarOptimized = await compressImage(file, AVATAR_OPTIONS);
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip if already small enough and in target format
  const targetType = opts.fileType || 'image/webp';
  const targetSizeBytes = (opts.maxSizeMB || 0.5) * 1024 * 1024;
  
  if (file.size < targetSizeBytes && file.type === targetType) {
    return file;
  }

  try {
    const compressedBlob = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      fileType: opts.fileType,
      initialQuality: opts.initialQuality,
    });
    
    // Create a new File from the compressed blob with appropriate extension
    const extension = opts.fileType === 'image/webp' ? 'webp' : 
                      opts.fileType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
    
    const compressedFile = new File([compressedBlob], fileName, {
      type: opts.fileType,
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    // Compression failed, return original file as fallback
    return file;
  }
}

/**
 * Compresses multiple images in parallel.
 * 
 * @param files - Array of Files to compress
 * @param options - Optional compression settings
 * @returns Promise<File[]> - Array of compressed files
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)));
}

/**
 * Calculates the size reduction from compression.
 * Useful for displaying savings to users.
 */
export function calculateSavings(
  originalSize: number,
  compressedSize: number
): { savedBytes: number; savedMB: string; percentage: string } {
  const savedBytes = originalSize - compressedSize;
  const savedMB = (savedBytes / 1024 / 1024).toFixed(2);
  const percentage = ((savedBytes / originalSize) * 100).toFixed(0);
  
  return { savedBytes, savedMB, percentage };
}

