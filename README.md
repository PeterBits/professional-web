# Rodando Libre — Editorial Web

Campervan rental website for **Rodando Libre** (Rolling Free in English), based in Toro, Zamora (Spain). The editorial / professional variant: serif display type, tight typographic hierarchy, a calm surface palette and a dedicated on-home gallery section.

Built with Astro 6 and deployed on Netlify.

## Tech Stack

- Astro 6 with server-side rendering (`output: 'server'`)
- `@astrojs/netlify` adapter
- Vanilla CSS with custom properties (no Tailwind)
- Google Fonts (serif display + sans body)
- i18n: Spanish (default) and English — EN version uses the localized brand "Rolling Free"
- Google Calendar integration via public API key
- TypeScript with `astro check` available

## Project Structure

```text
public/
  assets/                  # Real van photos served as static files
src/
  i18n/
    es.json                # Spanish translations ("Rodando Libre")
    en.json                # English translations ("Rolling Free")
    utils.ts               # Lang, useTranslations and route-path helpers
  env.d.ts                 # Astro / ImportMetaEnv type declarations
  layouts/
    BaseLayout.astro       # Base HTML layout, header/footer slots
  components/
    Header.astro           # Top nav + language switcher
    Footer.astro           # Brand, WhatsApp and Instagram links
    Hero.astro             # Full-bleed hero with van photo and CTA
    VanInfo.astro          # Specs + equipment + interior photo
    Gallery.astro          # 4-photo gallery (between VanInfo and Pricing)
    Pricing.astro          # Seasonal price cards (data from van-data.json)
    BookingCalendar.astro  # Interactive calendar fetching /api/availability
    ContactBlock.astro     # 3-step booking explainer + WhatsApp/Instagram CTAs
  data/
    van-data.json          # Shared specs, equipment and pricing data
  styles/
    global.css             # Tokens, reset, typography, utilities
  pages/
    index.astro            # Redirects to /es/
    es/
      index.astro          # Spanish home
      reservas.astro       # Spanish bookings
    en/
      index.astro          # English home
      bookings.astro       # English bookings
    api/
      availability.ts      # Returns availability from Google Calendar
```

## Design System

Editorial / professional theme:

| Token                     | Value              |
| :------------------------ | :----------------- |
| `--surface`               | Soft off-white     |
| `--surface-container`     | Neutral container  |
| `--on-surface`            | Deep text          |
| `--on-surface-variant`    | Muted text         |
| `--primary`               | Brand CTA          |
| `--tertiary`              | Eyebrow / labels   |
| `--outline`               | Borders            |

Typography pairs a serif family for display/italic accents with a sans-serif for body copy. Fluid sizing via `clamp()`. Mobile-first responsive layout with layout breakpoints at 768px and 1024px.

## Routes

| Path                | Description              |
| :------------------ | :----------------------- |
| `/`                 | Redirects to `/es/`      |
| `/es/`              | Spanish home             |
| `/es/reservas`      | Spanish bookings         |
| `/en/`              | English home             |
| `/en/bookings`      | English bookings         |
| `/api/availability` | JSON availability data   |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Declared types live in `src/env.d.ts`.

| Variable                 | Purpose                                                 |
| :----------------------- | :------------------------------------------------------ |
| `GOOGLE_CALENDAR_ID`     | Calendar ID (usually `xxxx@group.calendar.google.com`)  |
| `GOOGLE_API_KEY`         | Google Calendar API key with Calendar read access       |
| `PUBLIC_WHATSAPP_NUMBER` | WhatsApp number in international format, no "+" or spaces (e.g. `34722185903`) |

Without the Google variables, the booking calendar renders an error state. The rest of the site works normally and funnels users to WhatsApp.

## Commands

| Command           | Action                                    |
| :---------------- | :---------------------------------------- |
| `npm install`     | Install dependencies                      |
| `npm run dev`     | Start local dev server at localhost:4321  |
| `npm run build`   | Build for production                      |
| `npm run preview` | Preview the production build locally      |
| `npm run check`   | Run `astro check` for TypeScript errors   |

## Deployment

Configured for Netlify via `@astrojs/netlify`. Push the repository, connect it to Netlify and set the environment variables above in the project settings. Requires Node 22.12+ (declared in `package.json` `engines`).
