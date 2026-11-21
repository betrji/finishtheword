'use client';

import {useState,useSyncExternalStore,type ReactNode} from 'react';

function createDraft() {
  let value = '';
  const listeners = new Set<() => void>();
  return {
    read: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    write(next: string | ((current: string) => string)) {
      const updated = typeof next === 'function' ? next(value) : next;
      if (updated === value) return;
      value = updated;
      listeners.forEach(listener => listener());
    },
  };
}

export function useWordDraft() {
  const [draft] = useState(createDraft);
  return draft;
}

const emptyDraft = () => '';

export function WordDraft({draft,children}: {
  draft: ReturnType<typeof createDraft>;
  children: (word: string) => ReactNode;
}) {
  return children(useSyncExternalStore(draft.subscribe,draft.read,emptyDraft));
}
