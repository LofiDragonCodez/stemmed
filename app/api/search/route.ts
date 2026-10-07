import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/apple";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.replace(/[\u0000-\u001f\u007f]/g, "").trim();

  if (!query) {
    return NextResponse.json(
      { error: "Enter a song title or artist to search." },
      { status: 400 },
    );
  }

  if (query.length > 100) {
    return NextResponse.json(
      { error: "Search queries must be 100 characters or fewer." },
      { status: 400 },
    );
  }

  try {
    const tracks = await searchTracks(query);
    return NextResponse.json(tracks, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Apple song search failed:", error);
    return NextResponse.json(
      { error: "Song search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
