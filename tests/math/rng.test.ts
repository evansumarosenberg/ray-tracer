import { describe, expect, it } from 'vitest';
import { createRng, DEFAULT_SCENE_SEED } from '../../src/math/rng';

describe('createRng', () => {
  it('produces repeatable values for the same seed', () => {
    const a = createRng(DEFAULT_SCENE_SEED);
    const b = createRng(DEFAULT_SCENE_SEED);

    expect([a.next(), a.next(), a.next(), a.next()]).toEqual([
      b.next(),
      b.next(),
      b.next(),
      b.next(),
    ]);
  });

  it('supports inclusive-exclusive numeric ranges', () => {
    const rng = createRng(1234);
    const value = rng.range(10, 12);

    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThan(12);
  });
});
