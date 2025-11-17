import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Languages, Mic, ArrowLeft, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const adminTools = [
    {
      title: 'Actualizar Agente de Voz',
      description: 'Configura y actualiza el agente de voz de ElevenLabs',
      icon: Mic,
      path: '/update-agent',
      color: 'text-blue-500',
    },
    {
      title: 'Traducir Actividades',
      description: 'Traduce automáticamente actividades existentes a todos los idiomas',
      icon: Languages,
      path: '/traducir-actividades',
      color: 'text-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Panel de Administración</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Gestiona y configura las herramientas administrativas de la plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card 
                key={tool.path}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(tool.path)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl">{tool.title}</CardTitle>
                      <CardDescription className="text-base">
                        {tool.description}
                      </CardDescription>
                    </div>
                    <Icon className={`h-8 w-8 ${tool.color} flex-shrink-0`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Abrir herramienta
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
