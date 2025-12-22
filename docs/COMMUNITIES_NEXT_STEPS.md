# 🚀 Communities Feature - Progress Report & Next Steps

## ✅ Completed (Phase 1-2)

### 1. Database Schema ✓
- ✅ Created migration file: `supabase/migrations/20251217030756_create_communities.sql`
- ✅ Tables: `communities`, `community_members`
- ✅ Added `community_id` column to `activities` table
- ✅ RLS policies implemented for security
- ✅ Triggers for auto-updating member counts
- ✅ Indexes for performance

### 2. TypeScript Types ✓
- ✅ Created `src/features/communities/types/community.types.ts`
- ✅ Updated `Activity` interface to include `community` and `community_id`
- ✅ Defined `Community`, `CommunityMember`, `CommunityWithMembership` interfaces

### 3. i18n Translations ✓
- ✅ Added Spanish translations to `src/lib/i18n/es.ts`
- ✅ Added English translations to `src/lib/i18n/en.ts`
- ✅ Includes: list, detail, create, categories, card text

### 4. ActivityCard Update ✓
- ✅ Community badge now displays when activity belongs to a community
- ✅ Badge is clickable and navigates to community detail page
- ✅ Uses Users icon + community name

### 5. CreateActivityDialog Update ✓ (Partial)
- ✅ Added `community_id` to form data
- ✅ Updated `activityData` object to include `community_id` on insert/update

---

## 🔨 TODO: Remaining Implementation Steps

### Step 1: Complete CreateActivityDialog Community Selector

**Add community fetch hook and UI:**

```tsx
// Add near other state declarations (around line 520)
const [userCommunities, setUserCommunities] = useState<Array<{id: string; name: string}>>([]);

// Fetch user's communities
useEffect(() => {
  const fetchUserCommunities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from('community_members')
      .select('community_id, communities(id, name)')
      .eq('user_id', user.id)
      .eq('role', 'admin'); // Only admins can post for communities
    
    if (data) {
      const communities = data
        .filter(item => item.communities)
        .map(item => ({
          id: item.communities.id,
          name: item.communities.name
        }));
      setUserCommunities(communities);
    }
  };
  
  if (open) {
    fetchUserCommunities();
  }
}, [open]);

// Add to form initialization when editing (around line 532)
community_id: activityToEdit.community_id || null,
```

**Add UI component (after category Select, around line 1216):**

```tsx
{/* Community Select (Optional) */}
{userCommunities.length > 0 && (
  <div className="space-y-2">
    <Label htmlFor="community">
      {t('activities.create.community')}
      <span className="text-muted-foreground text-xs ml-2">
        ({t('activities.create.optional')})
      </span>
    </Label>
    <Select
      value={formData.community_id || 'none'}
      onValueChange={(value) => 
        setFormData({ 
          ...formData, 
          community_id: value === 'none' ? null : value 
        })
      }
    >
      <SelectTrigger id="community">
        <SelectValue placeholder={t('activities.create.communityPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          {t('activities.create.noCommunity')}
        </SelectItem>
        {userCommunities.map((community) => (
          <SelectItem key={community.id} value={community.id}>
            {community.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**Add missing i18n keys:**

```typescript
// In es.ts and en.ts under activities.create:
community: "Comunidad",
optional: "opcional",
communityPlaceholder: "Selecciona una comunidad",
noCommunity: "Sin comunidad",
```

---

### Step 2: Create Communities List Page

**File:** `src/features/communities/pages/CommunitiesList.tsx`

**Key features:**
- Grid layout (3 cols desktop, 1 col mobile)
- Search bar
- Category filter tabs
- Community cards with:
  - Cover image
  - Name
  - Member count
  - Activity count
  - Join button
- Infinite scroll or pagination
- Empty state

**Hook needed:** `src/features/communities/hooks/useCommunities.ts`

---

### Step 3: Create Community Detail Page

**File:** `src/features/communities/pages/CommunityDetail.tsx`

**Sections:**
- Hero with cover image
- Community info card (name, description, member count, join/leave button)
- Tabs: Activities, Members, About
- Activity feed (reuse ActivityCard)
- Member grid (avatars)

**Hooks needed:**
- `src/features/communities/hooks/useCommunity.ts`
- `src/features/communities/hooks/useCommunityMembers.ts`
- `src/features/communities/hooks/useJoinCommunity.ts`

---

### Step 4: Update App Routing

**File:** `src/App.tsx`

Add routes:

```tsx
import CommunitiesList from "@/features/communities/pages/CommunitiesList";
import CommunityDetail from "@/features/communities/pages/CommunityDetail";

// In Routes:
<Route path="/communities" element={<CommunitiesList />} />
<Route path="/communities/:slug" element={<CommunityDetail />} />
```

---

### Step 5: Update Navigation

**Files:**
- `src/components/Header.tsx`
- `src/components/BottomNav.tsx`

Add "Communities" link with Users icon.

---

### Step 6: Update AI Assistant

**File:** `supabase/functions/voice-chat/index.ts`

Add tool definitions:

```typescript
{
  type: "function",
  function: {
    name: "searchCommunities",
    description: "Busca comunidades/grupos por nombre o tema",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de búsqueda" }
      }
    }
  }
}
```

Add execution:

```typescript
if (toolName === 'searchCommunities') {
  const { data } = await supabaseClient
    .from('communities')
    .select('id, name, slug, description, member_count')
    .ilike('name', `%${args.query}%`)
    .eq('is_public', true)
    .limit(10);
  
  return formatCommunities(data);
}
```

Update system prompt to mention communities.

---

### Step 7: Run Migration

```bash
cd /Users/franciscojavier/Sites/tardeo
npx supabase db push
```

After migration, regenerate Supabase types:

```bash
npx supabase gen types typescript --project-id kzcowengsnnuglyrjuto > src/integrations/supabase/types.ts
```

---

### Step 8: Testing Checklist

- [ ] Migration runs without errors
- [ ] Can create community
- [ ] Can join/leave community
- [ ] Community badge shows on activity cards
- [ ] Community selector works in create activity
- [ ] Communities list page loads
- [ ] Community detail page loads
- [ ] AI can search communities
- [ ] RLS policies work (test with different users)
- [ ] i18n works for ES/EN

---

## 📊 Analytics Events to Add

```typescript
// When creating community
track('community_created', {
  community_id: id,
  category: category,
  is_public: is_public
});

// When joining
track('community_joined', {
  community_id: id,
  source: 'button' | 'activity_card'
});

// When viewing details
track('community_viewed', {
  community_id: id,
  has_activities: activities_count > 0
});
```

---

## 🎯 Quick Start Command

To deploy everything at once:

```bash
# 1. Run migration
npm run supabase:push

# 2. Regenerate types
npm run supabase:types

# 3. Start dev server
npm run dev

# 4. Test in browser
open http://localhost:5173/communities
```

---

## 📝 Notes

- Migration is **backwards compatible** (adds nullable column)
- Community selector only shows if user is admin of at least one community
- Activities without `community_id` are "public" (visible to all)
- Private communities require RLS check on activities table (optional enhancement)

Ready to continue? Start with **Step 1** to complete the community selector UI! 🚀







