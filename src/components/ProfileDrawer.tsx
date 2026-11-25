'use client';

import type { ReactElement } from 'react';
import type { HouseholdProfile } from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';

export interface ProfileDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly profile: HouseholdProfile;
  readonly onChange: (next: HouseholdProfile) => void;
}

export function ProfileDrawer({
  open,
  onOpenChange,
  profile,
  onChange,
}: ProfileDrawerProps): ReactElement {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Household Profile"
      description="Enums only — shapes room volume, cooking source, commute distance, and Gemini guidance."
    >
      <div className="space-y-4 text-xs">
        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900">Sensitive group</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['none', 'General'],
                ['child', 'Child'],
                ['elder', 'Elder'],
                ['respiratory', 'Respiratory'],
                ['multiple', 'Multiple'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={profile.sensitive === val}
                onClick={() => onChange({ ...profile, sensitive: val })}
                className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                  profile.sensitive === val
                    ? 'bg-teal-800 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900">Primary room size</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['small', 'Small (30 m³)'],
                ['medium', 'Medium (45 m³)'],
                ['large', 'Large (70 m³)'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={profile.roomSize === val}
                onClick={() => onChange({ ...profile, roomSize: val })}
                className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                  profile.roomSize === val
                    ? 'bg-teal-800 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900">Cooking setup</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['gas_no_exhaust', 'Gas (no exhaust)'],
                ['gas_exhaust', 'Gas + exhaust'],
                ['induction', 'Induction'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={profile.cooking === val}
                onClick={() => onChange({ ...profile, cooking: val })}
                className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                  profile.cooking === val
                    ? 'bg-teal-800 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900">
            One-way daily commute distance
          </legend>
          <div className="flex flex-wrap gap-2">
            {([5, 10, 20] as const).map((km) => (
              <button
                key={km}
                type="button"
                aria-pressed={profile.commuteKm === km}
                onClick={() => onChange({ ...profile, commuteKm: km })}
                className={`rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-800 ${
                  profile.commuteKm === km
                    ? 'bg-teal-800 text-white'
                    : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </DrawerShell>
  );
}
