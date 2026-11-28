'use client';

import type { ReactElement } from 'react';
import type { HouseholdProfile, Hour, Toggles } from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';
import { RoomCheckPanel } from './RoomCheckPanel';

export interface RoomCheckDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly cityKey: string;
  readonly hours?: readonly Hour[];
  readonly profile?: HouseholdProfile;
  readonly toggles?: Toggles;
  readonly onApplyIndoor: (indoor: Toggles['indoor']) => void;
  readonly onApplyFixes?: (nextProfile: HouseholdProfile, nextToggles: Toggles) => void;
}

export function RoomCheckDrawer({
  open,
  onOpenChange,
  cityKey,
  hours,
  profile,
  toggles,
  onApplyIndoor,
  onApplyFixes,
}: RoomCheckDrawerProps): ReactElement {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Check My Room (Vision)"
      description="Spot stove exhaust or window-gap bottlenecks and auto-apply the cheapest fix."
    >
      <RoomCheckPanel
        cityKey={cityKey}
        hours={hours}
        profile={profile}
        toggles={toggles}
        onApplyIndoor={onApplyIndoor}
        onApplyFixes={onApplyFixes}
        onAfterApply={() => onOpenChange(false)}
      />
    </DrawerShell>
  );
}
