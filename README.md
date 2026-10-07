# STEMMED

STEMMED is a monochrome, responsive song lookup app. Search Apple's free iTunes Search API to see the song, artist, producer, BPM, musical key, duration, and album art.

## Requirements

- Node.js 20.9 or newer

## Run locally

1. Install dependencies with `npm install`.
2. (Optional) Copy `.env.example` to `.env.local` and add `GENIUS_ACCESS_TOKEN` if you want the Genius producer-credit fallback.
3. Start the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

The app also provides `npm run lint`, `npm run typecheck`, and `npm run build`.

## Data sources and optional credentials

### Apple Search API

Song search, title, artist, duration, and album artwork come from Apple's public [iTunes Search API](https://performance-partners.apple.com/search-api). It requires no API key or account.

### Producer credits

MusicBrainz is queried first and needs no API key. To enable the optional Genius fallback, create an API client on the [Genius API clients page](https://genius.com/api-clients), then set `GENIUS_ACCESS_TOKEN` in `.env.local`.

MusicBrainz requests use the `STEMMED/1.0 (mailto:contact@stemmed.app)` User-Agent and are spaced by at least 1.1 seconds within a server instance.

### BPM and key

STEMMED first looks up BPM and key by title and artist through GetSongBPM. Add `GETSONGBPM_API_KEY` to `.env.local` and to your hosting provider's environment settings. GetSongBPM requires a public backlink to `https://getsongbpm.com/`; keep the homepage footer link in place. ReccoBeats is used as a fallback when MusicBrainz can link the Apple-catalog recording to a Spotify ID. STEMMED does not require Spotify credentials or call Spotify directly. If neither source has the track, the fields show `N/A`.

## Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Add `GETSONGBPM_API_KEY` to the project environment variables for BPM/key lookups. Optionally add `GENIUS_ACCESS_TOKEN` to enable the Genius producer-credit fallback.
3. Deploy. Vercel detects the Next.js app and runs the production build.

## Deploy to Render

1. Create a **Web Service** from this repository in [Render](https://render.com/).
2. Set the build command to `npm install && npm run build` and the start command to `npm start`.
3. Add `GETSONGBPM_API_KEY` in the service's environment settings. Optionally add `GENIUS_ACCESS_TOKEN` for the Genius producer-credit fallback.
4. Deploy the service. Keep the GetSongBPM backlink on the public homepage; its API requires that backlink to be publicly accessible.

The app keeps track-response and ReccoBeats caches in process memory. Vercel serverless instances do not share memory, so caches are best-effort and can be cold on a new instance. For shared, durable response caching, replace the in-memory LRU with Vercel KV or Upstash Redis.

## Data notes

BPM and key are estimates supplied by ReccoBeats; they may be unavailable when MusicBrainz cannot link a recording to Spotify, and some songs—especially indie and underground releases—may be missing. Producer credits may also be missing: STEMMED checks MusicBrainz first and falls back to Genius when configured. Missing data appears as `N/A`.

The replaceable wordmark lives at `public/wordmark.svg`; replace that asset to use a custom logo.
