import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Loader2, 
  MapPin, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  User,
  MapPinned,
  Heart,
  Check,
  PartyPopper
} from "lucide-react";
import { compressImage, AVATAR_OPTIONS, calculateSavings } from "@/lib/utils/imageCompression";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

// Google Maps libraries
const libraries: ("places")[] = ["places"];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_INTERESTS = 3;

// Username validation
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

interface Interest {
  id: string;
  name: string;
  icon: string;
}

interface FormData {
  avatar_url: string;
  username: string;
  full_name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  bio: string;
  interests: string[];
}

const STEPS = [
  { id: 1, title: "Tu identidad", icon: User, description: "Cuéntanos quién eres" },
  { id: 2, title: "Ubicación y bio", icon: MapPinned, description: "De dónde vienes y qué te define" },
  { id: 3, title: "Tus intereses", icon: Heart, description: "Qué actividades te gustan" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    avatar_url: "",
    username: "",
    full_name: "",
    city: "",
    latitude: null,
    longitude: null,
    bio: "",
    interests: [],
  });

  // Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [compressingAvatar, setCompressingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Username validation
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // City autocomplete
  const [cityInputValue, setCityInputValue] = useState('');
  const cityAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Bio generation
  const [generatingBio, setGeneratingBio] = useState(false);

  // Load Google Maps
  const { isLoaded: isMapsLoaded, loadError: mapsLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Check auth and load data on mount
  useEffect(() => {
    checkAuth();
    loadInterests();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Check if already onboarded
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate("/");
        return;
      }

      // Pre-fill existing data if any
      if (profile) {
        setFormData(prev => ({
          ...prev,
          full_name: profile.full_name || "",
          avatar_url: profile.avatar_url || "",
        }));
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInterests = async () => {
    const { data } = await supabase.from("interests").select("*").order("name");
    if (data) setInterests(data);
  };

  // ============================================
  // Username Validation
  // ============================================

  const validateUsernameFormat = (username: string): string | null => {
    if (!username) return null;
    if (username.length < USERNAME_MIN) return `Mínimo ${USERNAME_MIN} caracteres`;
    if (username.length > USERNAME_MAX) return `Máximo ${USERNAME_MAX} caracteres`;
    if (!USERNAME_REGEX.test(username)) return "Solo letras, números, puntos y guiones bajos";
    return null;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || !userId) return;
    
    const formatError = validateUsernameFormat(username);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", userId)
        .maybeSingle();

      if (data) {
        setUsernameError("Este nombre de usuario ya está en uso");
      } else {
        setUsernameError(null);
      }
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().trim();
    setFormData(prev => ({ ...prev, username: sanitized }));
    
    if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
    
    const formatError = validateUsernameFormat(sanitized);
    if (formatError) {
      setUsernameError(formatError);
      return;
    }
    
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
  // Avatar Upload
  // ============================================

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Error", description: "Formato no válido. Usa JPG, PNG o WEBP", variant: "destructive" });
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Error", description: "La imagen es muy grande. Máximo 5MB", variant: "destructive" });
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Error", description: "Error al subir la imagen", variant: "destructive" });
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

    setCompressingAvatar(true);
    let optimizedFile: File;
    try {
      optimizedFile = await compressImage(file, AVATAR_OPTIONS);
      if (optimizedFile.size < originalSize) {
        const { percentage } = calculateSavings(originalSize, optimizedFile.size);
        toast({ title: "Imagen optimizada", description: `Reducida ${percentage}%` });
      }
    } catch {
      optimizedFile = file;
    } finally {
      setCompressingAvatar(false);
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadImage(optimizedFile);
      if (url) {
        setFormData(prev => ({ ...prev, avatar_url: url }));
        toast({ title: "¡Genial!", description: "Foto de perfil actualizada" });
      }
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ============================================
  // City Autocomplete
  // ============================================

  const handleCityAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      cityAutocompleteRef.current = autocomplete;
    },
    []
  );

  const handleCityPlaceChanged = useCallback(() => {
    if (!cityAutocompleteRef.current) return;

    const place = cityAutocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const addressComponents = place.address_components || [];
    let cityName = '';

    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
        break;
      }
      if (component.types.includes('administrative_area_level_2')) {
        cityName = component.long_name;
      }
    }

    if (!cityName) {
      cityName = place.name || place.formatted_address?.split(',')[0] || '';
    }

    setFormData(prev => ({
      ...prev,
      city: cityName,
      latitude: lat,
      longitude: lng,
    }));
    setCityInputValue(cityName);
  }, []);

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityInputValue(value);
    if (!value) {
      setFormData(prev => ({ ...prev, city: '', latitude: null, longitude: null }));
    }
  };

  // ============================================
  // AI Bio Generation
  // ============================================

  const generateBio = async () => {
    if (!formData.full_name) {
      toast({ title: "Primero completa tu nombre", variant: "destructive" });
      return;
    }

    setGeneratingBio(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get interest names for the selected interests
      const selectedInterestNames = interests
        .filter(i => formData.interests.includes(i.id))
        .map(i => i.name);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://kzcowengsnnuglyrjuto.supabase.co'}/functions/v1/generate-bio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            city: formData.city,
            interests: selectedInterestNames,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to generate bio');

      const { bio } = await response.json();
      setFormData(prev => ({ ...prev, bio }));
      toast({ title: "¡Bio generada!", description: "Puedes editarla si quieres" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo generar la bio", variant: "destructive" });
    } finally {
      setGeneratingBio(false);
    }
  };

  // ============================================
  // Interest Selection
  // ============================================

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  // ============================================
  // Navigation & Validation
  // ============================================

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.full_name.trim()) {
          toast({ title: "Completa tu nombre", variant: "destructive" });
          return false;
        }
        if (formData.username && usernameError) {
          toast({ title: "Corrige el nombre de usuario", description: usernameError, variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        // City and bio are optional
        return true;
      case 3:
        if (formData.interests.length < MIN_INTERESTS) {
          toast({ 
            title: "Selecciona más intereses", 
            description: `Necesitas al menos ${MIN_INTERESTS} intereses`,
            variant: "destructive" 
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // ============================================
  // Complete Onboarding
  // ============================================

  const completeOnboarding = async () => {
    if (!validateStep(3) || !userId) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          avatar_url: formData.avatar_url || null,
          username: formData.username?.toLowerCase().trim() || null,
          city: formData.city || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          bio: formData.bio || null,
          onboarding_completed: true,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Delete existing interests
      await supabase.from("user_interests").delete().eq("user_id", userId);

      // Insert new interests
      if (formData.interests.length > 0) {
        const { error: interestsError } = await supabase
          .from("user_interests")
          .insert(formData.interests.map(id => ({ user_id: userId, interest_id: id })));

        if (interestsError) throw interestsError;
      }

      // 🎉 Confetti explosion!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'],
      });

      toast({
        title: "🎉 ¡Bienvenido a Tardeo!",
        description: "Tu perfil está listo. ¡A explorar actividades!",
      });

      // Redirect after a brief delay for the confetti
      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Step indicators */}
          <div className="flex justify-center gap-3 mb-8">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300",
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground scale-105"
                    : currentStep > step.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Card container */}
          <div className="bg-card rounded-2xl shadow-xl border p-6 sm:p-8">
            {/* Step 1: Identity */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">¡Bienvenido! 👋</h1>
                  <p className="text-muted-foreground mt-1">Cuéntanos quién eres</p>
                </div>

                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="text-3xl bg-primary/10">
                        {formData.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar || compressingAvatar}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {compressingAvatar || uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
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
                    Toca para añadir foto
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo *</Label>
                  <Input
                    id="fullName"
                    placeholder="¿Cómo te llamas?"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="text-lg"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Nombre de usuario <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="username"
                      placeholder="tu_nombre_unico"
                      value={formData.username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={cn("pl-8", usernameError && "border-destructive")}
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
                      Para tu URL de perfil: tardeo.app/u/{formData.username || "tunombre"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Location & Bio */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">¿De dónde eres? 🗺️</h1>
                  <p className="text-muted-foreground mt-1">Y cuéntanos algo de ti</p>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">Tu ciudad</Label>
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
                          placeholder="Busca tu ciudad..."
                          className="pl-10"
                        />
                      </Autocomplete>
                    ) : (
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Tu ciudad"
                        className="pl-10"
                      />
                    )}
                  </div>
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Ubicación guardada
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio">Tu bio</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateBio}
                      disabled={generatingBio || !formData.full_name}
                      className="gap-1.5 text-primary hover:text-primary"
                    >
                      {generatingBio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generar con IA
                    </Button>
                  </div>
                  <Textarea
                    id="bio"
                    placeholder="Cuéntanos algo sobre ti... ¿Qué te gusta hacer en tu tiempo libre?"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.bio.length}/500
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Interests */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">¿Qué te interesa? ✨</h1>
                  <p className="text-muted-foreground mt-1">
                    Selecciona al menos {MIN_INTERESTS} actividades
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {interests.map((interest) => (
                    <Badge
                      key={interest.id}
                      variant={formData.interests.includes(interest.id) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-base py-2.5 px-4 transition-all duration-200",
                        formData.interests.includes(interest.id) 
                          ? "scale-105 shadow-md" 
                          : "hover:scale-105"
                      )}
                      onClick={() => toggleInterest(interest.id)}
                    >
                      {interest.icon} {interest.name}
                    </Badge>
                  ))}
                </div>

                <div className="text-center pt-4">
                  <p className={cn(
                    "text-sm font-medium",
                    formData.interests.length >= MIN_INTERESTS 
                      ? "text-green-600" 
                      : "text-muted-foreground"
                  )}>
                    {formData.interests.length >= MIN_INTERESTS ? (
                      <>
                        <Check className="inline h-4 w-4 mr-1" />
                        ¡Perfecto! Has seleccionado {formData.interests.length} intereses
                      </>
                    ) : (
                      `${formData.interests.length}/${MIN_INTERESTS} seleccionados`
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Atrás
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button
                  onClick={nextStep}
                  className="flex-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={completeOnboarding}
                  disabled={saving || formData.interests.length < MIN_INTERESTS}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PartyPopper className="h-4 w-4 mr-2" />
                  )}
                  ¡Completar!
                </Button>
              )}
            </div>
          </div>

          {/* Skip hint - removed, we don't want them to escape! */}
        </div>
      </div>
    </div>
  );
}
