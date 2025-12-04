import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
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
import { Plus, Loader2, MapPin, Check, Sparkles } from 'lucide-react';

// Libraries for Google Maps
const libraries: ("places")[] = ["places"];

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
    city: '',
    province: '',
    date: '',
    time: '18:00',
    cost: 0,
    maxParticipants: 20,
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [secondaryImages, setSecondaryImages] = useState<File[]>([]);
  const [secondaryPreviews, setSecondaryPreviews] = useState<string[]>([]);

  // AI Description generation state
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  // Google Places Autocomplete
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [locationInputValue, setLocationInputValue] = useState('');
  const [isPlaceSelected, setIsPlaceSelected] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Extract address component by type
  const getAddressComponent = useCallback(
    (components: google.maps.GeocoderAddressComponent[], type: string): string => {
      const component = components.find((c) => c.types.includes(type));
      return component?.long_name || '';
    },
    []
  );

  // Handle place selection from autocomplete
  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place.geometry?.location) {
      toast({
        title: t('common.error'),
        description: t('activities.create.locationNotFound'),
        variant: 'destructive',
      });
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const addressComponents = place.address_components || [];

    // Extract location name (establishment name or formatted address)
    const locationName = place.name || place.formatted_address || '';

    // Extract city (locality or administrative_area_level_2)
    const city =
      getAddressComponent(addressComponents, 'locality') ||
      getAddressComponent(addressComponents, 'administrative_area_level_2') ||
      getAddressComponent(addressComponents, 'administrative_area_level_1');

    // Extract province (administrative_area_level_2 or administrative_area_level_1)
    const province =
      getAddressComponent(addressComponents, 'administrative_area_level_2') ||
      getAddressComponent(addressComponents, 'administrative_area_level_1');

    // Update form data
    setFormData((prev) => ({
      ...prev,
      location: locationName,
      city,
      province,
      latitude: lat,
      longitude: lng,
    }));

    setLocationInputValue(place.formatted_address || locationName);
    setIsPlaceSelected(true);
  }, [getAddressComponent, t, toast]);

  // Handle autocomplete load
  const handleAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  // Reset location when user clears the input
  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationInputValue(value);

    // If user clears or modifies the input, reset the selection
    if (isPlaceSelected && value !== locationInputValue) {
      setIsPlaceSelected(false);
      setFormData((prev) => ({
        ...prev,
        location: '',
        city: '',
        province: '',
        latitude: null,
        longitude: null,
      }));
    }
  };

  // Generate AI description using native Supabase Edge Function
  const handleGenerateDescription = useCallback(async () => {
    if (!formData.title.trim()) {
      toast({
        title: t('common.error'),
        description: t('activities.create.titleRequiredForAI'),
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingDescription(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-description', {
        body: {
          title: formData.title,
          category: formData.category || undefined,
          location: formData.location || undefined,
        },
      });

      if (error) {
        console.error('AI generation error:', error);
        toast({
          title: t('common.error'),
          description: t('activities.create.aiGenerationError'),
          variant: 'destructive',
        });
        return;
      }

      if (data?.description) {
        // Typewriter effect for the generated description
        const description = data.description;
        let currentIndex = 0;
        
        setFormData((prev) => ({ ...prev, description: '' }));
        
        const typeInterval = setInterval(() => {
          if (currentIndex < description.length) {
            setFormData((prev) => ({
              ...prev,
              description: description.slice(0, currentIndex + 1),
            }));
            currentIndex++;
          } else {
            clearInterval(typeInterval);
          }
        }, 20);

        toast({
          title: '✨ ' + t('activities.create.aiGenerated'),
          description: t('activities.create.aiGeneratedDesc'),
        });
      }
    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: t('common.error'),
        description: t('activities.create.aiGenerationError'),
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [formData.title, formData.category, formData.location, t, toast]);

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

  const handleSecondaryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + secondaryImages.length > 4) {
      toast({
        title: t('common.error'),
        description: t('activities.create.maxSecondaryImages'),
        variant: 'destructive',
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('activities.create.imageTooLarge'),
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setSecondaryImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSecondaryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSecondaryImage = (index: number) => {
    setSecondaryImages(prev => prev.filter((_, i) => i !== index));
    setSecondaryPreviews(prev => prev.filter((_, i) => i !== index));
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
      const secondaryImageUrls: string[] = [];

      // Upload main image if provided
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

      // Upload secondary images if provided
      if (secondaryImages.length > 0) {
        for (let i = 0; i < secondaryImages.length; i++) {
          const file = secondaryImages[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-secondary-${i}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('activity-images')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Secondary image upload error:', uploadError);
            continue; // Continue with other images
          }

          const { data: { publicUrl } } = supabase.storage
            .from('activity-images')
            .getPublicUrl(filePath);

          secondaryImageUrls.push(publicUrl);
        }
      }

      // Translate title and description using Edge Function
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

      // Use coordinates from Google Places (already set in formData)
      const latitude = formData.latitude;
      const longitude = formData.longitude;

      // Insert activity with all translations
      const { error: insertError } = await supabase.from('activities').insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        city: formData.city,
        province: formData.province,
        country: 'España',
        latitude,
        longitude,
        date: formData.date,
        time: formData.time,
        cost: formData.cost,
        max_participants: formData.maxParticipants,
        created_by: user.id,
        image_url: imageUrl,
        secondary_images: secondaryImageUrls,
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
        city: '',
        province: '',
        date: '',
        time: '18:00',
        cost: 0,
        maxParticipants: 20,
        latitude: null,
        longitude: null,
      });
      setMainImage(null);
      setImagePreview(null);
      setSecondaryImages([]);
      setSecondaryPreviews([]);
      setLocationInputValue('');
      setIsPlaceSelected(false);

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
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => {
          // Prevent closing when clicking on Google Places dropdown
          const target = event.target as HTMLElement | null;
          if (target && target.closest('.pac-container')) {
            event.preventDefault();
          }
        }}
      >
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
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="description" className="mb-0">{t('activities.create.activityDescription')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription || !formData.title.trim()}
                className="h-7 px-2.5 text-xs gap-1.5 border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-400 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950 dark:hover:text-purple-300"
              >
                {isGeneratingDescription ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGeneratingDescription ? t('activities.create.generating') : t('activities.create.generateWithAI')}
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('activities.create.descriptionPlaceholder')}
              rows={4}
              className={isGeneratingDescription ? 'animate-pulse' : ''}
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

          <div>
            <Label htmlFor="secondaryImages">{t('activities.create.secondaryImages')}</Label>
            <Input
              id="secondaryImages"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleSecondaryImagesChange}
              className="cursor-pointer"
              multiple
              disabled={secondaryImages.length >= 4}
            />
            {secondaryPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {secondaryPreviews.map((preview, index) => (
                  <div key={index} className="relative h-32 rounded-lg overflow-hidden border border-border group">
                    <img 
                      src={preview} 
                      alt={`Secondary ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeSecondaryImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="sr-only">Remove</span>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('activities.create.secondaryImagesHelp')} ({secondaryImages.length}/4)
            </p>
          </div>

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

          {/* Google Places Autocomplete for Location */}
          <div className="space-y-2">
              <Label htmlFor="location">{t('activities.create.location')} *</Label>
            {isLoaded && !loadError ? (
              <div className="relative">
                <Autocomplete
                  onLoad={handleAutocompleteLoad}
                  onPlaceChanged={handlePlaceChanged}
                  options={{
                    componentRestrictions: { country: 'es' },
                    fields: ['name', 'formatted_address', 'geometry', 'address_components'],
                  }}
                >
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                      value={locationInputValue}
                      onChange={handleLocationInputChange}
                      placeholder={t('activities.create.locationAutocompletePlaceholder')}
                      className="pl-10 pr-10"
                required
                    />
                    {isPlaceSelected && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </Autocomplete>
                {/* Show extracted location details */}
                {isPlaceSelected && formData.city && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">{t('activities.create.location')}:</span>
                        <p className="font-medium truncate">{formData.location}</p>
            </div>
                      <div>
                        <span className="text-muted-foreground">{t('activities.create.city')}:</span>
                        <p className="font-medium">{formData.city}</p>
          </div>
                      {formData.province && formData.province !== formData.city && (
            <div>
                          <span className="text-muted-foreground">{t('activities.create.province')}:</span>
                          <p className="font-medium">{formData.province}</p>
            </div>
                      )}
                      {formData.latitude && formData.longitude && (
            <div>
                          <span className="text-muted-foreground">Coords:</span>
                          <p className="font-medium text-xs font-mono">
                            {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                    placeholder={loadError ? t('activities.create.mapsError') : t('common.loading')}
                    disabled
                    className="pl-10"
              />
            </div>
                {loadError && (
                  <p className="text-xs text-destructive">
                    {t('activities.create.mapsConfigError')}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('activities.create.locationHelp')}
            </p>
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