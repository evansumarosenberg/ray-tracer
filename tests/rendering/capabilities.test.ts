import { describe, expect, it } from 'vitest';
import { checkWebGlCapabilities, type WebGlCapabilityAdapter } from '../../src/rendering/capabilities';

function adapter(overrides: Partial<WebGlCapabilityAdapter>): WebGlCapabilityAdapter {
  return {
    hasWebGl2: true,
    hasExtension: () => true,
    canRenderToFloatTexture: () => true,
    ...overrides,
  };
}

describe('checkWebGlCapabilities', () => {
  it('accepts WebGL2 with float render target support', () => {
    expect(checkWebGlCapabilities(adapter({}))).toEqual({ supported: true });
  });

  it('rejects missing WebGL2', () => {
    expect(checkWebGlCapabilities(adapter({ hasWebGl2: false }))).toEqual({
      supported: false,
      reason: 'WebGL2 is required.',
    });
  });

  it('rejects missing float color buffer support', () => {
    expect(checkWebGlCapabilities(adapter({ hasExtension: () => false }))).toEqual({
      supported: false,
      reason: 'Floating-point color buffer support is required.',
    });
  });

  it('rejects GPUs that cannot attach float textures to framebuffers', () => {
    expect(checkWebGlCapabilities(adapter({ canRenderToFloatTexture: () => false }))).toEqual({
      supported: false,
      reason: 'Floating-point framebuffer rendering is not supported.',
    });
  });
});
