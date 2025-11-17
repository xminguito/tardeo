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
import { User, LogOut, ArrowLeft, Settings, Heart } from "lucide-react";
import { z } from "zod";
import { useFavorites } from "@/features/activities/hooks/useFavorites";

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
        title: "Error",
        description: "No se pudo cargar el perfil",
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
        title: "¡Perfil actualizado! ✨",
        description: "Tus cambios han sido guardados",
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
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="flex gap-2">
            {isUserAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Mi Perfil</CardTitle>
                  <p className="text-sm text-muted-foreground">Personaliza tu información</p>
                </div>
              </div>
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
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={profile?.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Sobre mí</Label>
              <Textarea
                id="bio"
                placeholder="Cuéntanos algo sobre ti..."
                value={profile?.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={profile?.city || ""}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="Madrid, Barcelona..."
              />
            </div>

            <div className="space-y-3">
              <Label>Mis intereses</Label>
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
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;