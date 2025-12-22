import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/utils/imageCompression';
import {
  createCommunitySchema,
  CreateCommunityFormData,
  SlugAvailability,
} from '../utils/communityValidation';
import { generateSlugFromName } from '../utils/communityUtils';

// ============================================================================
// Types
// ============================================================================

export interface CoverImageState {
  file: File | null;
  preview: string | null;
}

export interface UseCommunityCreationReturn {
  // Form
  form: UseFormReturn<CreateCommunityFormData>;
  
  // Cover Image
  coverImage: CoverImageState;
  isCompressingImage: boolean;
  handleCoverImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeCoverImage: () => void;
  
  // AI Magic Fill
  aiTopic: string;
  setAiTopic: (topic: string) => void;
  isGeneratingAI: boolean;
  generateWithAI: () => Promise<void>;
  
  // Slug Availability
  slugAvailability: SlugAvailability;
  
  // Form Actions
  onSubmit: (data: CreateCommunityFormData) => void;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resetForm: () => void;
  
  // Loading States
  isSubmitting: boolean;
  isFormBusy: boolean;
}

// ============================================================================
// Debounce Hook
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCommunityCreation(
  onSuccess?: () => void
): UseCommunityCreationReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  // Cover image state
  const [coverImage, setCoverImage] = useState<CoverImageState>({
    file: null,
    preview: null,
  });
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // AI Magic Fill state
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Slug availability state
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailability>('idle');
  const lastCheckedSlug = useRef<string>('');

  // ---------------------------------------------------------------------------
  // Form Setup
  // ---------------------------------------------------------------------------

  const form = useForm<CreateCommunityFormData>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      category: '',
      tags: '',
    },
  });

  const { setValue, setError, clearErrors, reset, watch } = form;
  const watchSlug = watch('slug');

  // Debounced slug for availability check
  const debouncedSlug = useDebounce(watchSlug, 500);

  // ---------------------------------------------------------------------------
  // Slug Availability Check
  // ---------------------------------------------------------------------------

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3 || lastCheckedSlug.current === slug) {
      return;
    }

    // Validate format first
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setSlugAvailability('idle');
      return;
    }

    lastCheckedSlug.current = slug;
    setSlugAvailability('checking');

    try {
      const { data, error } = await supabase.rpc('is_community_slug_available', {
        slug_to_check: slug,
      });

      if (error) throw error;

      if (data) {
        setSlugAvailability('available');
        clearErrors('slug');
      } else {
        setSlugAvailability('taken');
        setError('slug', {
          type: 'manual',
          message: 'communities.createForm.slugTaken',
        });
      }
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailability('idle');
    }
  }, [clearErrors, setError]);

  // Check slug availability when debounced value changes
  useEffect(() => {
    if (debouncedSlug && debouncedSlug.length >= 3) {
      checkSlugAvailability(debouncedSlug);
    } else {
      setSlugAvailability('idle');
    }
  }, [debouncedSlug, checkSlugAvailability]);

  // ---------------------------------------------------------------------------
  // Cover Image Handling
  // ---------------------------------------------------------------------------

  const handleCoverImageChange = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('common.error'),
        description: t('activities.create.invalidImageType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('common.error'),
        description: t('activities.create.imageTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    // Compress image
    try {
      setIsCompressingImage(true);
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage({
          file: compressed,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      console.error('Image compression error:', error);
      toast({
        title: t('common.error'),
        description: t('communities.createForm.imageError'),
        variant: 'destructive',
      });
    } finally {
      setIsCompressingImage(false);
    }
  }, [t, toast]);

  const removeCoverImage = useCallback(() => {
    setCoverImage({ file: null, preview: null });
  }, []);

  // ---------------------------------------------------------------------------
  // AI Magic Fill
  // ---------------------------------------------------------------------------

  const generateWithAI = useCallback(async (): Promise<void> => {
    if (!aiTopic.trim()) {
      toast({
        title: t('common.error'),
        description: t('communities.createForm.aiTopicPlaceholder'),
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-community-details', {
        body: {
          topic: aiTopic,
          language: t('common.language') || 'es',
        },
      });

      if (error) throw error;

      if (data?.name && data?.description && data?.category) {
        // Fill form with AI-generated data
        setValue('name', data.name);
        setValue('description', data.description);
        setValue('category', data.category);

        // Auto-generate slug from AI-generated name
        const slug = generateSlugFromName(data.name);
        setValue('slug', slug);
        setSlugAvailability('idle'); // Reset to trigger new check

        toast({
          title: t('communities.createForm.aiSuccess'),
          description: t('common.success'),
        });
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: t('communities.createForm.aiError'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [aiTopic, t, toast, setValue]);

  // ---------------------------------------------------------------------------
  // Name Change Handler (with auto-slug generation)
  // ---------------------------------------------------------------------------

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);

    // Auto-generate slug
    const slug = generateSlugFromName(name);
    setValue('slug', slug);
    setSlugAvailability('idle');
  }, [setValue]);

  // ---------------------------------------------------------------------------
  // Create Community Mutation
  // ---------------------------------------------------------------------------

  const createCommunityMutation = useMutation({
    mutationFn: async (data: CreateCommunityFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Parse tags
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      // 2. Create community FIRST (without image)
      // This ensures we have the community_id for the storage path
      const { data: community, error: insertError } = await supabase
        .from('communities')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description,
          category: data.category,
          tags: tagsArray,
          cover_image_url: null, // Will be updated after upload
          created_by: user.id,
          is_public: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Upload cover image if present (using community_id in path)
      // This allows community admins/moderators to manage the image later
      if (coverImage.file) {
        const fileExt = coverImage.file.name.split('.').pop() || 'webp';
        // NEW: Use community.id instead of user.id for folder structure
        const fileName = `${community.id}/${Date.now()}-cover.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community_images')
          .upload(fileName, coverImage.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          // Rollback: delete the community if image upload fails
          await supabase.from('communities').delete().eq('id', community.id);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('community_images')
          .getPublicUrl(uploadData.path);

        // 4. Update community with cover image URL
        const { error: updateError } = await supabase
          .from('communities')
          .update({ cover_image_url: publicUrl })
          .eq('id', community.id);

        if (updateError) {
          console.error('Failed to update community with image URL:', updateError);
          // Don't throw - community was created successfully, just without image
        }

        return { ...community, cover_image_url: publicUrl };
      }

      return community;
    },
    onSuccess: (community) => {
      toast({
        title: t('communities.createForm.success'),
        description: t('communities.createForm.successDescription'),
      });

      queryClient.invalidateQueries({ queryKey: ['communities'] });

      // Reset all state
      resetForm();
      onSuccess?.();

      // Navigate to new community
      navigate(`/communities/${community.slug}`);
    },
    onError: (error: Error) => {
      console.error('Create community error:', error);

      let errorMessage = t('communities.createForm.error');

      if (error.message?.includes('duplicate key')) {
        errorMessage = t('communities.createForm.slugTaken');
        setSlugAvailability('taken');
      }

      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Form Submission
  // ---------------------------------------------------------------------------

  const onSubmit = useCallback((data: CreateCommunityFormData) => {
    // Don't submit if slug is taken
    if (slugAvailability === 'taken') {
      toast({
        title: t('common.error'),
        description: t('communities.createForm.slugTaken'),
        variant: 'destructive',
      });
      return;
    }
    createCommunityMutation.mutate(data);
  }, [slugAvailability, createCommunityMutation, t, toast]);

  // ---------------------------------------------------------------------------
  // Reset Form
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    reset();
    setCoverImage({ file: null, preview: null });
    setAiTopic('');
    setIsGeneratingAI(false);
    setSlugAvailability('idle');
    lastCheckedSlug.current = '';
  }, [reset]);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------

  const isSubmitting = createCommunityMutation.isPending;
  const isFormBusy = isSubmitting || isCompressingImage || isGeneratingAI;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Form
    form,

    // Cover Image
    coverImage,
    isCompressingImage,
    handleCoverImageChange,
    removeCoverImage,

    // AI Magic Fill
    aiTopic,
    setAiTopic,
    isGeneratingAI,
    generateWithAI,

    // Slug Availability
    slugAvailability,

    // Form Actions
    onSubmit,
    handleNameChange,
    resetForm,

    // Loading States
    isSubmitting,
    isFormBusy,
  };
}
