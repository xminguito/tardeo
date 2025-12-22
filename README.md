# Tardeo: Social Network & AI Assistant for Active Aging

Tardeo is a modern platform designed to connect people through social activities and communities, featuring an advanced conversational assistant (voice and text) powered by Artificial Intelligence.

## 🚀 Technical Vision (Senior Overview)

Unlike conventional prototypes, Tardeo is built under robust software engineering principles to ensure scalability and performance:

* **Feature-Based Architecture**: Modular code organization by business domains (`activities`, `social`, `communities`) to maximize maintainability and decoupling.
* **AI-Driven UX**: Hybrid conversational assistant utilizing **OpenAI Function Calling** to execute real-time business logic such as searches, bookings, and automated navigation.
* **TOON Protocol**: Implementation of a Token-Oriented Object Notation serialization system to optimize latency and token consumption in assistant responses.
* **Performance-First**: Strategic use of `React.lazy` and `Suspense` for deferred loading of heavy modules such as Analytics, Site Settings, and User Management, optimizing the LCP (Largest Contentful Paint) Core Web Vital.
* **BaaS with Supabase**: Distributed backend logic via **Edge Functions** and data security guaranteed through strict RLS (Row Level Security) policies.

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS.
* **UI/UX**: shadcn/ui, Radix UI, Lucide Icons.
* **AI & Voice**: ElevenLabs SDK for voice synthesis and OpenAI GPT-4o-mini for function orchestration.
* **Backend & DB**: Supabase (PostgreSQL, Edge Functions, Auth, Storage).
* **Testing & Analytics**: Vitest for unit testing and Mixpanel for observability and KPI tracking.

## ⚙️ Setup and Execution

1. **Cloning and Dependencies**:
   ```bash
   git clone [https://github.com/xminguito/tardeo.git](https://github.com/xminguito/tardeo.git)
   cd tardeo
   npm install
Environment Variables: Configure your .env file with your Supabase credentials and Google Maps API Key (required for activity geolocating).

Development Server:

Bash

npm run dev
📚 Technical Documentation
The project includes a detailed technical knowledge base in the /docs directory:

Analytics: Instrumentation guides and Mixpanel setup.

Social System: Database specifications and social event triggers.

Voice & TTS: Documentation on cost optimization, quality metrics, and rate limiting for the AI assistant.

📈 Innovation Roadmap
[ ] Implement Development Mode on Cloudflare for DNS optimization and advanced cache management.

[ ] Expand assistant capabilities for autonomous community management.

[ ] Enhance hearing accessibility systems for users with sensory impairments.

Developed with a relentless focus on Clean Code, Performance, and Accessibility.