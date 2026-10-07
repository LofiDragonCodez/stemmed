import { NextResponse } from "next/server";
import { trackCache } from "@/lib/cache";
import { getGetSongBpmFeatures } from "@/lib/getsongbpm";
import { getProducerLookup } from "@/lib/producer";
import { getAudioFeatures } from "@/lib/reccobeats";
import { formatDuration, getAppleTrack } from "@/lib/apple";
import type { AppleTrack, TrackDetails } from "@/lib/apple";
import type { ProducerLookup } from "@/lib/producer";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d{1,20}$/.test(id)) {
    return NextResponse.json({ error: "Invalid Apple track ID." }, { status: 400 });
  }

  const cached = trackCache.get(id);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  }

  let appleTrack: AppleTrack;
  try {
    appleTrack = await getAppleTrack(id);
  } catch (error) {
    console.error("Apple track lookup failed:", error);
    return NextResponse.json(
      { error: "Track details are temporarily unavailable." },
      { status: 502 },
    );
  }

  const [producerResult, getSongBpmResult] = await Promise.allSettled([
    getProducerLookup(appleTrack.trackName, appleTrack.artistName),
    getGetSongBpmFeatures(appleTrack.trackName, appleTrack.artistName),
  ]);

  const producerData: ProducerLookup | null =
    producerResult.status === "fulfilled" ? producerResult.value : null;
  if (producerResult.status === "rejected") {
    console.error("Producer lookup failed:", producerResult.reason);
  }

  // ReccoBeats indexes audio features by Spotify ID. MusicBrainz sometimes links
  // an Apple-catalog recording to Spotify; use it as a fallback to GetSongBPM.
  const getSongBpmFeatures =
    getSongBpmResult.status === "fulfilled"
      ? getSongBpmResult.value
      : { bpm: null, key: null };
  if (getSongBpmResult.status === "rejected") {
    console.error("GetSongBPM lookup failed:", getSongBpmResult.reason);
  }

  const features =
    getSongBpmFeatures.bpm !== null && getSongBpmFeatures.key !== null
      ? getSongBpmFeatures
      : await getAudioFeatures(producerData?.spotifyId ?? null);

  const response: TrackDetails = {
    song: appleTrack.trackName ?? null,
    artist: appleTrack.artistName ?? null,
    producer: producerData?.producer ?? null,
    bpm: getSongBpmFeatures.bpm ?? features.bpm,
    key: getSongBpmFeatures.key ?? features.key,
    duration:
      appleTrack.trackTimeMillis == null
        ? null
        : formatDuration(appleTrack.trackTimeMillis),
    coverArt:
      appleTrack.artworkUrl100?.replace("100x100", "600x600") ?? null,
  };

  trackCache.set(id, response);
  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
  });
}
