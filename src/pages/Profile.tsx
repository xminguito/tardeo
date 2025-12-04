import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Shield, Heart, Lock, Globe, Camera, X, ImagePlus, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { useFavorites } from "@/features/activities/hooks/useFavorites";
import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage, AVATAR_OPTIONS, GALLERY_OPTIONS, calculateSavings } from "@/lib/utils/imageCompression";

const MAX_GALLERY_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { favorites } = useFavorites(userId);

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !userId) return;

    const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;
    if (files.length > remainingSlots) {
      toast({
        title: t('common.error'),
        description: `Solo puedes añadir ${remainingSlots} imagen(es) más`,
        variant: "destructive",
      });
      return;
    }

    const originalTotalSize = files.reduce((acc, f) => acc + f.size, 0);

    // Step 1: Compress all files in parallel
    setCompressingGallery(true);
    let optimizedFiles: File[];
    try {
      optimizedFiles = await Promise.all(
        files.map(file => compressImage(file, GALLERY_OPTIONS))
      );
      
      // Show compression savings
      const compressedTotalSize = optimizedFiles.reduce((acc, f) => acc + f.size, 0);
      if (compressedTotalSize < originalTotalSize) {
        const { savedMB, percentage } = calculateSavings(originalTotalSize, compressedTotalSize);
        toast({
          title: `${files.length} imagen(es) optimizada(s)`,
          description: `Reducidas ${percentage}% (${savedMB}MB ahorrados)`,
        });
      }
    } catch (error) {
      console.error('Gallery compression failed:', error);
      optimizedFiles = files; // Fallback to original
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
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate inputs
      profileSchema.parse({
        full_name: profile.full_name?.trim() || "",
        bio: profile.bio?.trim() || "",
        city: profile.city?.trim() || "",
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Actualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          city: profile.city,
          profile_visibility: profile.profile_visibility || 'public',
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

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

            <div className="space-y-2">
              <Label htmlFor="city">{t('profile.city')}</Label>
              <Input
                id="city"
                value={profile?.city || ""}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder={t('profile.cityPlaceholder')}
              />
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

            {/* Gallery Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Mi Galería</Label>
                <span className="text-sm text-muted-foreground">
                  {galleryImages.length}/{MAX_GALLERY_IMAGES} imágenes
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Añade hasta {MAX_GALLERY_IMAGES} fotos para mostrar en tu perfil público
              </p>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {galleryImages.map((url, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img
                      src={url}
                      alt={`Galería ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeGalleryImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {galleryImages.length < MAX_GALLERY_IMAGES && (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery || compressingGallery}
                    className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    {compressingGallery ? (
                      <>
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                        <span className="text-xs text-muted-foreground">Optimizando...</span>
                      </>
                    ) : uploadingGallery ? (
                      <>
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                        <span className="text-xs text-muted-foreground">Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Añadir</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleGalleryUpload}
                className="hidden"
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
              
              {/* User ID Display */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-semibold">ID de tu Perfil</Label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                    {userId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(userId || '');
                      toast({
                        title: "Copiado",
                        description: "ID del perfil copiado al portapapeles",
                      });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Comparte este ID para que otros usuarios puedan ver tu perfil:{" "}
                  <span className="font-mono text-primary">
                    /user/{userId}
                  </span>
                </p>
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