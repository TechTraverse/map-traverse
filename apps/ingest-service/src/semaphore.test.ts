import { describe, it, expect } from 'vitest';
import { Semaphore, SemaphoreBusyError } from './semaphore.js';

describe('Semaphore', () => {
  it('bounds concurrent holders to max', async () => {
    const sem = new Semaphore(2);
    let peak = 0;
    let current = 0;
    const task = () =>
      sem.run(async () => {
        current += 1;
        peak = Math.max(peak, current);
        await new Promise(r => setTimeout(r, 5));
        current -= 1;
      });
    await Promise.all([task(), task(), task(), task()]);
    expect(peak).toBe(2);
  });

  it('rejects when the wait queue is full', async () => {
    const sem = new Semaphore(1, 1); // 1 active + 1 waiting allowed
    await sem.acquire(); // fill active
    const waiting = sem.acquire(); // fills the single waiting slot
    await expect(sem.acquire()).rejects.toBeInstanceOf(SemaphoreBusyError);
    sem.release(); // let the queued waiter proceed
    await waiting;
    sem.release();
    expect(sem.inUse).toBe(0);
  });
});
