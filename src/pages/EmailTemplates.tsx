import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Mail, Save, RotateCcw, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';
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

// Map main tabs to their template types
const MAIN_TAB_TEMPLATES: Record<string, string> = {
  confirmation: 'confirmation',
  reminder: 'reminder',
  cancellation: 'cancellation',
  new_activity: 'new_activity',
  organizer: 'organizer_new_participant', // Default for organizer tab
};

// Organizer sub-templates
const ORGANIZER_SUBTEMPLATES = {
  new_participant: 'organizer_new_participant',
  participant_left: 'organizer_participant_left',
};

export default function EmailTemplates() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<string>('confirmation');
  const [organizerSubTemplate, setOrganizerSubTemplate] = useState<string>('new_participant');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  // Compute the actual template type being edited
  const getActiveTemplateType = (): string => {
    if (activeTab === 'organizer') {
      return ORGANIZER_SUBTEMPLATES[organizerSubTemplate as keyof typeof ORGANIZER_SUBTEMPLATES];
    }
    return MAIN_TAB_TEMPLATES[activeTab] || activeTab;
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update form when template selection changes
  useEffect(() => {
    const templateType = getActiveTemplateType();
    const template = templates.find(t => t.template_type === templateType);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
    }
  }, [activeTab, organizerSubTemplate, templates]);

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
    const templateType = getActiveTemplateType();
    try {
      setSaving(true);
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject,
          html_content: htmlContent,
          updated_at: new Date().toISOString(),
        })
        .eq('template_type', templateType);

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
    const templateType = getActiveTemplateType();
    const template = templates.find(t => t.template_type === templateType);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      toast({
        title: 'Cambios descartados',
        description: 'Se han restaurado los valores guardados',
      });
    }
  };

  // Get variables hint based on current template
  const getVariablesHint = () => {
    const templateType = getActiveTemplateType();
    
    const commonVars = (
      <>
        <code>{'{{activity_title}}'}</code>, <code>{'{{activity_date}}'}</code>,{' '}
        <code>{'{{activity_time}}'}</code>, <code>{'{{activity_location}}'}</code>,{' '}
        <code>{'{{activity_url}}'}</code>
      </>
    );

    if (templateType.startsWith('organizer_')) {
      return (
        <>
          <strong>Variables de organizador:</strong>{' '}
          <code>{'{{organizer_name}}'}</code>, <code>{'{{participant_name}}'}</code>,{' '}
          <code>{'{{user_name}}'}</code>, <code>{'{{user_initial}}'}</code>,{' '}
          {commonVars},{' '}
          <code>{'{{current_participants}}'}</code>, <code>{'{{max_participants}}'}</code>,{' '}
          <code>{'{{spots_left}}'}</code>
        </>
      );
    }

    if (templateType === 'confirmation') {
      return (
        <>
          <strong>Variables de confirmación:</strong>{' '}
          <code>{'{{user_name}}'}</code>, {commonVars},{' '}
          <code>{'{{activity_cost}}'}</code>
        </>
      );
    }

    if (templateType === 'cancellation') {
      return (
        <>
          <strong>Variables de cancelación:</strong>{' '}
          <code>{'{{user_name}}'}</code>, {commonVars},{' '}
          <code>{'{{cancellation_reason}}'}</code>
        </>
      );
    }

    if (templateType === 'new_activity') {
      return (
        <>
          <strong>Variables de nueva actividad:</strong>{' '}
          <code>{'{{user_name}}'}</code>, {commonVars},{' '}
          <code>{'{{activity_description}}'}</code>, <code>{'{{activity_cost}}'}</code>
        </>
      );
    }

    // Default (reminder, etc.)
    return (
      <>
        <strong>Variables disponibles:</strong>{' '}
        <code>{'{{user_name}}'}</code>, {commonVars}
      </>
    );
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">Cargando plantillas...</p>
        </div>
      </PageTransition>
    );
  }

  const templateType = getActiveTemplateType();
  const currentTemplate = templates.find(t => t.template_type === templateType);

  return (
    <PageTransition>
      <div className="container mx-auto p-6 max-w-7xl">
        <PageHeader
          title="Plantillas de Email"
          icon={<Mail className="h-10 w-10 text-primary" />}
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
            {getVariablesHint()}
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="confirmation">Confirmación</TabsTrigger>
            <TabsTrigger value="reminder">Recordatorio</TabsTrigger>
            <TabsTrigger value="cancellation">Cancelación</TabsTrigger>
            <TabsTrigger value="new_activity">Nueva actividad</TabsTrigger>
            <TabsTrigger value="organizer">Organizador</TabsTrigger>
          </TabsList>

          {/* All tabs share the same editor layout */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Editor</span>
                  {/* Sub-navigation for Organizer tab */}
                  {activeTab === 'organizer' && (
                    <ToggleGroup
                      type="single"
                      value={organizerSubTemplate}
                      onValueChange={(value) => value && setOrganizerSubTemplate(value)}
                      className="bg-muted rounded-lg p-1"
                    >
                      <ToggleGroupItem
                        value="new_participant"
                        aria-label="Nueva reserva"
                        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        Nueva reserva
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="participant_left"
                        aria-label="Cancelación"
                        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
                      >
                        <UserMinus className="h-4 w-4 mr-1.5" />
                        Cancelación
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                </CardTitle>
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
                    <strong>Asunto:</strong>{' '}
                    {subject
                      .replace(/\{\{user_name\}\}/g, 'Juan Pérez')
                      .replace(/\{\{activity_title\}\}/g, 'Cena de networking')
                      .replace(/\{\{organizer_name\}\}/g, 'María García')
                      .replace(/\{\{participant_name\}\}/g, 'Juan Pérez')}
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
                        .replace(/\{\{cancellation_reason\}\}/g, 'Condiciones meteorológicas adversas')
                        // Organizer-specific variables
                        .replace(/\{\{organizer_name\}\}/g, 'María García')
                        .replace(/\{\{participant_name\}\}/g, 'Juan Pérez')
                        .replace(/\{\{user_initial\}\}/g, 'J')
                        .replace(/\{\{current_participants\}\}/g, '8')
                        .replace(/\{\{max_participants\}\}/g, '20')
                        .replace(/\{\{spots_left\}\}/g, '12')}
                      className="w-full h-[600px] border-0"
                      title="Vista previa del email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hidden TabsContent for each tab (required by Radix) */}
          <TabsContent value="confirmation" className="hidden" />
          <TabsContent value="reminder" className="hidden" />
          <TabsContent value="cancellation" className="hidden" />
          <TabsContent value="new_activity" className="hidden" />
          <TabsContent value="organizer" className="hidden" />
        </Tabs>
      </div>
    </PageTransition>
  );
}
