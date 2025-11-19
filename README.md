# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/28a6008a-4f93-4bad-97ab-37c33350fedf

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/28a6008a-4f93-4bad-97ab-37c33350fedf) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Variables

This project requires the following environment variables to be configured in your `.env` file:

### Required Variables

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Google Maps API (for location search)
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### How to Configure

1. **Supabase**: 
   - Already configured if you're using Lovable Cloud
   - For external Supabase projects, get these values from your Supabase project settings

2. **Google Maps API Key**:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
   - Create an API key with HTTP referrer restrictions:
     - Add `*.lovable.app/*` (for Lovable hosting)
     - Add your custom domain if applicable
   - Copy the API key to `VITE_GOOGLE_MAPS_API_KEY`

**Note**: The Google Maps API key is designed to be used in the client-side code. Its security comes from the HTTP referrer restrictions you configure in Google Cloud Console, not from keeping it secret.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/28a6008a-4f93-4bad-97ab-37c33350fedf) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
