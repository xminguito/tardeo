import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Shield, Heart } from "lucide-react";
import { z } from "zod";
import { useFavorites } from "@/features/activities/hooks/useFavorites";
import PageHeader from "@/components/PageHeader";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
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
        setProfile(profileData);
        setSelectedInterests(profileData.user_interests?.map((ui: any) => ui.interest_id) || []);
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