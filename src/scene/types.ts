import type { Vec3 } from '../math/vec3';

export enum MaterialType {
  Lambertian = 0,
  Metal = 1,
  Dielectric = 2,
}

export type Material =
  | { type: MaterialType.Lambertian; albedo: Vec3 }
  | { type: MaterialType.Metal; albedo: Vec3; fuzz: number }
  | { type: MaterialType.Dielectric; refractionIndex: number };

export interface Sphere {
  center: Vec3;
  radius: number;
  material: Material;
}

export interface Scene {
  spheres: Sphere[];
}
