/**
 * Hero Banners Manager - Admin Panel
 * Manage multiple sliders with banners and page assignments
 */

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  Plus, Edit, Trash2, Image as ImageIcon, MoveUp, MoveDown, 
  Eye, EyeOff, Layers, Settings2, Globe 
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';

// Available pages for slider placement
const AVAILABLE_PAGES = [
  { path: '/', label: 'Página Principal (Home)' },
  { path: '/actividades', label: 'Actividades' },
  { path: '/explorar-perfiles', label: 'Explorar Perfiles' },
  { path: '/favoritos', label: 'Favoritos' },
  { path: '/mi-cuenta', label: 'Mi Cuenta' },
];

interface Slider {
  id: string;
  name: string;
  slug: string;
  description?: string;
  page_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HeroBanner {
  id: string;
  slider_id?: string;
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
  image_url_mobile?: string;
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
type SliderFormData = Omit<Slider, 'id' | 'created_at' | 'updated_at'>;

export default function HeroBannersManager() {
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const { toast } = useToast();

  // State
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [selectedSlider, setSelectedSlider] = useState<Slider | null>(null);
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Banner dialog
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Slider dialog
  const [sliderDialogOpen, setSliderDialogOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null);

  const [bannerFormData, setBannerFormData] = useState<BannerFormData>({
    slider_id: '',
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
    image_url_mobile: '',
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

  const [sliderFormData, setSliderFormData] = useState<SliderFormData>({
    name: '',
    slug: '',
    description: '',
    page_path: '/',
    is_active: true,
  });

  useEffect(() => {
    if (isAdmin) {
      loadSliders();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedSlider) {
      loadBanners(selectedSlider.id);
    }
  }, [selectedSlider]);

  const loadSliders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const slidersData = (data || []) as Slider[];
      setSliders(slidersData);
      
      // Auto-select first slider
      if (slidersData.length > 0 && !selectedSlider) {
        setSelectedSlider(slidersData[0]);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error loading sliders:', error);
      }
      // If sliders table doesn't exist, show migration message
      if (error.message?.includes('relation') || error.code === '42P01') {
        toast({
          title: 'Migración necesaria',
          description: 'Ejecuta el script MIGRATION_SLIDERS.sql en Supabase SQL Editor',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los sliders',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBanners = async (sliderId: string) => {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('slider_id', sliderId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setBanners((data || []) as any);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error loading banners:', error);
      }
      // Fallback: load all banners if slider_id column doesn't exist
      if (error.message?.includes('slider_id')) {
        const { data } = await supabase
          .from('hero_banners')
          .select('*')
          .order('order_index', { ascending: true });
        setBanners((data || []) as any);
      }
    }
  };

  // ===== SLIDER CRUD =====
  const handleSliderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!sliderFormData.name || !sliderFormData.slug) {
        toast({
          title: 'Error',
          description: 'Nombre y slug son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      if (editingSlider) {
        const { error } = await supabase
          .from('sliders')
          .update(sliderFormData)
          .eq('id', editingSlider.id);

        if (error) throw error;

        toast({ title: 'Éxito', description: 'Slider actualizado correctamente' });
      } else {
        const { error } = await supabase
          .from('sliders')
          .insert([sliderFormData]);

        if (error) throw error;

        toast({ title: 'Éxito', description: 'Slider creado correctamente' });
      }

      setSliderDialogOpen(false);
      resetSliderForm();
      loadSliders();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error saving slider:', error);
      }
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el slider',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSlider = async (slider: Slider) => {
    if (!confirm(`¿Eliminar el slider "${slider.name}" y todos sus banners?`)) return;

    try {
      // First delete all banners in this slider
      await supabase.from('hero_banners').delete().eq('slider_id', slider.id);
      
      // Then delete the slider
      const { error } = await supabase.from('sliders').delete().eq('id', slider.id);

      if (error) throw error;

      toast({ title: 'Éxito', description: 'Slider eliminado correctamente' });
      
      if (selectedSlider?.id === slider.id) {
        setSelectedSlider(null);
        setBanners([]);
      }
      
      loadSliders();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error deleting slider:', error);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetSliderForm = () => {
    setEditingSlider(null);
    setSliderFormData({
      name: '',
      slug: '',
      description: '',
      page_path: '/',
      is_active: true,
    });
  };

  // ===== BANNER CRUD =====
  const handleImageUpload = async (file: File, isMobile = false) => {
    try {
      setUploadingImage(true);

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La imagen debe ser menor a 5MB');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      const fileExt = file.name.split('.').pop();
      const prefix = isMobile ? 'mobile-' : '';
      const fileName = `${prefix}${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('hero-banners')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('hero-banners')
        .getPublicUrl(fileName);

      if (isMobile) {
        setBannerFormData((prev) => ({ ...prev, image_url_mobile: data.publicUrl }));
      } else {
        setBannerFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
      }

      toast({
        title: 'Éxito',
        description: `Imagen ${isMobile ? 'móvil ' : ''}subida correctamente`,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error uploading image:', error);
      }
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir la imagen',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!bannerFormData.title_es || !bannerFormData.description_es || !bannerFormData.image_url) {
        toast({
          title: 'Error',
          description: 'Los campos en español son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      const dataToSave = {
        ...bannerFormData,
        slider_id: selectedSlider?.id,
      };

      if (editingBanner) {
        const { error } = await (supabase.from('hero_banners') as any)
          .update(dataToSave)
          .eq('id', editingBanner.id);

        if (error) throw error;

        toast({ title: 'Éxito', description: 'Banner actualizado correctamente' });
      } else {
        const { error } = await (supabase.from('hero_banners') as any)
          .insert([{ ...dataToSave, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;

        toast({ title: 'Éxito', description: 'Banner creado correctamente' });
      }

      setBannerDialogOpen(false);
      resetBannerForm();
      if (selectedSlider) loadBanners(selectedSlider.id);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error saving banner:', error);
      }
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el banner',
        variant: 'destructive',
      });
    }
  };

  const handleEditBanner = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setBannerFormData({
      slider_id: banner.slider_id,
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
      image_url_mobile: banner.image_url_mobile || '',
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
    setBannerDialogOpen(true);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este banner?')) return;

    try {
      const { error } = await (supabase.from('hero_banners') as any).delete().eq('id', id);

      if (error) throw error;

      toast({ title: 'Éxito', description: 'Banner eliminado correctamente' });

      if (selectedSlider) loadBanners(selectedSlider.id);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error deleting banner:', error);
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      const { error } = await (supabase.from('hero_banners') as any)
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: `Banner ${!banner.is_active ? 'activado' : 'desactivado'}`,
      });

      if (selectedSlider) loadBanners(selectedSlider.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMoveUp = async (banner: HeroBanner) => {
    const prevBanner = banners.find((b) => b.order_index === banner.order_index - 1);
    if (!prevBanner) return;

    try {
      await (supabase.from('hero_banners') as any).update({ order_index: banner.order_index }).eq('id', prevBanner.id);
      await (supabase.from('hero_banners') as any).update({ order_index: prevBanner.order_index }).eq('id', banner.id);

      if (selectedSlider) loadBanners(selectedSlider.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMoveDown = async (banner: HeroBanner) => {
    const nextBanner = banners.find((b) => b.order_index === banner.order_index + 1);
    if (!nextBanner) return;

    try {
      await (supabase.from('hero_banners') as any).update({ order_index: banner.order_index }).eq('id', nextBanner.id);
      await (supabase.from('hero_banners') as any).update({ order_index: nextBanner.order_index }).eq('id', banner.id);

      if (selectedSlider) loadBanners(selectedSlider.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetBannerForm = () => {
    setEditingBanner(null);
    setBannerFormData({
      slider_id: selectedSlider?.id,
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
      image_url_mobile: '',
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title="Gestión de Sliders"
          icon={<Layers className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Sliders' },
          ]}
        />

        {/* Sliders Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Sliders Disponibles
                </CardTitle>
                <CardDescription>
                  Crea y gestiona sliders para diferentes páginas
                </CardDescription>
              </div>
              <Dialog open={sliderDialogOpen} onOpenChange={setSliderDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetSliderForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Slider
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSlider ? 'Editar Slider' : 'Crear Nuevo Slider'}
                    </DialogTitle>
                    <DialogDescription>
                      Define un slider y asígnalo a una página
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSliderSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="slider_name">Nombre *</Label>
                      <Input
                        id="slider_name"
                        value={sliderFormData.name}
                        onChange={(e) => setSliderFormData((prev) => ({ 
                          ...prev, 
                          name: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                        }))}
                        placeholder="Slider Promociones"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="slider_slug">Slug *</Label>
                      <Input
                        id="slider_slug"
                        value={sliderFormData.slug}
                        onChange={(e) => setSliderFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        placeholder="promociones"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Identificador único (solo letras, números y guiones)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="slider_page">Página donde mostrar *</Label>
                      <Select
                        value={sliderFormData.page_path}
                        onValueChange={(value) => setSliderFormData((prev) => ({ ...prev, page_path: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una página" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_PAGES.map((page) => (
                            <SelectItem key={page.path} value={page.path}>
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                {page.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="slider_description">Descripción</Label>
                      <Textarea
                        id="slider_description"
                        value={sliderFormData.description || ''}
                        onChange={(e) => setSliderFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción del slider..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="slider_active"
                        checked={sliderFormData.is_active}
                        onCheckedChange={(checked) => setSliderFormData((prev) => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="slider_active">Slider activo</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setSliderDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingSlider ? 'Actualizar' : 'Crear'} Slider
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-center py-4 text-muted-foreground">Cargando sliders...</p>
            ) : sliders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No hay sliders creados. Ejecuta la migración SQL primero.
                </p>
                <Button variant="outline" onClick={() => window.open('/admin/archivos', '_blank')}>
                  Ver archivos de migración
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sliders.map((slider) => (
                  <div
                    key={slider.id}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedSlider?.id === slider.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                    onClick={() => setSelectedSlider(slider)}
                  >
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {slider.name}
                        {!slider.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {slider.page_path}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSlider(slider);
                          setSliderFormData({
                            name: slider.name,
                            slug: slider.slug,
                            description: slider.description || '',
                            page_path: slider.page_path,
                            is_active: slider.is_active,
                          });
                          setSliderDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlider(slider);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Banners Section */}
        {selectedSlider && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Banners de "{selectedSlider.name}"
                  </CardTitle>
                  <CardDescription>
                    Página: {AVAILABLE_PAGES.find(p => p.path === selectedSlider.page_path)?.label || selectedSlider.page_path}
                  </CardDescription>
                </div>
                <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetBannerForm}>
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

                    <form onSubmit={handleBannerSubmit} className="space-y-6">
                      {/* Image Uploads */}
                      <div className="space-y-4">
                        <Label>Imágenes del Banner *</Label>
                        
                        {/* Desktop Image */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Imagen de Escritorio *</Label>
                          <div className="flex gap-4 items-start">
                            <div className="flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, false);
                                }}
                                disabled={uploadingImage}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Recomendado: 1600x900px, máx 5MB
                              </p>
                            </div>
                            {bannerFormData.image_url && (
                              <img
                                src={bannerFormData.image_url}
                                alt="Desktop Preview"
                                className="w-32 h-18 object-cover rounded border"
                              />
                            )}
                          </div>
                        </div>

                        {/* Mobile Image */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Imagen Móvil (Opcional)</Label>
                          <div className="flex gap-4 items-start">
                            <div className="flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file, true);
                                }}
                                disabled={uploadingImage}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Recomendado: 800x1200px, máx 5MB
                              </p>
                            </div>
                            {bannerFormData.image_url_mobile && (
                              <img
                                src={bannerFormData.image_url_mobile}
                                alt="Mobile Preview"
                                className="w-20 h-30 object-cover rounded border"
                              />
                            )}
                          </div>
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
                              <Label>Título {lang === 'es' && '*'}</Label>
                              <Input
                                value={bannerFormData[`title_${lang}` as keyof BannerFormData] as string}
                                onChange={(e) =>
                                  setBannerFormData((prev) => ({
                                    ...prev,
                                    [`title_${lang}`]: e.target.value,
                                  }))
                                }
                                required={lang === 'es'}
                                placeholder={`Título en ${lang.toUpperCase()}`}
                              />
                            </div>

                            <div>
                              <Label>Descripción {lang === 'es' && '*'}</Label>
                              <Textarea
                                value={bannerFormData[`description_${lang}` as keyof BannerFormData] as string}
                                onChange={(e) =>
                                  setBannerFormData((prev) => ({
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
                              <Label>Texto del Botón</Label>
                              <Input
                                value={bannerFormData[`cta_text_${lang}` as keyof BannerFormData] as string}
                                onChange={(e) =>
                                  setBannerFormData((prev) => ({
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
                        <Label htmlFor="cta_link">Enlace del Botón</Label>
                        <Input
                          id="cta_link"
                          value={bannerFormData.cta_link}
                          onChange={(e) => setBannerFormData((prev) => ({ ...prev, cta_link: e.target.value }))}
                          placeholder="/actividades"
                        />
                      </div>

                      {/* Settings */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is_active"
                            checked={bannerFormData.is_active}
                            onCheckedChange={(checked) =>
                              setBannerFormData((prev) => ({ ...prev, is_active: checked }))
                            }
                          />
                          <Label htmlFor="is_active">Banner activo</Label>
                        </div>

                        <div className="flex-1">
                          <Label htmlFor="order_index">Orden</Label>
                          <Input
                            id="order_index"
                            type="number"
                            value={bannerFormData.order_index}
                            onChange={(e) =>
                              setBannerFormData((prev) => ({ ...prev, order_index: parseInt(e.target.value) }))
                            }
                            min={1}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setBannerDialogOpen(false)}>
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
              {banners.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No hay banners en este slider. Crea el primero arriba.
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
                              onClick={() => handleEditBanner(banner)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBanner(banner.id)}
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
        )}
      </div>
    </PageTransition>
  );
}
