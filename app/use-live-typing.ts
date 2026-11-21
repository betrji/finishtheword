'use client';
import {useEffect, useRef, useState} from 'react';
import {clientId} from '../lib/client-id';
import {createTypingChannel, type TypingPreview} from '../lib/live-typing';

export function useLiveTyping({matchId, turnId, enabled, sending, watch = false, session}: {
  matchId: string; turnId: string; enabled: boolean; sending: boolean; watch?: boolean;
  session: {current: string | null};
}) {
  const channel = useRef<ReturnType<typeof createTypingChannel> | null>(null);
  const [preview, setPreview] = useState<TypingPreview | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const live = createTypingChannel({matchId, turnId, watch, writer: sending ? clientId() : undefined,
      visible: () => !document.hidden,
      async send(packet, signal) {
        const response = await fetch('/api/arena/typing', {method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
          headers: {'Content-Type': 'application/json', ...(session.current ? {'X-Arena-Session': session.current} : {})}, body: JSON.stringify(packet)});
        if (!response.ok) throw Error('Preview unavailable');
        return response.json();
      },
      receive(value) { setPreview(previous => previous?.turnId === value.turnId && previous.draft === value.draft ? previous : value); }
    });
    channel.current = live;
    if (!sending) live.watch();
    const resume = () => live.resume(); document.addEventListener('visibilitychange', resume);
    return () => { live.stop(); if (channel.current === live) channel.current = null; document.removeEventListener('visibilitychange', resume); };
  }, [matchId, turnId, enabled, sending, watch, session]);
  return {draft: enabled && !sending && preview?.turnId === turnId ? preview.draft : null,
    edit: (value: string) => { if (sending) channel.current?.edit(value); }};
}
