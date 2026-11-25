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
  readonly isDark?: boolean;
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

  if (firstIdx === lastIdx) {
    if (lastIdx + 1 < data.length) {
      return { x1: data[firstIdx].clock, x2: data[lastIdx + 1].clock };
    }
    return { x1: data[firstIdx - 1].clock, x2: data[lastIdx].clock };
  }

  return { x1: data[firstIdx].clock, x2: data[lastIdx].clock };
}

export function ExposureChartInner({
  points,
  isDark = false,
}: ExposureChartInnerProps): ReactElement {
  const data: ChartDatum[] = points.map((p) => ({
    clock: formatIsoClock(p.time),
    outdoor: Math.round(p.outdoorPm25 * 10) / 10,
    baseline: Math.round(p.baselineExposure * 10) / 10,
    adjusted: Math.round(p.adjustedExposure * 10) / 10,
  }));

  const bounds = getBestWindowBounds(points, data);
  const gridStroke = isDark ? '#27272a' : '#e4e4e7';
  const tickFill = isDark ? '#d4d4d8' : '#3f3f46';
  const adjustedStroke = isDark ? '#2dd4bf' : '#0f766e';
  const baselineStroke = isDark ? '#fbbf24' : '#d97706';
  const outdoorStroke = isDark ? '#94a3b8' : '#64748b';
  const whoColor = isDark ? '#38bdf8' : '#0369a1';
  const cpcbColor = isDark ? '#f59e0b' : '#92400e';

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="clock" tick={{ fontSize: 11, fill: tickFill }} interval={3} />
          <YAxis tick={{ fontSize: 11, fill: tickFill }} width={44} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              color: isDark ? '#f4f4f5' : '#18181b',
              borderRadius: '0.5rem',
              fontSize: '12px',
            }}
            formatter={(value) => [`${String(value ?? '')} µg/m³`]}
            labelFormatter={(label) => `Local time: ${String(label ?? '')}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4, color: tickFill }} />
          {bounds ? (
            <ReferenceArea
              x1={bounds.x1}
              x2={bounds.x2}
              fill={isDark ? '#14b8a6' : '#0d9488'}
              fillOpacity={isDark ? 0.2 : 0.14}
              label={{
                value: 'Best window',
                position: 'insideTop',
                fontSize: 10,
                fill: isDark ? '#5eead4' : '#0f766e',
              }}
            />
          ) : null}
          <ReferenceLine
            y={15}
            stroke={whoColor}
            strokeDasharray="2 2"
            label={{
              value: 'WHO 15',
              position: 'insideTopRight',
              fontSize: 10,
              fill: whoColor,
            }}
          />
          <ReferenceLine
            y={60}
            stroke={cpcbColor}
            strokeDasharray="2 2"
            label={{
              value: 'CPCB 60',
              position: 'insideTopRight',
              fontSize: 10,
              fill: cpcbColor,
            }}
          />
          <Line
            type="monotone"
            dataKey="outdoor"
            name="Outdoor air"
            stroke={outdoorStroke}
            strokeWidth={1.75}
            strokeDasharray="3 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Baseline routine"
            stroke={baselineStroke}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="adjusted"
            name="Adjusted routine"
            stroke={adjustedStroke}
            strokeWidth={2.75}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
