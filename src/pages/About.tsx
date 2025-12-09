import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Heart, Users, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function About() {
  const { t } = useTranslation();

  const values = [
    {
      icon: Heart,
      title: t('about.values.connection.title', 'Conexión Real'),
      description: t('about.values.connection.description', 'Creemos en el poder de las conexiones humanas auténticas, más allá de las pantallas.'),
    },
    {
      icon: Users,
      title: t('about.values.community.title', 'Comunidad Local'),
      description: t('about.values.community.description', 'Fomentamos encuentros en tu ciudad, con personas que comparten tus intereses.'),
    },
    {
      icon: MapPin,
      title: t('about.values.experiences.title', 'Experiencias Únicas'),
      description: t('about.values.experiences.description', 'Cada actividad es una oportunidad para crear recuerdos inolvidables.'),
    },
    {
      icon: Sparkles,
      title: t('about.values.magic.title', 'La Magia de lo Presencial'),
      description: t('about.values.magic.description', 'Recuperamos la emoción de conocer gente nueva cara a cara.'),
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Header user={null} />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs 
              items={[
                { label: t('about.breadcrumb', 'Sobre Tardeo') }
              ]} 
            />
          </div>

          {/* Hero Section */}
          <section className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              {t('about.hero.title', 'Más que una app, un movimiento.')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('about.hero.subtitle', 'Recuperando la magia de conocerse en persona.')}
            </p>
          </section>

          {/* Video Section */}
          <section className="mb-16">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-muted">
              <video
                className="w-full h-full object-cover"
                controls
                autoPlay
                muted
                loop
                playsInline
                poster="/videos/tardeo-poster.jpg"
              >
                <source src="/videos/tardeo-promo.mp4" type="video/mp4" />
                {t('about.video.fallback', 'Tu navegador no soporta la reproducción de vídeos.')}
              </video>
              
              {/* Fallback gradient overlay when video not loaded */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-600/20 pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t('about.video.caption', 'Descubre cómo Tardeo está cambiando la forma de conectar.')}
            </p>
          </section>

          {/* Mission Section */}
          <section className="mb-16">
            <Card className="p-6 md:p-10 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                {t('about.mission.title', 'Nuestra Misión')}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {t('about.mission.p1', 'En un mundo cada vez más conectado digitalmente, paradójicamente nos sentimos más solos que nunca. Tardeo nació de una idea simple pero poderosa: devolver a las personas la alegría de conocerse en la vida real.')}
                </p>
                <p>
                  {t('about.mission.p2', 'Creemos que las mejores amistades, los recuerdos más valiosos y las experiencias más enriquecedoras suceden cuando dejamos el móvil y nos atrevemos a vivir el momento presente, cara a cara, con otras personas.')}
                </p>
                <p>
                  {t('about.mission.p3', 'Tardeo es tu puente hacia una comunidad vibrante de personas que, como tú, buscan algo más: planes auténticos, conversaciones reales y conexiones que perduran más allá de la pantalla.')}
                </p>
              </div>
            </Card>
          </section>

          {/* Values Grid */}
          <section className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              {t('about.values.title', 'Lo que nos define')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                      <value.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center mb-8">
            <Card className="p-8 md:p-12 bg-primary text-primary-foreground">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                {t('about.cta.title', '¿Listo para conectar?')}
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-lg mx-auto">
                {t('about.cta.description', 'Únete a miles de personas que ya están creando recuerdos inolvidables.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/actividades">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
                  >
                    {t('about.cta.explore', 'Explorar Actividades')}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto bg-transparent border-2 border-white text-white hover:text-white hover:bg-white/10"
                  >
                    {t('about.cta.join', 'Crear Cuenta')}
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
