import type { Vec3 } from '../math/vec3';

export enum MaterialType {
  Lambertian = 0,
  Metal = 1,
  Dielectric = 2,
}

export type Material =
  | { readonly type: MaterialType.Lambertian; readonly albedo: Vec3 }
  | { readonly type: MaterialType.Metal; readonly albedo: Vec3; readonly fuzz: number }
  | { readonly type: MaterialType.Dielectric; readonly refractionIndex: number };

export interface Sphere {
  readonly center: Vec3;
  readonly radius: number;
  readonly material: Material;
}

export interface Scene {
  readonly spheres: readonly Sphere[];
}
