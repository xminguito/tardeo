import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

export const createCommunitySchema = z.object({
  name: z.string()
    .min(3, 'communities.createForm.nameRequired')
    .max(100, 'communities.createForm.nameTooLong'),
  slug: z.string()
    .min(3, 'communities.createForm.slugRequired')
    .max(100, 'communities.createForm.slugTooLong')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'communities.createForm.slugInvalid'),
  description: z.string()
    .min(10, 'communities.createForm.descriptionTooShort')
    .max(500, 'communities.createForm.descriptionTooLong'),
  category: z.string().min(1, 'communities.createForm.categoryRequired'),
  tags: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

export type CreateCommunityFormData = z.infer<typeof createCommunitySchema>;

export type SlugAvailability = 'idle' | 'checking' | 'available' | 'taken';

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function isSlugLongEnough(slug: string): boolean {
  return slug.length >= 3;
}
