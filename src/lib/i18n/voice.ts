/**
 * Voice Assistant i18n translations
 * Optimized for TTS brevity and clarity
 */

export const voiceTranslations = {
  en: {
    voice: {
      // Search responses
      search: {
        found: 'Found {{count}} activities',
        foundOne: 'Found "{{title}}"',
        notFound: 'No activities found for "{{query}}"',
        multiple: 'Found {{count}} activities. Showing "{{title}}"',
        error: 'Search failed',
      },
      // Reservation responses
      reservation: {
        success: 'Reserved for "{{title}}"',
        alreadyBooked: 'Already booked',
        full: '"{{title}}" is full',
        loginRequired: 'Login required',
        error: 'Reservation failed',
      },
      // Activity details
      details: {
        summary: '"{{title}}" on {{date}} at {{time}}. {{cost}}, {{availability}}',
        notFound: 'Activity not found',
        error: 'Could not get details',
      },
      // Suggestions
      suggestions: {
        found: 'Here are {{count}} activities',
        none: 'No activities match your preferences',
        error: 'Could not generate suggestions',
      },
      // Filters
      filters: {
        applied: 'Filter applied',
        cleared: 'Filters cleared',
        error: 'Could not apply filter',
      },
      // Reservations list
      myReservations: {
        found: 'You have {{count}} reservations',
        none: 'No active reservations',
        error: 'Could not get reservations',
      },
      // Ratings
      ratings: {
        submitted: 'Rating saved: {{rating}} stars',
        summary: '"{{title}}": {{average}} stars, {{count}} reviews',
        none: 'No reviews yet',
        error: 'Could not get ratings',
      },
      // Navigation
      navigation: {
        success: 'Showing activities',
        withCategory: 'Showing {{category}} activities',
        error: 'Navigation failed',
      },
      // Common
      common: {
        free: 'free',
        full: 'full',
        available: '{{count}} spots',
      },
    },
  },
  es: {
    voice: {
      // Search responses
      search: {
        found: 'Encontré {{count}} actividades',
        foundOne: 'Encontré "{{title}}"',
        notFound: 'No encontré actividades para "{{query}}"',
        multiple: 'Encontré {{count}} actividades. Te muestro "{{title}}"',
        error: 'Error al buscar',
      },
      // Reservation responses
      reservation: {
        success: 'Reservado: "{{title}}"',
        alreadyBooked: 'Ya estás apuntado',
        full: '"{{title}}" está completa',
        loginRequired: 'Debes iniciar sesión',
        error: 'Error al reservar',
      },
      // Activity details
      details: {
        summary: '"{{title}}" el {{date}} a las {{time}}. {{cost}}, {{availability}}',
        notFound: 'Actividad no encontrada',
        error: 'Error al obtener detalles',
      },
      // Suggestions
      suggestions: {
        found: 'Te recomiendo {{count}} actividades',
        none: 'No hay actividades disponibles',
        error: 'Error al generar sugerencias',
      },
      // Filters
      filters: {
        applied: 'Filtro aplicado',
        cleared: 'Filtros eliminados',
        error: 'Error al aplicar filtro',
      },
      // Reservations list
      myReservations: {
        found: 'Tienes {{count}} reservas',
        none: 'Sin reservas activas',
        error: 'Error al obtener reservas',
      },
      // Ratings
      ratings: {
        submitted: 'Valoración guardada: {{rating}} estrellas',
        summary: '"{{title}}": {{average}} estrellas, {{count}} opiniones',
        none: 'Sin valoraciones',
        error: 'Error al obtener valoraciones',
      },
      // Navigation
      navigation: {
        success: 'Mostrando actividades',
        withCategory: 'Mostrando actividades de {{category}}',
        error: 'Error al navegar',
      },
      // Common
      common: {
        free: 'gratis',
        full: 'completa',
        available: '{{count}} plazas',
      },
    },
  },
  ca: {
    voice: {
      search: {
        found: 'He trobat {{count}} activitats',
        foundOne: 'He trobat "{{title}}"',
        notFound: 'No he trobat activitats per "{{query}}"',
        multiple: 'He trobat {{count}} activitats. Et mostro "{{title}}"',
        error: 'Error en cercar',
      },
      reservation: {
        success: 'Reservat: "{{title}}"',
        alreadyBooked: 'Ja estàs apuntat',
        full: '"{{title}}" està completa',
        loginRequired: 'Has d\'iniciar sessió',
        error: 'Error en reservar',
      },
      details: {
        summary: '"{{title}}" el {{date}} a les {{time}}. {{cost}}, {{availability}}',
        notFound: 'Activitat no trobada',
        error: 'Error en obtenir detalls',
      },
      suggestions: {
        found: 'Et recomano {{count}} activitats',
        none: 'No hi ha activitats disponibles',
        error: 'Error en generar suggeriments',
      },
      filters: {
        applied: 'Filtre aplicat',
        cleared: 'Filtres eliminats',
        error: 'Error en aplicar filtre',
      },
      myReservations: {
        found: 'Tens {{count}} reserves',
        none: 'Sense reserves actives',
        error: 'Error en obtenir reserves',
      },
      ratings: {
        submitted: 'Valoració guardada: {{rating}} estrelles',
        summary: '"{{title}}": {{average}} estrelles, {{count}} opinions',
        none: 'Sense valoracions',
        error: 'Error en obtenir valoracions',
      },
      navigation: {
        success: 'Mostrant activitats',
        withCategory: 'Mostrant activitats de {{category}}',
        error: 'Error en navegar',
      },
      common: {
        free: 'gratis',
        full: 'completa',
        available: '{{count}} places',
      },
    },
  },
  fr: {
    voice: {
      search: {
        found: 'Trouvé {{count}} activités',
        foundOne: 'Trouvé "{{title}}"',
        notFound: 'Aucune activité pour "{{query}}"',
        multiple: 'Trouvé {{count}} activités. Affichage de "{{title}}"',
        error: 'Erreur de recherche',
      },
      reservation: {
        success: 'Réservé: "{{title}}"',
        alreadyBooked: 'Déjà réservé',
        full: '"{{title}}" est complet',
        loginRequired: 'Connexion requise',
        error: 'Erreur de réservation',
      },
      details: {
        summary: '"{{title}}" le {{date}} à {{time}}. {{cost}}, {{availability}}',
        notFound: 'Activité non trouvée',
        error: 'Erreur de détails',
      },
      suggestions: {
        found: 'Je recommande {{count}} activités',
        none: 'Aucune activité disponible',
        error: 'Erreur de suggestions',
      },
      filters: {
        applied: 'Filtre appliqué',
        cleared: 'Filtres effacés',
        error: 'Erreur de filtre',
      },
      myReservations: {
        found: 'Vous avez {{count}} réservations',
        none: 'Aucune réservation',
        error: 'Erreur de réservations',
      },
      ratings: {
        submitted: 'Avis enregistré: {{rating}} étoiles',
        summary: '"{{title}}": {{average}} étoiles, {{count}} avis',
        none: 'Aucun avis',
        error: 'Erreur d\'avis',
      },
      navigation: {
        success: 'Affichage des activités',
        withCategory: 'Affichage des activités {{category}}',
        error: 'Erreur de navigation',
      },
      common: {
        free: 'gratuit',
        full: 'complet',
        available: '{{count}} places',
      },
    },
  },
  it: {
    voice: {
      search: {
        found: 'Trovato {{count}} attività',
        foundOne: 'Trovato "{{title}}"',
        notFound: 'Nessuna attività per "{{query}}"',
        multiple: 'Trovato {{count}} attività. Mostrando "{{title}}"',
        error: 'Errore di ricerca',
      },
      reservation: {
        success: 'Prenotato: "{{title}}"',
        alreadyBooked: 'Già prenotato',
        full: '"{{title}}" è completo',
        loginRequired: 'Accesso richiesto',
        error: 'Errore di prenotazione',
      },
      details: {
        summary: '"{{title}}" il {{date}} alle {{time}}. {{cost}}, {{availability}}',
        notFound: 'Attività non trovata',
        error: 'Errore nei dettagli',
      },
      suggestions: {
        found: 'Raccomando {{count}} attività',
        none: 'Nessuna attività disponibile',
        error: 'Errore nei suggerimenti',
      },
      filters: {
        applied: 'Filtro applicato',
        cleared: 'Filtri cancellati',
        error: 'Errore nel filtro',
      },
      myReservations: {
        found: 'Hai {{count}} prenotazioni',
        none: 'Nessuna prenotazione',
        error: 'Errore nelle prenotazioni',
      },
      ratings: {
        submitted: 'Valutazione salvata: {{rating}} stelle',
        summary: '"{{title}}": {{average}} stelle, {{count}} recensioni',
        none: 'Nessuna recensione',
        error: 'Errore nelle valutazioni',
      },
      navigation: {
        success: 'Mostrando attività',
        withCategory: 'Mostrando attività {{category}}',
        error: 'Errore di navigazione',
      },
      common: {
        free: 'gratis',
        full: 'completo',
        available: '{{count}} posti',
      },
    },
  },
  de: {
    voice: {
      search: {
        found: '{{count}} Aktivitäten gefunden',
        foundOne: '"{{title}}" gefunden',
        notFound: 'Keine Aktivitäten für "{{query}}"',
        multiple: '{{count}} Aktivitäten gefunden. Zeige "{{title}}"',
        error: 'Suchfehler',
      },
      reservation: {
        success: 'Reserviert: "{{title}}"',
        alreadyBooked: 'Bereits gebucht',
        full: '"{{title}}" ist voll',
        loginRequired: 'Anmeldung erforderlich',
        error: 'Reservierungsfehler',
      },
      details: {
        summary: '"{{title}}" am {{date}} um {{time}}. {{cost}}, {{availability}}',
        notFound: 'Aktivität nicht gefunden',
        error: 'Detailfehler',
      },
      suggestions: {
        found: 'Ich empfehle {{count}} Aktivitäten',
        none: 'Keine Aktivitäten verfügbar',
        error: 'Vorschlagsfehler',
      },
      filters: {
        applied: 'Filter angewendet',
        cleared: 'Filter gelöscht',
        error: 'Filterfehler',
      },
      myReservations: {
        found: 'Sie haben {{count}} Reservierungen',
        none: 'Keine Reservierungen',
        error: 'Reservierungsfehler',
      },
      ratings: {
        submitted: 'Bewertung gespeichert: {{rating}} Sterne',
        summary: '"{{title}}": {{average}} Sterne, {{count}} Bewertungen',
        none: 'Keine Bewertungen',
        error: 'Bewertungsfehler',
      },
      navigation: {
        success: 'Zeige Aktivitäten',
        withCategory: 'Zeige {{category}} Aktivitäten',
        error: 'Navigationsfehler',
      },
      common: {
        free: 'kostenlos',
        full: 'voll',
        available: '{{count}} Plätze',
      },
    },
  },
};
