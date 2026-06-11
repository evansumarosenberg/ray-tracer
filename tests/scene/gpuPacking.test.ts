import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import { packSceneForGpu } from '../../src/scene/gpuPacking';

describe('packSceneForGpu', () => {
  it('packs sphere and material data into aligned Float32Array buffers', () => {
    const scene = createFinalScene();
    const packed = packSceneForGpu(scene);

    expect(packed.sphereCount).toBe(scene.spheres.length);
    expect(packed.spheres).toBeInstanceOf(Float32Array);
    expect(packed.materials).toBeInstanceOf(Float32Array);
    expect(packed.spheres.length).toBe(scene.spheres.length * 4);
    expect(packed.materials.length).toBe(scene.spheres.length * 8);
  });
});
