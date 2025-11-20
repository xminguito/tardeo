import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
import { useFavorites } from '@/features/activities/hooks/useFavorites';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailTemplate {
  id: string;
  template_type: string;
  name: string;
  subject: string;
  html_content: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplates() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string>('confirmation');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const { favorites } = useFavorites(user?.id);

  // Form state
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [isAdmin]);

  useEffect(() => {
    const template = templates.find(t => t.template_type === activeTemplate);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
    }
  }, [activeTemplate, templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las plantillas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject,
          html_content: htmlContent,
          updated_at: new Date().toISOString(),
        })
        .eq('template_type', activeTemplate);

      if (error) throw error;

      toast({
        title: 'Plantilla guardada',
        description: 'Los cambios se han guardado correctamente',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la plantilla',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const template = templates.find(t => t.template_type === activeTemplate);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      toast({
        title: 'Cambios descartados',
        description: 'Se han restaurado los valores guardados',
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <PageTransition>
        <Header user={user} isUserAdmin={isAdmin || false} favoritesCount={favorites.size} />
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">Cargando plantillas...</p>
        </div>
      </PageTransition>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const currentTemplate = templates.find(t => t.template_type === activeTemplate);

  return (
    <PageTransition>
      <Header user={user} isUserAdmin={isAdmin || false} favoritesCount={favorites.size} />
      <div className="container mx-auto p-6 max-w-7xl">
        <PageHeader
          title="Plantillas de Email"
          icon={<Mail className="h-10 w-10 text-primary" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Plantillas de Email', href: '/admin/plantillas-email' },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar cambios
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          }
        />

        <Alert className="mb-6">
          <AlertDescription>
            <strong>Variables disponibles:</strong> Usa estas variables en tus plantillas: <code>{'{{user_name}}'}</code>,{' '}
            <code>{'{{activity_title}}'}</code>, <code>{'{{activity_date}}'}</code>,{' '}
            <code>{'{{activity_time}}'}</code>, <code>{'{{activity_location}}'}</code>,{' '}
            <code>{'{{activity_cost}}'}</code>, <code>{'{{activity_url}}'}</code>,{' '}
            <code>{'{{activity_description}}'}</code>, <code>{'{{cancellation_reason}}'}</code>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="confirmation">Confirmación</TabsTrigger>
            <TabsTrigger value="reminder">Recordatorio</TabsTrigger>
            <TabsTrigger value="cancellation">Cancelación</TabsTrigger>
            <TabsTrigger value="new_activity">Nueva actividad</TabsTrigger>
          </TabsList>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Editor</CardTitle>
                <CardDescription>{currentTemplate?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto del email</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Asunto del email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes usar variables como {'{{activity_title}}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="htmlContent">Contenido HTML</Label>
                  <Textarea
                    id="htmlContent"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="HTML del email"
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
                <CardDescription>
                  Esta es una aproximación de cómo se verá el email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-2 text-sm border-b">
                    <strong>Asunto:</strong> {subject}
                  </div>
                  <div className="p-4 bg-white">
                    <iframe
                      srcDoc={htmlContent
                        .replace(/\{\{user_name\}\}/g, 'Juan Pérez')
                        .replace(/\{\{activity_title\}\}/g, 'Cena de networking')
                        .replace(/\{\{activity_date\}\}/g, '25 de noviembre de 2025')
                        .replace(/\{\{activity_time\}\}/g, '19:30')
                        .replace(/\{\{activity_location\}\}/g, 'Restaurante El Jardín, Barcelona')
                        .replace(/\{\{activity_cost\}\}/g, '25')
                        .replace(/\{\{activity_url\}\}/g, 'https://tardeo.app/activity/123')
                        .replace(/\{\{activity_description\}\}/g, 'Una velada perfecta para conocer gente nueva')
                        .replace(/\{\{cancellation_reason\}\}/g, 'Condiciones meteorológicas adversas')}
                      className="w-full h-[600px] border-0"
                      title="Vista previa del email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="confirmation" className="hidden" />
          <TabsContent value="reminder" className="hidden" />
          <TabsContent value="cancellation" className="hidden" />
          <TabsContent value="new_activity" className="hidden" />
        </Tabs>
      </div>
    </PageTransition>
  );
}
