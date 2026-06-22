# ContentOS

**Multi-Platform Video Content Engine** - Create, manage, and scale faceless video content across TikTok, Instagram, YouTube, and Facebook.

## Features

### 🎯 Strategy Generation
- AI-powered channel strategy from your niche
- Brand identity (name, handle, tagline, positioning)
- Content mix pillars with percentages
- Platform-specific posting schedules
- 6-month growth roadmap with metrics
- Product & funnel strategy

### 🎬 Video Production Pipeline
- AI script generation (OpenAI GPT-4)
- AI visuals generation (FLUX via fal.ai)
- Text-to-speech voiceovers (Kokoro via fal.ai)
- Motion video generation (Wan 2.1)
- HyperFrames composition export
- OpenMontage integration

### 📊 Multi-Channel Management
- Connect TikTok, Instagram, YouTube, Facebook
- Auto-posting scheduler
- Performance analytics
- Revenue tracking

### 💰 Monetization
- Digital product management
- Sales funnel visualization
- Integration with Gumroad, Beacons, Shopify, Stripe

## Quick Start

### 1. Install Dependencies
```bash
cd ContentOS
npm install
```

### 2. Set Up API Keys
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:
- **OpenAI API Key**: [Get from platform.openai.com](https://platform.openai.com/api-keys)
- **fal.ai API Key** (optional, for AI visuals): [Get from fal.ai](https://fal.ai/dashboard/keys)

```
OPENAI_API_KEY=sk-...
FAL_AI_API_KEY=...
```

### 3. Start Development Server
```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
ContentOS/
├── src/
│   ├── App.jsx           # Main application
│   ├── main.jsx          # React entry point
│   ├── index.css         # Tailwind styles
│   └── lib/
│       ├── api.js        # API client functions
│       └── fal.js        # fal.ai integration
├── api/
│   ├── generate-script.js    # OpenAI script generation
│   ├── generate-strategy.js  # Strategy generation
│   └── generate-ideas.js     # Video ideas generator
├── openmontage-bridge.js     # HyperFrames composition generator
├── package.json
└── .env.local                # Your API keys
```

## Usage

### Generate a Script
1. Go to **Create** tab
2. Enter your topic/hook
3. Click **Generate Script with AI**
4. Review the generated hook, body points, and CTA
5. Edit if needed and continue to next steps

### Generate a Strategy
1. Go to **Strategy** tab
2. Enter your niche, audience, and product
3. Click **Generate Complete Strategy**
4. Get brand identity, content pillars, schedule, roadmap, and funnel

### Export to HyperFrames
```bash
# Generate composition from script
node openmontage-bridge.js create '{"hook":"Your hook","body":["Point 1"],"cta":"Follow!"}' '{"brandName":"MyBrand"}'
```

This creates a HyperFrames HTML composition ready for rendering.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-script` | POST | Generate video script from topic |
| `/api/generate-strategy` | POST | Generate full channel strategy |
| `/api/generate-ideas` | POST | Generate viral video ideas |

### Example: Generate Script
```bash
curl -X POST http://localhost:5173/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{"topic":"5 tax mistakes freelancers make","style":"faceless","length":"short"}'
```

## Technology Stack

- **Frontend**: React + Vite + TailwindCSS
- **Icons**: lucide-react
- **AI Scripts**: OpenAI GPT-4o-mini
- **AI Visuals**: FLUX via fal.ai
- **AI Motion**: Wan 2.1 via fal.ai
- **TTS**: Kokoro via fal.ai
- **Video**: HyperFrames HTML compositions
- **Integration**: OpenMontage bridge

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for script generation | Yes |
| `FAL_AI_API_KEY` | fal.ai key for visuals/motion/TTS | No |
| `ELEVENLABS_API_KEY` | Premium voice cloning | No |
| `SUPABASE_URL` | Database URL | No |
| `SUPABASE_ANON_KEY` | Database key | No |

## Roadmap

- [ ] Social media OAuth & auto-posting
- [ ] Supabase database integration
- [ ] User authentication
- [ ] Real-time analytics sync
- [ ] A/B testing for hooks
- [ ] Batch video generation
- [ ] Team collaboration
- [ ] White-label exports

## License

MIT

---

Built with ❤️ for content creators scaling to multiple platforms.