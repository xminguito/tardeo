import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, X, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { COMMUNITY_CATEGORIES } from '../types/community.types';
import { compressImage } from '@/lib/utils/imageCompression';

// Validation schema
const createCommunitySchema = z.object({
  name: z.string()
    .min(3, 'communities.createForm.nameRequired')
    .max(100, 'Name too long'),
  slug: z.string()
    .min(3, 'communities.createForm.slugRequired')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'communities.createForm.slugInvalid'),
  description: z.string()
    .min(10, 'Description too short')
    .max(500, 'Description too long'),
  category: z.string().min(1, 'communities.createForm.categoryRequired'),
  tags: z.string().optional(),
});

type CreateCommunityFormData = z.infer<typeof createCommunitySchema>;

interface CreateCommunityModalProps {
  open: boolean;
  onClose: () => void;
}

// Debounce hook
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

export default function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // AI Magic Fill state
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Slug availability state
  const [slugAvailability, setSlugAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const lastCheckedSlug = useRef<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm<CreateCommunityFormData>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      category: '',
      tags: '',
    },
  });

  const watchName = watch('name');
  const watchSlug = watch('slug');
  const watchDescription = watch('description');
  const watchCategory = watch('category');

  // Debounced slug for availability check
  const debouncedSlug = useDebounce(watchSlug, 500);

  // Check slug availability
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

  // Effect to check slug availability when debounced value changes
  useEffect(() => {
    if (debouncedSlug && debouncedSlug.length >= 3) {
      checkSlugAvailability(debouncedSlug);
    } else {
      setSlugAvailability('idle');
    }
  }, [debouncedSlug, checkSlugAvailability]);

  // Reset slug availability when modal closes
  useEffect(() => {
    if (!open) {
      setSlugAvailability('idle');
      lastCheckedSlug.current = '';
    }
  }, [open]);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    
    // Auto-generate slug
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove duplicate hyphens
      .trim();
    
    setValue('slug', slug);
    setSlugAvailability('idle'); // Reset availability when slug changes
  };

  // Handle cover image upload
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      toast({
        title: t('common.error'),
        description: t('activities.create.invalidImageType'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('activities.create.imageTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    // Compress image
    try {
      setIsUploading(true);
      const compressed = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      
      setCoverImage(compressed);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      console.error('Image compression error:', error);
      toast({
        title: t('common.error'),
        description: 'Error processing image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  // AI Magic Fill - Generate community details
  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      toast({
        title: t('common.error'),
        description: t('communities.createForm.aiTopicPlaceholder'),
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-community-details', {
        body: { 
          topic: aiTopic,
          language: t('common.language') || 'es'
        },
      });

      if (error) throw error;
      
      if (data?.name && data?.description && data?.category) {
        // Fill the form with AI-generated data
        setValue('name', data.name);
        setValue('description', data.description);
        setValue('category', data.category);
        
        // Auto-generate slug from AI-generated name
        const slug = data.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^\w\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Remove duplicate hyphens
          .trim();
        
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
      setIsGenerating(false);
    }
  };

  // Create community mutation
  const createCommunityMutation = useMutation({
    mutationFn: async (data: CreateCommunityFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload cover image if present
      let coverImageUrl: string | null = null;
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-cover.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community_images')
          .upload(fileName, coverImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('community_images')
          .getPublicUrl(uploadData.path);
        
        coverImageUrl = publicUrl;
      }

      // 2. Parse tags
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      // 3. Insert community
      const { data: community, error: insertError } = await supabase
        .from('communities')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description,
          category: data.category,
          tags: tagsArray,
          cover_image_url: coverImageUrl,
          created_by: user.id,
          is_public: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return community;
    },
    onSuccess: (community) => {
      toast({
        title: t('communities.createForm.success'),
        description: t('communities.createForm.successDescription'),
      });
      
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      // Reset form and close modal
      reset();
      setCoverImage(null);
      setCoverImagePreview(null);
      setSlugAvailability('idle');
      onClose();
      
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

  const onSubmit = (data: CreateCommunityFormData) => {
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
  };

  const handleClose = () => {
    if (!createCommunityMutation.isPending) {
      reset();
      setCoverImage(null);
      setCoverImagePreview(null);
      setAiTopic('');
      setIsGenerating(false);
      setSlugAvailability('idle');
      onClose();
    }
  };

  // Slug availability indicator
  const SlugStatusIndicator = () => {
    if (slugAvailability === 'idle' || !watchSlug || watchSlug.length < 3) {
      return null;
    }

    if (slugAvailability === 'checking') {
      return (
        <div className="flex items-center gap-1 text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span className="text-xs">{t('common.checking')}</span>
        </div>
      );
    }

    if (slugAvailability === 'available') {
      return (
        <div className="flex items-center gap-1 text-green-600" aria-live="polite">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">{t('communities.createForm.slugAvailable')}</span>
        </div>
      );
    }

    if (slugAvailability === 'taken') {
      return (
        <div className="flex items-center gap-1 text-destructive" role="alert" aria-live="assertive">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">{t('communities.createForm.slugTaken')}</span>
        </div>
      );
    }

    return null;
  };

  const isFormBusy = createCommunityMutation.isPending || isUploading || isGenerating;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-busy={isFormBusy}
      >
        <DialogHeader>
          <DialogTitle>{t('communities.createForm.title')}</DialogTitle>
          <DialogDescription>
            {t('communities.createForm.description')}
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="space-y-6"
          aria-label={t('communities.createForm.title')}
        >
          {/* AI Magic Fill Section */}
          <div 
            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800"
            role="region"
            aria-label={t('communities.createForm.aiMagic')}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" aria-hidden="true" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                {t('communities.createForm.aiMagic')}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('communities.createForm.description')}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder={t('communities.createForm.aiTopicPlaceholder')}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateWithAI();
                  }
                }}
                disabled={isGenerating}
                className="flex-1"
                aria-label={t('communities.createForm.aiTopic')}
              />
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !aiTopic.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0 gap-2"
                aria-busy={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{t('communities.createForm.aiGenerating')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>{t('communities.createForm.aiMagic')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Card - aria-live only for critical changes */}
          {(watchName || coverImagePreview) && (
            <div 
              className="border rounded-lg overflow-hidden bg-muted/20"
              role="region"
              aria-label="Preview"
            >
              <div className="text-xs font-medium text-muted-foreground px-3 py-2 border-b">
                Preview
              </div>
              <div className="p-4">
                {coverImagePreview && (
                  <div className="h-32 rounded-lg overflow-hidden mb-3">
                    <img
                      src={coverImagePreview}
                      alt=""
                      className="w-full h-full object-cover"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <h3 className="font-bold text-lg">
                  {watchName || t('communities.createForm.namePlaceholder')}
                </h3>
                {watchCategory && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(`communities.categories.${watchCategory}`)}
                  </p>
                )}
                {watchDescription && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {watchDescription}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="cover-image">{t('communities.createForm.coverImage')}</Label>
            {coverImagePreview ? (
              <div className="relative">
                <img
                  src={coverImagePreview}
                  alt={t('communities.createForm.coverImage')}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeCoverImage}
                  aria-label={t('common.remove')}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <label 
                htmlFor="cover-image"
                className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                aria-busy={isUploading}
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-2" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? t('common.loading') : 'Click to upload cover image'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WEBP (max 2MB)
                </span>
                <input
                  id="cover-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverImageChange}
                  className="hidden"
                  disabled={isUploading}
                  aria-describedby="cover-image-help"
                />
              </label>
            )}
            <span id="cover-image-help" className="sr-only">
              Upload a cover image for your community. Accepted formats: JPG, PNG, WEBP. Maximum size: 2MB.
            </span>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('communities.createForm.name')} *
            </Label>
            <Input
              id="name"
              placeholder={t('communities.createForm.namePlaceholder')}
              {...register('name')}
              onChange={handleNameChange}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {t(errors.name.message || '')}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              {t('communities.createForm.slug')} *
            </Label>
            <div className="relative">
              <Input
                id="slug"
                placeholder={t('communities.createForm.slugPlaceholder')}
                {...register('slug')}
                aria-invalid={!!errors.slug || slugAvailability === 'taken'}
                aria-describedby="slug-help slug-error"
                className={slugAvailability === 'taken' ? 'border-destructive' : 
                           slugAvailability === 'available' ? 'border-green-500' : ''}
              />
            </div>
            <div className="flex items-center justify-between">
              <p id="slug-help" className="text-xs text-muted-foreground">
                {t('communities.createForm.slugHelp').replace('{{slug}}', watchSlug || 'your-slug')}
              </p>
              <SlugStatusIndicator />
            </div>
            {errors.slug && (
              <p id="slug-error" className="text-sm text-destructive" role="alert">
                {t(errors.slug.message || '')}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              {t('communities.createForm.category')} *
            </Label>
            <Select
              value={watchCategory}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger 
                id="category"
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? 'category-error' : undefined}
              >
                <SelectValue placeholder={t('communities.createForm.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {Object.values(COMMUNITY_CATEGORIES).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`communities.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p id="category-error" className="text-sm text-destructive" role="alert">
                {t(errors.category.message || '')}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('communities.createForm.descriptionLabel')} *
            </Label>
            <Textarea
              id="description"
              placeholder={t('communities.createForm.descriptionPlaceholder')}
              {...register('description')}
              rows={4}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <p id="description-error" className="text-sm text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('communities.createForm.tags')}</Label>
            <Input
              id="tags"
              placeholder={t('communities.createForm.tagsPlaceholder')}
              {...register('tags')}
              aria-describedby="tags-help"
            />
            <p id="tags-help" className="text-xs text-muted-foreground">
              {t('communities.createForm.tagsHelp')}
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCommunityMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isFormBusy || slugAvailability === 'taken' || slugAvailability === 'checking'}
              aria-busy={createCommunityMutation.isPending}
            >
              {createCommunityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t('communities.createForm.submitting')}</span>
                </>
              ) : (
                t('communities.createForm.submit')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
