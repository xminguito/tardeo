import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useViewTransitionName } from '@/components/PageTransition';

interface ActivityImageGalleryProps {
  mainImage: string;
  secondaryImages?: string[];
  title: string;
  /** Activity ID for view transition animation (hero effect) */
  activityId?: string;
}

export default function ActivityImageGallery({
  mainImage,
  secondaryImages = [],
  title,
  activityId,
}: ActivityImageGalleryProps) {
  // View Transitions API: Match the same name used in ActivityCard
  const imageTransitionName = activityId 
    ? useViewTransitionName('activity-image', activityId) 
    : undefined;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const allImages = [mainImage, ...secondaryImages];

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrevious();
  };

  return (
    <>
      {/* Gallery Carousel */}
      <div className="w-full space-y-4">
        {/* Main Image */}
        <div
          className="w-full h-[400px] rounded-lg overflow-hidden cursor-pointer group relative"
          onClick={() => openLightbox(0)}
        >
          <img
            src={mainImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={imageTransitionName ? { viewTransitionName: imageTransitionName } : undefined}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-4 py-2 rounded-full text-sm">
              Ver en grande
            </span>
          </div>
        </div>

        {/* Thumbnail Carousel */}
        {secondaryImages.length > 0 && (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent className="-ml-2">
                {allImages.map((image, index) => (
                  <CarouselItem
                    key={index}
                    className="pl-2 basis-1/3 md:basis-1/4 lg:basis-1/5"
                  >
                    <div
                      className={cn(
                        "h-24 rounded-md overflow-hidden cursor-pointer border-2 transition-all duration-200",
                        index === 0
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border"
                      )}
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={image}
                        alt={`${title} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Buttons */}
          {allImages.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm z-10">
              {currentIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Main Image */}
          <div
            className="max-w-[90vw] max-h-[90vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allImages[currentIndex]}
              alt={`${title} - ${currentIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
