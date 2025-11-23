/**
 * Hero Banners Manager - Admin Panel
 * Manage home page slider banners with multi-language support
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Image as ImageIcon, MoveUp, MoveDown, Eye, EyeOff } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';

interface HeroBanner {
  id: string;
  title_es: string;
  title_en?: string;
  title_ca?: string;
  title_fr?: string;
  title_de?: string;
  title_it?: string;
  description_es: string;
  description_en?: string;
  description_ca?: string;
  description_fr?: string;
  description_de?: string;
  description_it?: string;
  image_url: string;
  cta_text_es?: string;
  cta_text_en?: string;
  cta_text_ca?: string;
  cta_text_fr?: string;
  cta_text_de?: string;
  cta_text_it?: string;
  cta_link?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type BannerFormData = Omit<HeroBanner, 'id' | 'created_at' | 'updated_at'>;

export default function HeroBannersManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<BannerFormData>({
    title_es: '',
    title_en: '',
    title_ca: '',
    title_fr: '',
    title_de: '',
    title_it: '',
    description_es: '',
    description_en: '',
    description_ca: '',
    description_fr: '',
    description_de: '',
    description_it: '',
    image_url: '',
    cta_text_es: '',
    cta_text_en: '',
    cta_text_ca: '',
    cta_text_fr: '',
    cta_text_de: '',
    cta_text_it: '',
    cta_link: '',
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin) {
      loadBanners();
    }
  }, [isAdmin]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading banners:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los banners',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen debe ser menor a 5MB');
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      // Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('hero-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));

      toast({
        title: 'Éxito',
        description: 'Imagen subida correctamente',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir la imagen',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.title_es || !formData.description_es || !formData.image_url) {
        toast({
          title: 'Error',
          description: 'Los campos en español son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      if (editingBanner) {
        // Update
        const { error } = await supabase
          .from('hero_banners')
          .update(formData)
          .eq('id', editingBanner.id);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Banner actualizado correctamente',
        });
      } else {
        // Create
        const { error } = await supabase
          .from('hero_banners')
          .insert([{ ...formData, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;

        toast({
          title: 'Éxito',
          description: 'Banner creado correctamente',
        });
      }

      setDialogOpen(false);
      resetForm();
      loadBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el banner',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title_es: banner.title_es,
      title_en: banner.title_en || '',
      title_ca: banner.title_ca || '',
      title_fr: banner.title_fr || '',
      title_de: banner.title_de || '',
      title_it: banner.title_it || '',
      description_es: banner.description_es,
      description_en: banner.description_en || '',
      description_ca: banner.description_ca || '',
      description_fr: banner.description_fr || '',
      description_de: banner.description_de || '',
      description_it: banner.description_it || '',
      image_url: banner.image_url,
      cta_text_es: banner.cta_text_es || '',
      cta_text_en: banner.cta_text_en || '',
      cta_text_ca: banner.cta_text_ca || '',
      cta_text_fr: banner.cta_text_fr || '',
      cta_text_de: banner.cta_text_de || '',
      cta_text_it: banner.cta_text_it || '',
      cta_link: banner.cta_link || '',
      order_index: banner.order_index,
      is_active: banner.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    try {
      const { error } = await supabase.from('hero_banners').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Banner eliminado correctamente',
      });

      loadBanners();
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el banner',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `Banner ${!banner.is_active ? 'activado' : 'desactivado'}`,
      });

      loadBanners();
    } catch (error: any) {
      console.error('Error toggling banner:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMoveUp = async (banner: HeroBanner) => {
    const prevBanner = banners.find((b) => b.order_index === banner.order_index - 1);
    if (!prevBanner) return;

    try {
      await supabase.from('hero_banners').update({ order_index: banner.order_index }).eq('id', prevBanner.id);
      await supabase.from('hero_banners').update({ order_index: prevBanner.order_index }).eq('id', banner.id);

      loadBanners();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMoveDown = async (banner: HeroBanner) => {
    const nextBanner = banners.find((b) => b.order_index === banner.order_index + 1);
    if (!nextBanner) return;

    try {
      await supabase.from('hero_banners').update({ order_index: banner.order_index }).eq('id', nextBanner.id);
      await supabase.from('hero_banners').update({ order_index: nextBanner.order_index }).eq('id', banner.id);

      loadBanners();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({
      title_es: '',
      title_en: '',
      title_ca: '',
      title_fr: '',
      title_de: '',
      title_it: '',
      description_es: '',
      description_en: '',
      description_ca: '',
      description_fr: '',
      description_de: '',
      description_it: '',
      image_url: '',
      cta_text_es: '',
      cta_text_en: '',
      cta_text_ca: '',
      cta_text_fr: '',
      cta_text_de: '',
      cta_text_it: '',
      cta_link: '',
      order_index: banners.length > 0 ? Math.max(...banners.map((b) => b.order_index)) + 1 : 1,
      is_active: true,
    });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-destructive">No tienes permisos de administrador</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <PageHeader
          title="Gestión de Banners"
          icon={<ImageIcon className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Banners' },
          ]}
        />

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Banners del Slider Principal</CardTitle>
                <CardDescription>
                  Gestiona los banners que aparecen en la página principal
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Banner
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBanner ? 'Editar Banner' : 'Crear Nuevo Banner'}
                    </DialogTitle>
                    <DialogDescription>
                      Completa los campos en español (obligatorio) y opcionalmente en otros idiomas
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                      <Label>Imagen del Banner *</Label>
                      <div className="flex gap-4 items-start">
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            disabled={uploadingImage}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Recomendado: 1600x900px, máx 5MB
                          </p>
                        </div>
                        {formData.image_url && (
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-32 h-18 object-cover rounded border"
                          />
                        )}
                      </div>
                    </div>

                    {/* Multi-language tabs */}
                    <Tabs defaultValue="es" className="w-full">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="es">🇪🇸 ES *</TabsTrigger>
                        <TabsTrigger value="en">🇬🇧 EN</TabsTrigger>
                        <TabsTrigger value="ca">Ⓒ CA</TabsTrigger>
                        <TabsTrigger value="fr">🇫🇷 FR</TabsTrigger>
                        <TabsTrigger value="de">🇩🇪 DE</TabsTrigger>
                        <TabsTrigger value="it">🇮🇹 IT</TabsTrigger>
                      </TabsList>

                      {(['es', 'en', 'ca', 'fr', 'de', 'it'] as const).map((lang) => (
                        <TabsContent key={lang} value={lang} className="space-y-4">
                          <div>
                            <Label htmlFor={`title_${lang}`}>
                              Título {lang === 'es' && '*'}
                            </Label>
                            <Input
                              id={`title_${lang}`}
                              value={formData[`title_${lang}` as keyof BannerFormData] as string}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  [`title_${lang}`]: e.target.value,
                                }))
                              }
                              required={lang === 'es'}
                              placeholder={`Título en ${lang.toUpperCase()}`}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`description_${lang}`}>
                              Descripción {lang === 'es' && '*'}
                            </Label>
                            <Textarea
                              id={`description_${lang}`}
                              value={formData[`description_${lang}` as keyof BannerFormData] as string}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  [`description_${lang}`]: e.target.value,
                                }))
                              }
                              required={lang === 'es'}
                              placeholder={`Descripción en ${lang.toUpperCase()}`}
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`cta_text_${lang}`}>
                              Texto del Botón (opcional)
                            </Label>
                            <Input
                              id={`cta_text_${lang}`}
                              value={formData[`cta_text_${lang}` as keyof BannerFormData] as string}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  [`cta_text_${lang}`]: e.target.value,
                                }))
                              }
                              placeholder={`Texto del botón en ${lang.toUpperCase()}`}
                            />
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>

                    {/* CTA Link */}
                    <div>
                      <Label htmlFor="cta_link">Enlace del Botón (opcional)</Label>
                      <Input
                        id="cta_link"
                        value={formData.cta_link}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cta_link: e.target.value }))}
                        placeholder="/actividades"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Ruta relativa (e.g. /actividades) o URL completa
                      </p>
                    </div>

                    {/* Settings */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, is_active: checked }))
                          }
                        />
                        <Label htmlFor="is_active">Banner activo</Label>
                      </div>

                      <div className="flex-1">
                        <Label htmlFor="order_index">Orden</Label>
                        <Input
                          id="order_index"
                          type="number"
                          value={formData.order_index}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, order_index: parseInt(e.target.value) }))
                          }
                          min={1}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={uploadingImage}>
                        {editingBanner ? 'Actualizar' : 'Crear'} Banner
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Cargando banners...</p>
            ) : banners.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No hay banners creados. Crea el primero arriba.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Orden</TableHead>
                    <TableHead>Vista Previa</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((banner, index) => (
                    <TableRow key={banner.id}>
                      <TableCell className="font-mono">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(banner)}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-3 w-3" />
                          </Button>
                          <span className="text-xs text-center">{banner.order_index}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(banner)}
                            disabled={index === banners.length - 1}
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={banner.image_url}
                          alt={banner.title_es}
                          className="w-32 h-18 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">{banner.title_es}</div>
                        {banner.cta_text_es && (
                          <div className="text-xs text-muted-foreground">
                            CTA: {banner.cta_text_es}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="text-sm text-muted-foreground truncate">
                          {banner.description_es}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(banner)}
                        >
                          {banner.is_active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(banner)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(banner.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

