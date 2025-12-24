/**
 * Community Translation Utilities
 * Helper functions to get translated fields based on current language
 */

import type { Community, CommunityTranslations } from '../types/community.types';

type SupportedLanguage = 'es' | 'en' | 'ca' | 'fr' | 'it' | 'de';

/**
 * Get translated community name based on current language
 * Falls back to Spanish (original) name if translation not available
 */
export function getTranslatedName(
  community: Pick<Community, 'name' | 'translations'>,
  language: string
): string {
  const lang = language as SupportedLanguage;
  
  // Spanish is the source language, return original name
  if (lang === 'es') {
    return community.name;
  }
  
  const translations = community.translations as CommunityTranslations | null;
  if (!translations) {
    return community.name;
  }
  
  const key = `name_${lang}` as keyof CommunityTranslations;
  return translations[key] || community.name;
}

/**
 * Get translated community description based on current language
 * Falls back to Spanish (original) description if translation not available
 */
export function getTranslatedDescription(
  community: Pick<Community, 'description' | 'translations'>,
  language: string
): string | null {
  const lang = language as SupportedLanguage;
  
  // Spanish is the source language, return original description
  if (lang === 'es') {
    return community.description;
  }
  
  const translations = community.translations as CommunityTranslations | null;
  if (!translations || !community.description) {
    return community.description;
  }
  
  const key = `description_${lang}` as keyof CommunityTranslations;
  return translations[key] || community.description;
}

