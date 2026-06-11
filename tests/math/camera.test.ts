import { describe, expect, it } from 'vitest';
import { buildCamera } from '../../src/math/camera';
import { cross, dot, type Vec3 } from '../../src/math/vec3';
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

    expect(dot(camera.u, camera.v)).toBeCloseTo(0, 12);
    expect(dot(camera.u, camera.w)).toBeCloseTo(0, 12);
    expect(dot(camera.v, camera.w)).toBeCloseTo(0, 12);
    expectVec3Close(cross(camera.u, camera.v), camera.w);
  });

  it('computes viewport and defocus disk values', () => {
    const camera = buildCamera(DEVELOPMENT_PRESET.camera, 1200, 675);

    expectVec3Close(camera.pixelDeltaU, [0.001174779, 0, -0.005090710]);
    expectVec3Close(camera.pixelDeltaV, [0.000754697, -0.005166772, 0.000174161]);
    expectVec3Close(camera.pixel00, [2.405145852, 2.258703545, 3.769440399]);
    expectVec3Close(camera.defocusDiskU, [0.011773724, 0, -0.051019470]);
    expectVec3Close(camera.defocusDiskV, [-0.007563629, 0.051781771, -0.001745453]);
  });

  it('rejects invalid image dimensions', () => {
    const invalidDimensions = [
      [0, 675],
      [-1, 675],
      [Number.NaN, 675],
      [Number.POSITIVE_INFINITY, 675],
      [1200, 0],
      [1200, -1],
      [1200, Number.NaN],
      [1200, Number.NEGATIVE_INFINITY],
    ];

    for (const [imageWidth, imageHeight] of invalidDimensions) {
      expect(() => buildCamera(DEVELOPMENT_PRESET.camera, imageWidth, imageHeight)).toThrow(/image dimensions/i);
    }
  });
});

function expectVec3Close(actual: Vec3, expected: Vec3, precision = 6): void {
  expect(actual[0]).toBeCloseTo(expected[0], precision);
  expect(actual[1]).toBeCloseTo(expected[1], precision);
  expect(actual[2]).toBeCloseTo(expected[2], precision);
}
