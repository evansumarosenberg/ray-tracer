import { describe, expect, it } from 'vitest';
import {
  add,
  cross,
  divScalar,
  dot,
  length,
  lengthSquared,
  mul,
  mulScalar,
  nearZero,
  neg,
  reflect,
  refract,
  sub,
  unit,
  vec3,
  type Vec3,
} from '../../src/math/vec3';

describe('vec3', () => {
  it('supports arithmetic and basis operations', () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];

    expect(vec3(1, 2, 3)).toEqual(a);
    expect(add(a, b)).toEqual([5, 7, 9]);
    expect(sub(b, a)).toEqual([3, 3, 3]);
    expect(mul(a, b)).toEqual([4, 10, 18]);
    expect(mulScalar(a, 2)).toEqual([2, 4, 6]);
    expect(divScalar([2, 4, 6], 2)).toEqual(a);
    expect(neg(a)).toEqual([-1, -2, -3]);
    expect(dot(a, b)).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(lengthSquared([0, 3, 4])).toBe(25);
    expect(length([0, 3, 4])).toBe(5);
  });

  it('normalizes, reflects, refracts, and detects near-zero vectors', () => {
    expect(unit([0, 0, 5])).toEqual([0, 0, 1]);
    expect(reflect([1, -1, 0], [0, 1, 0])).toEqual([1, 1, 0]);
    expect(nearZero([1e-9, -1e-9, 1e-9])).toBe(true);
    expect(nearZero([1e-7, 0, 0])).toBe(false);

    const refracted = refract(unit([0, -1, -1]), [0, 1, 0], 1 / 1.5);
    expect(refracted[0]).toBeCloseTo(0, 15);
    expect(refracted[1]).toBeCloseTo(-0.88191710368819698, 15);
    expect(refracted[2]).toBeCloseTo(-0.47140452079103162, 15);
  });
});
