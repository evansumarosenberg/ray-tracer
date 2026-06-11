import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import { MaterialType } from '../../src/scene/types';

describe('createFinalScene', () => {
  it('creates a deterministic final book scene for the fixed seed', () => {
    const a = createFinalScene();
    const b = createFinalScene();

    expect(a).toEqual(b);
    expect(a.spheres).toHaveLength(485);
  });

  it('matches fixed material counts for seed 20260611', () => {
    const scene = createFinalScene();
    const counts = scene.spheres.reduce(
      (acc, sphere) => {
        acc[sphere.material.type] += 1;
        return acc;
      },
      {
        [MaterialType.Lambertian]: 0,
        [MaterialType.Metal]: 0,
        [MaterialType.Dielectric]: 0,
      },
    );

    expect(counts[MaterialType.Lambertian]).toBe(378);
    expect(counts[MaterialType.Metal]).toBe(76);
    expect(counts[MaterialType.Dielectric]).toBe(31);
  });

  it('keeps random small spheres outside the book exclusion zone', () => {
    const smallSpheres = createFinalScene().spheres.filter((sphere) => sphere.radius === 0.2);

    for (const sphere of smallSpheres) {
      const dx = sphere.center[0] - 4;
      const dz = sphere.center[2] - 0;
      expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThan(0.9);
    }
  });
});
