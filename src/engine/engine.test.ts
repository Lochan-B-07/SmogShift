import { describe, expect, it } from 'vitest';
import {
  buildRolling24Window,
  compareIndoorMethods,
  computeDailyEmissionsSavings,
  computeFingerprint,
  computeMeters,
  computeSteadyState,
  getCpcbPm25Category,
  getIndoorConfig,
  mapRoutine,
  selectVentilationWindow,
  simulateDay,
  simulateIndoorSeries,
  stepIndoorConcentration,
} from './index';
import {
  FIXTURE_CLEAN_HOURS,
  FIXTURE_HAZARDOUS_HOURS,
  FIXTURE_WINDOW_HOURS,
  make24Hours,
} from './__fixtures__/fixtures';

describe('Engine hand-computed fixtures F1-F11', () => {
  it('F1: closed room steady state', () => {
    const res = computeSteadyState({
      cOut: 200,
      lambda: 1.0,
      cadr: 0,
      volume: 45,
      sourceRate: 0,
    });
    expect(res.a).toBeCloseTo(1.3, 6);
    expect(res.cSs).toBeCloseTo(180 / 1.3, 4);
    expect(res.cSs).toBeCloseTo(138.46, 2);
  });

  it('F2: HEPA steady state', () => {
    const res = computeSteadyState({
      cOut: 200,
      lambda: 1.0,
      cadr: 250,
      volume: 45,
      sourceRate: 0,
    });
    expect(res.q).toBeCloseTo(5.5556, 4);
    expect(res.a).toBeCloseTo(6.8556, 4);
    expect(res.cSs).toBeCloseTo(26.26, 2);
  });

  it('F3: one-hour step from clean room', () => {
    const res = stepIndoorConcentration({
      cInPrev: 0,
      cOut: 200,
      lambda: 1.0,
      cadr: 0,
      volume: 45,
      sourceRate: 0,
    });
    expect(res.cInNext).toBeCloseTo(138.461538 * (1 - Math.exp(-1.3)), 4);
    expect(res.cInNext).toBeCloseTo(100.73, 2);
  });

  it('F4: cooking source only', () => {
    const res = computeSteadyState({
      cOut: 0,
      lambda: 1.0,
      cadr: 0,
      volume: 45,
      sourceRate: 2000,
    });
    expect(res.cSs).toBeCloseTo(2000 / 45 / 1.3, 4);
    expect(res.cSs).toBeCloseTo(34.19, 2);
  });

  it('F5: exposure meters', () => {
    const meters = computeMeters(60);
    expect(meters.pctWHO).toBeCloseTo(400, 6);
    expect(meters.cigEq).toBeCloseTo(60 / 22, 4);
    expect(meters.cigEq).toBeCloseTo(2.727, 3);
  });

  it('F6: cigarettes avoided', () => {
    const meters = computeMeters(45, 90);
    expect(meters.cigAvoided).toBeCloseTo(45 / 22, 4);
    expect(meters.cigAvoided).toBeCloseTo(2.045, 3);
  });

  it('F7: community emissions savings with cited Indian EFs', () => {
    const savings = computeDailyEmissionsSavings({
      households: 10,
      commuteKm: 10,
      travel: 'metro_walk',
    });
    expect(savings.co2eKg).toBeCloseTo(21.0, 4);
    expect(savings.noxG).toBeCloseTo(16.0, 4);
  });

  it('F8: window selection picks unique minimum at hour 14', () => {
    const resolved = buildRolling24Window(FIXTURE_WINDOW_HOURS);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const win = selectVentilationWindow(resolved.hours);
    expect(win.bestHour).toBe(14);
    expect(win.label).toBe('safe_window');
  });

  it('F9: all-hazardous window yields least_bad', () => {
    const resolved = buildRolling24Window(FIXTURE_HAZARDOUS_HOURS);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const win = selectVentilationWindow(resolved.hours);
    expect(win.label).toBe('least_bad');
  });

  it('F10: clean day window yields clean_day', () => {
    const resolved = buildRolling24Window(FIXTURE_CLEAN_HOURS);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const win = selectVentilationWindow(resolved.hours);
    expect(win.label).toBe('clean_day');
  });

  it('F11: induction + seal_exhaust never worsens cooking source S', () => {
    const cfg = getIndoorConfig('seal_exhaust', {
      roomSize: 'medium',
      cooking: 'induction',
    });
    expect(cfg.effectiveCookingS).toBe(400);
    expect(cfg.lambdaClosed).toBe(0.6);
  });
});

describe('Engine property tests', () => {
  it('higher CADR never raises indoor concentration', () => {
    const steps = Array.from({ length: 24 }, (_, h) => ({
      pm25: 150 + (h % 6) * 15,
      isAiring: h === 7,
      isCooking: h === 8 || h === 20,
    }));

    const noneCfg = getIndoorConfig('none', { roomSize: 'medium', cooking: 'gas_no_exhaust' });
    const diyCfg = getIndoorConfig('diy_box', { roomSize: 'medium', cooking: 'gas_no_exhaust' });
    const hepaCfg = getIndoorConfig('hepa', { roomSize: 'medium', cooking: 'gas_no_exhaust' });

    const sNone = simulateIndoorSeries(steps, noneCfg);
    const sDiy = simulateIndoorSeries(steps, diyCfg);
    const sHepa = simulateIndoorSeries(steps, hepaCfg);

    for (let i = 0; i < 24; i += 1) {
      expect(sDiy[i]).toBeLessThanOrEqual(sNone[i] + 1e-9);
      expect(sHepa[i]).toBeLessThanOrEqual(sDiy[i] + 1e-9);
    }
  });

  it('as lambda -> infinity, steady state approaches P * C_out', () => {
    const res = computeSteadyState({
      cOut: 180,
      lambda: 1e6,
      cadr: 250,
      volume: 45,
      sourceRate: 2000,
    });
    expect(res.cSs).toBeCloseTo(0.9 * 180, 2);
  });

  it('with S=0 and C_out=0, indoor concentration decays monotonically toward 0', () => {
    let cIn = 120;
    for (let h = 0; h < 24; h += 1) {
      const next = stepIndoorConcentration({
        cInPrev: cIn,
        cOut: 0,
        lambda: 1.0,
        cadr: 0,
        volume: 45,
        sourceRate: 0,
      }).cInNext;
      expect(next).toBeLessThan(cIn);
      expect(next).toBeGreaterThanOrEqual(0);
      cIn = next;
    }
    expect(cIn).toBeLessThan(1e-6);
  });
});

describe('Window, null interpolation, routine, CPCB bands, fingerprint, CADR', () => {
  it('linearly interpolates up to 3 consecutive null hours', () => {
    const vals = Array.from({ length: 24 }, () => 100) as (number | null)[];
    vals[4] = 80;
    vals[5] = null;
    vals[6] = null;
    vals[7] = null;
    vals[8] = 120;

    const res = buildRolling24Window(make24Hours(vals));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.hours[5].pm25).toBeCloseTo(90, 5);
    expect(res.hours[6].pm25).toBeCloseTo(100, 5);
    expect(res.hours[7].pm25).toBeCloseTo(110, 5);
  });

  it('returns insufficient_data when more than 3 consecutive hours are null', () => {
    const vals = Array.from({ length: 24 }, () => 100) as (number | null)[];
    vals[5] = null;
    vals[6] = null;
    vals[7] = null;
    vals[8] = null;

    const res = buildRolling24Window(make24Hours(vals));
    expect(res).toEqual({ ok: false, reason: 'insufficient_data' });
  });

  it('builds rolling 24h window from 48h forecast starting at local prefix', () => {
    const hours48 = Array.from({ length: 48 }, (_, idx) => {
      const day = idx < 24 ? 25 : 26;
      const h = idx % 24;
      return {
        time: `2026-11-${day}T${String(h).padStart(2, '0')}:00`,
        pm25: 50 + idx,
        pm10: 80 + idx,
        no2: 30,
      };
    });
    const res = buildRolling24Window(hours48, '2026-11-25T14:00');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.hours).toHaveLength(24);
    expect(res.hours[0].time).toBe('2026-11-25T14:00');
    expect(res.hours[23].time).toBe('2026-11-26T13:00');
  });

  it('smartTiming moves flexible outdoor & airing hour from 07 to bestHour', () => {
    const sim = simulateDay(
      FIXTURE_WINDOW_HOURS,
      { sensitive: 'none', roomSize: 'medium', cooking: 'gas_no_exhaust', commuteKm: 10 },
      { travel: 'carpool', smartTiming: true, indoor: 'hepa', households: 25 },
    );
    expect(sim.ok).toBe(true);
    if (!sim.ok) return;
    expect(sim.summary.bestHour).toBe(14);
    expect(sim.points[7].baselineActivity).toBe('airing_outdoor');
    expect(sim.points[7].adjustedActivity).toBe('home_indoors');
    expect(sim.points[14].adjustedActivity).toBe('airing_outdoor');
    expect(sim.summary.adjustedPctWho).toBeLessThan(sim.summary.baselinePctWho);
  });

  it('mapRoutine maps 08 & 20 cooking and 09 & 18 commute', () => {
    const resolved = buildRolling24Window(FIXTURE_WINDOW_HOURS);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const base = mapRoutine(resolved.hours, { smartTiming: false, bestHour: 14 });
    expect(base[8].isCooking).toBe(true);
    expect(base[20].isCooking).toBe(true);
    expect(base[9].isOutdoors).toBe(true);
    expect(base[18].isOutdoors).toBe(true);
  });

  it('CPCB band edges return exact label, icon, and range', () => {
    expect(getCpcbPm25Category(0).band).toBe('good');
    expect(getCpcbPm25Category(30).band).toBe('good');
    expect(getCpcbPm25Category(31).band).toBe('satisfactory');
    expect(getCpcbPm25Category(60).band).toBe('satisfactory');
    expect(getCpcbPm25Category(61).band).toBe('moderately_polluted');
    expect(getCpcbPm25Category(90).band).toBe('moderately_polluted');
    expect(getCpcbPm25Category(91).band).toBe('poor');
    expect(getCpcbPm25Category(120).band).toBe('poor');
    expect(getCpcbPm25Category(121).band).toBe('very_poor');
    expect(getCpcbPm25Category(250).band).toBe('very_poor');
    expect(getCpcbPm25Category(251).band).toBe('severe');
  });

  it('fingerprint classifies combustion, mixed, dust, and unknown correctly', () => {
    expect(computeFingerprint(make24Hours([80], { pm10: 100, no2: 15 }))).toEqual({
      ratio: 0.8,
      regime: 'combustion',
      no2Level: 'low',
    });
    expect(computeFingerprint(make24Hours([50], { pm10: 100, no2: 50 }))).toEqual({
      ratio: 0.5,
      regime: 'mixed',
      no2Level: 'moderate',
    });
    expect(computeFingerprint(make24Hours([30], { pm10: 100, no2: 95 }))).toEqual({
      ratio: 0.3,
      regime: 'dust',
      no2Level: 'high',
    });
    expect(computeFingerprint(make24Hours([null], { pm10: null, no2: null }))).toEqual({
      ratio: null,
      regime: 'unknown',
      no2Level: 'unknown',
    });
  });

  it('CADR comparison includes HEPA (250), DIY box (200), and plants (0)', () => {
    const methods = compareIndoorMethods('medium');
    expect(methods.map((m) => [m.id, m.cadrM3h])).toEqual([
      ['hepa', 250],
      ['diy_box', 200],
      ['plants', 0],
    ]);
    expect(methods[2].steadyStateFractionOfBaseline).toBeCloseTo(1, 6);
  });
});
