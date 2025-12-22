# Tardeo

> Social Network & AI Assistant for Active Aging

Tardeo is a modern platform designed to connect people through social activities and communities, featuring an advanced conversational assistant (voice and text) powered by Artificial Intelligence.

## ⚠️ Project Status: Active R&D

This project is currently in an **Active Research & Development phase**.
* **Infrastructure & Backend**: Core logic, AI orchestration (OpenAI/ElevenLabs), and database schemas are production-ready.
* **Frontend/UI**: The user interface and some social features are under continuous iteration and may not reflect the final intended UX.
* **Public Access**: The web platform is not yet open for public registration as we fine-tune performance and accessibility standards.

## 🚀 Technical Vision

Built under robust software engineering principles for scalability and performance:

- **Feature-Based Architecture**: Modular code organization by business domains (`activities`, `social`, `communities`) to maximize maintainability and decoupling.
- **AI-Driven UX**: Hybrid conversational assistant utilizing **OpenAI Function Calling** to execute real-time business logic such as searches, bookings, and automated navigation.
- **TOON Protocol**: Token-Oriented Object Notation serialization system to optimize latency and token consumption in assistant responses.
- **Performance-First**: Strategic use of `React.lazy` and `Suspense` for deferred loading of heavy modules, optimizing Core Web Vitals.
- **BaaS with Supabase**: Distributed backend logic via **Edge Functions** and data security guaranteed through strict RLS (Row Level Security) policies.

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **UI/UX** | shadcn/ui, Radix UI, Lucide Icons |
| **AI & Voice** | ElevenLabs SDK, OpenAI GPT-4o-mini |
| **Backend & DB** | Supabase (PostgreSQL, Edge Functions, Auth, Storage) |
| **Testing** | Vitest |
| **Analytics** | Mixpanel |

## ⚙️ Setup

```bash
# Clone and install
git clone https://github.com/xminguito/tardeo.git
cd tardeo
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and API keys

# Run development server
npm run dev
```

## 📚 Documentation

```
docs/
├── analytics.md              # Mixpanel instrumentation
├── database/                 # Database migrations & setup
├── social/                   # Social features & communities
│   ├── README.md            # Social system overview
│   ├── DB.md                # Database schema
│   ├── API.md               # API endpoints
│   └── ...
├── tts-*.md                  # Voice/TTS documentation
└── internal/                 # Internal configuration guides
```

## 📈 Roadmap

- [ ] Cloudflare DNS optimization and advanced cache management
- [ ] Expand assistant capabilities for autonomous community management
- [ ] Enhance accessibility systems for users with sensory impairments

---

**v1.0.0** · Built with Clean Code, Performance, and Accessibility in mind.
