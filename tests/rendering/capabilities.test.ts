import { describe, expect, it } from 'vitest';
import {
  checkWebGlCapabilities,
  createWebGlCapabilityAdapter,
  type WebGlCapabilityAdapter,
} from '../../src/rendering/capabilities';
import { FakeWebGl2 } from './fakeWebGl';

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

  it('cleans up resources and restores bindings after a successful float framebuffer probe', () => {
    const fake = new FakeWebGl2();
    const textureBinding = fake.textureBinding;
    const drawFramebufferBinding = fake.drawFramebufferBinding;
    const readFramebufferBinding = fake.readFramebufferBinding;
    const capabilityAdapter = createWebGlCapabilityAdapter(fake.asWebGl2());

    expect(capabilityAdapter.canRenderToFloatTexture()).toBe(true);

    expect(fake.deletedTextures).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(1);
    expect(fake.textureBinding).toBe(textureBinding);
    expect(fake.drawFramebufferBinding).toBe(drawFramebufferBinding);
    expect(fake.readFramebufferBinding).toBe(readFramebufferBinding);
  });

  it('deletes the probe texture when framebuffer creation fails', () => {
    const fake = new FakeWebGl2({ createFramebufferReturnsNull: true });
    const capabilityAdapter = createWebGlCapabilityAdapter(fake.asWebGl2());

    expect(capabilityAdapter.canRenderToFloatTexture()).toBe(false);

    expect(fake.deletedTextures).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(0);
  });

  it('restores state and deletes probe resources when float texture allocation throws', () => {
    const fake = new FakeWebGl2({ texImage2DThrows: true });
    const textureBinding = fake.textureBinding;
    const drawFramebufferBinding = fake.drawFramebufferBinding;
    const readFramebufferBinding = fake.readFramebufferBinding;
    const capabilityAdapter = createWebGlCapabilityAdapter(fake.asWebGl2());

    expect(capabilityAdapter.canRenderToFloatTexture()).toBe(false);

    expect(fake.deletedTextures).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(0);
    expect(fake.textureBinding).toBe(textureBinding);
    expect(fake.drawFramebufferBinding).toBe(drawFramebufferBinding);
    expect(fake.readFramebufferBinding).toBe(readFramebufferBinding);
  });

  it('returns false and cleans up when the float framebuffer is incomplete', () => {
    const fake = new FakeWebGl2({ framebufferStatus: 0x8cd6 });
    const capabilityAdapter = createWebGlCapabilityAdapter(fake.asWebGl2());

    expect(capabilityAdapter.canRenderToFloatTexture()).toBe(false);

    expect(fake.deletedTextures).toHaveLength(1);
    expect(fake.deletedFramebuffers).toHaveLength(1);
  });
});
