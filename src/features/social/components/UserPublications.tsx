import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserPublicationsProps {
  userId: string;
  isPublic?: boolean;
}

export default function UserPublications({ userId, isPublic = true }: UserPublicationsProps) {
  // TODO: Implement when publications/posts table is created
  if (!isPublic) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Publicaciones</CardTitle>
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
        <CardTitle>Publicaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center py-8">
          Las publicaciones estarán disponibles próximamente
        </p>
      </CardContent>
    </Card>
  );
}

