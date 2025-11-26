# Mixpanel Analytics Dashboard - RESUELTO ✅

## Solución Implementada

El Analytics Dashboard (`/admin/analytics`) ahora muestra datos reales de Mixpanel
utilizando la **Export API** (`data-eu.mixpanel.com`).

### Problema Original

Las APIs de Query (Segmentation, JQL, Insights) en `api-eu.mixpanel.com` fallaban
con `AuthenticationRequired` usando cualquier credencial:

- Project Token ❌
- Project Secret ❌
- Service Account Secret ❌

### Solución

Se descubrió que la **Export API** (`data-eu.mixpanel.com/api/2.0/export`)
funciona correctamente con el **Project Secret** como password en Basic Auth.

El Edge Function `admin-mixpanel-query` fue reescrito para:

1. Usar la Export API en lugar de Segmentation API
2. Descargar eventos en bruto (formato newline-delimited JSON)
3. Procesar los eventos localmente para calcular métricas:
   - DAU (Daily Active Users)
   - WAU (Weekly Active Users)
   - Reservations count
   - Funnel conversion
   - Retention cohorts
   - Assistant metrics

### Ventajas de esta solución

- ✅ Acceso a TODOS los eventos históricos de Mixpanel
- ✅ No requiere Service Account (solo Project Secret)
- ✅ Compatible con EU data residency
- ✅ Cache de 5 minutos para optimizar rendimiento

### Configuración

El secret `MIXPANEL_API_SECRET` en Supabase debe contener el **Project Secret**:
`841e185fec7dea687d746e23b00e6abf`

### Archivos Modificados

- `/supabase/functions/admin-mixpanel-query/index.ts` - Reescrito para usar Export
  API

### Fecha de Resolución

26 de Noviembre de 2025
