import { add, cross, divScalar, mulScalar, sub, unit, type Vec3 } from './vec3';
import type { CameraPreset } from '../presets/renderPresets';

export interface BuiltCamera {
  center: Vec3;
  pixel00: Vec3;
  pixelDeltaU: Vec3;
  pixelDeltaV: Vec3;
  u: Vec3;
  v: Vec3;
  w: Vec3;
  defocusDiskU: Vec3;
  defocusDiskV: Vec3;
}

export function buildCamera(preset: CameraPreset, imageWidth: number, imageHeight: number): BuiltCamera {
  const center = preset.lookFrom;
  const theta = degreesToRadians(preset.vfov);
  const h = Math.tan(theta / 2);
  const viewportHeight = 2 * h * preset.focusDist;
  const viewportWidth = viewportHeight * (imageWidth / imageHeight);

  const w = unit(sub(preset.lookFrom, preset.lookAt));
  const u = unit(cross(preset.viewUp, w));
  const v = cross(w, u);

  const viewportU = mulScalar(u, viewportWidth);
  const viewportV = mulScalar(v, -viewportHeight);
  const pixelDeltaU = divScalar(viewportU, imageWidth);
  const pixelDeltaV = divScalar(viewportV, imageHeight);

  const viewportUpperLeft = sub(
    sub(sub(center, mulScalar(w, preset.focusDist)), divScalar(viewportU, 2)),
    divScalar(viewportV, 2),
  );
  const pixel00 = add(viewportUpperLeft, mulScalar(add(pixelDeltaU, pixelDeltaV), 0.5));

  const defocusRadius = preset.focusDist * Math.tan(degreesToRadians(preset.defocusAngle / 2));
  const defocusDiskU = mulScalar(u, defocusRadius);
  const defocusDiskV = mulScalar(v, defocusRadius);

  return { center, pixel00, pixelDeltaU, pixelDeltaV, u, v, w, defocusDiskU, defocusDiskV };
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
