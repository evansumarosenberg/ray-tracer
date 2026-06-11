import { MaterialType, type Scene } from './types';

export const SPHERE_FLOAT_STRIDE = 4;
export const SPHERE_CENTER_X_OFFSET = 0;
export const SPHERE_CENTER_Y_OFFSET = 1;
export const SPHERE_CENTER_Z_OFFSET = 2;
export const SPHERE_RADIUS_OFFSET = 3;

export const MATERIAL_FLOAT_STRIDE = 8;
export const MATERIAL_TYPE_OFFSET = 0;
export const MATERIAL_ALBEDO_R_OFFSET = 1;
export const MATERIAL_ALBEDO_G_OFFSET = 2;
export const MATERIAL_ALBEDO_B_OFFSET = 3;
export const MATERIAL_FUZZ_OFFSET = 4;
export const MATERIAL_REFRACTION_INDEX_OFFSET = 5;

export interface PackedScene {
  sphereCount: number;
  spheres: Float32Array;
  materials: Float32Array;
}

export function packSceneForGpu(scene: Scene): PackedScene {
  const spheres = new Float32Array(scene.spheres.length * SPHERE_FLOAT_STRIDE);
  const materials = new Float32Array(scene.spheres.length * MATERIAL_FLOAT_STRIDE);

  scene.spheres.forEach((sphere, index) => {
    const sphereOffset = index * SPHERE_FLOAT_STRIDE;
    spheres[sphereOffset + SPHERE_CENTER_X_OFFSET] = sphere.center[0];
    spheres[sphereOffset + SPHERE_CENTER_Y_OFFSET] = sphere.center[1];
    spheres[sphereOffset + SPHERE_CENTER_Z_OFFSET] = sphere.center[2];
    spheres[sphereOffset + SPHERE_RADIUS_OFFSET] = sphere.radius;

    const materialOffset = index * MATERIAL_FLOAT_STRIDE;
    materials[materialOffset + MATERIAL_TYPE_OFFSET] = sphere.material.type;

    if (sphere.material.type === MaterialType.Lambertian || sphere.material.type === MaterialType.Metal) {
      materials[materialOffset + MATERIAL_ALBEDO_R_OFFSET] = sphere.material.albedo[0];
      materials[materialOffset + MATERIAL_ALBEDO_G_OFFSET] = sphere.material.albedo[1];
      materials[materialOffset + MATERIAL_ALBEDO_B_OFFSET] = sphere.material.albedo[2];
    }

    if (sphere.material.type === MaterialType.Metal) {
      materials[materialOffset + MATERIAL_FUZZ_OFFSET] = sphere.material.fuzz;
    }

    if (sphere.material.type === MaterialType.Dielectric) {
      materials[materialOffset + MATERIAL_REFRACTION_INDEX_OFFSET] = sphere.material.refractionIndex;
    }
  });

  return { sphereCount: scene.spheres.length, spheres, materials };
}
