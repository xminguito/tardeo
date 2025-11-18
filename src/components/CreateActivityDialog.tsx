import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2 } from 'lucide-react';

interface CreateActivityDialogProps {
  onActivityCreated?: () => void;
}

export default function CreateActivityDialog({ onActivityCreated }: CreateActivityDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    date: '',
    time: '18:00',
    cost: 0,
    maxParticipants: 20,
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('activities.create.imageTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      setMainImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t('common.error'),
          description: t('activities.create.mustBeLoggedIn'),
          variant: 'destructive',
        });
        return;
      }

      let imageUrl: string | null = null;

      // Upload image if provided
      if (mainImage) {
        const fileExt = mainImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-images')
          .upload(filePath, mainImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: t('common.error'),
            description: t('activities.create.imageUploadError'),
            variant: 'destructive',
          });
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('activity-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Translate title and description using Lovable AI
      toast({
        title: t('activities.create.translating'),
        description: t('activities.create.translatingDescription'),
      });

      const { data: translations, error: translateError } = await supabase.functions.invoke(
        'translate-activity',
        {
          body: {
            title: formData.title,
            description: formData.description,
          },
        }
      );

      if (translateError) {
        console.error('Translation error:', translateError);
        toast({
          title: t('common.error'),
          description: t('activities.create.translationError'),
          variant: 'destructive',
        });
        return;
      }

      // Insert activity with all translations
      const { error: insertError } = await supabase.from('activities').insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        cost: formData.cost,
        max_participants: formData.maxParticipants,
        created_by: user.id,
        image_url: imageUrl,
        // Spanish (original)
        title_es: formData.title,
        description_es: formData.description,
        // Translations
        title_en: translations.title_en,
        title_ca: translations.title_ca,
        title_fr: translations.title_fr,
        title_it: translations.title_it,
        title_de: translations.title_de,
        description_en: translations.description_en,
        description_ca: translations.description_ca,
        description_fr: translations.description_fr,
        description_it: translations.description_it,
        description_de: translations.description_de,
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast({
          title: t('common.error'),
          description: t('activities.create.createError'),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: t('common.success'),
        description: t('activities.create.created'),
      });

      setOpen(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        location: '',
        date: '',
        time: '18:00',
        cost: 0,
        maxParticipants: 20,
      });
      setMainImage(null);
      setImagePreview(null);

      onActivityCreated?.();
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: t('common.error'),
        description: t('activities.create.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="md:size-default">
          <Plus className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">{t('home.createActivity')}</span>
          <span className="sm:hidden">{t('common.create')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('activities.create.title')}</DialogTitle>
          <DialogDescription>
            {t('activities.create.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t('activities.create.activityTitle')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder={t('activities.create.titlePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('activities.create.activityDescription')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('activities.create.descriptionPlaceholder')}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="image">{t('activities.create.mainImage')}</Label>
            <Input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            {imagePreview && (
              <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden border border-border">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('activities.create.imageRequirements')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">{t('activities.create.category')} *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                placeholder={t('activities.create.categoryPlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="location">{t('activities.create.location')} *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                placeholder={t('activities.create.locationPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">{t('activities.create.date')} *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="time">{t('activities.create.time')} *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">{t('activities.create.cost')}</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="maxParticipants">{t('activities.create.maxParticipants')}</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t('activities.create.creating') : t('activities.create.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}