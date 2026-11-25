'use client';

import type { ReactElement } from 'react';
import { compareIndoorMethods, getRoomVolume } from '@/engine';
import type { HouseholdProfile } from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';

export interface CadrDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly roomSize: HouseholdProfile['roomSize'];
}

export function CadrDrawer({ open, onOpenChange, roomSize }: CadrDrawerProps): ReactElement {
  const volume = getRoomVolume(roomSize);
  const methods = compareIndoorMethods(roomSize);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Room CADR / ACH Reality Check"
      description={`Comparing particle clearance in your ${roomSize} room (${volume} m³).`}
    >
      <div className="space-y-3 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-zinc-800 dark:text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <th scope="col" className="px-2 py-2 font-semibold">
                  Intervention
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  CADR
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Air Changes/hr (ACH)
                </th>
                <th scope="col" className="px-2 py-2 font-semibold">
                  Steady-state PM2.5 left
                </th>
              </tr>
            </thead>
            <tbody>
              {methods.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <th scope="row" className="px-2 py-2 font-semibold">
                    {item.label}
                  </th>
                  <td className="px-2 py-2 tabular-nums">{item.cadrM3h} m³/h</td>
                  <td className="px-2 py-2 tabular-nums">{item.ach.toFixed(1)} h⁻¹</td>
                  <td className="px-2 py-2 tabular-nums">
                    {Math.round(item.steadyStateFractionOfBaseline * 100)}% of unpurified
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Why potted plants are listed at 0 m³/h</p>
          <p className="mt-1">
            Houseplants are great for greenery, but peer-reviewed chamber studies show their PM2.5
            clean-air delivery rate is negligible compared to passive building leakage. Rely on
            draft sealing, kitchen exhaust, a DIY box fan filter, or a HEPA purifier.
          </p>
        </div>
      </div>
    </DrawerShell>
  );
}
