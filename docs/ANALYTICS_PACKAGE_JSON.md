# Package.json Updates for Analytics

## Dependencies to Add

Add these to your `package.json`:

```json
{
  "dependencies": {
    "mixpanel-browser": "^2.47.0"
  },
  "devDependencies": {
    "@types/mixpanel-browser": "^2.47.0"
  }
}
```

## Install Command

```bash
npm install mixpanel-browser
npm install -D @types/mixpanel-browser
```

Or with pnpm (if you're using it):

```bash
pnpm add mixpanel-browser
pnpm add -D @types/mixpanel-browser
```

## Optional: Add Analytics Scripts

You can add these helper scripts to `package.json`:

```json
{
  "scripts": {
    "test:analytics": "vitest run src/lib/analytics",
    "test:analytics:watch": "vitest watch src/lib/analytics",
    "analytics:status": "node -e \"console.log('Analytics Status:', require('./src/lib/analytics').getAnalyticsStatus())\"",
    "deploy:analytics": "supabase functions deploy mixpanel-proxy"
  }
}
```

### Usage

```bash
# Run analytics tests
npm run test:analytics

# Watch analytics tests
npm run test:analytics:watch

# Deploy Edge Function
npm run deploy:analytics
```

## TypeScript Configuration

No changes needed! The integration uses existing TypeScript config.

But if you want to ensure proper types, verify `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest"],
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler"
  }
}
```

## Vite Configuration

No changes needed! Dynamic imports work out of the box.

But you can optimize chunk splitting if desired in `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'analytics': ['mixpanel-browser'],
        },
      },
    },
  },
});
```

This ensures Mixpanel is in a separate chunk (though dynamic import already does this).

---

## Environment Variables Reference

### Development (.env.local)
```env
VITE_MIXPANEL_TOKEN=your_project_token_here
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### Production (Supabase Secrets)
```bash
supabase secrets set MIXPANEL_API_SECRET=your_api_secret
```

### Production (Lovable or Vercel)
```env
VITE_MIXPANEL_TOKEN=your_project_token_here
```

---

## Verification After Install

```bash
# Check dependencies installed
npm list mixpanel-browser
npm list @types/mixpanel-browser

# Run tests
npm run test:analytics

# Build to verify no errors
npm run build
```

---

## Bundle Size Check

After installation, verify bundle size:

```bash
npm run build
npx vite-bundle-visualizer
```

**Expected**:
- `mixpanel-browser` should NOT appear in the main chunk
- Should appear in a lazy-loaded chunk (~40 KB gzipped)

---

That's all you need to add! 🎉


