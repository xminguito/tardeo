import { useTranslation } from 'react-i18next';
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
import { Loader2, Upload, X, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { COMMUNITY_CATEGORIES } from '../types/community.types';
import { useCommunityCreation } from '../hooks/useCommunityCreation';
import type { SlugAvailability } from '../utils/communityValidation';

// ============================================================================
// Props
// ============================================================================

interface CreateCommunityModalProps {
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SlugStatusIndicatorProps {
  status: SlugAvailability;
  slug: string;
}

function SlugStatusIndicator({ status, slug }: SlugStatusIndicatorProps) {
  const { t } = useTranslation();

  if (status === 'idle' || !slug || slug.length < 3) {
    return null;
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1 text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span className="text-xs">{t('common.checking')}</span>
      </div>
    );
  }

  if (status === 'available') {
    return (
      <div className="flex items-center gap-1 text-green-600" aria-live="polite">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">{t('communities.createForm.slugAvailable')}</span>
      </div>
    );
  }

  if (status === 'taken') {
    return (
      <div className="flex items-center gap-1 text-destructive" role="alert" aria-live="assertive">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">{t('communities.createForm.slugTaken')}</span>
      </div>
    );
  }

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const { t } = useTranslation();

  const {
    form,
    coverImage,
    isCompressingImage,
    handleCoverImageChange,
    removeCoverImage,
    aiTopic,
    setAiTopic,
    isGeneratingAI,
    generateWithAI,
    slugAvailability,
    onSubmit,
    handleNameChange,
    resetForm,
    isSubmitting,
    isFormBusy,
  } = useCommunityCreation(onClose);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchName = watch('name');
  const watchSlug = watch('slug');
  const watchDescription = watch('description');
  const watchCategory = watch('category');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleAIKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateWithAI();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
          <AIMagicFillSection
            aiTopic={aiTopic}
            setAiTopic={setAiTopic}
            isGenerating={isGeneratingAI}
            onGenerate={generateWithAI}
            onKeyDown={handleAIKeyDown}
          />

          {/* Preview Card */}
          <PreviewCard
            name={watchName}
            category={watchCategory}
            description={watchDescription}
            coverImagePreview={coverImage.preview}
          />

          {/* Cover Image Upload */}
          <CoverImageUpload
            preview={coverImage.preview}
            isUploading={isCompressingImage}
            onChange={handleCoverImageChange}
            onRemove={removeCoverImage}
          />

          {/* Name Field */}
          <FormField
            id="name"
            label={t('communities.createForm.name')}
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              placeholder={t('communities.createForm.namePlaceholder')}
              {...register('name')}
              onChange={handleNameChange}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </FormField>

          {/* Slug Field */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              {t('communities.createForm.slug')} *
            </Label>
            <Input
              id="slug"
              placeholder={t('communities.createForm.slugPlaceholder')}
              {...register('slug')}
              aria-invalid={!!errors.slug || slugAvailability === 'taken'}
              aria-describedby="slug-help slug-error"
              className={
                slugAvailability === 'taken' ? 'border-destructive' :
                slugAvailability === 'available' ? 'border-green-500' : ''
              }
            />
            <div className="flex items-center justify-between">
              <p id="slug-help" className="text-xs text-muted-foreground">
                {t('communities.createForm.slugHelp').replace('{{slug}}', watchSlug || 'your-slug')}
              </p>
              <SlugStatusIndicator status={slugAvailability} slug={watchSlug} />
            </div>
            {errors.slug && (
              <p id="slug-error" className="text-sm text-destructive" role="alert">
                {t(errors.slug.message || '')}
              </p>
            )}
          </div>

          {/* Category Field */}
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

          {/* Description Field */}
          <FormField
            id="description"
            label={t('communities.createForm.descriptionLabel')}
            required
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              placeholder={t('communities.createForm.descriptionPlaceholder')}
              {...register('description')}
              rows={4}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
          </FormField>

          {/* Tags Field */}
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

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isFormBusy || slugAvailability === 'taken' || slugAvailability === 'checking'}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
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

// ============================================================================
// Extracted UI Components
// ============================================================================

interface AIMagicFillSectionProps {
  aiTopic: string;
  setAiTopic: (topic: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function AIMagicFillSection({
  aiTopic,
  setAiTopic,
  isGenerating,
  onGenerate,
  onKeyDown,
}: AIMagicFillSectionProps) {
  const { t } = useTranslation();

  return (
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
          onKeyDown={onKeyDown}
          disabled={isGenerating}
          className="flex-1"
          aria-label={t('communities.createForm.aiTopic')}
        />
        <Button
          type="button"
          onClick={onGenerate}
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
  );
}

interface PreviewCardProps {
  name: string;
  category: string;
  description: string;
  coverImagePreview: string | null;
}

function PreviewCard({ name, category, description, coverImagePreview }: PreviewCardProps) {
  const { t } = useTranslation();

  if (!name && !coverImagePreview) {
    return null;
  }

  return (
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
          {name || t('communities.createForm.namePlaceholder')}
        </h3>
        {category && (
          <p className="text-sm text-muted-foreground mt-1">
            {t(`communities.categories.${category}`)}
          </p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface CoverImageUploadProps {
  preview: string | null;
  isUploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

function CoverImageUpload({ preview, isUploading, onChange, onRemove }: CoverImageUploadProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label htmlFor="cover-image">{t('communities.createForm.coverImage')}</Label>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={t('communities.createForm.coverImage')}
            className="w-full h-48 object-cover rounded-lg"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onRemove}
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
            {isUploading ? t('common.loading') : t('communities.createForm.uploadCoverImage')}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WEBP (max 2MB)
          </span>
          <input
            id="cover-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onChange}
            className="hidden"
            disabled={isUploading}
            aria-describedby="cover-image-help"
          />
        </label>
      )}
      <span id="cover-image-help" className="sr-only">
        {t('communities.createForm.coverImageHelp')}
      </span>
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FormField({ id, label, required, error, children }: FormFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
