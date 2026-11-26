'use client';

import { useRef, type KeyboardEvent, type ReactElement } from 'react';

export type WorkspaceTabId = 'day' | 'simulator' | 'advisor' | 'room';

export interface WorkspaceTabItem {
  readonly id: WorkspaceTabId;
  readonly label: string;
  readonly subtitle: string;
  readonly badge?: string;
}

export interface WorkspaceTabsProps {
  readonly activeTab: WorkspaceTabId;
  readonly tabs: readonly WorkspaceTabItem[];
  readonly onSelectTab: (tab: WorkspaceTabId) => void;
}

export function WorkspaceTabs({
  activeTab,
  tabs,
  onSelectTab,
}: WorkspaceTabsProps): ReactElement {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = tabs[nextIndex];
      if (targetTab) {
        onSelectTab(targetTab.id);
        buttonRefs.current[nextIndex]?.focus();
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label="SmogShift workspace sections"
      className="grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-200/90 bg-white/90 p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90 sm:grid-cols-4"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex flex-col items-start rounded-xl px-3 py-2 text-left transition focus:outline-2 focus:outline-offset-2 focus:outline-teal-700 ${
              selected
                ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-600'
                : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex w-full items-center justify-between gap-1.5 text-xs font-bold">
              <span>{tab.label}</span>
              {tab.badge ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    selected
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </span>
            <span
              className={`mt-0.5 text-[11px] ${
                selected ? 'text-teal-100' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {tab.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}
