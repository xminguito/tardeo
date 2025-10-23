import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  currentParticipants: number;
  maxParticipants: number;
  imageUrl?: string;
  onJoin: (id: string) => void;
}

const ActivityCard = ({
  id,
  title,
  description,
  category,
  location,
  date,
  currentParticipants,
  maxParticipants,
  imageUrl,
  onJoin,
}: ActivityCardProps) => {
  const isFull = currentParticipants >= maxParticipants;

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2">
      {imageUrl && (
        <div className="h-56 w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl md:text-3xl font-bold leading-tight">
            {title}
          </h3>
          <Badge className="text-lg px-4 py-2 whitespace-nowrap">
            {category}
          </Badge>
        </div>

        <p className="text-xl text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-lg">
            <Calendar className="h-6 w-6 text-primary flex-shrink-0" />
            <span>{format(new Date(date), "PPP", { locale: es })}</span>
          </div>

          <div className="flex items-center gap-3 text-lg">
            <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-3 text-lg">
            <Users className="h-6 w-6 text-primary flex-shrink-0" />
            <span>
              {currentParticipants} / {maxParticipants} participantes
            </span>
          </div>
        </div>

        <Button
          onClick={() => onJoin(id)}
          disabled={isFull}
          className="w-full mt-4 text-xl py-6"
          variant={isFull ? "secondary" : "default"}
        >
          {isFull ? "Completo" : "¡Me apunto!"}
        </Button>
      </div>
    </Card>
  );
};

export default ActivityCard;
