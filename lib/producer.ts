type MusicBrainzRecording = {
  id: string;
  title: string;
  "artist-credit"?: Array<{ name?: string; artist?: { name?: string } }>;
  relations?: MusicBrainzRelationship[];
};

type MusicBrainzSearchResponse = { recordings?: MusicBrainzRecording[] };
type MusicBrainzRelationship = {
  type?: string;
  artist?: { name?: string };
  url?: { resource?: string };
};
type MusicBrainzRecordingDetails = {
  relations?: MusicBrainzRelationship[];
};
type GeniusSearchResponse = {
  response?: {
    hits?: Array<{
      result?: {
        id?: number;
        title?: string;
        primary_artist?: { name?: string };
      };
    }>;
  };
};
type GeniusSongResponse = {
  response?: {
    song?: {
      producer_artists?: Array<{ name?: string }>;
    };
  };
};

export type ProducerLookup = {
  producer: string | null;
  spotifyId: string | null;
};

const MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
const MUSICBRAINZ_AGENT = "STEMMED/1.0 (mailto:contact@stemmed.app)";
let musicBrainzQueue: Promise<void> = Promise.resolve();
let lastMusicBrainzRequestAt = 0;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function musicBrainzFetch(url: string): Promise<Response> {
  const request = musicBrainzQueue.then(async () => {
    const delay = Math.max(0, 1100 - (Date.now() - lastMusicBrainzRequestAt));
    if (delay) await wait(delay);
    lastMusicBrainzRequestAt = Date.now();
    return fetch(url, {
      headers: { "User-Agent": MUSICBRAINZ_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  });
  musicBrainzQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return request;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function extractArtist(recording: MusicBrainzRecording): string {
  return (
    recording["artist-credit"]
      ?.map((credit) => credit.name ?? credit.artist?.name ?? "")
      .filter(Boolean)
      .join(", ") ?? ""
  );
}

function spotifyTrackId(relations: MusicBrainzRelationship[]): string | null {
  for (const relation of relations) {
    const resource = relation.url?.resource;
    if (!resource) continue;
    try {
      const url = new URL(resource);
      if (url.hostname !== "open.spotify.com" && url.hostname !== "spotify.com") {
        continue;
      }
      const parts = url.pathname.split("/").filter(Boolean);
      const trackIndex = parts.indexOf("track");
      const id = trackIndex >= 0 ? parts[trackIndex + 1] : null;
      if (id && /^[A-Za-z0-9]{22}$/.test(id)) return id;
    } catch {
      continue;
    }
  }
  return null;
}

async function findMusicBrainzData(
  title: string,
  artist: string,
): Promise<ProducerLookup> {
  const query = `recording:"${title}" AND artist:"${artist}"`;
  const searchUrl = `${MUSICBRAINZ_BASE}/recording/?${new URLSearchParams({
    query,
    fmt: "json",
    limit: "5",
  })}`;
  const searchResponse = await musicBrainzFetch(searchUrl);
  if (!searchResponse.ok) {
    throw new Error(`MusicBrainz search failed with status ${searchResponse.status}.`);
  }
  const search = (await searchResponse.json()) as MusicBrainzSearchResponse;
  const recordings = search.recordings ?? [];
  const wantedTitle = normalize(title);
  const wantedArtist = normalize(artist);
  const match =
    recordings.find(
      (recording) =>
        normalize(recording.title) === wantedTitle &&
        (normalize(extractArtist(recording)) === wantedArtist ||
          normalize(extractArtist(recording)).includes(wantedArtist)),
    ) ?? recordings[0];
  if (!match) return { producer: null, spotifyId: null };

  const detailUrl = `${MUSICBRAINZ_BASE}/recording/${encodeURIComponent(match.id)}?${new URLSearchParams(
    { inc: "artist-credits+artist-rels+url-rels", fmt: "json" },
  )}`;
  const detailsResponse = await musicBrainzFetch(detailUrl);
  if (!detailsResponse.ok) {
    throw new Error(`MusicBrainz recording lookup failed with status ${detailsResponse.status}.`);
  }
  const details = (await detailsResponse.json()) as MusicBrainzRecordingDetails;
  const relations = details.relations ?? [];
  const producers = relations
    .filter((relation) => relation.type?.toLowerCase() === "producer")
    .map((relation) => relation.artist?.name)
    .filter((name): name is string => Boolean(name));
  return {
    producer: [...new Set(producers)].join(", ") || null,
    spotifyId: spotifyTrackId(relations),
  };
}

async function findGeniusProducers(
  title: string,
  artist: string,
): Promise<string | null> {
  const accessToken = process.env.GENIUS_ACCESS_TOKEN;
  if (!accessToken) return null;

  const searchResponse = await fetch(
    `https://api.genius.com/search?${new URLSearchParams({
      q: `${title} ${artist}`,
    })}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!searchResponse.ok) {
    throw new Error(`Genius search failed with status ${searchResponse.status}.`);
  }
  const search = (await searchResponse.json()) as GeniusSearchResponse;
  const wantedTitle = normalize(title);
  const wantedArtist = normalize(artist);
  const hits = search.response?.hits ?? [];
  const match =
    hits.find(
      ({ result }) =>
        normalize(result?.title ?? "") === wantedTitle &&
        normalize(result?.primary_artist?.name ?? "") === wantedArtist,
    ) ?? hits[0];
  const songId = match?.result?.id;
  if (!songId) return null;

  const songResponse = await fetch(
    `https://api.genius.com/songs/${songId}?${new URLSearchParams({
      text_format: "plain",
    })}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!songResponse.ok) {
    throw new Error(`Genius song lookup failed with status ${songResponse.status}.`);
  }
  const song = (await songResponse.json()) as GeniusSongResponse;
  const producers = song.response?.song?.producer_artists
    ?.map((producer) => producer.name)
    .filter((name): name is string => Boolean(name));
  return producers?.length ? [...new Set(producers)].join(", ") : null;
}

export async function getProducerLookup(
  title: string,
  artist: string,
): Promise<ProducerLookup> {
  let musicBrainz: ProducerLookup = { producer: null, spotifyId: null };
  try {
    musicBrainz = await findMusicBrainzData(title, artist);
    if (musicBrainz.producer) return musicBrainz;
  } catch (error) {
    console.error("MusicBrainz producer lookup failed; trying Genius:", error);
  }

  try {
    return {
      producer: await findGeniusProducers(title, artist),
      spotifyId: musicBrainz.spotifyId,
    };
  } catch (error) {
    console.error("Genius producer lookup failed:", error);
    return musicBrainz;
  }
}
