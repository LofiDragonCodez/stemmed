import { LruCache } from "@/lib/cache";

type GetSongBpmSong = {
  id?: string;
  song_id?: string;
  title?: string;
  song_title?: string;
  tempo?: string | number | null;
  key_of?: string | null;
  artist?: string | { name?: string };
};

type GetSongBpmSearchResponse = {
  search?: GetSongBpmSong[];
};

export type SongAudioFeatures = {
  bpm: number | null;
  key: string | null;
};

const API_BASE = "https://api.getsong.co";
const featureCache = new LruCache<string, SongAudioFeatures>(500, 60 * 60 * 1000);

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function formatKey(value: string | null | undefined): string | null {
  const match = value?.trim().match(/^([A-Ga-g])([#b]?)(m|min|minor)?$/i);
  if (!match) return null;

  const pitch = `${match[1].toUpperCase()}${match[2] ?? ""}`;
  const enharmonic: Record<string, string> = {
    Db: "C#/Db",
    "D#": "D#/Eb",
    Eb: "D#/Eb",
    "E#": "F",
    Fb: "E",
    Gb: "F#/Gb",
    "F#": "F#/Gb",
    Ab: "G#/Ab",
    "G#": "G#/Ab",
    Bb: "A#/Bb",
    "A#": "A#/Bb",
    Cb: "B",
    "B#": "C",
  };
  const note = enharmonic[pitch] ?? pitch;
  const minor = Boolean(match[3]);
  return `${note} ${minor ? "minor" : "major"}`;
}

function readBpm(value: string | number | null | undefined): number | null {
  const bpm = typeof value === "number" ? value : Number(value);
  return Number.isFinite(bpm) && bpm > 0 ? Math.round(bpm) : null;
}

function artistName(song: GetSongBpmSong): string {
  return typeof song.artist === "string" ? song.artist : song.artist?.name ?? "";
}

function title(song: GetSongBpmSong): string {
  return song.title ?? song.song_title ?? "";
}

export async function getGetSongBpmFeatures(
  songTitle: string,
  artist: string,
): Promise<SongAudioFeatures> {
  const empty = { bpm: null, key: null };
  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) return empty;

  const cacheKey = `${normalize(songTitle)}|${normalize(artist)}`;
  const cached = featureCache.get(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      type: "both",
      limit: "10",
      lookup: `song:${songTitle} artist:${artist}`,
    });
    const response = await fetch(`${API_BASE}/search/?${params}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`GetSongBPM search failed with status ${response.status}.`);
    }

    const data = (await response.json()) as GetSongBpmSearchResponse;
    const wantedTitle = normalize(songTitle);
    const wantedArtist = normalize(artist);
    const exactMatch = data.search?.find(
      (result) =>
        normalize(title(result)) === wantedTitle &&
        normalize(artistName(result)) === wantedArtist,
    );
    if (!exactMatch) return empty;

    const features = {
      bpm: readBpm(exactMatch.tempo),
      key: formatKey(exactMatch.key_of),
    };
    if (features.bpm !== null || features.key !== null) {
      featureCache.set(cacheKey, features);
    }
    return features;
  } catch (error) {
    console.error("GetSongBPM audio-features lookup failed:", error);
    return empty;
  }
}
