import { describe, expect, it } from 'vitest';
import { BOOK_QUALITY_PRESET, DEVELOPMENT_PRESET, RENDER_PRESETS } from '../../src/presets/renderPresets';

describe('render presets', () => {
  it('captures development and book-quality targets', () => {
    expect(DEVELOPMENT_PRESET.samplesPerPixel).toBe(10);
    expect(DEVELOPMENT_PRESET.maxDepth).toBe(20);
    expect(BOOK_QUALITY_PRESET.samplesPerPixel).toBe(500);
    expect(BOOK_QUALITY_PRESET.maxDepth).toBe(50);
  });

  it('keeps camera settings faithful to the final book scene', () => {
    expect(BOOK_QUALITY_PRESET.camera).toEqual(DEVELOPMENT_PRESET.camera);
    expect(BOOK_QUALITY_PRESET.camera.aspectRatio).toBe(16 / 9);
    expect(BOOK_QUALITY_PRESET.camera.imageWidth).toBe(1200);
    expect(BOOK_QUALITY_PRESET.camera.vfov).toBe(20);
    expect(BOOK_QUALITY_PRESET.camera.lookFrom).toEqual([13, 2, 3]);
    expect(BOOK_QUALITY_PRESET.camera.lookAt).toEqual([0, 0, 0]);
    expect(BOOK_QUALITY_PRESET.camera.viewUp).toEqual([0, 1, 0]);
    expect(BOOK_QUALITY_PRESET.camera.defocusAngle).toBe(0.6);
    expect(BOOK_QUALITY_PRESET.camera.focusDist).toBe(10);
  });

  it('freezes exported preset objects', () => {
    expect(Object.isFrozen(DEVELOPMENT_PRESET)).toBe(true);
    expect(Object.isFrozen(BOOK_QUALITY_PRESET)).toBe(true);
    expect(Object.isFrozen(BOOK_QUALITY_PRESET.camera)).toBe(true);
    expect(Object.isFrozen(RENDER_PRESETS)).toBe(true);
  });
});
