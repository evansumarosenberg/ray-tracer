import type { RenderPreset } from '../presets/renderPresets';

export const MIN_RESOLUTION_SCALE = 0.1;
export const MAX_RESOLUTION_SCALE = 1;

export interface RenderSettings {
  presetId: RenderPreset['id'];
  aspectRatio: number;
  imageWidth: number;
  resolutionScale: number;
  samplesPerPixel: number;
  maxDepth: number;
  paused: boolean;
}

export function computeRenderSize(imageWidth: number, aspectRatio: number, resolutionScale: number) {
  const width = Math.max(1, Math.floor(imageWidth * resolutionScale));
  const height = Math.max(1, Math.floor(width / aspectRatio));
  return { width, height };
}

export function createRenderSettings(
  preset: RenderPreset,
  overrides: Partial<Pick<RenderSettings, 'resolutionScale' | 'samplesPerPixel' | 'maxDepth' | 'paused'>> = {},
): RenderSettings {
  const resolutionScale = clamp(
    finiteOrFallback(overrides.resolutionScale, MAX_RESOLUTION_SCALE),
    MIN_RESOLUTION_SCALE,
    MAX_RESOLUTION_SCALE,
  );
  const samplesPerPixel = Math.max(
    1,
    Math.floor(finiteOrFallback(overrides.samplesPerPixel, preset.samplesPerPixel)),
  );
  const maxDepth = Math.max(1, Math.floor(finiteOrFallback(overrides.maxDepth, preset.maxDepth)));

  return {
    presetId: preset.id,
    aspectRatio: preset.camera.aspectRatio,
    imageWidth: preset.camera.imageWidth,
    resolutionScale,
    samplesPerPixel,
    maxDepth,
    paused: overrides.paused ?? false,
  };
}

export function shouldResetAccumulation(previous: RenderSettings, next: RenderSettings): boolean {
  return (
    previous.presetId !== next.presetId ||
    previous.aspectRatio !== next.aspectRatio ||
    previous.imageWidth !== next.imageWidth ||
    previous.resolutionScale !== next.resolutionScale ||
    previous.samplesPerPixel !== next.samplesPerPixel ||
    previous.maxDepth !== next.maxDepth
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOrFallback(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}
