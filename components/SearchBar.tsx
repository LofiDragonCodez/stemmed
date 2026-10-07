"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { SearchTrack } from "@/lib/apple";

type SearchBarProps = {
  onSelect: (id: string) => void;
  onRetry?: () => void;
  requestError: boolean;
  selectedId: string | null;
  setLoading: (loading: boolean) => void;
};

export default function SearchBar({
  onSelect,
  onRetry,
  requestError,
  selectedId,
  setLoading,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchTrack[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextSearch = useRef(false);
  const listId = "song-search-results";

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2 || cleanQuery.length > 100) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const response = await fetch(
          `/api/search?${new URLSearchParams({ q: cleanQuery })}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Song search failed with status ${response.status}`);
        }
        const results = (await response.json()) as SearchTrack[];
        setMatches(results);
        setSubmittedQuery(cleanQuery);
        setActiveIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Unable to search songs:", error);
        setSearchError(true);
        setMatches([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function selectTrack(track: SearchTrack) {
    skipNextSearch.current = true;
    setQuery(`${track.song} — ${track.artist}`);
    setMatches([]);
    setSubmittedQuery("");
    setActiveIndex(-1);
    setLoading(true);
    onSelect(track.id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? matches.length - 1 : current - 1,
      );
    } else if (event.key === "Escape") {
      setMatches([]);
      setActiveIndex(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const match = matches[activeIndex] ?? matches[0];
      if (match) {
        selectTrack(match);
      } else if (query.trim().length >= 2) {
        setSearching(true);
        setSearchError(false);
        setLoading(true);
        void searchAndSelect(query.trim());
      }
    }
  }

  async function searchAndSelect(term: string) {
    try {
      const response = await fetch(
        `/api/search?${new URLSearchParams({ q: term })}`,
      );
      if (!response.ok) throw new Error(`Song search failed with status ${response.status}`);
      const results = (await response.json()) as SearchTrack[];
      setMatches(results);
      setSubmittedQuery(term);
      if (results[0]) {
        selectTrack(results[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Unable to search songs:", error);
      setSearchError(true);
      setLoading(false);
    } finally {
      setSearching(false);
    }
  }

  async function retrySearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(false);
    try {
      const response = await fetch(
        `/api/search?${new URLSearchParams({ q: query.trim() })}`,
      );
      if (!response.ok) throw new Error(`Song search failed with status ${response.status}`);
      setMatches((await response.json()) as SearchTrack[]);
    } catch (error) {
      console.error("Unable to retry song search:", error);
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  }

  const showDropdown =
    focused && (matches.length > 0 || searching || searchError);
  const noResults =
    submittedQuery.length > 0 &&
    submittedQuery === query.trim() &&
    matches.length === 0 &&
    !searching &&
    !searchError;

  return (
    <div className="search-area">
      <div className="search-wrap">
        <div className="search-box">
          <button
            type="button"
            className="search-icon"
            aria-label="Search songs"
            onClick={() => inputRef.current?.focus()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="7.2" />
              <path d="m16.2 16.2 5 5" />
            </svg>
          </button>
          {!query && (
            <span className="search-placeholder" aria-hidden="true">
              search up a song, <em>get all you need.</em>
            </span>
          )}
          <input
            ref={inputRef}
            aria-label="Search for a song or artist"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            aria-activedescendant={
              activeIndex >= 0 ? `song-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            maxLength={100}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onChange={(event) => {
              skipNextSearch.current = false;
              const nextQuery = event.target.value.slice(0, 100);
              setQuery(nextQuery);
              if (nextQuery.trim().length < 2) {
                setMatches([]);
                setSearching(false);
                setSubmittedQuery("");
              }
              setSelectedIdForSearch();
            }}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="search up a song, get all you need."
            role="combobox"
            type="search"
            value={query}
          />
        </div>

        {showDropdown && (
          <ul className="search-dropdown" id={listId} role="listbox">
            {searching && (
              <li className="dropdown-status" role="status">
                looking it up…
              </li>
            )}
            {searchError && (
              <li className="dropdown-status" role="status">
                Search couldn&apos;t load.{" "}
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={retrySearch}>
                  Try again
                </button>
              </li>
            )}
            {matches.map((track, index) => (
              <li
                className={`search-option ${index === activeIndex ? "is-active" : ""}`}
                id={`song-option-${index}`}
                key={track.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectTrack(track)}
                role="option"
                aria-selected={index === activeIndex}
              >
                {track.coverArt ? (
                  <Image
                    alt=""
                    className="option-cover"
                    src={track.coverArt}
                    width={42}
                    height={42}
                    unoptimized
                  />
                ) : (
                  <span className="option-cover option-cover-empty" aria-hidden="true" />
                )}
                <span className="option-copy">
                  <span className="option-title">{track.song}</span>
                  <span className="option-artist">{track.artist}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {noResults && <p className="search-message">no songs found — try another search.</p>}
      {searchError && !showDropdown && (
        <p className="search-message">
          Search couldn&apos;t load.{" "}
          <button type="button" onClick={retrySearch}>
            Try again
          </button>
        </p>
      )}
      {requestError && (
        <p className="search-message error-message" role="alert">
          Those details couldn&apos;t load.{" "}
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </p>
      )}
      {selectedId && !requestError && !searching && !matches.length && (
        <span className="sr-only" aria-live="polite">
          Track details loaded.
        </span>
      )}
    </div>
  );

  function setSelectedIdForSearch() {
    if (selectedId) setLoading(false);
  }
}
