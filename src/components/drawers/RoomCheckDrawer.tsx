'use client';

import type { ReactElement } from 'react';
import type { Toggles } from '@/shared/schemas';
import { DrawerShell } from './DrawerShell';
import { RoomCheckPanel } from './RoomCheckPanel';

export interface RoomCheckDrawerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly cityKey: string;
  readonly onApplyIndoor: (indoor: Toggles['indoor']) => void;
}

export function RoomCheckDrawer({
  open,
  onOpenChange,
  cityKey,
  onApplyIndoor,
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
        onApplyIndoor={onApplyIndoor}
        onAfterApply={() => onOpenChange(false)}
      />
    </DrawerShell>
  );
}
