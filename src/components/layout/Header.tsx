'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ActiveLocation } from '@/hooks/useAirQuality';
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
  readonly onSelectLocation: (loc: ActiveLocation) => void;
  readonly onOpenProfile: () => void;
  readonly onOpenCadr: () => void;
  readonly onOpenBrief: () => void;
}

export function Header({
  location,
  airQuality,
  loading,
  onSelectLocation,
  onOpenProfile,
  onOpenCadr,
  onOpenBrief,
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
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-2.5 px-4 py-3 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">SmogShift</h1>
            <p className="text-xs text-zinc-700">
              Exposure Budget Simulator · <span className="font-semibold">{location.name}</span>
              {loading && airQuality ? (
                <span className="ml-2 text-teal-800" role="status">
                  Updating...
                </span>
              ) : null}
            </p>
          </div>
          {airQuality ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${
                airQuality.source.isFallback
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-zinc-300 bg-zinc-100 text-zinc-800'
              }`}
            >
              {airQuality.source.isFallback
                ? `Offline snapshot from ${airQuality.source.snapshotDate ?? 'recent capture'}. Not live data.`
                : `Modeled forecast · Open-Meteo · Updated ${formatMinutesAgo(airQuality.source.fetchedAt)}`}
            </span>
          ) : null}
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
                className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                  active
                    ? 'bg-teal-800 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {city.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleGeolocate}
            className="rounded-full border border-teal-700 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800"
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
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-500 focus:border-teal-700 focus:outline-2 focus:outline-teal-700"
            />
            {searching ? (
              <span className="mt-1 block text-xs text-zinc-600" role="status">
                Searching...
              </span>
            ) : null}
            {dropdownOpen ? (
              <div
                id="city-search-results"
                role="region"
                aria-live="polite"
                aria-label="City search results"
                className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-300 bg-white p-1 shadow-md"
              >
                {results.length > 0 ? (
                  <ul className="divide-y divide-zinc-100">
                    {results.map((item) => (
                      <li key={`${item.name}-${item.lat}-${item.lon}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full rounded px-2.5 py-2 text-left text-xs text-zinc-900 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none"
                        >
                          <span className="font-semibold">{item.name}</span>
                          {item.admin1 ? (
                            <span className="text-zinc-600">, {item.admin1}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : searchMessage ? (
                  <p className="p-2 text-xs text-zinc-700">{searchMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 sm:px-3"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={onOpenCadr}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 sm:px-3"
            >
              CADR Check
            </button>
            <button
              type="button"
              onClick={onOpenBrief}
              className="rounded-lg border border-teal-800 bg-teal-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 sm:px-3"
            >
              Share Brief
            </button>
          </div>
        </div>

        {geoMessage ? (
          <p role="status" className="text-xs font-medium text-amber-900">
            {geoMessage}
          </p>
        ) : null}
      </div>
    </header>
  );
}
