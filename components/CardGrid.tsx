import ResultCard, { type CardItem } from "@/components/ResultCard";
import type { TrackDetails } from "@/lib/apple";

type CardGridProps = {
  track: TrackDetails | null;
  loading: boolean;
};

export default function CardGrid({ track, loading }: CardGridProps) {
  const cards: CardItem[] = [
    { label: "Song", value: track?.song ?? null, fontClass: "font-song" },
    {
      label: "Duration",
      value: track?.duration ?? null,
      fontClass: "font-duration",
    },
    { label: "Key", value: track?.key ?? null, fontClass: "font-key" },
    { label: "BPM", value: track?.bpm ?? null, fontClass: "font-bpm" },
    {
      label: "Producer",
      value: track?.producer ?? null,
      fontClass: "font-producer",
    },
    { label: "Artist", value: track?.artist ?? null, fontClass: "font-artist" },
  ];

  return (
    <section className="card-grid" aria-label="Song details">
      {cards.map((item, index) => (
        <ResultCard
          key={item.label}
          item={{
            ...item,
            value: track && item.value === null ? "N/A" : item.value,
          }}
          index={index}
          loading={loading}
        />
      ))}
    </section>
  );
}
