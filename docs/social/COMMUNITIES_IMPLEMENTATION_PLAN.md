# 🏘️ Communities Feature - Implementation Plan

## Overview
Transform Tardeo from an event directory into a **Community-First Platform** to improve user retention and solve the "empty feed" problem.

---

## 📊 Phase 1: Database Schema & Migration

### 1.1 New Tables

#### `communities` table
```sql
id: uuid (PK)
name: text (NOT NULL)
slug: text (UNIQUE, NOT NULL) -- URL-friendly
description: text
image_url: text
cover_image_url: text
tags: text[] -- e.g., ['yoga', 'deportes', 'arte']
category: text -- Main category
is_public: boolean (DEFAULT true)
member_count: integer (DEFAULT 0) -- Cached count
created_by: uuid (FK -> profiles.id)
created_at: timestamptz
updated_at: timestamptz
```

#### `community_members` table
```sql
id: uuid (PK)
community_id: uuid (FK -> communities.id) ON DELETE CASCADE
user_id: uuid (FK -> auth.users.id) ON DELETE CASCADE
role: text (CHECK: 'admin' | 'moderator' | 'member')
joined_at: timestamptz
UNIQUE(community_id, user_id)
```

#### Update `activities` table
```sql
-- Add column:
community_id: uuid (FK -> communities.id) ON DELETE SET NULL (nullable)
```

### 1.2 RLS Policies

**communities table:**
- ✅ SELECT: Public (anyone can view)
- ✅ INSERT: Authenticated users can create
- ✅ UPDATE: Only admins of the community
- ✅ DELETE: Only creator or admins

**community_members table:**
- ✅ SELECT: Authenticated users only (prevent scraping)
- ✅ INSERT: Authenticated users can join
- ✅ UPDATE: Only admins can change roles
- ✅ DELETE: Users can leave (self), admins can remove others

**activities table (update):**
- ✅ If `community_id` is set, only community members can see/join the activity (configurable)

### 1.3 Indexes
```sql
CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_tags ON communities USING gin(tags);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_activities_community ON activities(community_id);
```

---

## 🎨 Phase 2: Frontend UI Components

### 2.1 New Pages

#### `/communities` - Communities List
**Layout:**
```
Header
├─ Search bar (filter by name/tags)
├─ Category tabs (All, Deportes, Arte, Social, etc.)
└─ Grid of community cards (3 cols desktop, 1 col mobile)

CommunityCard:
├─ Cover Image (aspect-ratio 16:9)
├─ Avatar/Logo (overlap)
├─ Name + Badge (if user is member)
├─ Description (truncated, 2 lines)
├─ Member count + Activity count
└─ "Join" / "Joined ✓" button
```

**Key Features:**
- Infinite scroll or pagination
- Skeleton loaders
- Empty state: "No hay comunidades todavía. ¡Crea la primera!"

#### `/communities/:slug` - Community Detail
**Layout:**
```
Header
├─ Cover Image (hero, h-64)
├─ Community Info Card:
│   ├─ Avatar + Name
│   ├─ Description
│   ├─ Tags
│   ├─ Member count
│   └─ Join/Leave Button (primary CTA)
├─ Tabs:
│   ├─ Upcoming Activities (default)
│   ├─ Members (avatar grid)
│   └─ About (full description, rules)
└─ Activity Feed (if tab = activities)
```

**Features:**
- Optimistic UI for join/leave
- Only members can post activities (rule enforcement)
- Admin badge for organizers

#### `/communities/create` - Create Community
**Form Fields:**
- Name (required, max 50 chars)
- Slug (auto-generated, editable)
- Description (rich text, max 500 chars)
- Category (dropdown)
- Tags (multi-select)
- Cover Image (upload or URL)
- Privacy: Public / Members-Only

### 2.2 Updated Components

#### `ActivityCard.tsx` Update
**Add Community Badge:**
```tsx
{activity.community && (
  <Badge variant="secondary" className="flex items-center gap-1">
    <Users className="h-3 w-3" />
    {activity.community.name}
  </Badge>
)}
```

Position: Top-right corner or below image

#### `CreateActivityDialog.tsx` Update
**Add Community Selector:**
```tsx
<Select
  label="Comunidad (opcional)"
  options={userCommunities}
  placeholder="Selecciona una comunidad"
  onChange={setCommunityId}
/>
```

Fetch user's communities where `role IN ['admin', 'moderator', 'member']`

#### `Header.tsx` / `BottomNav.tsx` Update
Add "Communities" link:
```tsx
<NavigationItem href="/communities" icon={Users} label="Comunidades" />
```

---

## 🔧 Phase 3: TypeScript Types

### 3.1 New Types (`src/features/communities/types/community.types.ts`)
```typescript
export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  category: string | null;
  is_public: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

export interface CommunityWithMembership extends Community {
  is_member: boolean;
  user_role?: 'admin' | 'moderator' | 'member';
  activities_count?: number;
}
```

### 3.2 Update Activity Types
```typescript
// Add to Activity interface:
community_id?: string | null;
community?: {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
} | null;
```

---

## 🌍 Phase 4: i18n Translations

### 4.1 Add to `src/lib/i18n/es.ts`
```typescript
communities: {
  title: "Comunidades",
  create: "Crear Comunidad",
  join: "Unirse",
  joined: "Miembro",
  leave: "Salir",
  members: "Miembros",
  activities: "Actividades",
  about: "Acerca de",
  empty: "No hay comunidades todavía",
  emptyDescription: "Sé el primero en crear una comunidad",
  search: "Buscar comunidades...",
  categories: {
    all: "Todas",
    sports: "Deportes",
    art: "Arte y Cultura",
    social: "Social",
    learning: "Aprendizaje",
    wellness: "Bienestar",
  },
  card: {
    memberCount: "{{count}} miembros",
    activityCount: "{{count}} actividades",
  },
  detail: {
    joinConfirm: "¿Unirse a {{name}}?",
    leaveConfirm: "¿Salir de {{name}}?",
    organizedBy: "Organizado por",
    noActivities: "No hay actividades próximas",
  },
  create: {
    title: "Crear Nueva Comunidad",
    name: "Nombre",
    namePlaceholder: "ej: Amantes del Yoga",
    slug: "URL amigable",
    slugPlaceholder: "amantes-del-yoga",
    description: "Descripción",
    descriptionPlaceholder: "¿De qué trata tu comunidad?",
    category: "Categoría",
    tags: "Etiquetas",
    tagsPlaceholder: "yoga, meditación, bienestar",
    coverImage: "Imagen de portada",
    privacy: "Privacidad",
    public: "Pública (cualquiera puede ver)",
    private: "Solo miembros",
    submit: "Crear Comunidad",
  }
},
```

Repeat for `en.ts`, `ca.ts`, `fr.ts`, `it.ts`, `de.ts`.

---

## 🤖 Phase 5: AI Assistant Integration

### 5.1 Update Voice Chat System Prompt
**File:** `supabase/functions/voice-chat/index.ts`

Add to system prompt:
```typescript
const systemPrompt = `Eres un asistente amigable para Tardeo, ayudando a personas mayores a encontrar actividades Y comunidades.

NUEVAS CAPACIDADES:
- searchCommunities: Busca comunidades/grupos por nombre o tema
- getCommunityDetails: Obtiene info de una comunidad específica
- listCommunityActivities: Lista actividades de una comunidad

EJEMPLOS DE USO:
Usuario: "¿Hay algún grupo de yoga?"
→ Usa searchCommunities({query: "yoga"})

Usuario: "Muéstrame las actividades del grupo de senderismo"
→ Usa listCommunityActivities({communitySlug: "senderismo"})
`;
```

### 5.2 New Tool Definitions
Add to `tools` array:
```typescript
{
  type: "function",
  function: {
    name: "searchCommunities",
    description: "Busca comunidades/grupos disponibles por nombre o tema",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Texto de búsqueda (nombre, tema, categoría)"
        }
      }
    }
  }
},
{
  type: "function",
  function: {
    name: "getCommunityDetails",
    description: "Obtiene información completa de una comunidad",
    parameters: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "El slug de la comunidad"
        }
      },
      required: ["slug"]
    }
  }
}
```

### 5.3 Tool Execution Functions
```typescript
async function executeToolCall(toolName: string, args: any, supabase: any) {
  if (toolName === 'searchCommunities') {
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, description, member_count, tags')
      .ilike('name', `%${args.query}%`)
      .eq('is_public', true)
      .limit(10);
    
    return formatCommunityResults(data);
  }
  
  if (toolName === 'getCommunityDetails') {
    const { data } = await supabase
      .from('communities')
      .select('*, activities(count)')
      .eq('slug', args.slug)
      .single();
    
    return formatCommunityDetail(data);
  }
  
  // ... existing tools
}
```

---

## ⚡ Phase 6: Performance Optimizations

### 6.1 Caching Strategy
- Cache `member_count` in `communities` table (update via trigger)
- Use `select count()` aggregates sparingly
- Implement Redis cache for popular communities (optional)

### 6.2 Optimistic UI
**Join/Leave actions:**
```typescript
const { mutate: joinCommunity } = useMutation({
  mutationFn: async (communityId: string) => {
    // Optimistic update
    queryClient.setQueryData(['community', communityId], (old: any) => ({
      ...old,
      is_member: true,
      member_count: old.member_count + 1,
    }));
    
    return supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    });
  },
  onError: () => {
    queryClient.invalidateQueries(['community', communityId]);
  },
});
```

### 6.3 Query Optimization
```typescript
// Fetch communities with user membership status in single query
const { data } = await supabase
  .from('communities')
  .select(`
    *,
    community_members!left(role)
  `)
  .eq('community_members.user_id', userId);
```

---

## 🧪 Phase 7: Testing Checklist

- [ ] RLS policies prevent unauthorized access
- [ ] Users can create communities
- [ ] Users can join/leave communities
- [ ] Admins can edit community details
- [ ] Activities show community badge correctly
- [ ] Community selector works in CreateActivity
- [ ] AI assistant finds communities by name/theme
- [ ] Mobile responsive layout works
- [ ] i18n works for all languages
- [ ] Analytics track community interactions

---

## 📈 Success Metrics

**Track in Mixpanel:**
- `community_created`: When user creates community
- `community_joined`: When user joins
- `community_left`: When user leaves
- `community_activity_viewed`: Activity clicked from community
- `ai_community_search`: AI used to find communities

**KPIs to Monitor:**
- Average communities per user
- Activities per community
- Retention rate (30-day)
- Community engagement rate

---

## 🚀 Deployment Order

1. ✅ **Deploy Migration** (zero downtime, adds nullable column)
2. ✅ **Deploy Backend Types** (Supabase types regen)
3. ✅ **Deploy Frontend Components** (feature flag optional)
4. ✅ **Update AI Functions** (new tools)
5. ✅ **Monitor & Iterate** (analytics, user feedback)

---

## 📝 Next Steps

Ready to start implementation? Let's begin with:

**Step 1:** Create the database migration file
**Step 2:** Add TypeScript types
**Step 3:** Build the Communities list page

Would you like me to start generating the code for Phase 1?







