import { describe, expect, it } from 'vitest';
import { buildCamera } from '../../src/math/camera';
import { DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';

describe('buildCamera', () => {
  it('builds a right-handed camera frame from the book settings', () => {
    const camera = buildCamera(DEVELOPMENT_PRESET.camera, 1200, 675);

    expect(camera.center).toEqual([13, 2, 3]);
    expect(camera.w[0]).toBeCloseTo(0.963624, 6);
    expect(camera.w[1]).toBeCloseTo(0.148250, 6);
    expect(camera.w[2]).toBeCloseTo(0.222375, 6);
    expect(camera.u[0]).toBeCloseTo(0.224860, 6);
    expect(camera.u[2]).toBeCloseTo(-0.974391, 6);
    expect(camera.v[1]).toBeCloseTo(0.988950, 6);
  });

  it('computes viewport and defocus disk values', () => {
    const camera = buildCamera(DEVELOPMENT_PRESET.camera, 1200, 675);

    expect(camera.pixelDeltaU[0]).toBeGreaterThan(0);
    expect(camera.pixelDeltaV[1]).toBeLessThan(0);
    expect(camera.defocusDiskU[0]).toBeGreaterThan(0);
    expect(camera.defocusDiskV[1]).toBeGreaterThan(0);
  });
});
