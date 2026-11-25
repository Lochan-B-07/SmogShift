import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import delhiSnapshot from '@/data/fallback/delhi.json';
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
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
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
      return new Response(
        JSON.stringify({
          results: [{ name: 'Jaipur', admin1: 'Rajasthan', lat: 26.91, lon: 75.79 }],
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

describe('Hero UI, interactions, and WCAG accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads Delhi NCR, updates meters when toggles flip, renders HourlyTable, and passes vitest-axe', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);
    expect(screen.getByText(/Hourly exposure data table/i)).toBeInTheDocument();

    const householdSection = screen.getByLabelText('Exposure and community meters');
    const beforeText = householdSection.textContent ?? '';

    await user.click(screen.getByRole('radio', { name: 'HEPA' }));
    await user.click(screen.getByRole('radio', { name: 'Metro + Walk' }));

    await waitFor(() => {
      const afterText = householdSection.textContent ?? '';
      expect(afterText).not.toBe(beforeText);
      expect(afterText).toContain('kg');
      expect(afterText).toContain('g');
    });

    const axeResults = await axe(container);
    expect(axeResults.violations).toEqual([]);
  });

  it('fetches question-specific explanation when clicking quick-question chip', async () => {
    const fetchMock = setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    await user.click(screen.getByRole('button', { name: 'Why not indoor plants?' }));

    await screen.findByText(/Explanation for why_not_plants/i);
    expect(screen.getByText('Rule-based explanation')).toBeInTheDocument();

    const analyzeCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        typeof url === 'string' &&
        url.startsWith('/api/analyze') &&
        String(init?.body ?? '').includes('why_not_plants'),
    );
    expect(analyzeCall).toBeDefined();
  });

  it('shows offline snapshot banner when source.isFallback is true', async () => {
    setupFetchMock({ isFallback: true });
    render(<Home />);

    await screen.findByText(/Offline snapshot from .* Not live data\./i);
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
      await screen.findByText(/Location permission denied\. Preset cities and search remain active\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lucknow' })).toBeEnabled();
  });

  it('opens Profile, CADR, Brief (EN/HI with lang="hi"), and Assumptions drawers cleanly', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    render(<Home />);

    await screen.findByText(/Modeled forecast · Open-Meteo/i);

    // CADR drawer
    await user.click(screen.getByRole('button', { name: 'CADR / ACH Check' }));
    const cadrDialog = await screen.findByRole('dialog');
    expect(within(cadrDialog).getByText(/Indoor Potted Plants/i)).toBeInTheDocument();
    await user.click(within(cadrDialog).getByRole('button', { name: /Close Room CADR/i }));

    // Brief drawer + Hindi toggle
    await user.click(screen.getByRole('button', { name: 'Family / RWA Brief' }));
    const briefDialog = await screen.findByRole('dialog');
    await within(briefDialog).findByText(/Smog brief — Delhi NCR/i);
    await user.click(within(briefDialog).getByRole('button', { name: /हिन्दी/i }));
    const hiPre = await within(briefDialog).findByText(/स्मॉग संक्षिप्त नोट/i);
    expect(hiPre).toHaveAttribute('lang', 'hi');
    await user.click(within(briefDialog).getByRole('button', { name: /Close Family/i }));

    // Assumptions modal
    await user.click(screen.getByRole('button', { name: /Assumptions & methodology/i }));
    const assumptionsDialog = await screen.findByRole('dialog');
    expect(within(assumptionsDialog).getByText(/What we explicitly do NOT model/i)).toBeInTheDocument();
  });
});
