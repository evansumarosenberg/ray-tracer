import { describe, expect, it } from 'vitest';
import { add, cross, dot, length, mulScalar, nearZero, reflect, refract, unit, type Vec3 } from '../../src/math/vec3';

describe('vec3', () => {
  it('supports arithmetic and basis operations', () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];

    expect(add(a, b)).toEqual([5, 7, 9]);
    expect(mulScalar(a, 2)).toEqual([2, 4, 6]);
    expect(dot(a, b)).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(length([0, 3, 4])).toBe(5);
  });

  it('normalizes, reflects, refracts, and detects near-zero vectors', () => {
    expect(unit([0, 0, 5])).toEqual([0, 0, 1]);
    expect(reflect([1, -1, 0], [0, 1, 0])).toEqual([1, 1, 0]);
    expect(nearZero([1e-9, -1e-9, 1e-9])).toBe(true);

    const refracted = refract(unit([0, -1, -1]), [0, 1, 0], 1 / 1.5);
    expect(refracted[1]).toBeLessThan(0);
    expect(refracted[2]).toBeLessThan(0);
  });
});
