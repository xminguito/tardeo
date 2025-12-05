import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface UserGalleryProps {
  images: string[];
  isPublic?: boolean;
}

export default function UserGallery({ images, isPublic = true }: UserGalleryProps) {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Don't render anything if no images or private profile
  if (!isPublic || !images || images.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t('profile.gallery', 'Galería')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Instagram-style Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-3">
            {images.map((imageUrl, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(imageUrl)}
                className={cn(
                  "relative aspect-square overflow-hidden bg-muted",
                  "rounded-sm md:rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "group cursor-pointer"
                )}
              >
                <img
                  src={imageUrl}
                  alt={`${t('profile.galleryImage', 'Foto')} ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label={t('common.close', 'Cerrar')}
          >
            <X className="h-6 w-6" />
          </button>
          
          {selectedImage && (
            <div className="flex items-center justify-center w-full h-full p-4">
              <img
                src={selectedImage}
                alt={t('profile.galleryImage', 'Foto de galería')}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

