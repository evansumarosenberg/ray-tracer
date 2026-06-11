import type { Vec3 } from '../math/vec3';

export interface CameraPreset {
  aspectRatio: number;
  imageWidth: number;
  vfov: number;
  lookFrom: Vec3;
  lookAt: Vec3;
  viewUp: Vec3;
  defocusAngle: number;
  focusDist: number;
}

export interface RenderPreset {
  id: 'development' | 'book-quality';
  label: string;
  samplesPerPixel: number;
  maxDepth: number;
  camera: CameraPreset;
}

const FINAL_CAMERA: CameraPreset = {
  aspectRatio: 16 / 9,
  imageWidth: 1200,
  vfov: 20,
  lookFrom: [13, 2, 3],
  lookAt: [0, 0, 0],
  viewUp: [0, 1, 0],
  defocusAngle: 0.6,
  focusDist: 10,
};

export const DEVELOPMENT_PRESET: RenderPreset = {
  id: 'development',
  label: 'Development',
  samplesPerPixel: 10,
  maxDepth: 20,
  camera: FINAL_CAMERA,
};

export const BOOK_QUALITY_PRESET: RenderPreset = {
  id: 'book-quality',
  label: 'Book Quality',
  samplesPerPixel: 500,
  maxDepth: 50,
  camera: FINAL_CAMERA,
};

export const RENDER_PRESETS = [DEVELOPMENT_PRESET, BOOK_QUALITY_PRESET] as const;
