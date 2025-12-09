import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import RichTextEditor from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff,
  ExternalLink,
  Loader2,
  Search
} from 'lucide-react';

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  featured_image: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to generate slug from title
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export default function PagesManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    featured_image: '',
    meta_description: '',
    is_published: false,
  });

  // Fetch pages
  const fetchPages = async () => {
    try {
      setLoading(true);
      // Note: 'pages' table requires migration to be applied first
      const { data, error } = await (supabase as any)
        .from('pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPages((data as Page[]) || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las páginas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // Handle title change with auto-slug
  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      // Only auto-generate slug if editing a new page or slug hasn't been manually changed
      slug: !editingPage ? slugify(title) : prev.slug,
    }));
  };

  // Open dialog for new page
  const handleNewPage = () => {
    setEditingPage(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      featured_image: '',
      meta_description: '',
      is_published: false,
    });
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      featured_image: page.featured_image || '',
      meta_description: page.meta_description || '',
      is_published: page.is_published,
    });
    setIsDialogOpen(true);
  };

  // Save page
  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      toast({
        title: 'Error',
        description: 'El título y el slug son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const pageData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        featured_image: formData.featured_image || null,
        meta_description: formData.meta_description || null,
        is_published: formData.is_published,
      };

      if (editingPage) {
        // Update existing
        const { error } = await (supabase as any)
          .from('pages')
          .update(pageData)
          .eq('id', editingPage.id);

        if (error) throw error;
        toast({ title: 'Página actualizada correctamente' });
      } else {
        // Create new
        const { error } = await (supabase as any)
          .from('pages')
          .insert(pageData);

        if (error) throw error;
        toast({ title: 'Página creada correctamente' });
      }

      setIsDialogOpen(false);
      fetchPages();
    } catch (error: any) {
      console.error('Error saving page:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la página',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete page
  const handleDelete = async (page: Page) => {
    if (!confirm(`¿Estás seguro de eliminar "${page.title}"?`)) return;

    try {
      const { error } = await (supabase as any)
        .from('pages')
        .delete()
        .eq('id', page.id);

      if (error) throw error;
      toast({ title: 'Página eliminada' });
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la página',
        variant: 'destructive',
      });
    }
  };

  // Toggle publish status
  const handleTogglePublish = async (page: Page) => {
    try {
      const { error } = await (supabase as any)
        .from('pages')
        .update({ is_published: !page.is_published })
        .eq('id', page.id);

      if (error) throw error;
      fetchPages();
      toast({
        title: page.is_published ? 'Página despublicada' : 'Página publicada',
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  // Filter pages by search query
  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHeader
        title="Gestor de Páginas"
        icon={<FileText className="h-10 w-10 text-primary" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Páginas' }
        ]}
        actions={
          <Button onClick={handleNewPage} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Página
          </Button>
        }
      />

      {/* Search */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar páginas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Pages Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No se encontraron páginas' : 'No hay páginas todavía'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      /{page.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    {page.is_published ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Eye className="h-3 w-3 mr-1" />
                        Publicada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Borrador
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(page.updated_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {page.is_published && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/${page.slug}`, '_blank')}
                          title="Ver página"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(page)}
                        title={page.is_published ? 'Despublicar' : 'Publicar'}
                      >
                        {page.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(page)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(page)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? 'Editar Página' : 'Nueva Página'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ej: Política de Privacidad"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                  placeholder="politica-privacidad"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La URL será: {window.location.origin}/{formData.slug || 'slug'}
              </p>
            </div>

            {/* Featured Image */}
            <div className="space-y-2">
              <Label htmlFor="featured_image">Imagen destacada (URL)</Label>
              <Input
                id="featured_image"
                value={formData.featured_image}
                onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
                placeholder="https://..."
              />
              {formData.featured_image && (
                <img 
                  src={formData.featured_image} 
                  alt="Preview" 
                  className="w-full max-h-48 object-cover rounded-lg mt-2"
                />
              )}
            </div>

            {/* Meta Description */}
            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta descripción (SEO)</Label>
              <Input
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Descripción para buscadores..."
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_description.length}/160 caracteres
              </p>
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label>Contenido</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
              />
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="is_published" className="text-base">Publicar página</Label>
                <p className="text-sm text-muted-foreground">
                  Las páginas publicadas son visibles públicamente
                </p>
              </div>
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingPage ? 'Actualizar' : 'Crear Página'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
