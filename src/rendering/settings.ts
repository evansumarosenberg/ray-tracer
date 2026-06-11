import type { RenderPreset } from '../presets/renderPresets';

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
  overrides: Partial<Pick<RenderSettings, 'resolutionScale' | 'samplesPerPixel' | 'maxDepth' | 'paused'>>,
): RenderSettings {
  const resolutionScale = clamp(overrides.resolutionScale ?? 1, 0.1, 1);
  const samplesPerPixel = Math.max(1, Math.floor(overrides.samplesPerPixel ?? preset.samplesPerPixel));
  const maxDepth = Math.max(1, Math.floor(overrides.maxDepth ?? preset.maxDepth));

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
