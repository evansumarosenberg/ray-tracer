import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';
import { computeRenderSize, createRenderSettings, shouldResetAccumulation } from '../../src/rendering/settings';

describe('render settings', () => {
  it('computes 16:9 render sizes from image width and scale', () => {
    expect(computeRenderSize(1200, 16 / 9, 1)).toEqual({ width: 1200, height: 675 });
    expect(computeRenderSize(1200, 16 / 9, 0.5)).toEqual({ width: 600, height: 337 });
  });

  it('validates user-adjustable values', () => {
    const settings = createRenderSettings(DEVELOPMENT_PRESET, {
      resolutionScale: 0.25,
      maxDepth: 8,
      samplesPerPixel: 12,
    });

    expect(settings.resolutionScale).toBe(0.25);
    expect(settings.maxDepth).toBe(8);
    expect(settings.samplesPerPixel).toBe(12);
  });

  it('identifies render-affecting setting changes', () => {
    const base = createRenderSettings(DEVELOPMENT_PRESET, {});
    const changedDepth = { ...base, maxDepth: base.maxDepth - 1 };
    const changedPaused = { ...base, paused: !base.paused };

    expect(shouldResetAccumulation(base, changedDepth)).toBe(true);
    expect(shouldResetAccumulation(base, changedPaused)).toBe(false);
  });
});
