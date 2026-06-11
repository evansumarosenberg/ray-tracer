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

  it('pins the default scene seed sequence', () => {
    const rng = createRng(DEFAULT_SCENE_SEED);

    expect(rng.next()).toBeCloseTo(0.093103232327848673, 15);
    expect(rng.next()).toBeCloseTo(0.04117693193256855, 15);
    expect(rng.next()).toBeCloseTo(0.61568943248130381, 15);
    expect(rng.next()).toBeCloseTo(0.66863394086249173, 15);
  });

  it('supports inclusive-exclusive numeric ranges', () => {
    const rng = createRng(1234);

    for (let sample = 0; sample < 1_000; sample += 1) {
      const value = rng.range(10, 12);

      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(12);
    }
  });
});
