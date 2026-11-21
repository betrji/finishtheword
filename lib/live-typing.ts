export type TypingPreview = {turnId: string; draft: string | null};
export type TypingPacket = {matchId: string; turnId: string; watch?: boolean; writer?: string; sequence?: number; draft?: string};
export const TYPING_INTERVAL = 120;
export const PREVIEW_INTERVAL = 250;

// Send the first edit immediately, then only the newest draft. Slow connections
// never build a queue of obsolete keystrokes. Each turn gets its own channel.
export function createTypingChannel({matchId, turnId, writer, watch = false, send, receive, visible = () => true}: {
  matchId: string; turnId: string; writer?: string; watch?: boolean;
  send: (packet: TypingPacket, signal: AbortSignal) => Promise<TypingPreview>;
  receive: (preview: TypingPreview) => void; visible?: () => boolean;
}) {
  let stopped = false, sequence = 0, sent = 0, latest = '', lastSentAt = -Infinity;
  let reading = false, writing = false;
  let readTimer: ReturnType<typeof setTimeout> | undefined, writeTimer: ReturnType<typeof setTimeout> | undefined;
  const controllers = new Set<AbortController>();
  async function request(packet: TypingPacket) {
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const result = await send(packet, controller.signal);
      if (!stopped && !controller.signal.aborted && result.turnId === turnId) receive(result);
      return !controller.signal.aborted;
    } catch { return false; } // The normal snapshot remains a fallback; never interrupt typing.
    finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  async function publish() {
    clearTimeout(writeTimer);
    if (stopped || writing || sent === sequence || !visible()) return;
    const wait = TYPING_INTERVAL - (Date.now() - lastSentAt);
    if (wait > 0) { writeTimer = setTimeout(publish, wait); return; }
    writing = true; lastSentAt = Date.now(); const version = sequence;
    const ok = await request({matchId, turnId, writer, sequence: version, draft: latest});
    if (ok) sent = version;
    writing = false;
    if (!stopped && sent !== sequence) writeTimer = setTimeout(publish, ok ? 0 : 400);
  }
  async function read() {
    if (stopped || reading) return;
    const start = Date.now(); reading = true;
    const ok = !visible() || await request({matchId, turnId, watch});
    reading = false;
    if (!stopped) readTimer = setTimeout(read, ok ? Math.max(0, PREVIEW_INTERVAL - (Date.now() - start)) : 600);
  }
  return {
    edit(draft: string) { latest = draft.slice(0, 60); sequence++; void publish(); },
    watch() { void read(); },
    resume() { if (writer) void publish(); else { clearTimeout(readTimer); void read(); } },
    stop() { stopped = true; clearTimeout(readTimer); clearTimeout(writeTimer); for (const controller of controllers) controller.abort(); }
  };
}
