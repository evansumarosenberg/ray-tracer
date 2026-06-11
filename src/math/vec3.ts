export type Vec3 = readonly [number, number, number];

export const vec3 = (x: number, y: number, z: number): Vec3 => [x, y, z];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, b: Vec3): Vec3 => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const mulScalar = (a: Vec3, t: number): Vec3 => [a[0] * t, a[1] * t, a[2] * t];
export const divScalar = (a: Vec3, t: number): Vec3 => mulScalar(a, 1 / t);
export const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const lengthSquared = (a: Vec3): number => dot(a, a);
export const length = (a: Vec3): number => Math.sqrt(lengthSquared(a));
export const unit = (a: Vec3): Vec3 => divScalar(a, length(a));

export const nearZero = (a: Vec3): boolean => {
  const s = 1e-8;
  return Math.abs(a[0]) < s && Math.abs(a[1]) < s && Math.abs(a[2]) < s;
};

export const reflect = (v: Vec3, n: Vec3): Vec3 => sub(v, mulScalar(n, 2 * dot(v, n)));

export const refract = (uv: Vec3, n: Vec3, etaiOverEtat: number): Vec3 => {
  const cosTheta = Math.min(dot(neg(uv), n), 1);
  const rOutPerp = mulScalar(add(uv, mulScalar(n, cosTheta)), etaiOverEtat);
  const rOutParallel = mulScalar(n, -Math.sqrt(Math.abs(1 - lengthSquared(rOutPerp))));
  return add(rOutPerp, rOutParallel);
};
