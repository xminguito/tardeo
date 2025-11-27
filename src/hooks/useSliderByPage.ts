/**
 * Hook to load slider data for a specific page
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

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

interface UseSliderByPageResult {
  slides: Slide[];
  loading: boolean;
  error: string | null;
  sliderName: string | null;
}

export function useSliderByPage(pagePath: string): UseSliderByPageResult {
  const { i18n } = useTranslation();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderName, setSliderName] = useState<string | null>(null);

  useEffect(() => {
    const loadSlider = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, find the slider for this page
        const { data: sliderData, error: sliderError } = await supabase
          .from('sliders')
          .select('id, name')
          .eq('page_path', pagePath)
          .eq('is_active', true)
          .maybeSingle();

        if (sliderError) {
          // If sliders table doesn't exist, fall back to loading all banners
          if (import.meta.env.DEV) {
            console.warn('Sliders table not found, loading all banners');
          }
          await loadLegacyBanners();
          return;
        }

        if (!sliderData) {
          // No slider for this page
          setSlides([]);
          setSliderName(null);
          return;
        }

        setSliderName(sliderData.name);

        // Load banners for this slider
        const { data: bannersData, error: bannersError } = await supabase
          .from('hero_banners')
          .select('*')
          .eq('slider_id', sliderData.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (bannersError) throw bannersError;

        const formattedSlides = formatBanners(bannersData || [], i18n.language);
        setSlides(formattedSlides);
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Error loading slider:', err);
        }
        setError(err.message);
        
        // Fallback to legacy loading
        await loadLegacyBanners();
      } finally {
        setLoading(false);
      }
    };

    const loadLegacyBanners = async () => {
      try {
        // Legacy: load all active banners without slider_id filtering
        const { data, error } = await supabase
          .from('hero_banners')
          .select('*')
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (error) throw error;

        const formattedSlides = formatBanners(data || [], i18n.language);
        setSlides(formattedSlides);
        setSliderName('Default');
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Error loading legacy banners:', err);
        }
        setSlides([]);
      }
    };

    loadSlider();
  }, [pagePath, i18n.language]);

  return { slides, loading, error, sliderName };
}

/**
 * Format banners data to Slide interface
 */
function formatBanners(banners: any[], language: string): Slide[] {
  return banners.map((banner: any) => {
    // Get localized content with fallback to Spanish
    const lang = language.split('-')[0]; // 'es-ES' -> 'es'
    
    const title = banner[`title_${lang}`] || banner.title_es || '';
    const description = banner[`description_${lang}`] || banner.description_es || '';
    const ctaText = banner[`cta_text_${lang}`] || banner.cta_text_es || '';

    return {
      id: banner.id,
      image: banner.image_url,
      mobileImage: banner.image_url_mobile || undefined,
      title,
      description,
      cta: ctaText && banner.cta_link
        ? { text: ctaText, link: banner.cta_link }
        : undefined,
    };
  });
}

/**
 * Hook to load slider by slug instead of page path
 */
export function useSliderBySlug(slug: string): UseSliderByPageResult {
  const { i18n } = useTranslation();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderName, setSliderName] = useState<string | null>(null);

  useEffect(() => {
    const loadSlider = async () => {
      try {
        setLoading(true);
        setError(null);

        // Find the slider by slug
        const { data: sliderData, error: sliderError } = await supabase
          .from('sliders')
          .select('id, name')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (sliderError) throw sliderError;

        if (!sliderData) {
          setSlides([]);
          setSliderName(null);
          return;
        }

        setSliderName(sliderData.name);

        // Load banners
        const { data: bannersData, error: bannersError } = await supabase
          .from('hero_banners')
          .select('*')
          .eq('slider_id', sliderData.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (bannersError) throw bannersError;

        const formattedSlides = formatBanners(bannersData || [], i18n.language);
        setSlides(formattedSlides);
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Error loading slider by slug:', err);
        }
        setError(err.message);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlider();
  }, [slug, i18n.language]);

  return { slides, loading, error, sliderName };
}

