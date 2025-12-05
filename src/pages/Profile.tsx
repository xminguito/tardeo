import { useEffect, useState, useRef, useCallback, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Shield, Heart, Lock, Globe, Camera, X, ImagePlus, Loader2, MapPin, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useFavorites } from "@/features/activities/hooks/useFavorites";
import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage, AVATAR_OPTIONS, GALLERY_OPTIONS, calculateSavings } from "@/lib/utils/imageCompression";

// Google Maps libraries
const libraries: ("places")[] = ["places"];

const MAX_GALLERY_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Username validation regex: alphanumeric, underscores, dots only
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [compressingAvatar, setCompressingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [compressingGallery, setCompressingGallery] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [cityInputValue, setCityInputValue] = useState('');
  const [isGalleryDragging, setIsGalleryDragging] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cityAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { favorites } = useFavorites(userId);

  // Load Google Maps script
  const { isLoaded: isMapsLoaded, loadError: mapsLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    loadProfile();
    loadInterests();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, user_interests(interest_id)")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          ...profileData,
          profile_visibility: profileData.profile_visibility || 'public',
        });
        setSelectedInterests(profileData.user_interests?.map((ui: any) => ui.interest_id) || []);
        // Load gallery images from profile (stored as JSON array)
        if (profileData.gallery_images) {
          try {
            const images = typeof profileData.gallery_images === 'string' 
              ? JSON.parse(profileData.gallery_images) 
              : profileData.gallery_images;
            setGalleryImages(Array.isArray(images) ? images : []);
          } catch {
            setGalleryImages([]);
          }
        }
      }

      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsUserAdmin(!!adminRole);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: t('profile.errorLoading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInterests = async () => {
    const { data } = await supabase.from("interests").select("*");
    if (data) setInterests(data);
  };

  // Validate username format
  const validateUsernameFormat = (username: string): string | null => {
    if (!username) return null; // Empty is allowed (optional)
    if (username.length < USERNAME_MIN) {
      return `Mínimo ${USERNAME_MIN} caracteres`;
    }
    if (username.length > USERNAME_MAX) {
      return `Máximo ${USERNAME_MAX} caracteres`;
    }
    if (!USERNAME_REGEX.test(username)) {
      return "Solo letras, números, puntos y guiones bajos";
    }
    return null;
  };

  // Check username uniqueness (debounced)
  const checkUsernameAvailability = async (username: string) => {
    if (!username || !userId) return;
    
    const formatError = validateUsernameFormat(username);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUsernameError("Este nombre de usuario ya está cogido");
      } else {
        setUsernameError(null);
      }
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Handle username change with debounce
  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().trim();
    setProfile({ ...profile, username: sanitized });
    
    // Clear previous timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    // Immediate format validation
    const formatError = validateUsernameFormat(sanitized);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }
    
    // Debounce uniqueness check
    if (sanitized) {
      setCheckingUsername(true);
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(sanitized);
      }, 500);
    } else {
      setUsernameError(null);
      setCheckingUsername(false);
    }
  };

  // ============================================
  // City Autocomplete Handlers
  // ============================================

  // Handle city autocomplete load
  const handleCityAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      cityAutocompleteRef.current = autocomplete;
    },
    []
  );

  // Handle city selection from autocomplete
  const handleCityPlaceChanged = useCallback(() => {
    if (!cityAutocompleteRef.current) return;

    const place = cityAutocompleteRef.current.getPlace();

    if (!place.geometry?.location) {
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Extract city name from address components or formatted address
    const addressComponents = place.address_components || [];
    let cityName = '';

    // Try to find the locality (city) name
    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
        break;
      }
      if (component.types.includes('administrative_area_level_2')) {
        cityName = component.long_name;
      }
    }

    // Fallback to place name if no locality found
    if (!cityName) {
      cityName = place.name || place.formatted_address?.split(',')[0] || '';
    }

    // Update profile with city and coordinates
    setProfile((prev: any) => ({
      ...prev,
      city: cityName,
      latitude: lat,
      longitude: lng,
    }));

    setCityInputValue(cityName);
  }, []);

  // Handle manual city input change
  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityInputValue(value);
    
    // If user clears the input, also clear coordinates
    if (!value) {
      setProfile((prev: any) => ({
        ...prev,
        city: '',
        latitude: null,
        longitude: null,
      }));
    }
  };

  // Sync cityInputValue when profile loads
  useEffect(() => {
    if (profile?.city) {
      setCityInputValue(profile.city);
    }
  }, [profile?.city]);

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t('common.error'),
        description: "Formato no válido. Usa JPG, PNG o WEBP",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t('common.error'),
        description: "La imagen es demasiado grande. Máximo 5MB",
        variant: "destructive",
      });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    // Flat structure like hero-banners: avatar-{userId}-{timestamp}.ext
    const fileName = `${folder}-${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      if (import.meta.env.DEV) {
        console.error('Upload error:', uploadError);
      }
      toast({
        title: t('common.error'),
        description: "Error al subir la imagen",
        variant: "destructive",
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const originalSize = file.size;

    // Step 1: Compress
    setCompressingAvatar(true);
    let optimizedFile: File;
    try {
      optimizedFile = await compressImage(file, AVATAR_OPTIONS);
      
      // Show compression savings
      if (optimizedFile.size < originalSize) {
        const { savedMB, percentage } = calculateSavings(originalSize, optimizedFile.size);
        toast({
          title: "Imagen optimizada",
          description: `Reducida ${percentage}% (${savedMB}MB ahorrados)`,
        });
      }
    } catch (error) {
      console.error('Avatar compression failed:', error);
      optimizedFile = file; // Fallback to original
    } finally {
      setCompressingAvatar(false);
    }

    // Step 2: Upload
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(optimizedFile, 'avatar');
      if (url) {
        // Update profile with new avatar URL
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', userId);

        if (error) throw error;

        setProfile({ ...profile, avatar_url: url });
        toast({
          title: t('common.success'),
          description: "Foto de perfil actualizada",
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Validate gallery files
  const validateGalleryFiles = (files: File[]): File[] => {
    return files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: t('common.error'),
          description: "Formato no válido. Usa JPG, PNG o WEBP",
          variant: "destructive",
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: t('common.error'),
          description: "La imagen es demasiado grande. Máximo 5MB",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
  };

  // Handle gallery files (from input or drag & drop)
  const handleGalleryFiles = async (files: File[]) => {
    if (!files.length || !userId) return;

    const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;
    const filesToProcess = files.slice(0, remainingSlots);
    const validFiles = validateGalleryFiles(filesToProcess);

    if (validFiles.length === 0) return;

    if (files.length > remainingSlots) {
      toast({
        title: t('common.error'),
        description: `Solo puedes añadir ${remainingSlots} imagen(es) más`,
        variant: "destructive",
      });
    }

    const originalTotalSize = validFiles.reduce((acc, f) => acc + f.size, 0);

    // Step 1: Compress all files in parallel
    setCompressingGallery(true);
    let optimizedFiles: File[];
    try {
      optimizedFiles = await Promise.all(
        validFiles.map(file => compressImage(file, GALLERY_OPTIONS))
      );
      
      // Show compression savings
      const compressedTotalSize = optimizedFiles.reduce((acc, f) => acc + f.size, 0);
      if (compressedTotalSize < originalTotalSize) {
        const { savedMB, percentage } = calculateSavings(originalTotalSize, compressedTotalSize);
        toast({
          title: `${validFiles.length} imagen(es) optimizada(s)`,
          description: `Reducidas ${percentage}% (${savedMB}MB ahorrados)`,
        });
      }
    } catch (error) {
      console.error('Gallery compression failed:', error);
      optimizedFiles = validFiles; // Fallback to original
    } finally {
      setCompressingGallery(false);
    }

    // Step 2: Upload all compressed files
    setUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of optimizedFiles) {
        const url = await uploadImage(file, 'gallery');
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        const newGallery = [...galleryImages, ...uploadedUrls];
        
        // Update profile with new gallery
        const { error } = await supabase
          .from('profiles')
          .update({ gallery_images: newGallery })
          .eq('id', userId);

        if (error) throw error;

        setGalleryImages(newGallery);
        toast({
          title: t('common.success'),
          description: `${uploadedUrls.length} imagen(es) añadida(s) a la galería`,
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Handle gallery input change
  const handleGalleryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleGalleryFiles(files);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // Gallery drag & drop handlers
  const handleGalleryDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (galleryImages.length < MAX_GALLERY_IMAGES) {
      setIsGalleryDragging(true);
    }
  };

  const handleGalleryDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragging(false);
  };

  const handleGalleryDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGalleryDragging(false);

    if (galleryImages.length >= MAX_GALLERY_IMAGES) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleGalleryFiles(droppedFiles);
  };

  const removeGalleryImage = async (index: number) => {
    if (!userId) return;
    
    const newGallery = galleryImages.filter((_, i) => i !== index);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gallery_images: newGallery })
        .eq('id', userId);

      if (error) throw error;

      setGalleryImages(newGallery);
      toast({
        title: t('common.success'),
        description: "Imagen eliminada de la galería",
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const profileSchema = z.object({
    full_name: z.string().trim().min(2, "Nombre muy corto").max(100, "Nombre muy largo"),
    bio: z.string().trim().max(500, "Biografía muy larga").optional().or(z.literal("")),
    city: z.string().trim().max(100, "Ciudad muy larga").optional().or(z.literal("")),
    username: z.string().trim()
      .min(USERNAME_MIN, `Mínimo ${USERNAME_MIN} caracteres`)
      .max(USERNAME_MAX, `Máximo ${USERNAME_MAX} caracteres`)
      .regex(USERNAME_REGEX, "Solo letras, números, puntos y guiones bajos")
      .optional()
      .or(z.literal("")),
  });

  const handleSave = async () => {
    // Check for username errors before saving
    if (usernameError) {
      toast({
        title: "Error de validación",
        description: usernameError,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Validate inputs
      profileSchema.parse({
        full_name: profile.full_name?.trim() || "",
        bio: profile.bio?.trim() || "",
        city: profile.city?.trim() || "",
        username: profile.username?.trim() || "",
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Actualizar perfil (username stored lowercase, city with coordinates)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          city: profile.city,
          latitude: profile.latitude ?? null,
          longitude: profile.longitude ?? null,
          username: profile.username?.toLowerCase().trim() || null,
          profile_visibility: profile.profile_visibility || 'public',
        })
        .eq("id", user.id);

      if (profileError) {
        // Handle unique constraint violation
        if (profileError.code === '23505' && profileError.message?.includes('username')) {
          setUsernameError("Este nombre de usuario ya está cogido");
          throw new Error("El nombre de usuario ya está en uso");
        }
        throw profileError;
      }

      // Eliminar intereses antiguos
      await supabase.from("user_interests").delete().eq("user_id", user.id);

      // Insertar nuevos intereses
      if (selectedInterests.length > 0) {
        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(selectedInterests.map(id => ({ user_id: user.id, interest_id: id })));

        if (interestsError) throw interestsError;
      }

      toast({
        title: t('profile.updated'),
        description: t('profile.updatedDesc'),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={{ id: userId }} 
        isUserAdmin={isUserAdmin} 
        favoritesCount={favorites.size}
      />
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
        <PageHeader
          title={t('profile.title')}
          icon={<User className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: t('myAccount.title'), href: '/mi-cuenta' },
            { label: t('profile.title') }
          ]}
          actions={
            <>
              {isUserAdmin && (
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  <Shield className="mr-2 h-4 w-4" />
                  {t('profile.admin')}
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('profile.logout')}
              </Button>
            </>
          }
        />

        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{t('profile.personalInfo')}</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => navigate("/favoritos")}
                className="flex items-center gap-2"
              >
                <Heart className="h-5 w-5 text-primary fill-primary" />
                <span className="font-semibold">{favorites.size}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {profile?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar || compressingAvatar}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {compressingAvatar ? (
                    <>
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                      <span className="text-xs text-white mt-1">Optimizando...</span>
                    </>
                  ) : uploadingAvatar ? (
                    <>
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                      <span className="text-xs text-white mt-1">Subiendo...</span>
                    </>
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Haz clic para cambiar tu foto de perfil
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('profile.fullName')}</Label>
              <Input
                id="fullName"
                value={profile?.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t('profile.bio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('profile.bioPlaceholder')}
                value={profile?.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
              />
            </div>

            {/* City with Google Places Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="city">{t('profile.city')}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {isMapsLoaded && !mapsLoadError ? (
                  <Autocomplete
                    onLoad={handleCityAutocompleteLoad}
                    onPlaceChanged={handleCityPlaceChanged}
                    options={{
                      types: ['(cities)'],
                      componentRestrictions: { country: 'es' },
                    }}
                  >
                    <Input
                      id="city"
                      value={cityInputValue}
                      onChange={handleCityInputChange}
                      placeholder={t('profile.cityPlaceholder')}
                      className="pl-10"
                    />
                  </Autocomplete>
                ) : (
                  <Input
                    id="city"
                    value={profile?.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder={t('profile.cityPlaceholder')}
                    className="pl-10"
                    disabled={!!mapsLoadError}
                  />
                )}
              </div>
              {profile?.latitude && profile?.longitude && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Coordenadas guardadas: {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                </p>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                Nombre de usuario
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={profile?.username || ""}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="tu_nombre_unico"
                  className={`pl-8 ${usernameError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  maxLength={USERNAME_MAX}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {usernameError ? (
                <p className="text-sm text-destructive">{usernameError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {USERNAME_MIN}-{USERNAME_MAX} caracteres. Solo letras, números, puntos y guiones bajos.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>{t('profile.interests')}</Label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest.id}
                    variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                    className="cursor-pointer text-base py-2 px-4"
                    onClick={() => toggleInterest(interest.id)}
                  >
                    {interest.icon} {interest.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Gallery Section - Modern Drag & Drop */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Mi Galería</Label>
                <span className="text-sm text-muted-foreground">
                  {galleryImages.length}/{MAX_GALLERY_IMAGES} imágenes
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Arrastra o selecciona hasta {MAX_GALLERY_IMAGES} fotos para tu perfil público
              </p>
              
              {/* Drop Zone Container */}
              <div
                onDragOver={handleGalleryDragOver}
                onDragLeave={handleGalleryDragLeave}
                onDrop={handleGalleryDrop}
                className={`
                  rounded-xl p-3 transition-all duration-200
                  ${isGalleryDragging 
                    ? 'bg-primary/10 border-2 border-dashed border-primary scale-[1.01]' 
                    : 'bg-muted/30 border border-transparent'
                  }
                `}
              >
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {/* Existing Images */}
                  {galleryImages.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                      <img
                        src={url}
                        alt={`Galería ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground 
                                         opacity-0 group-hover:opacity-100 transition-opacity
                                         hover:bg-destructive/90 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                              aria-label="Eliminar imagen"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar imagen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}

                  {/* Compressing Placeholders */}
                  {compressingGallery && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-primary/50 bg-primary/5
                                   flex flex-col items-center justify-center gap-1">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      <span className="text-xs text-primary font-medium">Optimizando</span>
                    </div>
                  )}

                  {/* Uploading Placeholders */}
                  {uploadingGallery && !compressingGallery && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-primary/50 bg-primary/5
                                   flex flex-col items-center justify-center gap-1">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      <span className="text-xs text-primary font-medium">Subiendo</span>
                    </div>
                  )}

                  {/* Add More Button */}
                  {galleryImages.length < MAX_GALLERY_IMAGES && !compressingGallery && !uploadingGallery && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => galleryInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          galleryInputRef.current?.click();
                        }
                      }}
                      className={`
                        aspect-square rounded-lg border-2 border-dashed cursor-pointer
                        flex flex-col items-center justify-center gap-1
                        transition-all duration-200
                        ${isGalleryDragging 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                        }
                        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                      `}
                    >
                      <Plus className={`h-5 w-5 ${isGalleryDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-medium ${isGalleryDragging ? 'text-primary' : 'text-muted-foreground'}`}>
                        Añadir
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleGalleryInputChange}
                className="hidden"
                aria-label="Seleccionar imágenes para la galería"
              />
            </div>

            {/* Privacy Settings */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visibility" className="text-base font-semibold flex items-center gap-2">
                    {profile?.profile_visibility === 'private' ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    Visibilidad del Perfil
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {profile?.profile_visibility === 'private' 
                      ? "Tu perfil es privado. Solo tus amigos pueden ver tu contenido completo."
                      : "Tu perfil es público. Cualquiera puede ver tu contenido."}
                  </p>
                </div>
                <Switch
                  id="profile-visibility"
                  checked={profile?.profile_visibility === 'public'}
                  onCheckedChange={(checked) => {
                    setProfile({ 
                      ...profile, 
                      profile_visibility: checked ? 'public' : 'private' 
                    });
                  }}
                />
              </div>
              
              {/* Public Profile Link */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-semibold">Enlace a tu Perfil Público</Label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="px-3 py-2 bg-muted rounded-md text-sm font-mono break-all flex-1">
                    {window.location.origin}/u/{profile?.username || userId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/u/${profile?.username || userId}`;
                      navigator.clipboard.writeText(profileUrl);
                      toast({
                        title: "Copiado",
                        description: "Enlace del perfil copiado al portapapeles",
                      });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                {profile?.username ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✨ ¡Genial! Tu perfil tiene una URL personalizada:{" "}
                    <span className="font-mono text-primary font-medium">
                      tardeo.app/u/{profile.username}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Añade un nombre de usuario arriba para tener una URL más fácil de compartir.
                  </p>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
          </CardContent>
        </Card>
        </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default Profile;