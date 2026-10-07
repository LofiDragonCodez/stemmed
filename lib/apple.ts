export type SearchTrack = {
  id: string;
  song: string;
  artist: string;
  coverArt: string | null;
};

export type TrackDetails = {
  song: string | null;
  artist: string | null;
  producer: string | null;
  bpm: number | null;
  key: string | null;
  duration: string | null;
  coverArt: string | null;
};

export type AppleTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  trackTimeMillis?: number;
  artworkUrl100?: string;
};

type AppleResponse = {
  resultCount: number;
  results: AppleTrack[];
};

const API_BASE = "https://itunes.apple.com";
const trackInflight = new Map<string, Promise<AppleTrack>>();

async function appleFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Apple Search API request failed with status ${response.status}.`);
  }
  return (await response.json()) as T;
}

function toSearchTrack(track: AppleTrack): SearchTrack {
  return {
    id: String(track.trackId),
    song: track.trackName,
    artist: track.artistName,
    coverArt: track.artworkUrl100?.replace("100x100", "600x600") ?? null,
  };
}

export async function searchTracks(query: string): Promise<SearchTrack[]> {
  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    limit: "5",
  });
  const result = await appleFetch<AppleResponse>(`/search?${params}`);
  return result.results
    .filter((track) => Number.isSafeInteger(track.trackId))
    .map(toSearchTrack);
}

export function getAppleTrack(id: string): Promise<AppleTrack> {
  const pending = trackInflight.get(id);
  if (pending) return pending;

  const request = appleFetch<AppleResponse>(
    `/lookup?${new URLSearchParams({ id, entity: "song" })}`,
  ).then((result) => {
    const track = result.results.find(
      (item) => String(item.trackId) === id && typeof item.trackName === "string",
    );
    if (!track) throw new Error("Apple did not return the requested song.");
    return track;
  });

  trackInflight.set(id, request);
  void request.finally(() => trackInflight.delete(id)).catch(() => undefined);
  return request;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
