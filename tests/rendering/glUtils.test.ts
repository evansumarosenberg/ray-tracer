import { describe, expect, it } from 'vitest';
import { createFloatTexture, createFramebufferForTexture } from '../../src/rendering/glUtils';
import { FakeWebGl2 } from './fakeWebGl';

describe('createFloatTexture', () => {
  it.each([
    ['zero width', 0, 1],
    ['negative height', 1, -1],
    ['fractional width', 1.5, 1],
    ['NaN width', Number.NaN, 1],
    ['infinite height', 1, Number.POSITIVE_INFINITY],
  ])('rejects invalid dimensions: %s', (_label, width, height) => {
    const fake = new FakeWebGl2();

    expect(() => createFloatTexture(fake.asWebGl2(), width, height)).toThrow(
      'Float texture dimensions must be finite positive integers.',
    );

    expect(fake.texImage2DCalls).toBe(0);
    expect(fake.deletedTextures).toHaveLength(0);
  });

  it('rejects dimensions larger than MAX_TEXTURE_SIZE', () => {
    const fake = new FakeWebGl2({ maxTextureSize: 8 });

    expect(() => createFloatTexture(fake.asWebGl2(), 9, 8)).toThrow(
      'Float texture dimensions exceed MAX_TEXTURE_SIZE 8.',
    );

    expect(fake.texImage2DCalls).toBe(0);
    expect(fake.deletedTextures).toHaveLength(0);
  });

  it('deletes the texture and restores binding when texture upload reports a GL error', () => {
    const fake = new FakeWebGl2({ texImage2DError: 0x0505 });
    const textureBinding = fake.textureBinding;

    expect(() => createFloatTexture(fake.asWebGl2(), 4, 4)).toThrow(
      'Failed to allocate float texture; WebGL error 0x0505.',
    );

    expect(fake.deletedTextures).toHaveLength(1);
    expect(fake.textureBinding).toBe(textureBinding);
  });
});

describe('createFramebufferForTexture', () => {
  it('uses draw framebuffer state and preserves read framebuffer binding', () => {
    const fake = new FakeWebGl2();
    const texture = fake.createTexture();
    const drawFramebufferBinding = fake.drawFramebufferBinding;
    const readFramebufferBinding = fake.readFramebufferBinding;

    const framebuffer = createFramebufferForTexture(fake.asWebGl2(), texture);

    expect(framebuffer).toBeDefined();
    expect(fake.drawFramebufferBinding).toBe(drawFramebufferBinding);
    expect(fake.readFramebufferBinding).toBe(readFramebufferBinding);
  });

  it('includes the framebuffer status code in incomplete-framebuffer errors', () => {
    const fake = new FakeWebGl2({ framebufferStatus: 0x8cd6 });
    const texture = fake.createTexture();

    expect(() => createFramebufferForTexture(fake.asWebGl2(), texture)).toThrow(
      'WebGL framebuffer is incomplete: 0x8cd6.',
    );

    expect(fake.deletedFramebuffers).toHaveLength(1);
  });
});
