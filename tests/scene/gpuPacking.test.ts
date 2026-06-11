import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import {
  MATERIAL_ALBEDO_B_OFFSET,
  MATERIAL_ALBEDO_G_OFFSET,
  MATERIAL_ALBEDO_R_OFFSET,
  MATERIAL_FLOAT_STRIDE,
  MATERIAL_FUZZ_OFFSET,
  MATERIAL_REFRACTION_INDEX_OFFSET,
  MATERIAL_TYPE_OFFSET,
  SPHERE_CENTER_X_OFFSET,
  SPHERE_CENTER_Y_OFFSET,
  SPHERE_CENTER_Z_OFFSET,
  SPHERE_FLOAT_STRIDE,
  SPHERE_RADIUS_OFFSET,
  packSceneForGpu,
} from '../../src/scene/gpuPacking';
import { MaterialType, type Scene } from '../../src/scene/types';

describe('packSceneForGpu', () => {
  it('packs sphere and material data into aligned Float32Array buffers', () => {
    const scene = createFinalScene();
    const packed = packSceneForGpu(scene);

    expect(packed.sphereCount).toBe(scene.spheres.length);
    expect(packed.spheres).toBeInstanceOf(Float32Array);
    expect(packed.materials).toBeInstanceOf(Float32Array);
    expect(packed.spheres.length).toBe(scene.spheres.length * SPHERE_FLOAT_STRIDE);
    expect(packed.materials.length).toBe(scene.spheres.length * MATERIAL_FLOAT_STRIDE);
  });

  it('packs material variants into the documented ABI layout', () => {
    const scene: Scene = {
      spheres: [
        {
          center: [1, 2, 3],
          radius: 4,
          material: { type: MaterialType.Lambertian, albedo: [0.11, 0.22, 0.33] },
        },
        {
          center: [-5, -6, -7],
          radius: 8,
          material: { type: MaterialType.Metal, albedo: [0.44, 0.55, 0.66], fuzz: 0.77 },
        },
        {
          center: [9, 10, 11],
          radius: 12,
          material: { type: MaterialType.Dielectric, refractionIndex: 1.5 },
        },
      ],
    };
    const packed = packSceneForGpu(scene);

    expect(Array.from(packed.spheres)).toEqual([
      1, 2, 3, 4,
      -5, -6, -7, 8,
      9, 10, 11, 12,
    ]);

    expect(Array.from(packed.materials)).toEqual(float32Values([
      MaterialType.Lambertian, 0.11, 0.22, 0.33, 0, 0, 0, 0,
      MaterialType.Metal, 0.44, 0.55, 0.66, 0.77, 0, 0, 0,
      MaterialType.Dielectric, 0, 0, 0, 0, 1.5, 0, 0,
    ]));

    expect(packed.spheres[SPHERE_CENTER_X_OFFSET]).toBe(1);
    expect(packed.spheres[SPHERE_CENTER_Y_OFFSET]).toBe(2);
    expect(packed.spheres[SPHERE_CENTER_Z_OFFSET]).toBe(3);
    expect(packed.spheres[SPHERE_RADIUS_OFFSET]).toBe(4);
    expect(packed.materials[MATERIAL_TYPE_OFFSET]).toBe(MaterialType.Lambertian);
    expect(packed.materials[MATERIAL_ALBEDO_R_OFFSET]).toBeCloseTo(0.11);
    expect(packed.materials[MATERIAL_ALBEDO_G_OFFSET]).toBeCloseTo(0.22);
    expect(packed.materials[MATERIAL_ALBEDO_B_OFFSET]).toBeCloseTo(0.33);
    expect(packed.materials[MATERIAL_FLOAT_STRIDE + MATERIAL_FUZZ_OFFSET]).toBeCloseTo(0.77);
    expect(packed.materials[2 * MATERIAL_FLOAT_STRIDE + MATERIAL_REFRACTION_INDEX_OFFSET]).toBe(1.5);
  });
});

function float32Values(values: number[]): number[] {
  return Array.from(new Float32Array(values));
}
