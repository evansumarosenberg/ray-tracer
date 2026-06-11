import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import { MaterialType, type Scene, type Sphere } from '../../src/scene/types';

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

  it('matches the fixed seed scene fingerprint', () => {
    expect(sceneFingerprint(createFinalScene())).toBe(
      '93c214f0eb3cd298e5b8e47a1582286d4ce442b51900a56716e0254aa3941c34',
    );
  });

  it('keeps representative random small sphere sentinels stable', () => {
    const scene = createFinalScene();

    expect(normalizeSphere(scene.spheres[1])).toEqual({
      c: [-10.962941, 0.2, -10.44588],
      r: 0.2,
      m: MaterialType.Lambertian,
      a: [0.374497, 0.010881, 0.061879],
    });
    expect(normalizeSphere(scene.spheres[3])).toEqual({
      c: [-10.637889, 0.2, -8.760146],
      r: 0.2,
      m: MaterialType.Metal,
      a: [0.525292, 0.764482, 0.962117],
      f: 0.037939,
    });
    expect(normalizeSphere(scene.spheres[7])).toEqual({
      c: [-10.315622, 0.2, -4.74415],
      r: 0.2,
      m: MaterialType.Dielectric,
      ri: 1.5,
    });
  });

  it('keeps random small spheres outside the book exclusion zone', () => {
    const smallSpheres = createFinalScene().spheres.filter((sphere) => sphere.radius === 0.2);

    for (const sphere of smallSpheres) {
      expect(sphere.center[1]).toBe(0.2);
      const dx = sphere.center[0] - 4;
      const dz = sphere.center[2] - 0;
      expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThan(0.9);

      if (sphere.material.type === MaterialType.Lambertian || sphere.material.type === MaterialType.Metal) {
        for (const channel of sphere.material.albedo) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }

      if (sphere.material.type === MaterialType.Metal) {
        expect(sphere.material.fuzz).toBeGreaterThanOrEqual(0);
        expect(sphere.material.fuzz).toBeLessThan(0.5);
      }

      if (sphere.material.type === MaterialType.Dielectric) {
        expect(sphere.material.refractionIndex).toBe(1.5);
      }
    }
  });

  it('keeps canonical book spheres in fixed positions', () => {
    const scene = createFinalScene();

    expect(scene.spheres[0]).toEqual({
      center: [0, -1000, 0],
      radius: 1000,
      material: { type: MaterialType.Lambertian, albedo: [0.5, 0.5, 0.5] },
    });

    expect(scene.spheres.slice(-3)).toEqual([
      {
        center: [0, 1, 0],
        radius: 1,
        material: { type: MaterialType.Dielectric, refractionIndex: 1.5 },
      },
      {
        center: [-4, 1, 0],
        radius: 1,
        material: { type: MaterialType.Lambertian, albedo: [0.4, 0.2, 0.1] },
      },
      {
        center: [4, 1, 0],
        radius: 1,
        material: { type: MaterialType.Metal, albedo: [0.7, 0.6, 0.5], fuzz: 0 },
      },
    ]);
  });
});

interface NormalizedSphere {
  c: number[];
  r: number;
  m: MaterialType;
  a?: number[];
  f?: number;
  ri?: number;
}

function sceneFingerprint(scene: Scene): string {
  return createHash('sha256').update(JSON.stringify(scene.spheres.map(normalizeSphere))).digest('hex');
}

function normalizeSphere(sphere: Sphere): NormalizedSphere {
  const normalized: NormalizedSphere = {
    c: sphere.center.map(round6),
    r: round6(sphere.radius),
    m: sphere.material.type,
  };

  if ('albedo' in sphere.material) {
    normalized.a = sphere.material.albedo.map(round6);
  }

  if ('fuzz' in sphere.material) {
    normalized.f = round6(sphere.material.fuzz);
  }

  if ('refractionIndex' in sphere.material) {
    normalized.ri = round6(sphere.material.refractionIndex);
  }

  return normalized;
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}
