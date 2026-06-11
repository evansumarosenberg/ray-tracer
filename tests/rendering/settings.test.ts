import { describe, expect, it } from 'vitest';
import { BOOK_QUALITY_PRESET, DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';
import {
  MAX_RESOLUTION_SCALE,
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
    expect(createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: Number.NaN }).resolutionScale).toBe(1);

    const infiniteScale = createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: Number.POSITIVE_INFINITY });
    expect(Number.isFinite(infiniteScale.resolutionScale)).toBe(true);
    expect(infiniteScale.resolutionScale).toBe(1);

    expect(createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: 0.01 }).resolutionScale).toBe(
      MIN_RESOLUTION_SCALE,
    );
    expect(createRenderSettings(DEVELOPMENT_PRESET, { resolutionScale: 2 }).resolutionScale).toBe(
      MAX_RESOLUTION_SCALE,
    );
    expect(createRenderSettings(DEVELOPMENT_PRESET, { samplesPerPixel: Number.NaN }).samplesPerPixel).toBe(
      DEVELOPMENT_PRESET.samplesPerPixel,
    );

    const infiniteDepth = createRenderSettings(DEVELOPMENT_PRESET, { maxDepth: Number.POSITIVE_INFINITY });
    expect(Number.isFinite(infiniteDepth.maxDepth)).toBe(true);
    expect(infiniteDepth.maxDepth).toBe(DEVELOPMENT_PRESET.maxDepth);
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
