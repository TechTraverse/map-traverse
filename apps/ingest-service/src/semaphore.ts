/**
 * Tiny counting semaphore. ogr2ogr is CPU/IO heavy and PostGIS writes contend,
 * so concurrent ingests are bounded; callers past the cap get rejected (429)
 * rather than queued unboundedly.
 */
export class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly max: number,
    private readonly maxWaiting: number = 8,
  ) {}

  get inUse(): number {
    return this.active;
  }

  /** Acquire a slot, or throw if the wait queue is full. */
  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return;
    }
    if (this.waiters.length >= this.maxWaiting) {
      throw new SemaphoreBusyError();
    }
    await new Promise<void>(resolve => this.waiters.push(resolve));
    this.active += 1;
  }

  release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  /** Run `fn` while holding a slot. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export class SemaphoreBusyError extends Error {
  constructor() {
    super('Ingest service is busy');
    this.name = 'SemaphoreBusyError';
  }
}
