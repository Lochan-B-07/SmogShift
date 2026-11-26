'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ActiveLocation } from '@/hooks/useAirQuality';
import type { ThemeMode } from '@/hooks/useTheme';
import { formatMinutesAgo } from '@/lib/formatters';
import { CITY_PRESETS } from '@/lib/presets';
import {
  GeocodeResponseSchema,
  type AirQualityResponse,
  type GeocodeResult,
} from '@/shared/schemas';

export interface HeaderProps {
  readonly location: ActiveLocation;
  readonly airQuality: AirQualityResponse | null;
  readonly loading: boolean;
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
  readonly onSelectLocation: (loc: ActiveLocation) => void;
  readonly onOpenProfile: () => void;
  readonly onOpenCadr: () => void;
  readonly onOpenRoomCheck: () => void;
  readonly onOpenBrief: () => void;
  readonly onCopyShareUrl: () => void;
  readonly shareCopied: boolean;
}

export function Header({
  location,
  airQuality,
  loading,
  theme,
  onToggleTheme,
  onSelectLocation,
  onOpenProfile,
  onOpenCadr,
  onOpenRoomCheck,
  onOpenBrief,
  onCopyShareUrl,
  shareCopied,
}: HeaderProps): ReactElement {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<readonly GeocodeResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      async function runSearch(): Promise<void> {
        setSearching(true);
        setSearchMessage(null);
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
            signal: controller.signal,
          });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const json: unknown = await res.json();
          const parsed = GeocodeResponseSchema.parse(json);
          setResults(parsed.results);
          setDropdownOpen(true);
          if (parsed.results.length === 0) {
            setSearchMessage('City not found in India. Try one of the preset cities above.');
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setResults([]);
          setDropdownOpen(true);
          setSearchMessage('Search unavailable right now. Preset cities remain active.');
        } finally {
          setSearching(false);
        }
      }

      void runSearch();
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query]);

  function handleGeolocate(): void {
    setGeoMessage(null);
    setDropdownOpen(false);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage('Geolocation is not supported in this browser. Use city chips or search.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(2));
        const lon = Number(pos.coords.longitude.toFixed(2));
        setGeoMessage(null);
        onSelectLocation({
          key: 'geo',
          name: `Your location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          lat,
          lon,
        });
      },
      () => {
        setGeoMessage('Location permission denied. Preset cities and search remain active.');
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  }

  function handleSelectSearchResult(item: GeocodeResult): void {
    setDropdownOpen(false);
    setQuery('');
    setSearchMessage(null);
    setGeoMessage(null);
    onSelectLocation({
      key:
        item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 32) || 'custom',
      name: item.admin1 ? `${item.name}, ${item.admin1}` : item.name,
      lat: item.lat,
      lon: item.lon,
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/90 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
      <div className="mx-auto flex max-w-4xl flex-col gap-2.5 px-4 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs dark:bg-teal-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 15h11a3 3 0 1 0-3-3M3 10h7a2.5 2.5 0 1 0-2.5-2.5M4 19h14a2.5 2.5 0 1 1-2.5 2.5"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                SmogShift
              </h1>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                Exposure Budget ·{' '}
                <span className="font-semibold text-teal-900 dark:text-teal-300">
                  {location.name}
                </span>
                {loading && airQuality ? (
                  <span className="ml-2 text-teal-800 dark:text-teal-300" role="status">
                    Updating...
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {airQuality ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${airQuality.source.isFallback
                  ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-teal-200 bg-teal-50/70 text-teal-950 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
                  }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${airQuality.source.isFallback ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                />
                {airQuality.source.isFallback
                  ? `Offline snapshot from ${airQuality.source.snapshotDate ?? 'recent capture'}. Not live data.`
                  : `Modeled forecast · Open-Meteo · Updated ${formatMinutesAgo(airQuality.source.fetchedAt)}`}
              </span>
            ) : null}

            {/* Share URL button */}
            <button
              type="button"
              onClick={onCopyShareUrl}
              aria-label={shareCopied ? 'Share link copied' : 'Copy share link for current settings'}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {shareCopied ? (
                <>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-emerald-600">
                    <path d="M13.5 2.5 6 10.5 2.5 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-current">
                    <path d="M11 2a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-1.73-1H5.73A2 2 0 0 1 4 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 1.73 1h3.54A2 2 0 0 1 11 2Zm0 8a2 2 0 0 1 1.73 1h.27a1 1 0 0 1 0 2h-.27A2 2 0 0 1 11 14a2 2 0 0 1-2-2 2 2 0 0 1 .27-1H5.73A2 2 0 0 1 4 12a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 1.73 1h3.54A2 2 0 0 1 11 10Z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              {theme === 'dark' ? (
                <>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5 fill-amber-400"
                  >
                    <path d="M10 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 11a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7-4a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 10a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm9.95-4.95a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0ZM7.17 12.83a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0Zm7.78 1.41a1 1 0 0 1-1.41 0l-.71-.71a1 1 0 1 1 1.41-1.41l.71.71a1 1 0 0 1 0 1.41ZM7.17 7.17a1 1 0 0 1-1.41 0l-.71-.71A1 1 0 0 1 6.46 5.05l.71.71a1 1 0 0 1 0 1.41ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                  </svg>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-zinc-700">
                    <path d="M17.29 13.29A8 8 0 0 1 6.71 2.71a8 8 0 1 0 10.58 10.58Z" />
                  </svg>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        <nav aria-label="Preset cities" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {CITY_PRESETS.map((city) => {
            const active = city.key === location.key;
            return (
              <button
                key={city.key}
                type="button"
                onClick={() => {
                  setGeoMessage(null);
                  setDropdownOpen(false);
                  onSelectLocation(city);
                }}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${active
                  ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-600'
                  : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                  }`}
              >
                {city.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleGeolocate}
            className="rounded-full border border-teal-700 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-teal-600 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/60"
          >
            Use my location
          </button>
        </nav>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div ref={searchBoxRef} className="relative w-full sm:max-w-xs">
            <label htmlFor="city-search" className="sr-only">
              Search Indian city
            </label>
            <input
              id="city-search"
              type="search"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                if (next.trim().length < 2) {
                  setResults([]);
                  setSearchMessage(null);
                  setDropdownOpen(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDropdownOpen(false);
                }
              }}
              placeholder="Search Indian town or city..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-500 focus:border-teal-700 focus:outline-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
            />
            {searching ? (
              <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400" role="status">
                Searching...
              </span>
            ) : null}
            {dropdownOpen ? (
              <div
                id="city-search-results"
                role="region"
                aria-live="polite"
                aria-label="City search results"
                className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-300 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
              >
                {results.length > 0 ? (
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
                    {results.map((item) => (
                      <li key={`${item.name}-${item.lat}-${item.lon}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full rounded px-2.5 py-2 text-left text-xs text-zinc-900 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none dark:text-zinc-100 dark:hover:bg-teal-950/60 dark:focus:bg-teal-950/60"
                        >
                          <span className="font-semibold">{item.name}</span>
                          {item.admin1 ? (
                            <span className="text-zinc-600 dark:text-zinc-400">
                              , {item.admin1}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchMessage ? (
                  <p className="p-2 text-xs text-zinc-700 dark:text-zinc-300">{searchMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              title="Edit household profile (sensitive group, room size, cooking type, commute)"
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:px-3"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={onOpenCadr}
              title="CADR / ACH calculator — find the right air purifier for your room"
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:px-3"
            >
              CADR Check
            </button>
            <button
              type="button"
              onClick={onOpenRoomCheck}
              title="Upload or test a room photo with Gemini Vision"
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:px-3"
            >
              Room Check
            </button>
            <button
              type="button"
              onClick={onOpenBrief}
              className="rounded-lg border border-teal-800 bg-teal-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 sm:px-3"
            >
              Share Brief
            </button>
          </div>
        </div>

        {geoMessage ? (
          <p role="status" className="text-xs font-medium text-amber-900 dark:text-amber-300">
            {geoMessage}
          </p>
        ) : null}
      </div>
    </header>
  );
}
