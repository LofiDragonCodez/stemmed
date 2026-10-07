import { LruCache } from "@/lib/cache";
import { formatMusicalKey } from "@/lib/keyMap";

type ReccoFeaturesResponse = {
  tempo?: number | null;
  key?: number | null;
  mode?: number | null;
};

type ReccoTrack = {
  id?: string;
  uuid?: string;
  spotifyId?: string;
  spotify_id?: string;
};

export type AudioFeatures = {
  bpm: number | null;
  key: string | null;
};

const API_BASE = "https://api.reccobeats.com/v1";
const featureCache = new LruCache<string, AudioFeatures>(500, 60 * 60 * 1000);

async function fetchWithRetry(url: string): Promise<Response> {
  let response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (response.status === 429 || response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
  }
  return response;
}

function readFeatures(value: unknown): AudioFeatures | null {
  if (!value || typeof value !== "object") return null;
  const features = value as ReccoFeaturesResponse;
  return {
    bpm:
      typeof features.tempo === "number" &&
      Number.isFinite(features.tempo) &&
      features.tempo > 0
        ? Math.round(features.tempo)
        : null,
    key: formatMusicalKey(features.key, features.mode),
  };
}

async function directLookup(spotifyId: string): Promise<AudioFeatures | null> {
  const response = await fetchWithRetry(
    `${API_BASE}/track/${encodeURIComponent(spotifyId)}/audio-features`,
  );
  if (!response.ok) return null;
  return readFeatures(await response.json());
}

function candidatesFromLookup(value: unknown): ReccoTrack[] {
  if (Array.isArray(value)) return value as ReccoTrack[];
  if (!value || typeof value !== "object") return [];
  const record = value as {
    content?: unknown;
    items?: unknown;
    tracks?: unknown;
    id?: unknown;
    uuid?: unknown;
  };
  if (Array.isArray(record.content)) return record.content as ReccoTrack[];
  if (Array.isArray(record.items)) return record.items as ReccoTrack[];
  if (Array.isArray(record.tracks)) return record.tracks as ReccoTrack[];
  return typeof record.id === "string" || typeof record.uuid === "string"
    ? [record as ReccoTrack]
    : [];
}

async function resolveReccoId(spotifyId: string): Promise<string | null> {
  const response = await fetchWithRetry(
    `${API_BASE}/track?${new URLSearchParams({ ids: spotifyId })}`,
  );
  if (!response.ok) return null;

  const tracks = candidatesFromLookup(await response.json());
  const matched =
    tracks.find(
      (track) =>
        track.spotifyId === spotifyId || track.spotify_id === spotifyId,
    ) ?? tracks[0];
  return matched?.uuid ?? matched?.id ?? null;
}

export async function getAudioFeatures(
  spotifyId: string | null,
): Promise<AudioFeatures> {
  if (!spotifyId) return { bpm: null, key: null };

  const cached = featureCache.get(spotifyId);
  if (cached) return cached;

  try {
    const direct = await directLookup(spotifyId);
    if (direct) {
      featureCache.set(spotifyId, direct);
      return direct;
    }

    // Some ReccoBeats endpoints accept Spotify IDs while the feature endpoint only accepts its UUID.
    const reccoId = await resolveReccoId(spotifyId);
    if (!reccoId) return { bpm: null, key: null };
    const response = await fetchWithRetry(
      `${API_BASE}/track/${encodeURIComponent(reccoId)}/audio-features`,
    );
    if (!response.ok) return { bpm: null, key: null };

    const features = readFeatures(await response.json());
    if (!features || (features.bpm === null && features.key === null)) {
      return { bpm: null, key: null };
    }
    featureCache.set(spotifyId, features);
    return features;
  } catch (error) {
    console.error("ReccoBeats audio-features lookup failed:", error);
    return { bpm: null, key: null };
  }
}
