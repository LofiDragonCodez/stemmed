const PITCH_CLASSES = [
  "C",
  "C#/Db",
  "D",
  "D#/Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "G#/Ab",
  "A",
  "A#/Bb",
  "B",
] as const;

export function formatMusicalKey(
  key: number | null | undefined,
  mode: number | null | undefined,
): string | null {
  if (
    key == null ||
    !Number.isInteger(key) ||
    key < 0 ||
    key >= PITCH_CLASSES.length ||
    (mode !== 0 && mode !== 1)
  ) {
    return null;
  }

  // ReccoBeats follows Spotify's pitch-class numbering; mode 1 is major and 0 is minor.
  return `${PITCH_CLASSES[key]} ${mode === 1 ? "major" : "minor"}`;
}
