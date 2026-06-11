import { describe, expect, it } from 'vitest';
import { BOOK_QUALITY_PRESET, DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';
import {
  MAX_RESOLUTION_SCALE,
  MAX_RENDER_DIMENSION,
  MIN_RESOLUTION_SCALE,
  computeRenderSize,
  createRenderSettings,
  shouldResetAccumulation,
} from '../../src/rendering/settings';

describe('render settings', () => {
  it('computes 16:9 render sizes from image width and scale', () => {
    expect(computeRenderSize(1200, 16 / 9, 1)).toEqual({ width: 1200, height: 675 });
    expect(computeRenderSize(1200, 16 / 9, 0.5)).toEqual({ width: 600, height: 337 });
  });

  it('always computes finite positive render sizes from unsafe inputs', () => {
    const unsafeCases = [
      { label: 'NaN width', args: [Number.NaN, 16 / 9, 1] },
      { label: 'infinite width', args: [Number.POSITIVE_INFINITY, 16 / 9, 1] },
      { label: 'negative infinite width', args: [Number.NEGATIVE_INFINITY, 16 / 9, 1] },
      { label: 'zero aspect ratio', args: [1200, 0, 1] },
      { label: 'NaN aspect ratio', args: [1200, Number.NaN, 1] },
      { label: 'infinite aspect ratio', args: [1200, Number.POSITIVE_INFINITY, 1] },
      { label: 'negative width and scale', args: [-1200, 16 / 9, -1] },
      { label: 'negative aspect ratio', args: [1200, -16 / 9, 1] },
      { label: 'infinite scale', args: [1200, 16 / 9, Number.POSITIVE_INFINITY] },
      { label: 'negative infinite scale', args: [1200, 16 / 9, Number.NEGATIVE_INFINITY] },
    ] satisfies Array<{ label: string; args: [number, number, number] }>;

    for (const { label, args } of unsafeCases) {
      const size = computeRenderSize(...args);

      expect(Number.isInteger(size.width), `${label} width integer`).toBe(true);
      expect(Number.isInteger(size.height), `${label} height integer`).toBe(true);
      expect(size.width, `${label} width positive`).toBeGreaterThanOrEqual(1);
      expect(size.height, `${label} height positive`).toBeGreaterThanOrEqual(1);
      expect(size.width, `${label} width capped`).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
      expect(size.height, `${label} height capped`).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    }
  });

  it('caps finite extreme render sizes', () => {
    const tinyAspectRatio = computeRenderSize(1200, Number.MIN_VALUE, 1);
    const hugeWidth = computeRenderSize(Number.MAX_VALUE, 0.1, 1);

    for (const size of [tinyAspectRatio, hugeWidth]) {
      expect(Number.isInteger(size.width)).toBe(true);
      expect(Number.isInteger(size.height)).toBe(true);
      expect(size.width).toBeGreaterThanOrEqual(1);
      expect(size.height).toBeGreaterThanOrEqual(1);
      expect(size.width).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
      expect(size.height).toBeLessThanOrEqual(MAX_RENDER_DIMENSION);
    }
  });

  it('validates user-adjustable values', () => {
    const settings = createRenderSettings(DEVELOPMENT_PRESET, {
      resolutionScale: 0.25,
      maxDepth: 8.9,
      samplesPerPixel: 12.9,
    });

    expect(settings.resolutionScale).toBe(0.25);
    expect(settings.maxDepth).toBe(8);
    expect(settings.samplesPerPixel).toBe(12);
  });

  it('normalizes unsafe numeric overrides', () => {
    expect(createRenderSettings(DEVELOPMENT_PRESET).resolutionScale).toBe(1);

    for (const unsafeValue of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const settings = createRenderSettings(DEVELOPMENT_PRESET, {
        resolutionScale: unsafeValue,
        samplesPerPixel: unsafeValue,
        maxDepth: unsafeValue,
      });

      expect(Number.isFinite(settings.resolutionScale)).toBe(true);
      expect(settings.resolutionScale).toBe(1);
      expect(Number.isFinite(settings.samplesPerPixel)).toBe(true);
      expect(settings.samplesPerPixel).toBe(DEVELOPMENT_PRESET.samplesPerPixel);
      expect(Number.isFinite(settings.maxDepth)).toBe(true);
      expect(settings.maxDepth).toBe(DEVELOPMENT_PRESET.maxDepth);
    }

    expect(createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: 0.01 }).resolutionScale).toBe(
      MIN_RESOLUTION_SCALE,
    );
    expect(createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: 2 }).resolutionScale).toBe(
      MAX_RESOLUTION_SCALE,
    );
  });

  it('identifies render-affecting setting changes', () => {
    const base = createRenderSettings(DEVELOPMENT_PRESET);
    const renderAffectingChanges = [
      { field: 'presetId', next: { ...base, presetId: BOOK_QUALITY_PRESET.id } },
      { field: 'aspectRatio', next: { ...base, aspectRatio: 1 } },
      { field: 'imageWidth', next: { ...base, imageWidth: base.imageWidth - 1 } },
      { field: 'resolutionScale', next: { ...base, resolutionScale: base.resolutionScale / 2 } },
      { field: 'samplesPerPixel', next: { ...base, samplesPerPixel: base.samplesPerPixel + 1 } },
      { field: 'maxDepth', next: { ...base, maxDepth: base.maxDepth - 1 } },
    ];

    for (const { field, next } of renderAffectingChanges) {
      expect(shouldResetAccumulation(base, next), field).toBe(true);
    }
  });

  it('does not reset accumulation for paused-only changes', () => {
    const base = createRenderSettings(DEVELOPMENT_PRESET);
    const changedPaused = { ...base, paused: !base.paused };

    expect(shouldResetAccumulation(base, changedPaused)).toBe(false);
  });
});
