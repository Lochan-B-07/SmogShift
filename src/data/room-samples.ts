import type { RoomCheckResponse } from '@/shared/schemas';

export interface RoomSample {
  readonly id: string;
  readonly label: string;
  readonly imagePath: string;
  readonly fallbackResponse: RoomCheckResponse;
}

export const ROOM_SAMPLES: readonly RoomSample[] = [
  {
    id: 'gas_stove',
    label: 'Gas stove (no exhaust)',
    imagePath: '/room-samples/gas-stove-no-exhaust.jpg',
    fallbackResponse: {
      bottlenecks: [
        'Unvented gas burner without a kitchen exhaust hood or chimney traps fine PM2.5 and NO2 indoors.',
        'Closed kitchen window during cooking prevents combustion smoke from clearing.',
      ],
      fix: 'Run a kitchen exhaust fan or crack a cross-vent window while cooking, then seal doors afterward.',
      mappedIndoor: 'seal_exhaust',
      source: 'sample',
    },
  },
  {
    id: 'living_room_gap',
    label: 'Living room (door gap + plants)',
    imagePath: '/room-samples/living-room-gap.jpg',
    fallbackResponse: {
      bottlenecks: [
        'Visible balcony door gap allows outdoor smog to infiltrate continuously.',
        'Indoor potted plants do not meaningfully filter airborne PM2.5.',
      ],
      fix: 'Add an under-door draft stopper or foam weatherstrip (~INR 300) and pair with a DIY box-fan filter.',
      mappedIndoor: 'diy_box',
      source: 'sample',
    },
  },
];
