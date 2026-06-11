import { createRng, DEFAULT_SCENE_SEED } from '../math/rng';
import { length, mul, sub, type Vec3 } from '../math/vec3';
import { MaterialType, type Material, type Scene, type Sphere } from './types';

export function createFinalScene(seed = DEFAULT_SCENE_SEED): Scene {
  const rng = createRng(seed);
  const spheres: Sphere[] = [];

  spheres.push({
    center: [0, -1000, 0],
    radius: 1000,
    material: { type: MaterialType.Lambertian, albedo: [0.5, 0.5, 0.5] },
  });

  for (let a = -11; a < 11; a += 1) {
    for (let b = -11; b < 11; b += 1) {
      const chooseMat = rng.next();
      const center: Vec3 = [a + 0.9 * rng.next(), 0.2, b + 0.9 * rng.next()];

      if (length(sub(center, [4, 0.2, 0])) <= 0.9) {
        continue;
      }

      spheres.push({
        center,
        radius: 0.2,
        material: createRandomMaterial(chooseMat, rng),
      });
    }
  }

  spheres.push(
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
  );

  return { spheres };
}

function createRandomMaterial(chooseMat: number, rng: ReturnType<typeof createRng>): Material {
  if (chooseMat < 0.8) {
    return {
      type: MaterialType.Lambertian,
      albedo: mul(randomVec3(rng, 0, 1), randomVec3(rng, 0, 1)),
    };
  }

  if (chooseMat < 0.95) {
    return {
      type: MaterialType.Metal,
      albedo: randomVec3(rng, 0.5, 1),
      fuzz: rng.range(0, 0.5),
    };
  }

  return { type: MaterialType.Dielectric, refractionIndex: 1.5 };
}

function randomVec3(rng: ReturnType<typeof createRng>, min: number, max: number): Vec3 {
  return [rng.range(min, max), rng.range(min, max), rng.range(min, max)];
}
