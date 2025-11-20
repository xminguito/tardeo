import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Mail, Send } from "lucide-react";

export default function EmailTester() {
  const { toast } = useToast();
  const [emailType, setEmailType] = useState<"confirmation" | "reminder" | "cancellation" | "new_activity">("confirmation");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientEmail: "",
    recipientName: "",
    activityTitle: "Taller de Cerámica",
    activityDate: "25 de noviembre de 2025",
    activityTime: "18:00",
    activityLocation: "Calle Mayor 10, Barcelona",
    activityUrl: "https://tardeo.app/activity/123",
    activityDescription: "Aprende técnicas básicas de cerámica en un ambiente relajado y creativo",
    activityCategory: "Arte",
    activityCost: "25€",
    hoursUntil: 24,
    cancellationReason: "",
  });

  const handleSendEmail = async () => {
    if (!formData.recipientEmail || !formData.recipientName) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el email y nombre del destinatario",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        type: emailType,
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        activityTitle: formData.activityTitle,
        activityDate: formData.activityDate,
        activityTime: formData.activityTime,
        activityLocation: formData.activityLocation,
        activityUrl: formData.activityUrl,
      };

      if (emailType === "reminder") {
        payload.hoursUntil = formData.hoursUntil;
      } else if (emailType === "cancellation") {
        payload.cancellationReason = formData.cancellationReason;
      } else if (emailType === "new_activity") {
        payload.activityDescription = formData.activityDescription;
        payload.activityCategory = formData.activityCategory;
        payload.activityCost = formData.activityCost;
      }

      const { data, error } = await supabase.functions.invoke("send-activity-notification", {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Se ha enviado el email de ${emailType} correctamente`,
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Probar Emails de Actividades"
        icon={<Mail className="h-8 w-8 text-primary" />}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Email Tester" },
        ]}
      />

      <p className="text-muted-foreground text-lg mb-8">
        Envía emails de prueba para las notificaciones de actividades
      </p>

      <div className="container py-8 max-w-4xl">
        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="emailType">Tipo de Email</Label>
              <Select value={emailType} onValueChange={(value: any) => setEmailType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmation">Confirmación de Registro</SelectItem>
                  <SelectItem value="reminder">Recordatorio</SelectItem>
                  <SelectItem value="cancellation">Cancelación</SelectItem>
                  <SelectItem value="new_activity">Nueva Actividad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Email del Destinatario *</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName">Nombre del Destinatario *</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityTitle">Título de la Actividad</Label>
              <Input
                id="activityTitle"
                value={formData.activityTitle}
                onChange={(e) => setFormData({ ...formData, activityTitle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activityDate">Fecha</Label>
                <Input
                  id="activityDate"
                  value={formData.activityDate}
                  onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityTime">Hora</Label>
                <Input
                  id="activityTime"
                  value={formData.activityTime}
                  onChange={(e) => setFormData({ ...formData, activityTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityLocation">Ubicación</Label>
                <Input
                  id="activityLocation"
                  value={formData.activityLocation}
                  onChange={(e) => setFormData({ ...formData, activityLocation: e.target.value })}
                />
              </div>
            </div>

            {emailType === "reminder" && (
              <div className="space-y-2">
                <Label htmlFor="hoursUntil">Horas hasta la actividad</Label>
                <Input
                  id="hoursUntil"
                  type="number"
                  value={formData.hoursUntil}
                  onChange={(e) => setFormData({ ...formData, hoursUntil: parseInt(e.target.value) })}
                />
              </div>
            )}

            {emailType === "cancellation" && (
              <div className="space-y-2">
                <Label htmlFor="cancellationReason">Motivo de Cancelación (opcional)</Label>
                <Textarea
                  id="cancellationReason"
                  value={formData.cancellationReason}
                  onChange={(e) => setFormData({ ...formData, cancellationReason: e.target.value })}
                  placeholder="Ej: Condiciones meteorológicas adversas"
                />
              </div>
            )}

            {emailType === "new_activity" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="activityDescription">Descripción</Label>
                  <Textarea
                    id="activityDescription"
                    value={formData.activityDescription}
                    onChange={(e) => setFormData({ ...formData, activityDescription: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityCategory">Categoría</Label>
                    <Input
                      id="activityCategory"
                      value={formData.activityCategory}
                      onChange={(e) => setFormData({ ...formData, activityCategory: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activityCost">Precio</Label>
                    <Input
                      id="activityCost"
                      value={formData.activityCost}
                      onChange={(e) => setFormData({ ...formData, activityCost: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            <Button onClick={handleSendEmail} disabled={loading} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Enviando..." : "Enviar Email de Prueba"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
