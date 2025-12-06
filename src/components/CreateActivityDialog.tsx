import React, { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, MapPin, Check, Sparkles, ImagePlus, X } from 'lucide-react';
import { compressImage, GALLERY_OPTIONS, calculateSavings } from '@/lib/utils/imageCompression';

// ============================================
// Activity Categories
// ============================================
const ACTIVITY_CATEGORIES = [
  { id: 'social', labelKey: 'activities.categories.social', emoji: '☕', icon: '☕' },
  { id: 'culture', labelKey: 'activities.categories.culture', emoji: '🎨', icon: '🎨' },
  { id: 'sport', labelKey: 'activities.categories.sport', emoji: '🏃', icon: '🏃' },
  { id: 'food', labelKey: 'activities.categories.food', emoji: '🍷', icon: '🍷' },
  { id: 'music', labelKey: 'activities.categories.music', emoji: '🎵', icon: '🎵' },
  { id: 'games', labelKey: 'activities.categories.games', emoji: '🎲', icon: '🎲' },
  { id: 'learning', labelKey: 'activities.categories.learning', emoji: '📚', icon: '📚' },
  { id: 'family', labelKey: 'activities.categories.family', emoji: '👨‍👩‍👧‍👦', icon: '👨‍👩‍👧‍👦' },
  { id: 'pets', labelKey: 'activities.categories.pets', emoji: '🐶', icon: '🐶' },
  { id: 'other', labelKey: 'activities.categories.other', emoji: '✨', icon: '✨' },
] as const;

type CategoryId = typeof ACTIVITY_CATEGORIES[number]['id'];

// ============================================
// ImageUploadZone Component
// ============================================
interface ImageUploadZoneProps {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  accept?: string;
  maxSizeMB?: number;
  label: string;
  hint: string;
  height?: string;
  isCompressing?: boolean;
}

function ImageUploadZone({
  preview,
  onFileSelect,
  onRemove,
  accept = 'image/jpeg,image/png,image/webp,image/jpg',
  maxSizeMB = 5,
  label,
  hint,
  height = 'h-48',
  isCompressing = false,
}: ImageUploadZoneProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): boolean => {
    const validTypes = accept.split(',').map(t => t.trim());
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('common.error'),
        description: t('activities.create.invalidImageType'),
        variant: 'destructive',
      });
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: t('activities.create.imageTooLarge'),
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  // Show compressing state
  if (isCompressing) {
    return (
      <div className={`${height} rounded-xl border-2 border-dashed border-primary/50 bg-primary/5
                       flex flex-col items-center justify-center gap-3`}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-primary">{t('activities.create.optimizingImage')}</p>
          <p className="text-xs text-muted-foreground">{t('activities.create.optimizingHint')}</p>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className={`relative ${height} rounded-xl overflow-hidden border border-border group`}>
        <img
          src={preview}
          alt="Preview"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground 
                           opacity-0 group-hover:opacity-100 transition-opacity
                           hover:bg-destructive/90 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={t('common.delete')}
              >
                <X className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('common.delete')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        ${height} rounded-xl border-2 border-dashed cursor-pointer
        flex flex-col items-center justify-center gap-2
        transition-all duration-200
        ${isDragging 
          ? 'border-primary bg-primary/10 scale-[1.02]' 
          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
        }
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-label={label}
      />
      <div className={`p-3 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-muted'} transition-colors`}>
        <ImagePlus className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div className="text-center px-4">
        <p className={`text-sm font-medium ${isDragging ? 'text-primary' : 'text-foreground'}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

// ============================================
// GalleryUploadGrid Component
// ============================================
interface GalleryUploadGridProps {
  previews: string[];
  onFilesSelect: (files: File[]) => void;
  onRemove: (index: number) => void;
  maxFiles?: number;
  accept?: string;
  maxSizeMB?: number;
  isCompressing?: boolean;
  compressingCount?: number;
}

function GalleryUploadGrid({
  previews,
  onFilesSelect,
  onRemove,
  maxFiles = 4,
  accept = 'image/jpeg,image/png,image/webp,image/jpg',
  maxSizeMB = 5,
  isCompressing = false,
  compressingCount = 0,
}: GalleryUploadGridProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const canAddMore = previews.length < maxFiles;

  const validateFiles = (files: File[]): File[] => {
    const validTypes = accept.split(',').map(t => t.trim());
    return files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast({
          title: t('common.error'),
          description: t('activities.create.invalidImageType'),
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('activities.create.imageTooLarge'),
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAddMore) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canAddMore) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const availableSlots = maxFiles - previews.length;
    const filesToAdd = droppedFiles.slice(0, availableSlots);
    const validFiles = validateFiles(filesToAdd);

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }

    if (droppedFiles.length > availableSlots) {
      toast({
        title: t('common.error'),
        description: t('activities.create.maxSecondaryImages'),
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const availableSlots = maxFiles - previews.length;
    const filesToAdd = files.slice(0, availableSlots);
    const validFiles = validateFiles(filesToAdd);

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }

    if (files.length > availableSlots) {
      toast({
        title: t('common.error'),
        description: t('activities.create.maxSecondaryImages'),
        variant: 'destructive',
      });
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && canAddMore) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-2"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Existing previews */}
        {previews.map((preview, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            <img
              src={preview}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground 
                               opacity-0 group-hover:opacity-100 transition-opacity
                               hover:bg-destructive/90 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={t('common.delete')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('common.delete')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}

        {/* Compressing placeholders */}
        {isCompressing && Array.from({ length: compressingCount }).map((_, index) => (
          <div 
            key={`compressing-${index}`} 
            className="aspect-square rounded-lg border-2 border-dashed border-primary/50 bg-primary/5
                       flex items-center justify-center"
          >
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        ))}

        {/* Add more button */}
        {canAddMore && !isCompressing && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleKeyDown}
            className={`
              aspect-square rounded-lg border-2 border-dashed cursor-pointer
              flex flex-col items-center justify-center gap-1
              transition-all duration-200
              ${isDragging 
                ? 'border-primary bg-primary/10 scale-[1.02]' 
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
              }
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            `}
          >
            <Plus className={`h-5 w-5 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-medium ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}>
              {t('activities.create.addImage')}
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        multiple
        aria-label={t('activities.create.secondaryImages')}
      />

      <p className="text-xs text-muted-foreground">
        {t('activities.create.secondaryImagesHelp')} ({previews.length}/{maxFiles})
      </p>
    </div>
  );
}

// Libraries for Google Maps
const libraries: ("places")[] = ["places"];

// Activity type for edit mode
interface ActivityToEdit {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date: string;
  time: string;
  cost: number;
  max_participants: number;
  image_url?: string | null;
  secondary_images?: string[] | null;
}

interface CreateActivityDialogProps {
  onActivityCreated?: () => void;
  // Edit mode props
  activityToEdit?: ActivityToEdit | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CreateActivityDialog({ 
  onActivityCreated, 
  activityToEdit,
  isOpen: controlledOpen,
  onClose 
}: CreateActivityDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Determine if this is edit mode
  const isEditMode = !!activityToEdit;
  
  // Support both controlled and uncontrolled open state
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen !== undefined && onClose && !value) {
      onClose();
    } else {
      setInternalOpen(value);
    }
  };
  
  const [loading, setLoading] = useState(false);
  
  // Form data initialization - will be set via useEffect when editing
  const getInitialFormData = () => ({
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
  
  const [formData, setFormData] = useState(getInitialFormData);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [secondaryImages, setSecondaryImages] = useState<File[]>([]);
  const [secondaryPreviews, setSecondaryPreviews] = useState<string[]>([]);
  
  // Track if images have changed (to avoid re-uploading existing ones)
  const [mainImageChanged, setMainImageChanged] = useState(false);
  const [existingMainImageUrl, setExistingMainImageUrl] = useState<string | null>(null);
  const [existingSecondaryUrls, setExistingSecondaryUrls] = useState<string[]>([]);

  // Initialize form with activity data when editing
  useEffect(() => {
    if (activityToEdit && open) {
      setFormData({
        title: activityToEdit.title || '',
        description: activityToEdit.description || '',
        category: activityToEdit.category || '',
        location: activityToEdit.location || '',
        city: activityToEdit.city || '',
        province: activityToEdit.province || '',
        date: activityToEdit.date || '',
        time: activityToEdit.time?.slice(0, 5) || '18:00',
        cost: activityToEdit.cost || 0,
        maxParticipants: activityToEdit.max_participants || 20,
        latitude: activityToEdit.latitude || null,
        longitude: activityToEdit.longitude || null,
      });
      
      // Set location input value for display
      setLocationInputValue(activityToEdit.location || '');
      setIsPlaceSelected(!!activityToEdit.latitude && !!activityToEdit.longitude);
      
      // Handle existing images
      if (activityToEdit.image_url) {
        setExistingMainImageUrl(activityToEdit.image_url);
        setImagePreview(activityToEdit.image_url);
        setMainImageChanged(false);
      }
      
      if (activityToEdit.secondary_images && activityToEdit.secondary_images.length > 0) {
        setExistingSecondaryUrls(activityToEdit.secondary_images);
        setSecondaryPreviews(activityToEdit.secondary_images);
      }
    } else if (!open) {
      // Reset form when dialog closes
      setFormData(getInitialFormData());
      setMainImage(null);
      setImagePreview(null);
      setSecondaryImages([]);
      setSecondaryPreviews([]);
      setLocationInputValue('');
      setIsPlaceSelected(false);
      setMainImageChanged(false);
      setExistingMainImageUrl(null);
      setExistingSecondaryUrls([]);
    }
  }, [activityToEdit, open]);

  // Image compression states
  const [isCompressingMain, setIsCompressingMain] = useState(false);
  const [isCompressingSecondary, setIsCompressingSecondary] = useState(false);
  const [compressingCount, setCompressingCount] = useState(0);

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

  // Main image handlers with compression
  const handleMainImageSelect = useCallback(async (file: File) => {
    // Revoke previous URL to prevent memory leak (only if it's a blob URL, not an existing image URL)
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    // Start compression
    setIsCompressingMain(true);

    try {
      const optimizedFile = await compressImage(file, GALLERY_OPTIONS);
      setMainImage(optimizedFile);
      setImagePreview(URL.createObjectURL(optimizedFile));
      setMainImageChanged(true); // Mark as changed for edit mode

      // Show success toast with size reduction info
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const compressedSizeMB = (optimizedFile.size / 1024 / 1024).toFixed(2);
      if (file.size !== optimizedFile.size) {
        toast({
          title: t('activities.create.imageOptimized'),
          description: t('activities.create.imageOptimizedDesc', { 
            original: originalSizeMB, 
            compressed: compressedSizeMB 
          }),
        });
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      // Fallback to original file
      setMainImage(file);
      setImagePreview(URL.createObjectURL(file));
      setMainImageChanged(true);
    } finally {
      setIsCompressingMain(false);
    }
  }, [imagePreview, t, toast]);

  const handleMainImageRemove = useCallback(() => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setMainImage(null);
    setImagePreview(null);
    setMainImageChanged(true); // Mark as changed (removed)
    setExistingMainImageUrl(null);
  }, [imagePreview]);

  // Secondary images handlers with compression
  const handleSecondaryImagesSelect = useCallback(async (files: File[]) => {
    setIsCompressingSecondary(true);
    setCompressingCount(files.length);

    try {
      // Compress all files in parallel
      const optimizedFiles = await Promise.all(
        files.map(file => compressImage(file, GALLERY_OPTIONS))
      );

      const newPreviews = optimizedFiles.map(file => URL.createObjectURL(file));
      setSecondaryImages(prev => [...prev, ...optimizedFiles]);
      setSecondaryPreviews(prev => [...prev, ...newPreviews]);

      // Calculate total savings
      const originalTotal = files.reduce((acc, f) => acc + f.size, 0);
      const compressedTotal = optimizedFiles.reduce((acc, f) => acc + f.size, 0);
      
      if (originalTotal !== compressedTotal) {
        toast({
          title: t('activities.create.imagesOptimized'),
          description: t('activities.create.imagesOptimizedDesc', { 
            count: files.length,
            saved: ((originalTotal - compressedTotal) / 1024 / 1024).toFixed(2)
          }),
        });
      }
    } catch (error) {
      console.error('Error optimizing images:', error);
      // Fallback to original files
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setSecondaryImages(prev => [...prev, ...files]);
      setSecondaryPreviews(prev => [...prev, ...newPreviews]);
    } finally {
      setIsCompressingSecondary(false);
      setCompressingCount(0);
    }
  }, [t, toast]);

  const handleSecondaryImageRemove = useCallback((index: number) => {
    // Revoke URL for the removed image
    URL.revokeObjectURL(secondaryPreviews[index]);
    setSecondaryImages(prev => prev.filter((_, i) => i !== index));
    setSecondaryPreviews(prev => prev.filter((_, i) => i !== index));
  }, [secondaryPreviews]);

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

      let imageUrl: string | null = isEditMode ? existingMainImageUrl : null;
      let secondaryImageUrls: string[] = isEditMode ? [...existingSecondaryUrls] : [];

      // Upload main image only if it changed (new file selected)
      if (mainImage && mainImageChanged) {
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
      } else if (!mainImage && !imagePreview) {
        // Image was removed
        imageUrl = null;
      }

      // Upload new secondary images if any
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

      // For edit mode, use existing previews that weren't removed
      // Secondary previews now contains the current state (existing URLs + new blob URLs)
      if (isEditMode) {
        // Filter out blob URLs and only keep existing URLs that are still in previews
        secondaryImageUrls = secondaryPreviews.filter(url => !url.startsWith('blob:'));
        // Add newly uploaded URLs
        for (let i = 0; i < secondaryImages.length; i++) {
          const file = secondaryImages[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-secondary-edit-${i}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('activity-images')
            .upload(filePath, file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('activity-images')
              .getPublicUrl(filePath);
            secondaryImageUrls.push(publicUrl);
          }
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

      // Prepare activity data
      const activityData = {
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
        image_url: imageUrl,
        secondary_images: secondaryImageUrls.length > 0 ? secondaryImageUrls : null,
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
      };

      if (isEditMode && activityToEdit) {
        // UPDATE existing activity
        const { error: updateError } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', activityToEdit.id);

        if (updateError) {
          console.error('Update error:', updateError);
          toast({
            title: t('common.error'),
            description: t('activities.edit.updateError'),
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: t('common.success'),
          description: t('activities.edit.updated'),
        });
      } else {
        // INSERT new activity
        const { error: insertError } = await supabase.from('activities').insert({
          ...activityData,
          created_by: user.id,
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
      }

      setOpen(false);
      
      // Reset form state
      setFormData(getInitialFormData());
      setMainImage(null);
      setImagePreview(null);
      setSecondaryImages([]);
      setSecondaryPreviews([]);
      setLocationInputValue('');
      setIsPlaceSelected(false);
      setMainImageChanged(false);
      setExistingMainImageUrl(null);
      setExistingSecondaryUrls([]);

      onActivityCreated?.();
    } catch (error) {
      console.error('Error saving activity:', error);
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
      {/* Only show trigger in create mode (uncontrolled) */}
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" className="md:size-default">
            <Plus className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden sm:inline">{t('home.createActivity')}</span>
            <span className="sm:hidden">{t('common.create')}</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(event) => {
          // Prevent Dialog from capturing clicks on Google Places dropdown
          const target = event.target as HTMLElement | null;
          if (target && target.closest('.pac-container')) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          // Prevent Dialog from stealing focus when interacting with Google dropdown
          const target = event.target as HTMLElement | null;
          if (target && target.closest('.pac-container')) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          // Prevent closing when clicking on Google Places dropdown
          const target = event.target as HTMLElement | null;
          if (target && target.closest('.pac-container')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('activities.edit.title') : t('activities.create.title')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t('activities.edit.description') : t('activities.create.description')}
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

          {/* Main Image Upload Zone */}
          <div className="space-y-2">
            <Label>{t('activities.create.mainImage')}</Label>
            <ImageUploadZone
              preview={imagePreview}
              onFileSelect={handleMainImageSelect}
              onRemove={handleMainImageRemove}
              label={t('activities.create.dropMainImage')}
              hint={t('activities.create.imageRequirements')}
              height="h-48"
              isCompressing={isCompressingMain}
            />
          </div>

          {/* Secondary Images Gallery */}
          <div className="space-y-2">
            <Label>{t('activities.create.secondaryImages')}</Label>
            <GalleryUploadGrid
              previews={secondaryPreviews}
              onFilesSelect={handleSecondaryImagesSelect}
              onRemove={handleSecondaryImageRemove}
              maxFiles={4}
              isCompressing={isCompressingSecondary}
              compressingCount={compressingCount}
            />
          </div>

          {/* Category Select */}
          <div className="space-y-2">
              <Label htmlFor="category">{t('activities.create.category')} *</Label>
            <Select
                value={formData.category}
              onValueChange={(value: CategoryId) => setFormData({ ...formData, category: value })}
                required
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder={t('activities.create.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <SelectItem 
                    key={category.id} 
                    value={category.id}
                    className="cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{category.emoji}</span>
                      <span>{t(category.labelKey)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      onBlur={(e) => {
                        // Prevent blur from interfering with pac-container clicks
                        // The relatedTarget is null when clicking on pac-container (it's outside React)
                        const relatedTarget = e.relatedTarget as HTMLElement | null;
                        if (!relatedTarget) {
                          // Check if pac-container is visible (user might be clicking on it)
                          const pacContainer = document.querySelector('.pac-container');
                          if (pacContainer && pacContainer.childElementCount > 0) {
                            // Re-focus the input to allow selection
                            e.target.focus();
                          }
                        }
                      }}
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
              {loading 
                ? (isEditMode ? t('activities.edit.saving') : t('activities.create.creating'))
                : (isEditMode ? t('activities.edit.saveChanges') : t('activities.create.create'))
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}