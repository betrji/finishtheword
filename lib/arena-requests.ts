// Background refreshes must never hold up a word, queue join, or leave action.
// Mutations remain serialized; a superseded poll cannot apply its late response.
export class ArenaRequests {
  private poll: AbortController | null = null;
  private pending = 0;
  private tail: Promise<void> = Promise.resolve();

  async run<T>(action: string, task: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    const polling = action === 'status';
    if (polling && (this.poll || this.pending)) return null;
    const controller = new AbortController();
    let release = () => {};
    if (polling) this.poll = controller;
    else {
      this.pending++;
      this.poll?.abort('superseded');
      const previous = this.tail;
      this.tail = new Promise<void>(resolve => { release = resolve; });
      await previous;
    }
    const timeout = setTimeout(() => controller.abort(new DOMException('Connection timed out. Please retry.', 'TimeoutError')), 10000);
    try {
      const value = await task(controller.signal);
      if (controller.signal.aborted) {
        if (controller.signal.reason === 'superseded') return null;
        throw controller.signal.reason;
      }
      return value;
    } catch (error) {
      if (controller.signal.reason === 'superseded') return null;
      throw controller.signal.aborted ? controller.signal.reason : error;
    } finally {
      clearTimeout(timeout);
      if (this.poll === controller) this.poll = null;
      if (!polling) { this.pending--; release(); }
    }
  }
}
