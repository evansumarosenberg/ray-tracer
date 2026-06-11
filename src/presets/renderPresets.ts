import type { Vec3 } from '../math/vec3';

export interface CameraPreset {
  readonly aspectRatio: number;
  readonly imageWidth: number;
  readonly vfov: number;
  readonly lookFrom: Vec3;
  readonly lookAt: Vec3;
  readonly viewUp: Vec3;
  readonly defocusAngle: number;
  readonly focusDist: number;
}

export type RenderPresetId = 'development' | 'book-quality';

export interface RenderPreset {
  readonly id: RenderPresetId;
  readonly label: string;
  readonly samplesPerPixel: number;
  readonly maxDepth: number;
  readonly camera: CameraPreset;
}

const FINAL_CAMERA: CameraPreset = Object.freeze({
  aspectRatio: 16 / 9,
  imageWidth: 1200,
  vfov: 20,
  lookFrom: [13, 2, 3] as const,
  lookAt: [0, 0, 0] as const,
  viewUp: [0, 1, 0] as const,
  defocusAngle: 0.6,
  focusDist: 10,
});

export const DEVELOPMENT_PRESET: RenderPreset = Object.freeze({
  id: 'development',
  label: 'Development',
  samplesPerPixel: 10,
  maxDepth: 20,
  camera: FINAL_CAMERA,
});

export const BOOK_QUALITY_PRESET: RenderPreset = Object.freeze({
  id: 'book-quality',
  label: 'Book Quality',
  samplesPerPixel: 500,
  maxDepth: 50,
  camera: FINAL_CAMERA,
});

export const RENDER_PRESETS = Object.freeze([DEVELOPMENT_PRESET, BOOK_QUALITY_PRESET] as const);
