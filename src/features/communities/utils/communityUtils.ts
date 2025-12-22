/**
 * Community Utility Functions
 * 
 * Pure functions for community-related operations
 */

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generates a URL-friendly slug from a community name
 * 
 * @param name - The community name to convert
 * @returns A lowercase, hyphenated slug
 * 
 * @example
 * generateSlugFromName("Yoga Lovers Madrid") // "yoga-lovers-madrid"
 * generateSlugFromName("Café & Terrazas") // "cafe-terrazas"
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .trim();
}

// ============================================================================
// Tags Parsing
// ============================================================================

/**
 * Parses a comma-separated string of tags into an array
 * 
 * @param tagsString - Comma-separated tags string
 * @returns Array of trimmed, non-empty tag strings
 * 
 * @example
 * parseTagsString("yoga, fitness, wellness") // ["yoga", "fitness", "wellness"]
 * parseTagsString("  hiking , , mountains  ") // ["hiking", "mountains"]
 */
export function parseTagsString(tagsString: string | undefined): string[] {
  if (!tagsString) return [];
  
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

// ============================================================================
// Image Validation
// ============================================================================

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export interface ImageValidationResult {
  valid: boolean;
  error?: 'invalid_type' | 'too_large';
}

/**
 * Validates an image file for community cover upload
 * 
 * @param file - The file to validate
 * @returns Validation result with error type if invalid
 */
export function validateCoverImage(file: File): ImageValidationResult {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'invalid_type' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'too_large' };
  }

  return { valid: true };
}

/**
 * Gets the file extension from a filename
 * 
 * @param filename - The filename to extract extension from
 * @returns The file extension without the dot, or 'webp' as default
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext || 'webp';
}
