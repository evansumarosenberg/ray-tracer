import { MaterialType, type Scene } from './types';

export interface PackedScene {
  sphereCount: number;
  spheres: Float32Array;
  materials: Float32Array;
}

export function packSceneForGpu(scene: Scene): PackedScene {
  const spheres = new Float32Array(scene.spheres.length * 4);
  const materials = new Float32Array(scene.spheres.length * 8);

  scene.spheres.forEach((sphere, index) => {
    const sphereOffset = index * 4;
    spheres[sphereOffset + 0] = sphere.center[0];
    spheres[sphereOffset + 1] = sphere.center[1];
    spheres[sphereOffset + 2] = sphere.center[2];
    spheres[sphereOffset + 3] = sphere.radius;

    const materialOffset = index * 8;
    materials[materialOffset + 0] = sphere.material.type;

    if (sphere.material.type === MaterialType.Lambertian || sphere.material.type === MaterialType.Metal) {
      materials[materialOffset + 1] = sphere.material.albedo[0];
      materials[materialOffset + 2] = sphere.material.albedo[1];
      materials[materialOffset + 3] = sphere.material.albedo[2];
    }

    if (sphere.material.type === MaterialType.Metal) {
      materials[materialOffset + 4] = sphere.material.fuzz;
    }

    if (sphere.material.type === MaterialType.Dielectric) {
      materials[materialOffset + 5] = sphere.material.refractionIndex;
    }
  });

  return { sphereCount: scene.spheres.length, spheres, materials };
}
