import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserForumsProps {
  userId: string;
  isPublic?: boolean;
}

export default function UserForums({ userId, isPublic = true }: UserForumsProps) {
  // TODO: Implement when forums table is created
  if (!isPublic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Foros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Este perfil es privado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foros</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Los foros estarán disponibles próximamente
        </p>
      </CardContent>
    </Card>
  );
}

