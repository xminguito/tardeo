import { useTranslation } from 'react-i18next';
import { Shield, Mail, UserCheck, Database, Target, Scale } from 'lucide-react';
import { Card } from '@/components/ui/card';
import PageTransition from '@/components/PageTransition';
import PageHeader from '@/components/PageHeader';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'responsable',
      icon: UserCheck,
      title: t('privacy.sections.responsible.title', 'Responsable del Tratamiento'),
      content: [
        t('privacy.sections.responsible.p1', 'El responsable del tratamiento de los datos personales recogidos a través de esta aplicación es Tardeo App, S.L.'),
        t('privacy.sections.responsible.p2', 'Domicilio social: [Dirección pendiente de confirmación]'),
        t('privacy.sections.responsible.p3', 'CIF: [Pendiente de alta]'),
      ],
    },
    {
      id: 'datos',
      icon: Database,
      title: t('privacy.sections.data.title', 'Qué Datos Recopilamos'),
      content: [
        t('privacy.sections.data.registration', '**Datos de registro:** nombre, email, foto de perfil y ubicación aproximada.'),
        t('privacy.sections.data.activity', '**Datos de actividad:** actividades creadas, reservas realizadas, valoraciones y comentarios.'),
        t('privacy.sections.data.usage', '**Datos de uso:** información sobre cómo interactúas con la aplicación para mejorar tu experiencia.'),
        t('privacy.sections.data.voice', '**Datos de voz (opcional):** solo si usas el asistente de voz, se procesan transcripciones para responder a tus consultas.'),
      ],
    },
    {
      id: 'finalidad',
      icon: Target,
      title: t('privacy.sections.purpose.title', 'Finalidad del Tratamiento'),
      content: [
        t('privacy.sections.purpose.service', '**Prestación del servicio:** gestionar tu cuenta, permitirte crear y reservar actividades, y conectar con otros usuarios.'),
        t('privacy.sections.purpose.improvement', '**Mejora del servicio:** analizar patrones de uso para optimizar la experiencia de usuario.'),
        t('privacy.sections.purpose.communication', '**Comunicación:** enviarte notificaciones sobre tus actividades, recordatorios y actualizaciones importantes.'),
        t('privacy.sections.purpose.security', '**Seguridad:** detectar y prevenir fraudes o usos indebidos de la plataforma.'),
      ],
    },
    {
      id: 'derechos',
      icon: Scale,
      title: t('privacy.sections.rights.title', 'Tus Derechos'),
      content: [
        t('privacy.sections.rights.access', '**Acceso:** puedes solicitar una copia de todos los datos personales que tenemos sobre ti.'),
        t('privacy.sections.rights.rectification', '**Rectificación:** puedes corregir cualquier dato incorrecto o incompleto.'),
        t('privacy.sections.rights.deletion', '**Supresión:** puedes solicitar la eliminación de tu cuenta y todos tus datos asociados.'),
        t('privacy.sections.rights.portability', '**Portabilidad:** puedes solicitar tus datos en un formato estructurado para trasladarlos a otro servicio.'),
        t('privacy.sections.rights.opposition', '**Oposición:** puedes oponerte al tratamiento de tus datos para determinadas finalidades.'),
      ],
    },
    {
      id: 'contacto',
      icon: Mail,
      title: t('privacy.sections.contact.title', 'Contacto'),
      content: [
        t('privacy.sections.contact.p1', 'Para ejercer cualquiera de tus derechos o resolver cualquier duda sobre el tratamiento de tus datos personales, puedes contactarnos en:'),
        t('privacy.sections.contact.email', '**Email:** privacidad@tardeo.app'),
        t('privacy.sections.contact.p2', 'Responderemos a tu solicitud en un plazo máximo de 30 días.'),
      ],
    },
  ];

  // Helper function to render markdown-like bold text
  const renderContent = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => 
      index % 2 === 1 ? <strong key={index} className="font-semibold text-foreground">{part}</strong> : part
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <PageHeader
            title={t('privacy.title', 'Política de Privacidad')}
            icon={<Shield className="h-10 w-10 text-primary" />}
            breadcrumbs={[
              { label: t('privacy.breadcrumb', 'Privacidad') }
            ]}
          />

          {/* Last Updated */}
          <p className="text-sm text-muted-foreground mb-8">
            {t('privacy.lastUpdated', 'Última actualización: Diciembre 2024')}
          </p>

          {/* Introduction */}
          <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
            <p className="text-muted-foreground leading-relaxed">
              {t('privacy.intro', 'En Tardeo nos tomamos muy en serio la protección de tus datos personales. Esta política de privacidad explica qué información recopilamos, cómo la utilizamos y cuáles son tus derechos.')}
            </p>
          </Card>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {section.title}
                  </h2>
                </div>
                <Card className="p-6">
                  <ul className="space-y-3">
                    {section.content.map((item, index) => (
                      <li key={index} className="text-muted-foreground leading-relaxed">
                        {renderContent(item)}
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              {t('privacy.footer', 'Al utilizar Tardeo, aceptas el tratamiento de tus datos conforme a esta política de privacidad.')}
            </p>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
