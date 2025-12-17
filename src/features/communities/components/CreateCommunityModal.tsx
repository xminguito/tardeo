import { useState } from 'react';
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
import { Loader2, Upload, X, Sparkles } from 'lucide-react';
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      const { data: community, error: insertError } = await (supabase as any)
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
      onClose();
      
      // Navigate to new community
      navigate(`/communities/${community.slug}`);
    },
    onError: (error: any) => {
      console.error('Create community error:', error);
      
      let errorMessage = t('communities.createForm.error');
      
      if (error.message?.includes('duplicate key')) {
        errorMessage = 'Slug already exists. Please choose a different one.';
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateCommunityFormData) => {
    createCommunityMutation.mutate(data);
  };

  const handleClose = () => {
    if (!createCommunityMutation.isPending) {
      reset();
      setCoverImage(null);
      setCoverImagePreview(null);
      setAiTopic('');
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('communities.createForm.title')}</DialogTitle>
          <DialogDescription>
            {t('communities.createForm.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* AI Magic Fill Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
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
              />
              <Button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !aiTopic.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white border-0 gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('communities.createForm.aiGenerating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t('communities.createForm.aiMagic')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Card */}
          {(watchName || coverImagePreview) && (
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground px-3 py-2 border-b">
                Preview
              </div>
              <div className="p-4">
                {coverImagePreview && (
                  <div className="h-32 rounded-lg overflow-hidden mb-3">
                    <img
                      src={coverImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
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
            <Label>{t('communities.createForm.coverImage')}</Label>
            {coverImagePreview ? (
              <div className="relative">
                <img
                  src={coverImagePreview}
                  alt="Cover"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeCoverImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? t('common.loading') : 'Click to upload cover image'}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WEBP (max 2MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverImageChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
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
            />
            {errors.name && (
              <p className="text-sm text-destructive">{t(errors.name.message || '')}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              {t('communities.createForm.slug')} *
            </Label>
            <Input
              id="slug"
              placeholder={t('communities.createForm.slugPlaceholder')}
              {...register('slug')}
            />
            <p className="text-xs text-muted-foreground">
              {t('communities.createForm.slugHelp').replace('{{slug}}', watchSlug || 'your-slug')}
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{t(errors.slug.message || '')}</p>
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
              <SelectTrigger>
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
              <p className="text-sm text-destructive">{t(errors.category.message || '')}</p>
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
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t('communities.createForm.tags')}</Label>
            <Input
              id="tags"
              placeholder={t('communities.createForm.tagsPlaceholder')}
              {...register('tags')}
            />
            <p className="text-xs text-muted-foreground">
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
              disabled={createCommunityMutation.isPending || isUploading}
            >
              {createCommunityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('communities.createForm.submitting')}
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
