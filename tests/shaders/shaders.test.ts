import { describe, expect, it } from 'vitest';
import { MAX_SHADER_SPHERES } from '../../src/rendering/renderer';
import { displayFragmentShader } from '../../src/shaders/display.frag';
import { fullscreenVertexShader } from '../../src/shaders/fullscreen.vert';
import { pathTraceFragmentShader } from '../../src/shaders/pathTrace.frag';

describe('shader sources', () => {
  it('exports a fullscreen triangle vertex shader', () => {
    expect(fullscreenVertexShader).toContain('#version 300 es');
    expect(fullscreenVertexShader).toContain('out vec2 vUv');
    expect(fullscreenVertexShader).toContain('gl_VertexID');
    expect(fullscreenVertexShader).toContain('gl_Position');
  });

  it('exports a path tracing shader with the required renderer uniforms and material ABI', () => {
    for (const uniform of [
      'uPreviousAccumulation',
      'uSphereData',
      'uMaterialData',
      'uSphereCount',
      'uFrameIndex',
      'uMaxDepth',
      'uResolution',
      'uCameraCenter',
      'uPixel00',
      'uPixelDeltaU',
      'uPixelDeltaV',
      'uDefocusDiskU',
      'uDefocusDiskV',
    ]) {
      expect(pathTraceFragmentShader).toContain(uniform);
    }

    expect(pathTraceFragmentShader).toContain('const int MATERIAL_LAMBERTIAN = 0');
    expect(pathTraceFragmentShader).toContain('const int MATERIAL_METAL = 1');
    expect(pathTraceFragmentShader).toContain('const int MATERIAL_DIELECTRIC = 2');
    expect(pathTraceFragmentShader).toContain('materialA');
    expect(pathTraceFragmentShader).toContain('materialB');
    expect(pathTraceFragmentShader).toContain('texelFetch(uMaterialData, ivec2(index * 2');
    expect(pathTraceFragmentShader).toContain(`i < ${MAX_SHADER_SPHERES}`);
  });

  it('exports a display shader that averages and gamma corrects accumulation', () => {
    expect(displayFragmentShader).toContain('#version 300 es');
    expect(displayFragmentShader).toContain('uniform sampler2D uAccumulation');
    expect(displayFragmentShader).toContain('uniform int uSampleCount');
    expect(displayFragmentShader).toContain('sqrt');
  });
});
