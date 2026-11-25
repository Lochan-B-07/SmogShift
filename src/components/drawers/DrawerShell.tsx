'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactElement, ReactNode } from 'react';

export interface DrawerShellProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DrawerShellProps): ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]" />
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <Dialog.Content className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                  {description}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={`Close ${title}`}
                  className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-4">{children}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
