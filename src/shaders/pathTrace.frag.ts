export const pathTraceFragmentShader = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uPreviousAccumulation;
uniform sampler2D uSphereData;
uniform sampler2D uMaterialData;
uniform int uSphereCount;
uniform int uFrameIndex;
uniform int uMaxDepth;
uniform vec2 uResolution;
uniform vec3 uCameraCenter;
uniform vec3 uPixel00;
uniform vec3 uPixelDeltaU;
uniform vec3 uPixelDeltaV;
uniform vec3 uDefocusDiskU;
uniform vec3 uDefocusDiskV;

const int MATERIAL_LAMBERTIAN = 0;
const int MATERIAL_METAL = 1;
const int MATERIAL_DIELECTRIC = 2;
const float INFINITY_T = 1.0e20;
const float PI = 3.141592653589793;

struct Ray {
  vec3 origin;
  vec3 direction;
};

struct HitRecord {
  vec3 p;
  vec3 normal;
  float t;
  bool frontFace;
  int materialIndex;
};

uint hashSeed(uvec3 value) {
  uint seed = value.x * 1973u + value.y * 9277u + value.z * 26699u + 911u;
  seed ^= seed >> 16u;
  seed *= 2246822519u;
  seed ^= seed >> 13u;
  seed *= 3266489917u;
  seed ^= seed >> 16u;
  return seed;
}

float randomFloat(inout uint state) {
  state = state * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  word = (word >> 22u) ^ word;
  return float(word) / 4294967296.0;
}

vec3 randomVec3(inout uint state, float minValue, float maxValue) {
  return vec3(
    mix(minValue, maxValue, randomFloat(state)),
    mix(minValue, maxValue, randomFloat(state)),
    mix(minValue, maxValue, randomFloat(state))
  );
}

vec3 randomInUnitSphere(inout uint state) {
  for (int i = 0; i < 64; i++) {
    vec3 p = randomVec3(state, -1.0, 1.0);
    if (dot(p, p) < 1.0) {
      return p;
    }
  }

  return vec3(1.0, 0.0, 0.0);
}

vec3 randomUnitVector(inout uint state) {
  return normalize(randomInUnitSphere(state));
}

vec3 randomInUnitDisk(inout uint state) {
  for (int i = 0; i < 64; i++) {
    vec3 p = vec3(randomFloat(state) * 2.0 - 1.0, randomFloat(state) * 2.0 - 1.0, 0.0);
    if (dot(p, p) < 1.0) {
      return p;
    }
  }

  return vec3(0.0);
}

vec4 sphereAt(int index) {
  return texelFetch(uSphereData, ivec2(index, 0), 0);
}

vec4 materialA(int index) {
  return texelFetch(uMaterialData, ivec2(index * 2, 0), 0);
}

vec4 materialB(int index) {
  return texelFetch(uMaterialData, ivec2(index * 2 + 1, 0), 0);
}

vec3 rayAt(Ray ray, float t) {
  return ray.origin + t * ray.direction;
}

void setFaceNormal(Ray ray, vec3 outwardNormal, inout HitRecord record) {
  record.frontFace = dot(ray.direction, outwardNormal) < 0.0;
  record.normal = record.frontFace ? outwardNormal : -outwardNormal;
}

bool hitSphere(int index, Ray ray, float rayTMin, float rayTMax, inout HitRecord record) {
  vec4 sphere = sphereAt(index);
  vec3 center = sphere.xyz;
  float radius = sphere.w;
  vec3 oc = center - ray.origin;
  float a = dot(ray.direction, ray.direction);
  float h = dot(ray.direction, oc);
  float c = dot(oc, oc) - radius * radius;
  float discriminant = h * h - a * c;

  if (discriminant < 0.0) {
    return false;
  }

  float sqrtDiscriminant = sqrt(discriminant);
  float root = (h - sqrtDiscriminant) / a;

  if (root <= rayTMin || root >= rayTMax) {
    root = (h + sqrtDiscriminant) / a;

    if (root <= rayTMin || root >= rayTMax) {
      return false;
    }
  }

  record.t = root;
  record.p = rayAt(ray, root);
  record.materialIndex = index;
  setFaceNormal(ray, (record.p - center) / radius, record);
  return true;
}

bool hitWorld(Ray ray, float rayTMin, float rayTMax, out HitRecord record) {
  HitRecord tempRecord;
  bool hitAnything = false;
  float closestSoFar = rayTMax;

  for (int i = 0; i < 1024; i++) {
    if (i >= uSphereCount) {
      break;
    }

    if (hitSphere(i, ray, rayTMin, closestSoFar, tempRecord)) {
      hitAnything = true;
      closestSoFar = tempRecord.t;
      record = tempRecord;
    }
  }

  return hitAnything;
}

bool nearZero(vec3 value) {
  const float s = 1.0e-8;
  return abs(value.x) < s && abs(value.y) < s && abs(value.z) < s;
}

float reflectance(float cosine, float refractionIndex) {
  float r0 = (1.0 - refractionIndex) / (1.0 + refractionIndex);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * pow(1.0 - cosine, 5.0);
}

bool scatterLambertian(HitRecord record, inout uint state, out vec3 attenuation, out Ray scattered) {
  vec3 scatterDirection = record.normal + randomUnitVector(state);

  if (nearZero(scatterDirection)) {
    scatterDirection = record.normal;
  }

  attenuation = materialA(record.materialIndex).yzw;
  scattered = Ray(record.p, scatterDirection);
  return true;
}

bool scatterMetal(Ray ray, HitRecord record, inout uint state, out vec3 attenuation, out Ray scattered) {
  vec4 matA = materialA(record.materialIndex);
  vec4 matB = materialB(record.materialIndex);
  vec3 reflected = reflect(normalize(ray.direction), record.normal);
  scattered = Ray(record.p, reflected + matB.x * randomInUnitSphere(state));
  attenuation = matA.yzw;
  return dot(scattered.direction, record.normal) > 0.0;
}

bool scatterDielectric(Ray ray, HitRecord record, inout uint state, out vec3 attenuation, out Ray scattered) {
  float refractionIndex = materialB(record.materialIndex).y;
  float refractionRatio = record.frontFace ? (1.0 / refractionIndex) : refractionIndex;
  vec3 unitDirection = normalize(ray.direction);
  float cosTheta = min(dot(-unitDirection, record.normal), 1.0);
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  bool cannotRefract = refractionRatio * sinTheta > 1.0;
  vec3 direction;

  if (cannotRefract || reflectance(cosTheta, refractionRatio) > randomFloat(state)) {
    direction = reflect(unitDirection, record.normal);
  } else {
    direction = refract(unitDirection, record.normal, refractionRatio);
  }

  attenuation = vec3(1.0);
  scattered = Ray(record.p, direction);
  return true;
}

bool scatter(Ray ray, HitRecord record, inout uint state, out vec3 attenuation, out Ray scattered) {
  int materialType = int(materialA(record.materialIndex).x + 0.5);

  if (materialType == MATERIAL_LAMBERTIAN) {
    return scatterLambertian(record, state, attenuation, scattered);
  }

  if (materialType == MATERIAL_METAL) {
    return scatterMetal(ray, record, state, attenuation, scattered);
  }

  if (materialType == MATERIAL_DIELECTRIC) {
    return scatterDielectric(ray, record, state, attenuation, scattered);
  }

  attenuation = vec3(0.0);
  scattered = ray;
  return false;
}

vec3 rayColor(Ray ray, inout uint state) {
  vec3 throughput = vec3(1.0);

  for (int depth = 0; depth < 64; depth++) {
    if (depth >= uMaxDepth) {
      return vec3(0.0);
    }

    HitRecord record;

    if (hitWorld(ray, 0.001, INFINITY_T, record)) {
      vec3 attenuation;
      Ray scattered;

      if (!scatter(ray, record, state, attenuation, scattered)) {
        return vec3(0.0);
      }

      throughput *= attenuation;
      ray = scattered;
    } else {
      vec3 unitDirection = normalize(ray.direction);
      float a = 0.5 * (unitDirection.y + 1.0);
      vec3 background = mix(vec3(1.0), vec3(0.5, 0.7, 1.0), a);
      return throughput * background;
    }
  }

  return vec3(0.0);
}

Ray getRay(vec2 pixel, inout uint state) {
  vec2 jitter = vec2(randomFloat(state), randomFloat(state)) - 0.5;
  vec3 pixelSample = uPixel00 + (pixel.x + jitter.x) * uPixelDeltaU + (pixel.y + jitter.y) * uPixelDeltaV;
  vec3 diskSample = randomInUnitDisk(state);
  vec3 rayOrigin = uCameraCenter + diskSample.x * uDefocusDiskU + diskSample.y * uDefocusDiskV;
  return Ray(rayOrigin, pixelSample - rayOrigin);
}

void main() {
  ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
  vec2 pixel = clamp(vec2(pixelCoord), vec2(0.0), uResolution - vec2(1.0));
  uint seed = hashSeed(uvec3(uint(pixelCoord.x), uint(pixelCoord.y), uint(uFrameIndex + 1)));
  Ray ray = getRay(pixel, seed);
  vec3 sampleColor = rayColor(ray, seed);
  vec3 previousAccumulation = texelFetch(uPreviousAccumulation, pixelCoord, 0).rgb;
  outColor = vec4(previousAccumulation + sampleColor, 1.0);
}
`;
