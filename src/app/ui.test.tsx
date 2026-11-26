import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { getBestWindowBounds } from '@/components/chart/ExposureChartInner';
import bengaluruSnapshot from '@/data/fallback/bengaluru.json';
import delhiSnapshot from '@/data/fallback/delhi.json';
import type { HourlySimulationPoint } from '@/engine';
import { buildIcsText } from '@/lib/icsGenerator';
import Home from './page';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { readonly children: ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
  };
});

class MockResizeObserver {
  observe(): void { }
  unobserve(): void { }
  disconnect(): void { }
}

function setupFetchMock(options?: { readonly isFallback?: boolean }): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.startsWith('/api/air-quality')) {
      return new Response(
        JSON.stringify({
          ...delhiSnapshot,
          source: {
            ...delhiSnapshot.source,
            isFallback: options?.isFallback ?? false,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.startsWith('/api/geocode')) {
      if (url.includes('Zzzzz')) {
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          results: [{ name: 'Udaipur', admin1: 'Rajasthan', lat: 24.58, lon: 73.68 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.startsWith('/api/analyze')) {
      const body = init?.body ? (JSON.parse(String(init.body)) as { question?: string }) : {};
      return new Response(
        JSON.stringify({
          headlineReason: `Explanation for ${body.question ?? 'overview'}: fine PM2.5 dominates today.`,
          tradeoffs: [
            'Closing gaps slows indoor infiltration.',
            'Timing errands near the cleanest hour cuts outdoor peaks.',
          ],
          nextMove: 'Keep active indoor filtration running tonight.',
          caveat: 'Estimates are modeled, not medical advice.',
          source: 'template',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.startsWith('/api/brief')) {
      const body = init?.body ? (JSON.parse(String(init.body)) as { lang?: 'en' | 'hi' }) : {};
      const lang = body.lang ?? 'en';
      return new Response(
        JSON.stringify({
          lang,
          text:
            lang === 'hi'
              ? 'स्मॉग संक्षिप्त नोट — Delhi NCR\nसबसे साफ़ समय: 15:00'
              : 'Smog brief — Delhi NCR\nCleanest hour: 15:00',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }), {
      status: 404,
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Hero UI, DOM integrity, UX edge cases, and WCAG accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads Delhi NCR, updates meters across toggles/slider/SmartTiming, renders 24 HourlyTable rows, and passes vitest-axe', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    const table = screen.getByRole('table', { hidden: true });
    const rows = within(table).getAllByRole('row', { hidden: true });
    expect(rows.length).toBe(25); // 1 header row + 24 hourly rows

    const metersSection = screen.getByLabelText('Exposure and community meters');
    expect(within(metersSection).getByText(/Switch Daily Travel to Carpool/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Households participating' })).toHaveAttribute(
      'aria-valuetext',
      '25 households',
    );

    await user.click(screen.getByRole('radio', { name: 'HEPA' }));
    await user.click(screen.getByRole('radio', { name: 'Metro + Walk' }));
    await user.click(screen.getByRole('switch', { name: 'Toggle smart timing' }));
    expect(screen.getByRole('switch', { name: 'Toggle smart timing' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(within(metersSection).getByRole('button', { name: '100' }));

    await waitFor(() => {
      const text = metersSection.textContent ?? '';
      expect(text).toContain('100 households');
      expect(text).not.toContain('Switch Daily Travel to Carpool');
    });

    const axeResults = await axe(container);
    expect(axeResults.violations).toEqual([]);
  });

  it('ensures chart best-window shading always spans non-zero width even for a 1-hour window', () => {
    const makePoints = (bestIdx: number): HourlySimulationPoint[] =>
      Array.from({ length: 24 }, (_, idx) => ({
        time: `2026-11-25T${String(idx).padStart(2, '0')}:00`,
        hourOfDay: idx,
        outdoorPm25: 100,
        baselineIndoorPm25: 80,
        adjustedIndoorPm25: 50,
        baselineExposure: 80,
        adjustedExposure: 50,
        baselineActivity: 'home_indoors',
        adjustedActivity: 'home_indoors',
        isBestWindow: idx === bestIdx,
      }));

    const midPts = makePoints(14);
    const midData = midPts.map((p) => ({
      clock: p.time.slice(11, 16),
      outdoor: p.outdoorPm25,
      baseline: p.baselineExposure,
      adjusted: p.adjustedExposure,
    }));
    expect(getBestWindowBounds(midPts, midData)).toEqual({ x1: '14:00', x2: '15:00' });

    const endPts = makePoints(23);
    const endData = endPts.map((p) => ({
      clock: p.time.slice(11, 16),
      outdoor: p.outdoorPm25,
      baseline: p.baselineExposure,
      adjusted: p.adjustedExposure,
    }));
    expect(getBestWindowBounds(endPts, endData)).toEqual({ x1: '22:00', x2: '23:00' });
  });

  it('fetches question-specific explanation when clicking quick-question chips including new commute and cooking chips', async () => {
    const fetchMock = setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    await user.click(screen.getByRole('button', { name: 'Why not indoor plants?' }));
    await screen.findByText(/Explanation for why_not_plants/i);
    expect(screen.getByText('Rule-based explanation')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Best commute & mask plan' }));
    await screen.findByText(/Explanation for commute_mask/i);

    await user.click(screen.getByRole('button', { name: 'Cooking fumes & exhaust' }));
    await screen.findByText(/Explanation for cooking_impact/i);

    const analyzeCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        typeof url === 'string' &&
        url.startsWith('/api/analyze') &&
        String(init?.body ?? '').includes('cooking_impact'),
    );
    expect(analyzeCall).toBeDefined();
  });

  it('toggles light/dark mode, updates html class and localStorage, and keeps 0 axe violations', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);
    const themeBtn = screen.getByRole('button', { name: /Switch to dark mode/i });
    expect(themeBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('smogshift-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Switch to light mode/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const axeResults = await axe(container);
    expect(axeResults.violations).toEqual([]);
  });

  it('shows offline snapshot banner when source.isFallback is true', async () => {
    setupFetchMock({ isFallback: true });
    render(<Home />);

    await screen.findByText(/Offline snapshot from .* Not live data\./i);
  });

  it('handles air-quality fetch errors and recovers cleanly via Retry button', async () => {
    let failFirst = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.startsWith('/api/air-quality')) {
          if (failFirst) {
            failFirst = false;
            return new Response('Server error', { status: 500 });
          }
          return new Response(
            JSON.stringify({
              ...delhiSnapshot,
              source: { ...delhiSnapshot.source, isFallback: false },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            headlineReason: 'Recovered explanation.',
            tradeoffs: ['One.'],
            nextMove: 'Move.',
            caveat: 'Caveat.',
            source: 'template',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    const user = userEvent.setup();
    render(<Home />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Unable to load air-quality forecast/i);

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await screen.findByText(/Modeled forecast · Open-Meteo/i);
  });

  it('handles denied geolocation gracefully while keeping preset chips active', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) => {
          err?.({
            code: 1,
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });

    render(<Home />);
    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(
      await screen.findByText(
        /Location permission denied\. Preset cities and search remain active\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lucknow' })).toBeEnabled();
  });

  it('opens Profile (with Reset), CADR, Brief (EN/HI + copy fallback), and Assumptions drawers cleanly with 0 axe violations', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    // Profile drawer + Reset
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    const profileDialog = await screen.findByRole('dialog');
    await user.click(within(profileDialog).getByRole('button', { name: 'Induction' }));
    expect(within(profileDialog).getByRole('button', { name: 'Induction' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(profileDialog).getByRole('button', { name: 'Reset to defaults' }));
    expect(within(profileDialog).getByRole('button', { name: 'Gas (no exhaust)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect((await axe(profileDialog)).violations).toEqual([]);
    await user.click(
      within(profileDialog).getByRole('button', { name: /Close Household Profile/i }),
    );

    // CADR drawer
    await user.click(screen.getByRole('button', { name: 'CADR Check' }));
    const cadrDialog = await screen.findByRole('dialog');
    expect(within(cadrDialog).getByText(/Indoor Potted Plants/i)).toBeInTheDocument();
    await user.click(within(cadrDialog).getByRole('button', { name: /Close Room CADR/i }));

    // Brief drawer + Hindi toggle + clipboard handling
    const writeTextMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Denied'))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    await user.click(screen.getByRole('button', { name: 'Share Brief' }));
    const briefDialog = await screen.findByRole('dialog');
    await within(briefDialog).findByText(/Smog brief — Delhi NCR/i);
    await user.click(within(briefDialog).getByRole('button', { name: 'Copy text' }));
    await within(briefDialog).findByText(/Copy failed/i);
    await user.click(within(briefDialog).getByRole('button', { name: /Copy failed/i }));
    await within(briefDialog).findByText('Copied!');

    await user.click(within(briefDialog).getByRole('button', { name: /हिन्दी/i }));
    const hiPre = await within(briefDialog).findByText(/स्मॉग संक्षिप्त नोट/i);
    expect(hiPre).toHaveAttribute('lang', 'hi');
    expect((await axe(briefDialog)).violations).toEqual([]);
    await user.click(within(briefDialog).getByRole('button', { name: /Close Family/i }));

    // Assumptions modal
    await user.click(screen.getByRole('button', { name: /Assumptions & methodology/i }));
    const assumptionsDialog = await screen.findByRole('dialog');
    expect(
      within(assumptionsDialog).getByText(/What we explicitly do NOT model/i),
    ).toBeInTheDocument();
  });

  it('supports small-town search, closes dropdown on outside click, and shows City not found', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    const searchInput = screen.getByPlaceholderText(/Search Indian town or city/i);
    await user.type(searchInput, 'Zzzzz');
    await screen.findByText(/City not found in India/i);

    // Outside click dismisses dropdown
    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'City search results' })).not.toBeInTheDocument();
    });

    await user.clear(searchInput);
    await user.type(searchInput, 'Udaipur');
    const resultBtn = await screen.findByRole('button', { name: /Udaipur/i });
    await user.click(resultBtn);
    await screen.findByText(/Udaipur, Rajasthan/i);
  });

  it('renders clean_day verdict on low AQI snapshot and least_bad on hazardous snapshot', async () => {
    let mode: 'clean' | 'hazardous' = 'clean';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.startsWith('/api/air-quality')) {
          const payload =
            mode === 'clean'
              ? { ...bengaluruSnapshot, source: { ...bengaluruSnapshot.source, isFallback: false } }
              : {
                ...delhiSnapshot,
                source: { ...delhiSnapshot.source, isFallback: false },
                hours: delhiSnapshot.hours.map((h) => ({ ...h, pm25: 190, pm10: 250 })),
              };
          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.startsWith('/api/analyze')) {
          return new Response(
            JSON.stringify({
              headlineReason: 'Explanation.',
              tradeoffs: ['One.'],
              nextMove: 'Move.',
              caveat: 'Caveat.',
              source: 'template',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response('{}', { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<Home />);
    await screen.findByText(/Clean air day — best airing hour is/i);

    mode = 'hazardous';
    await user.click(screen.getByRole('button', { name: 'Lucknow' }));
    await screen.findByText(/No safe window today\. Least-bad hour is/i);
  });

  it('applies static day-planner example with zero /api/plan-day calls, renders GamePlanCard, and throttles /api/analyze on toggles', async () => {
    const fetchMock = setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);
    await screen.findByText(/Explanation for overview/i);

    const initialAnalyzeCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.startsWith('/api/analyze'),
    ).length;

    // Flipping a toggle should NOT auto-fire /api/analyze
    await user.click(screen.getByRole('radio', { name: 'HEPA' }));
    const afterToggleAnalyzeCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.startsWith('/api/analyze'),
    ).length;
    expect(afterToggleAnalyzeCalls).toBe(initialAnalyzeCalls);

    // Explicit trigger button DOES fire /api/analyze
    await user.click(screen.getByRole('button', { name: 'Explain this plan' }));
    await waitFor(() => {
      const afterExplainCalls = fetchMock.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.startsWith('/api/analyze'),
      ).length;
      expect(afterExplainCalls).toBe(initialAnalyzeCalls + 1);
    });

    // Clicking a static example chip applies profile+toggles without calling /api/plan-day
    await user.click(screen.getByRole('button', { name: 'Elder + HEPA + induction' }));
    await screen.findByText(/Understood: Older adult · Induction cooker/i);
    expect(screen.getByText(/Today's Game Plan · Delhi NCR/i)).toBeInTheDocument();

    const planDayCalls = fetchMock.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.startsWith('/api/plan-day'),
    );
    expect(planDayCalls.length).toBe(0);

    // Edit button dismisses GamePlanCard
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByText(/Today's Game Plan · Delhi NCR/i)).not.toBeInTheDocument();
  });

  it('builds valid .ics calendar text from engine bestHour', () => {
    const ics = buildIcsText(
      {
        title: 'Open windows',
        description: 'Line 1\nLine 2',
        startHour: 14,
        durationMinutes: 45,
        cityName: 'Delhi NCR',
      },
      new Date('2026-11-26T08:00:00'),
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261126T140000');
    expect(ics).toContain('DTEND:20261126T144500');
    expect(ics).toContain('SUMMARY:Open windows (14:00)');
    expect(ics).toContain('END:VCALENDAR');
  });
});
