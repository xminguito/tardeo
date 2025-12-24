/**
 * Performance-optimized Hero Slider
 * - Pure CSS animations (no heavy libraries)
 * - Lazy loading images
 * - Preload first slide only
 * - Intersection Observer
 * - Minimal JavaScript
 * - Responsive
 * - CLS Prevention: Reserved space with skeleton
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Slide {
  id: string;
  image: string;
  mobileImage?: string;
  title: string;
  description: string;
  cta?: {
    text: string;
    link: string;
  };
}

interface HeroSliderProps {
  slides: Slide[];
  autoplayInterval?: number; // milliseconds, 0 to disable
  className?: string;
  isLoading?: boolean; // Loading state for skeleton
}

export default function HeroSlider({
  slides,
  autoplayInterval = 5000,
  className,
  isLoading = false,
}: HeroSliderProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [imageLoadStates, setImageLoadStates] = useState<Record<number, boolean>>({});
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload adjacent images
  useEffect(() => {
    const preloadNext = (currentIndex + 1) % slides.length;
    if (!loadedImages.has(preloadNext)) {
      setLoadedImages((prev) => new Set(prev).add(preloadNext));
    }
  }, [currentIndex, slides.length, loadedImages]);

  // Autoplay
  useEffect(() => {
    if (autoplayInterval === 0 || isAutoplayPaused || slides.length <= 1) {
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoplayInterval);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [autoplayInterval, isAutoplayPaused, slides.length]);

  // Pause on hover
  const handleMouseEnter = () => {
    if (autoplayInterval > 0) {
      setIsAutoplayPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (autoplayInterval > 0) {
      setIsAutoplayPaused(false);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    // Preload this slide if not loaded
    if (!loadedImages.has(index)) {
      setLoadedImages((prev) => new Set(prev).add(index));
    }
  };

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % slides.length;
    goToSlide(newIndex);
  };

  const handleImageLoad = (index: number) => {
    setImageLoadStates((prev) => ({ ...prev, [index]: true }));
  };

  // Always render container to prevent CLS - show skeleton when loading or no slides
  const showSkeleton = isLoading || slides.length === 0;

  return (
    <div
      ref={sliderRef}
      className={cn(
        'relative w-full h-[300px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-xl',
        className
      )}
      onMouseEnter={!showSkeleton ? handleMouseEnter : undefined}
      onMouseLeave={!showSkeleton ? handleMouseLeave : undefined}
      role="region"
      aria-label="Hero carousel"
      aria-live="polite"
    >
      {/* Skeleton State - Prevents CLS */}
      {showSkeleton ? (
        <div className="relative w-full h-full">
          <Skeleton className="w-full h-full rounded-xl" />
          {/* Optional: Add a subtle loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/50 text-sm">Cargando...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Slides */}
          <div className="relative w-full h-full">
            {slides.map((slide, index) => {
              const isActive = index === currentIndex;
              const shouldLoad = loadedImages.has(index);
              const isImageLoaded = imageLoadStates[index];

              return (
                <div
                  key={slide.id}
                  className={cn(
                    'absolute inset-0 transition-opacity duration-700 ease-in-out',
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  )}
                  aria-hidden={!isActive}
                >
                  {/* Image with gradient overlay */}
                  <div className="relative w-full h-full">
                    {shouldLoad ? (
                      <>
                        <picture>
                          {slide.mobileImage && (
                            <source 
                              media="(max-width: 768px)" 
                              srcSet={slide.mobileImage}
                            />
                          )}
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className={cn(
                              'w-full h-full object-cover transition-opacity duration-500',
                              isImageLoaded ? 'opacity-100' : 'opacity-0'
                            )}
                            loading={index === 0 ? 'eager' : 'lazy'}
                            decoding={index === 0 ? 'sync' : 'async'}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                            onLoad={() => handleImageLoad(index)}
                          />
                        </picture>
                        {/* Show skeleton behind image until it loads */}
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-muted animate-pulse" />
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full bg-muted animate-pulse" />
                    )}
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  </div>

              {/* Content */}
              <div className="absolute inset-0 flex lg:items-end z-20 top-12">
                <div className="container mx-auto px-4 pb-12 md:pb-16 lg:pb-20">
                  <div className="max-w-2xl ml-12">
                    <h2
                      className={cn(
                        'text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 transition-all duration-700',
                        isActive
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-4 opacity-0'
                      )}
                      style={{
                        transitionDelay: isActive ? '200ms' : '0ms',
                      }}
                    >
                      {slide.title}
                    </h2>
                    <p
                      className={cn(
                        'text-lg md:text-xl text-white/90 mb-6 transition-all duration-700',
                        isActive
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-4 opacity-0'
                      )}
                      style={{
                        transitionDelay: isActive ? '400ms' : '0ms',
                      }}
                    >
                      {slide.description}
                    </p>
                    {slide.cta && (
                      <Button
                        size="lg"
                        className={cn(
                          'transition-all duration-700',
                          isActive
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-4 opacity-0'
                        )}
                        style={{
                          transitionDelay: isActive ? '600ms' : '0ms',
                        }}
                        onClick={() => {
                          if (slide.cta?.link.startsWith('http')) {
                            window.open(slide.cta.link, '_blank', 'noopener,noreferrer');
                          } else {
                            navigate(slide.cta.link);
                          }
                        }}
                      >
                        {slide.cta.text}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {!showSkeleton && slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots Navigation */}
      {!showSkeleton && slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2 items-center">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={cn(
                'p-0 border-0 rounded-full transition-all duration-300 cursor-pointer',
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              )}
              style={{
                width: index === currentIndex ? '2rem' : '0.5rem',
                height: '0.5rem',
                minWidth: 'unset',
                minHeight: 'unset',
              }}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}

      {/* Pause indicator (optional) */}
      {!showSkeleton && autoplayInterval > 0 && isAutoplayPaused && (
        <div className="absolute top-4 right-4 z-30 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
          Paused
        </div>
      )}
        </>
      )}
    </div>
  );
}

