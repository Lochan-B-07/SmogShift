'use client';

import type { ReactElement } from 'react';
import { DEFAULT_PROFILE } from '@/lib/presets';
import type { HouseholdProfile } from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';

export interface ProfileDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly profile: HouseholdProfile;
  readonly onChange: (next: HouseholdProfile) => void;
}

const BTN_BASE =
  'rounded-lg px-3 py-1.5 font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-teal-700';
const BTN_ON = 'bg-teal-800 text-white dark:bg-teal-600';
const BTN_OFF =
  'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700';

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
          <legend className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            Sensitive group
          </legend>
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
                className={`${BTN_BASE} ${profile.sensitive === val ? BTN_ON : BTN_OFF}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            Primary room size
          </legend>
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
                className={`${BTN_BASE} ${profile.roomSize === val ? BTN_ON : BTN_OFF}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            Cooking setup
          </legend>
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
                className={`${BTN_BASE} ${profile.cooking === val ? BTN_ON : BTN_OFF}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            One-way daily commute distance
          </legend>
          <div className="flex flex-wrap gap-2">
            {([5, 10, 20] as const).map((km) => (
              <button
                key={km}
                type="button"
                aria-pressed={profile.commuteKm === km}
                onClick={() => onChange({ ...profile, commuteKm: km })}
                className={`${BTN_BASE} ${profile.commuteKm === km ? BTN_ON : BTN_OFF}`}
              >
                {km} km
              </button>
            ))}
          </div>
        </fieldset>

        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_PROFILE)}
            className={`${BTN_BASE} ${BTN_OFF}`}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </DrawerShell>
  );
}
