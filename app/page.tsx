"use client";

import { useState } from "react";
import Image from "next/image";
import CardGrid from "@/components/CardGrid";
import HalftoneDecorations from "@/components/HalftoneDecorations";
import SearchBar from "@/components/SearchBar";
import type { TrackDetails } from "@/lib/apple";

export default function HomePage() {
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadTrack(id: string) {
    setLoading(true);
    setError(false);
    setTrack(null);
    setSelectedId(id);

    try {
      const response = await fetch(`/api/track/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`Track request failed with status ${response.status}`);
      }
      const result = (await response.json()) as TrackDetails;
      setTrack(result);
    } catch (requestError) {
      console.error("Unable to load track details:", requestError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <HalftoneDecorations />
      <div className="content">
        <header className="brand">
          <Image
            alt="STEMMED"
            className="wordmark"
            src="/wordmark.svg"
            height={132}
            width={330}
            priority
          />
        </header>

        <SearchBar
          onSelect={loadTrack}
          onRetry={selectedId ? () => loadTrack(selectedId) : undefined}
          requestError={error}
          selectedId={selectedId}
          setLoading={setLoading}
        />

        <CardGrid loading={loading} track={track} />
        <footer className="site-footer">
          <span>Need more song stats?</span>{" "}
          <a
            href="https://getsongbpm.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit GetSongBPM
          </a>
        </footer>
      </div>
    </main>
  );
}
