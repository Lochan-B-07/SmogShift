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

export function ExposureChartInner({ points }: ExposureChartInnerProps): ReactElement {
  const data: ChartDatum[] = points.map((p) => ({
    clock: formatIsoClock(p.time),
    outdoor: Math.round(p.outdoorPm25 * 10) / 10,
    baseline: Math.round(p.baselineExposure * 10) / 10,
    adjusted: Math.round(p.adjustedExposure * 10) / 10,
  }));

  const bestSpan = points
    .map((p, idx) => (p.isBestWindow ? data[idx]?.clock : null))
    .filter((v): v is string => v !== null);
  const x1 = bestSpan[0];
  const x2 = bestSpan[bestSpan.length - 1];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="clock" tick={{ fontSize: 11 }} interval={3} />
          <YAxis
            unit=" µg"
            tick={{ fontSize: 11 }}
            width={52}
            label={{
              value: 'PM2.5 (µg/m³)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: '#52525b' },
            }}
          />
          <Tooltip
            formatter={(value) => [`${String(value ?? '')} µg/m³`]}
            labelFormatter={(label) => `Local time: ${String(label ?? '')}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {x1 && x2 ? (
            <ReferenceArea
              x1={x1}
              x2={x2}
              fill="#0d9488"
              fillOpacity={0.12}
              label={{ value: 'Best window', position: 'insideTop', fontSize: 10, fill: '#0f766e' }}
            />
          ) : null}
          <ReferenceLine
            y={15}
            stroke="#0284c7"
            strokeDasharray="2 2"
            label={{ value: 'WHO 15', position: 'right', fontSize: 10, fill: '#0284c7' }}
          />
          <ReferenceLine
            y={60}
            stroke="#b45309"
            strokeDasharray="2 2"
            label={{ value: 'CPCB 60', position: 'right', fontSize: 10, fill: '#b45309' }}
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
