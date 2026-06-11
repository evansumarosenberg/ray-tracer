import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';
import { MAX_SHADER_SPHERES, ProgressiveRenderer, type RendererOptions } from '../../src/rendering/renderer';
import type { PackedScene } from '../../src/scene/gpuPacking';
import { FakeWebGl2 } from './fakeWebGl';

describe('ProgressiveRenderer', () => {
  it('increments sample count until the target and keeps returning render stats', () => {
    const fake = new FakeWebGl2();
    const renderer = createRenderer(fake, { targetSamples: 2 });

    expect(renderer.renderFrame()).toEqual({ sampleCount: 1, targetSamples: 2, width: 4, height: 2 });
    expect(renderer.renderFrame()).toEqual({ sampleCount: 2, targetSamples: 2, width: 4, height: 2 });
    expect(renderer.renderFrame()).toEqual({ sampleCount: 2, targetSamples: 2, width: 4, height: 2 });
    expect(fake.drawCalls).toHaveLength(5);
  });

  it('clears both accumulation framebuffers and resets sample count', () => {
    const fake = new FakeWebGl2();
    const viewport = [...fake.viewportValue];
    const renderer = createRenderer(fake, { targetSamples: 4 });

    expect(fake.viewportValue).toEqual(viewport);
    renderer.renderFrame();
    fake.viewportValue = [7, 8, 9, 10];
    fake.clearCalls.length = 0;
    renderer.reset();

    expect(renderer.stats().sampleCount).toBe(0);
    expect(fake.clearCalls).toHaveLength(2);
    expect(fake.clearCalls.map((call) => call.framebuffer?.id)).toEqual([1, 2]);
    expect(fake.viewportValue).toEqual([7, 8, 9, 10]);
  });

  it('deletes owned resources once when disposed repeatedly', () => {
    const fake = new FakeWebGl2();
    const renderer = createRenderer(fake);

    renderer.dispose();
    renderer.dispose();

    expect(fake.deletedPrograms).toHaveLength(2);
    expect(fake.deletedVertexArrays).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(2);
    expect(fake.deletedTextures).toHaveLength(4);
  });

  it('cleans up already-created resources when construction fails', () => {
    const fake = new FakeWebGl2({ texSubImage2DError: 0x0505 });

    expect(() => createRenderer(fake)).toThrow('Failed to upload sphere data; WebGL error 0x0505.');

    expect(fake.deletedPrograms).toHaveLength(2);
    expect(fake.deletedVertexArrays).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(2);
    expect(fake.deletedTextures).toHaveLength(3);
  });

  it('rejects scenes larger than the shader sphere loop cap before allocating resources', () => {
    const fake = new FakeWebGl2();

    expect(() => createRenderer(fake, { packedScene: createPackedScene(MAX_SHADER_SPHERES + 1) })).toThrow(
      `ProgressiveRenderer supports at most ${MAX_SHADER_SPHERES} spheres.`,
    );

    expect(fake.texImage2DCalls).toBe(0);
    expect(fake.deletedTextures).toHaveLength(0);
  });

  it('rejects maxDepth values larger than the shader ray loop cap', () => {
    const fake = new FakeWebGl2();

    expect(() => createRenderer(fake, { maxDepth: 65 })).toThrow('ProgressiveRenderer maxDepth must be <= 64.');

    expect(fake.texImage2DCalls).toBe(0);
    expect(fake.deletedTextures).toHaveLength(0);
  });
});

function createRenderer(fake: FakeWebGl2, overrides: Partial<RendererOptions> = {}): ProgressiveRenderer {
  return new ProgressiveRenderer({
    canvas: { width: 0, height: 0 } as HTMLCanvasElement,
    gl: fake.asWebGl2(),
    preset: DEVELOPMENT_PRESET,
    packedScene: createPackedScene(1),
    width: 4,
    height: 2,
    maxDepth: 4,
    targetSamples: 1,
    ...overrides,
  });
}

function createPackedScene(sphereCount: number): PackedScene {
  const spheres = new Float32Array(sphereCount * 4);
  const materials = new Float32Array(sphereCount * 8);

  for (let index = 0; index < sphereCount; index += 1) {
    const sphereOffset = index * 4;
    spheres[sphereOffset] = 0;
    spheres[sphereOffset + 1] = 0;
    spheres[sphereOffset + 2] = -1;
    spheres[sphereOffset + 3] = 0.5;

    const materialOffset = index * 8;
    materials[materialOffset] = 0;
    materials[materialOffset + 1] = 0.8;
    materials[materialOffset + 2] = 0.3;
    materials[materialOffset + 3] = 0.3;
  }

  return { sphereCount, spheres, materials };
}
