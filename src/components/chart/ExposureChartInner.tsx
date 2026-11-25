'use client';

import type { ReactElement } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlySimulationPoint } from '@/engine';
import { formatIsoClock } from '@/lib/formatters';

export interface ExposureChartInnerProps {
  readonly points: readonly HourlySimulationPoint[];
}

interface ChartDatum {
  readonly clock: string;
  readonly outdoor: number;
  readonly baseline: number;
  readonly adjusted: number;
}

export function getBestWindowBounds(
  points: readonly HourlySimulationPoint[],
  data: readonly ChartDatum[],
): { readonly x1: string; readonly x2: string } | null {
  const bestIndices = points.map((p, idx) => (p.isBestWindow ? idx : -1)).filter((idx) => idx >= 0);

  if (bestIndices.length === 0 || data.length < 2) return null;

  const firstIdx = bestIndices[0];
  const lastIdx = bestIndices[bestIndices.length - 1];

  // Ensure non-zero width when only a single hour qualifies
  if (firstIdx === lastIdx) {
    if (lastIdx + 1 < data.length) {
      return { x1: data[firstIdx].clock, x2: data[lastIdx + 1].clock };
    }
    return { x1: data[firstIdx - 1].clock, x2: data[lastIdx].clock };
  }

  return { x1: data[firstIdx].clock, x2: data[lastIdx].clock };
}

export function ExposureChartInner({ points }: ExposureChartInnerProps): ReactElement {
  const data: ChartDatum[] = points.map((p) => ({
    clock: formatIsoClock(p.time),
    outdoor: Math.round(p.outdoorPm25 * 10) / 10,
    baseline: Math.round(p.baselineExposure * 10) / 10,
    adjusted: Math.round(p.adjustedExposure * 10) / 10,
  }));

  const bounds = getBestWindowBounds(points, data);

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="clock" tick={{ fontSize: 11, fill: '#3f3f46' }} interval={3} />
          <YAxis tick={{ fontSize: 11, fill: '#3f3f46' }} width={44} />
          <Tooltip
            formatter={(value) => [`${String(value ?? '')} µg/m³`]}
            labelFormatter={(label) => `Local time: ${String(label ?? '')}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          {bounds ? (
            <ReferenceArea
              x1={bounds.x1}
              x2={bounds.x2}
              fill="#0d9488"
              fillOpacity={0.14}
              label={{
                value: 'Best window',
                position: 'insideTop',
                fontSize: 10,
                fill: '#0f766e',
              }}
            />
          ) : null}
          <ReferenceLine
            y={15}
            stroke="#0284c7"
            strokeDasharray="2 2"
            label={{
              value: 'WHO 15',
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#0369a1',
            }}
          />
          <ReferenceLine
            y={60}
            stroke="#b45309"
            strokeDasharray="2 2"
            label={{
              value: 'CPCB 60',
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#92400e',
            }}
          />
          <Line
            type="monotone"
            dataKey="outdoor"
            name="Outdoor air"
            stroke="#64748b"
            strokeWidth={1.75}
            strokeDasharray="3 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline routine"
            stroke="#d97706"
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="adjusted"
            name="Adjusted routine"
            stroke="#0f766e"
            strokeWidth={2.75}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
