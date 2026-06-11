# WebGL Raytracer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript + Vite WebGL2 progressive path tracer that faithfully adapts the final *Ray Tracing in One Weekend* renderer.

**Architecture:** TypeScript generates and tests deterministic scene, camera, preset, and WebGL support data; raw WebGL2 and GLSL perform iterative progressive path tracing into accumulation textures. The UI exposes only render-quality controls, progress, pause/reset, and PNG export.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright, raw WebGL2, GLSL ES 3.00.

---

## Reference Spec

Implement the approved design in `docs/superpowers/specs/2026-06-11-webgl-raytracer-design.md`.

Key source references:

- Book: https://raytracing.github.io/books/RayTracingInOneWeekend.html
- Release source: https://github.com/RayTracing/raytracing.github.io/blob/release/src/InOneWeekend/main.cc

## File Structure

- `index.html`: Vite entry page with canvas and controls mount point.
- `package.json`: npm scripts and dependencies.
- `tsconfig.json`: strict TypeScript project config.
- `vite.config.ts`: Vite config.
- `vitest.config.ts`: Vitest config.
- `playwright.config.ts`: Playwright smoke-test config.
- `src/main.ts`: application bootstrap.
- `src/style.css`: application layout and control styling.
- `src/math/vec3.ts`: vector math used by scene and camera tests.
- `src/math/rng.ts`: deterministic seeded random generator.
- `src/math/camera.ts`: book camera basis and viewport math.
- `src/presets/renderPresets.ts`: Development and Book Quality preset constants.
- `src/rendering/settings.ts`: render settings validation and reset comparison.
- `src/rendering/capabilities.ts`: WebGL2 capability detection through a testable adapter.
- `src/rendering/glUtils.ts`: shader compilation, program linking, texture, and framebuffer helpers.
- `src/rendering/renderer.ts`: progressive accumulation renderer lifecycle.
- `src/scene/types.ts`: sphere and material types.
- `src/scene/finalScene.ts`: fixed-seed final scene generation.
- `src/scene/gpuPacking.ts`: typed-array packing for shader upload.
- `src/shaders/fullscreen.vert.ts`: fullscreen triangle vertex shader source.
- `src/shaders/pathTrace.frag.ts`: path tracing accumulation fragment shader source.
- `src/shaders/display.frag.ts`: display and gamma-correction fragment shader source.
- `src/ui/app.ts`: DOM control wiring and renderer state coordination.
- `src/ui/exportPng.ts`: PNG export helper.
- `tests/**/*.test.ts`: Vitest unit tests.
- `tests/smoke/render.spec.ts`: Playwright WebGL smoke test.

## Task 1: Scaffold Vite, TypeScript, And Test Tooling

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `tests/scaffold.test.ts`

- [ ] **Step 1: Create package metadata and install tooling**

Run:

```bash
npm init -y
npm install
npm install -D typescript vite vitest jsdom @playwright/test
```

Then set scripts in `package.json` to:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:smoke": "playwright test"
  }
}
```

- [ ] **Step 2: Add TypeScript, Vite, Vitest, and Playwright config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/smoke',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 960, height: 540 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] **Step 3: Add a minimal app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebGL Raytracer</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import './style.css';

const app = document.querySelector<HTMLMainElement>('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

app.innerHTML = `
  <section class="shell">
    <canvas id="render-canvas" width="960" height="540" aria-label="Ray traced render"></canvas>
    <aside class="controls" aria-label="Render controls">
      <h1>WebGL Raytracer</h1>
      <p data-testid="status">Ready</p>
    </aside>
  </section>
`;
```

Create `src/style.css`:

```css
:root {
  color: #f5f7fa;
  background: #141816;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

.shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 100vh;
}

#render-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: #050606;
}

.controls {
  border-left: 1px solid #303832;
  padding: 16px;
  background: #1c221f;
}

.controls h1 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 650;
}

@media (max-width: 760px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(320px, 1fr) auto;
  }

  .controls {
    border-left: 0;
    border-top: 1px solid #303832;
  }
}
```

- [ ] **Step 4: Write a failing scaffold test**

Create `tests/scaffold.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('runs TypeScript unit tests', () => {
    expect('webgl-raytracer').toContain('raytracer');
  });
});
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html tsconfig.json vite.config.ts vitest.config.ts playwright.config.ts src/main.ts src/style.css tests/scaffold.test.ts
git commit -m "chore: scaffold TypeScript Vite app"
```

## Task 2: Deterministic Math And Seeded RNG

**Files:**
- Create: `src/math/vec3.ts`
- Create: `src/math/rng.ts`
- Create: `tests/math/vec3.test.ts`
- Create: `tests/math/rng.test.ts`

- [ ] **Step 1: Write vector math tests**

Create `tests/math/vec3.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { add, cross, dot, length, mulScalar, nearZero, reflect, refract, unit, type Vec3 } from '../../src/math/vec3';

describe('vec3', () => {
  it('supports arithmetic and basis operations', () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];

    expect(add(a, b)).toEqual([5, 7, 9]);
    expect(mulScalar(a, 2)).toEqual([2, 4, 6]);
    expect(dot(a, b)).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(length([0, 3, 4])).toBe(5);
  });

  it('normalizes, reflects, refracts, and detects near-zero vectors', () => {
    expect(unit([0, 0, 5])).toEqual([0, 0, 1]);
    expect(reflect([1, -1, 0], [0, 1, 0])).toEqual([1, 1, 0]);
    expect(nearZero([1e-9, -1e-9, 1e-9])).toBe(true);

    const refracted = refract(unit([0, -1, -1]), [0, 1, 0], 1 / 1.5);
    expect(refracted[1]).toBeLessThan(0);
    expect(refracted[2]).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Write seeded RNG tests**

Create `tests/math/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng, DEFAULT_SCENE_SEED } from '../../src/math/rng';

describe('createRng', () => {
  it('produces repeatable values for the same seed', () => {
    const a = createRng(DEFAULT_SCENE_SEED);
    const b = createRng(DEFAULT_SCENE_SEED);

    expect([a.next(), a.next(), a.next(), a.next()]).toEqual([
      b.next(),
      b.next(),
      b.next(),
      b.next(),
    ]);
  });

  it('supports inclusive-exclusive numeric ranges', () => {
    const rng = createRng(1234);
    const value = rng.range(10, 12);

    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThan(12);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/math/vec3.test.ts tests/math/rng.test.ts
```

Expected: fail because `src/math/vec3.ts` and `src/math/rng.ts` do not exist.

- [ ] **Step 4: Implement vector math**

Create `src/math/vec3.ts`:

```ts
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
```

- [ ] **Step 5: Implement seeded RNG**

Create `src/math/rng.ts`:

```ts
export const DEFAULT_SCENE_SEED = 20_260_611;

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    range(min: number, max: number): number {
      return min + (max - min) * next();
    },
  };
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/math/vec3.test.ts tests/math/rng.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/math/vec3.ts src/math/rng.ts tests/math/vec3.test.ts tests/math/rng.test.ts
git commit -m "feat: add deterministic math primitives"
```

## Task 3: Render Presets And Settings Validation

**Files:**
- Create: `src/presets/renderPresets.ts`
- Create: `src/rendering/settings.ts`
- Create: `tests/presets/renderPresets.test.ts`
- Create: `tests/rendering/settings.test.ts`

- [ ] **Step 1: Write preset tests**

Create `tests/presets/renderPresets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOOK_QUALITY_PRESET, DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';

describe('render presets', () => {
  it('captures development and book-quality targets', () => {
    expect(DEVELOPMENT_PRESET.samplesPerPixel).toBe(10);
    expect(DEVELOPMENT_PRESET.maxDepth).toBe(20);
    expect(BOOK_QUALITY_PRESET.samplesPerPixel).toBe(500);
    expect(BOOK_QUALITY_PRESET.maxDepth).toBe(50);
  });

  it('keeps camera settings faithful to the final book scene', () => {
    expect(BOOK_QUALITY_PRESET.camera).toEqual(DEVELOPMENT_PRESET.camera);
    expect(BOOK_QUALITY_PRESET.camera.lookFrom).toEqual([13, 2, 3]);
    expect(BOOK_QUALITY_PRESET.camera.lookAt).toEqual([0, 0, 0]);
    expect(BOOK_QUALITY_PRESET.camera.defocusAngle).toBe(0.6);
    expect(BOOK_QUALITY_PRESET.camera.focusDist).toBe(10);
  });
});
```

- [ ] **Step 2: Write render settings tests**

Create `tests/rendering/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';
import { computeRenderSize, createRenderSettings, shouldResetAccumulation } from '../../src/rendering/settings';

describe('render settings', () => {
  it('computes 16:9 render sizes from image width and scale', () => {
    expect(computeRenderSize(1200, 16 / 9, 1)).toEqual({ width: 1200, height: 675 });
    expect(computeRenderSize(1200, 16 / 9, 0.5)).toEqual({ width: 600, height: 337 });
  });

  it('validates user-adjustable values', () => {
    const settings = createRenderSettings(DEVELOPMENT_PRESET, {
      resolutionScale: 0.25,
      maxDepth: 8,
      samplesPerPixel: 12,
    });

    expect(settings.resolutionScale).toBe(0.25);
    expect(settings.maxDepth).toBe(8);
    expect(settings.samplesPerPixel).toBe(12);
  });

  it('identifies render-affecting setting changes', () => {
    const base = createRenderSettings(DEVELOPMENT_PRESET, {});
    const changedDepth = { ...base, maxDepth: base.maxDepth - 1 };
    const changedPaused = { ...base, paused: !base.paused };

    expect(shouldResetAccumulation(base, changedDepth)).toBe(true);
    expect(shouldResetAccumulation(base, changedPaused)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/presets/renderPresets.test.ts tests/rendering/settings.test.ts
```

Expected: fail because preset and settings modules do not exist.

- [ ] **Step 4: Implement presets**

Create `src/presets/renderPresets.ts`:

```ts
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
```

- [ ] **Step 5: Implement render settings**

Create `src/rendering/settings.ts`:

```ts
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
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/presets/renderPresets.test.ts tests/rendering/settings.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/presets/renderPresets.ts src/rendering/settings.ts tests/presets/renderPresets.test.ts tests/rendering/settings.test.ts
git commit -m "feat: add render presets and settings"
```

## Task 4: Book Camera Model

**Files:**
- Create: `src/math/camera.ts`
- Create: `tests/math/camera.test.ts`

- [ ] **Step 1: Write camera math tests**

Create `tests/math/camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildCamera } from '../../src/math/camera';
import { DEVELOPMENT_PRESET } from '../../src/presets/renderPresets';

describe('buildCamera', () => {
  it('builds a right-handed camera frame from the book settings', () => {
    const camera = buildCamera(DEVELOPMENT_PRESET.camera, 1200, 675);

    expect(camera.center).toEqual([13, 2, 3]);
    expect(camera.w[0]).toBeCloseTo(0.963624, 6);
    expect(camera.w[1]).toBeCloseTo(0.148250, 6);
    expect(camera.w[2]).toBeCloseTo(0.222375, 6);
    expect(camera.u[0]).toBeCloseTo(0.224860, 6);
    expect(camera.u[2]).toBeCloseTo(-0.974391, 6);
    expect(camera.v[1]).toBeCloseTo(0.988949, 6);
  });

  it('computes viewport and defocus disk values', () => {
    const camera = buildCamera(DEVELOPMENT_PRESET.camera, 1200, 675);

    expect(camera.pixelDeltaU[0]).toBeGreaterThan(0);
    expect(camera.pixelDeltaV[1]).toBeLessThan(0);
    expect(camera.defocusDiskU[0]).toBeGreaterThan(0);
    expect(camera.defocusDiskV[1]).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/math/camera.test.ts
```

Expected: fail because `src/math/camera.ts` does not exist.

- [ ] **Step 3: Implement camera math**

Create `src/math/camera.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/math/camera.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/math/camera.ts tests/math/camera.test.ts
git commit -m "feat: add book camera model"
```

## Task 5: Deterministic Final Scene And GPU Packing

**Files:**
- Create: `src/scene/types.ts`
- Create: `src/scene/finalScene.ts`
- Create: `src/scene/gpuPacking.ts`
- Create: `tests/scene/finalScene.test.ts`
- Create: `tests/scene/gpuPacking.test.ts`

- [ ] **Step 1: Write final scene tests**

Create `tests/scene/finalScene.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import { MaterialType } from '../../src/scene/types';

describe('createFinalScene', () => {
  it('creates a deterministic final book scene for the fixed seed', () => {
    const a = createFinalScene();
    const b = createFinalScene();

    expect(a).toEqual(b);
    expect(a.spheres).toHaveLength(485);
  });

  it('matches fixed material counts for seed 20260611', () => {
    const scene = createFinalScene();
    const counts = scene.spheres.reduce(
      (acc, sphere) => {
        acc[sphere.material.type] += 1;
        return acc;
      },
      {
        [MaterialType.Lambertian]: 0,
        [MaterialType.Metal]: 0,
        [MaterialType.Dielectric]: 0,
      },
    );

    expect(counts[MaterialType.Lambertian]).toBe(378);
    expect(counts[MaterialType.Metal]).toBe(76);
    expect(counts[MaterialType.Dielectric]).toBe(31);
  });

  it('keeps random small spheres outside the book exclusion zone', () => {
    const smallSpheres = createFinalScene().spheres.filter((sphere) => sphere.radius === 0.2);

    for (const sphere of smallSpheres) {
      const dx = sphere.center[0] - 4;
      const dz = sphere.center[2] - 0;
      expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThan(0.9);
    }
  });
});
```

- [ ] **Step 2: Write GPU packing tests**

Create `tests/scene/gpuPacking.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFinalScene } from '../../src/scene/finalScene';
import { packSceneForGpu } from '../../src/scene/gpuPacking';

describe('packSceneForGpu', () => {
  it('packs sphere and material data into aligned Float32Array buffers', () => {
    const scene = createFinalScene();
    const packed = packSceneForGpu(scene);

    expect(packed.sphereCount).toBe(scene.spheres.length);
    expect(packed.spheres).toBeInstanceOf(Float32Array);
    expect(packed.materials).toBeInstanceOf(Float32Array);
    expect(packed.spheres.length).toBe(scene.spheres.length * 4);
    expect(packed.materials.length).toBe(scene.spheres.length * 8);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/scene/finalScene.test.ts tests/scene/gpuPacking.test.ts
```

Expected: fail because scene modules do not exist.

- [ ] **Step 4: Implement scene types**

Create `src/scene/types.ts`:

```ts
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
```

- [ ] **Step 5: Implement deterministic final scene**

Create `src/scene/finalScene.ts`:

```ts
import { createRng, DEFAULT_SCENE_SEED } from '../math/rng';
import { length, mul, sub, type Vec3 } from '../math/vec3';
import { MaterialType, type Material, type Scene, type Sphere } from './types';

export function createFinalScene(seed = DEFAULT_SCENE_SEED): Scene {
  const rng = createRng(seed);
  const spheres: Sphere[] = [];

  spheres.push({
    center: [0, -1000, 0],
    radius: 1000,
    material: { type: MaterialType.Lambertian, albedo: [0.5, 0.5, 0.5] },
  });

  for (let a = -11; a < 11; a += 1) {
    for (let b = -11; b < 11; b += 1) {
      const chooseMat = rng.next();
      const center: Vec3 = [a + 0.9 * rng.next(), 0.2, b + 0.9 * rng.next()];

      if (length(sub(center, [4, 0.2, 0])) <= 0.9) {
        continue;
      }

      spheres.push({
        center,
        radius: 0.2,
        material: createRandomMaterial(chooseMat, rng),
      });
    }
  }

  spheres.push(
    {
      center: [0, 1, 0],
      radius: 1,
      material: { type: MaterialType.Dielectric, refractionIndex: 1.5 },
    },
    {
      center: [-4, 1, 0],
      radius: 1,
      material: { type: MaterialType.Lambertian, albedo: [0.4, 0.2, 0.1] },
    },
    {
      center: [4, 1, 0],
      radius: 1,
      material: { type: MaterialType.Metal, albedo: [0.7, 0.6, 0.5], fuzz: 0 },
    },
  );

  return { spheres };
}

function createRandomMaterial(chooseMat: number, rng: ReturnType<typeof createRng>): Material {
  if (chooseMat < 0.8) {
    return {
      type: MaterialType.Lambertian,
      albedo: mul(randomVec3(rng, 0, 1), randomVec3(rng, 0, 1)),
    };
  }

  if (chooseMat < 0.95) {
    return {
      type: MaterialType.Metal,
      albedo: randomVec3(rng, 0.5, 1),
      fuzz: rng.range(0, 0.5),
    };
  }

  return { type: MaterialType.Dielectric, refractionIndex: 1.5 };
}

function randomVec3(rng: ReturnType<typeof createRng>, min: number, max: number): Vec3 {
  return [rng.range(min, max), rng.range(min, max), rng.range(min, max)];
}
```

- [ ] **Step 6: Implement GPU packing**

Create `src/scene/gpuPacking.ts`:

```ts
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
```

- [ ] **Step 7: Run tests**

Run:

```bash
npm test -- tests/scene/finalScene.test.ts tests/scene/gpuPacking.test.ts
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/scene/types.ts src/scene/finalScene.ts src/scene/gpuPacking.ts tests/scene/finalScene.test.ts tests/scene/gpuPacking.test.ts
git commit -m "feat: add deterministic final scene"
```

## Task 6: WebGL Capability Checks And Utility Layer

**Files:**
- Create: `src/rendering/capabilities.ts`
- Create: `src/rendering/glUtils.ts`
- Create: `tests/rendering/capabilities.test.ts`

- [ ] **Step 1: Write capability tests**

Create `tests/rendering/capabilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkWebGlCapabilities, type WebGlCapabilityAdapter } from '../../src/rendering/capabilities';

function adapter(overrides: Partial<WebGlCapabilityAdapter>): WebGlCapabilityAdapter {
  return {
    hasWebGl2: true,
    hasExtension: () => true,
    canRenderToFloatTexture: () => true,
    ...overrides,
  };
}

describe('checkWebGlCapabilities', () => {
  it('accepts WebGL2 with float render target support', () => {
    expect(checkWebGlCapabilities(adapter({}))).toEqual({ supported: true });
  });

  it('rejects missing WebGL2', () => {
    expect(checkWebGlCapabilities(adapter({ hasWebGl2: false }))).toEqual({
      supported: false,
      reason: 'WebGL2 is required.',
    });
  });

  it('rejects missing float color buffer support', () => {
    expect(checkWebGlCapabilities(adapter({ hasExtension: () => false }))).toEqual({
      supported: false,
      reason: 'Floating-point color buffer support is required.',
    });
  });

  it('rejects GPUs that cannot attach float textures to framebuffers', () => {
    expect(checkWebGlCapabilities(adapter({ canRenderToFloatTexture: () => false }))).toEqual({
      supported: false,
      reason: 'Floating-point framebuffer rendering is not supported.',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/rendering/capabilities.test.ts
```

Expected: fail because `src/rendering/capabilities.ts` does not exist.

- [ ] **Step 3: Implement capability checks**

Create `src/rendering/capabilities.ts`:

```ts
export interface WebGlCapabilityAdapter {
  hasWebGl2: boolean;
  hasExtension(name: string): boolean;
  canRenderToFloatTexture(): boolean;
}

export type CapabilityResult = { supported: true } | { supported: false; reason: string };

export function checkWebGlCapabilities(adapter: WebGlCapabilityAdapter): CapabilityResult {
  if (!adapter.hasWebGl2) {
    return { supported: false, reason: 'WebGL2 is required.' };
  }

  if (!adapter.hasExtension('EXT_color_buffer_float')) {
    return { supported: false, reason: 'Floating-point color buffer support is required.' };
  }

  if (!adapter.canRenderToFloatTexture()) {
    return { supported: false, reason: 'Floating-point framebuffer rendering is not supported.' };
  }

  return { supported: true };
}

export function createWebGlCapabilityAdapter(gl: WebGL2RenderingContext | null): WebGlCapabilityAdapter {
  return {
    hasWebGl2: gl !== null,
    hasExtension(name: string): boolean {
      return gl !== null && gl.getExtension(name) !== null;
    },
    canRenderToFloatTexture(): boolean {
      if (!gl) return false;

      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();

      if (!texture || !framebuffer) return false;

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);

      return complete;
    },
  };
}
```

- [ ] **Step 4: Implement WebGL utility functions**

Create `src/rendering/glUtils.ts`:

```ts
export function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!program) throw new Error('Unable to create WebGL program.');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.';
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

export function createFloatTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Unable to create texture.');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

export function createFramebufferForTexture(gl: WebGL2RenderingContext, texture: WebGLTexture): WebGLFramebuffer {
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Unable to create framebuffer.');

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer is incomplete.');
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return framebuffer;
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test -- tests/rendering/capabilities.test.ts
npm run build
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add src/rendering/capabilities.ts src/rendering/glUtils.ts tests/rendering/capabilities.test.ts
git commit -m "feat: add WebGL capability checks"
```

## Task 7: Shaders And Progressive Renderer

**Files:**
- Create: `src/shaders/fullscreen.vert.ts`
- Create: `src/shaders/pathTrace.frag.ts`
- Create: `src/shaders/display.frag.ts`
- Create: `src/rendering/renderer.ts`

- [ ] **Step 1: Add fullscreen vertex shader**

Create `src/shaders/fullscreen.vert.ts`:

```ts
export const fullscreenVertexShader = `#version 300 es
precision highp float;

out vec2 vUv;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  vec2 position = POSITIONS[gl_VertexID];
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
```

- [ ] **Step 2: Add path-tracing fragment shader**

Create `src/shaders/pathTrace.frag.ts` with these required exported uniforms and functions:

```ts
export const pathTraceFragmentShader = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 fragColor;

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

const float INF = 1.0e20;
const int MATERIAL_LAMBERTIAN = 0;
const int MATERIAL_METAL = 1;
const int MATERIAL_DIELECTRIC = 2;

struct HitRecord {
  vec3 p;
  vec3 normal;
  float t;
  bool frontFace;
  int materialIndex;
};

uint hash(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float random(inout uint state) {
  state = hash(state);
  return float(state) / 4294967296.0;
}

vec3 randomInUnitSphere(inout uint state) {
  for (int i = 0; i < 64; i++) {
    vec3 p = vec3(random(state), random(state), random(state)) * 2.0 - 1.0;
    if (dot(p, p) < 1.0) return p;
  }
  return vec3(1.0, 0.0, 0.0);
}

vec3 randomUnitVector(inout uint state) {
  return normalize(randomInUnitSphere(state));
}

vec2 randomInUnitDisk(inout uint state) {
  for (int i = 0; i < 64; i++) {
    vec2 p = vec2(random(state), random(state)) * 2.0 - 1.0;
    if (dot(p, p) < 1.0) return p;
  }
  return vec2(0.0);
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

void setFaceNormal(vec3 rayDirection, vec3 outwardNormal, inout HitRecord rec) {
  rec.frontFace = dot(rayDirection, outwardNormal) < 0.0;
  rec.normal = rec.frontFace ? outwardNormal : -outwardNormal;
}

bool hitSphere(vec3 origin, vec3 direction, int index, float rayTMin, float rayTMax, inout HitRecord rec) {
  vec4 sphere = sphereAt(index);
  vec3 center = sphere.xyz;
  float radius = sphere.w;
  vec3 oc = center - origin;
  float a = dot(direction, direction);
  float h = dot(direction, oc);
  float c = dot(oc, oc) - radius * radius;
  float discriminant = h * h - a * c;

  if (discriminant < 0.0) return false;

  float sqrtd = sqrt(discriminant);
  float root = (h - sqrtd) / a;

  if (root <= rayTMin || rayTMax <= root) {
    root = (h + sqrtd) / a;
    if (root <= rayTMin || rayTMax <= root) return false;
  }

  rec.t = root;
  rec.p = origin + root * direction;
  rec.materialIndex = index;
  vec3 outwardNormal = (rec.p - center) / radius;
  setFaceNormal(direction, outwardNormal, rec);
  return true;
}

bool hitWorld(vec3 origin, vec3 direction, inout HitRecord rec) {
  HitRecord temp;
  bool hitAnything = false;
  float closest = INF;

  for (int i = 0; i < 1024; i++) {
    if (i >= uSphereCount) break;
    if (hitSphere(origin, direction, i, 0.001, closest, temp)) {
      hitAnything = true;
      closest = temp.t;
      rec = temp;
    }
  }

  return hitAnything;
}

float reflectance(float cosine, float refractionIndex) {
  float r0 = (1.0 - refractionIndex) / (1.0 + refractionIndex);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

bool scatter(vec3 rayDirection, HitRecord rec, inout uint state, out vec3 attenuation, out vec3 scatteredDirection) {
  vec4 a = materialA(rec.materialIndex);
  vec4 b = materialB(rec.materialIndex);
  int materialType = int(a.x + 0.5);

  if (materialType == MATERIAL_LAMBERTIAN) {
    scatteredDirection = rec.normal + randomUnitVector(state);
    if (length(scatteredDirection) < 1.0e-8) scatteredDirection = rec.normal;
    attenuation = a.yzw;
    return true;
  }

  if (materialType == MATERIAL_METAL) {
    vec3 reflected = reflect(normalize(rayDirection), rec.normal);
    scatteredDirection = reflected + b.x * randomInUnitSphere(state);
    attenuation = a.yzw;
    return dot(scatteredDirection, rec.normal) > 0.0;
  }

  float refractionIndex = b.y;
  attenuation = vec3(1.0);
  float ri = rec.frontFace ? (1.0 / refractionIndex) : refractionIndex;
  vec3 unitDirection = normalize(rayDirection);
  float cosTheta = min(dot(-unitDirection, rec.normal), 1.0);
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  bool cannotRefract = ri * sinTheta > 1.0;

  if (cannotRefract || reflectance(cosTheta, ri) > random(state)) {
    scatteredDirection = reflect(unitDirection, rec.normal);
  } else {
    scatteredDirection = refract(unitDirection, rec.normal, ri);
  }

  return true;
}

vec3 rayColor(vec3 origin, vec3 direction, inout uint state) {
  vec3 throughput = vec3(1.0);

  for (int depth = 0; depth < 64; depth++) {
    if (depth >= uMaxDepth) return vec3(0.0);

    HitRecord rec;
    if (hitWorld(origin, direction, rec)) {
      vec3 attenuation;
      vec3 scatteredDirection;

      if (!scatter(direction, rec, state, attenuation, scatteredDirection)) {
        return vec3(0.0);
      }

      throughput *= attenuation;
      origin = rec.p;
      direction = scatteredDirection;
    } else {
      vec3 unitDirection = normalize(direction);
      float a = 0.5 * (unitDirection.y + 1.0);
      vec3 sky = mix(vec3(1.0), vec3(0.5, 0.7, 1.0), a);
      return throughput * sky;
    }
  }

  return vec3(0.0);
}

vec3 getRayOrigin(inout uint state) {
  vec2 p = randomInUnitDisk(state);
  return uCameraCenter + p.x * uDefocusDiskU + p.y * uDefocusDiskV;
}

vec3 getRayDirection(vec2 pixel, vec3 origin) {
  vec3 pixelCenter = uPixel00 + pixel.x * uPixelDeltaU + pixel.y * uPixelDeltaV;
  return pixelCenter - origin;
}

void main() {
  ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
  uint state = uint(pixelCoord.x) * 1973u
    + uint(pixelCoord.y) * 9277u
    + uint(uFrameIndex) * 26699u
    + 911u;

  vec2 jitter = vec2(random(state), random(state)) - 0.5;
  vec2 pixel = vec2(pixelCoord) + jitter;
  vec3 origin = getRayOrigin(state);
  vec3 direction = getRayDirection(pixel, origin);
  vec3 sampleColor = rayColor(origin, direction, state);

  vec3 previous = texelFetch(uPreviousAccumulation, pixelCoord, 0).rgb;
  fragColor = vec4(previous + sampleColor, 1.0);
}
`;
```

- [ ] **Step 3: Add display shader**

Create `src/shaders/display.frag.ts`:

```ts
export const displayFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uAccumulation;
uniform int uSampleCount;

void main() {
  vec3 color = texture(uAccumulation, vUv).rgb / float(max(uSampleCount, 1));
  color = sqrt(max(color, vec3(0.0)));
  fragColor = vec4(color, 1.0);
}
`;
```

- [ ] **Step 4: Implement progressive renderer lifecycle**

Create `src/rendering/renderer.ts` with this public API:

```ts
import { buildCamera } from '../math/camera';
import type { RenderPreset } from '../presets/renderPresets';
import type { PackedScene } from '../scene/gpuPacking';
import { displayFragmentShader } from '../shaders/display.frag';
import { fullscreenVertexShader } from '../shaders/fullscreen.vert';
import { pathTraceFragmentShader } from '../shaders/pathTrace.frag';
import { createFloatTexture, createFramebufferForTexture, createProgram } from './glUtils';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  preset: RenderPreset;
  packedScene: PackedScene;
  width: number;
  height: number;
  maxDepth: number;
  targetSamples: number;
}

export interface RenderStats {
  sampleCount: number;
  targetSamples: number;
  width: number;
  height: number;
}

export class ProgressiveRenderer {
  private gl: WebGL2RenderingContext;
  private pathProgram: WebGLProgram;
  private displayProgram: WebGLProgram;
  private sampleCount = 0;
  private readonly targetSamples: number;
  private readonly width: number;
  private readonly height: number;

  constructor(private readonly options: RendererOptions) {
    this.gl = options.gl;
    this.width = options.width;
    this.height = options.height;
    this.targetSamples = options.targetSamples;
    this.pathProgram = createProgram(this.gl, fullscreenVertexShader, pathTraceFragmentShader);
    this.displayProgram = createProgram(this.gl, fullscreenVertexShader, displayFragmentShader);
    this.initializeTargets();
    this.uploadStaticScene();
  }

  renderFrame(): RenderStats {
    if (this.sampleCount < this.targetSamples) {
      this.accumulateSample();
      this.sampleCount += 1;
    }

    this.display();
    return this.stats();
  }

  reset(): void {
    this.sampleCount = 0;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  stats(): RenderStats {
    return {
      sampleCount: this.sampleCount,
      targetSamples: this.targetSamples,
      width: this.width,
      height: this.height,
    };
  }

  dispose(): void {
    this.gl.deleteProgram(this.pathProgram);
    this.gl.deleteProgram(this.displayProgram);
  }

  private initializeTargets(): void {
    const gl = this.gl;
    this.options.canvas.width = this.width;
    this.options.canvas.height = this.height;
    gl.viewport(0, 0, this.width, this.height);
    createFramebufferForTexture(gl, createFloatTexture(gl, this.width, this.height));
    createFramebufferForTexture(gl, createFloatTexture(gl, this.width, this.height));
  }

  private uploadStaticScene(): void {
    buildCamera(this.options.preset.camera, this.width, this.height);
  }

  private accumulateSample(): void {
    const gl = this.gl;
    gl.useProgram(this.pathProgram);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private display(): void {
    const gl = this.gl;
    gl.useProgram(this.displayProgram);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
```

Then complete the WebGL resource ownership in the same file:

- Store two accumulation textures and framebuffers as private fields.
- Store scene data textures as private fields.
- Upload `packedScene.spheres` into one `RGBA32F` texture of width `sphereCount`.
- Upload `packedScene.materials` into one `RGBA32F` texture of width `sphereCount * 2`.
- On each frame, bind previous accumulation as `uPreviousAccumulation`, bind scene textures, set camera uniforms from `buildCamera`, render into the next framebuffer, swap indices, then render display to the default framebuffer.
- Delete all created textures and framebuffers in `dispose()`.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/shaders/fullscreen.vert.ts src/shaders/pathTrace.frag.ts src/shaders/display.frag.ts src/rendering/renderer.ts
git commit -m "feat: add progressive WebGL renderer"
```

## Task 8: UI Wiring, Unsupported State, And PNG Export

**Files:**
- Create: `src/ui/app.ts`
- Create: `src/ui/exportPng.ts`
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Create: `tests/ui/exportPng.test.ts`

- [ ] **Step 1: Write PNG export test**

Create `tests/ui/exportPng.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { downloadCanvasPng } from '../../src/ui/exportPng';

describe('downloadCanvasPng', () => {
  it('creates a PNG download from the canvas data URL', () => {
    const click = vi.fn();
    const canvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
    } as unknown as HTMLCanvasElement;
    const link = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;

    downloadCanvasPng(canvas, 'render.png', () => link);

    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(link.href).toBe('data:image/png;base64,abc');
    expect(link.download).toBe('render.png');
    expect(click).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ui/exportPng.test.ts
```

Expected: fail because `src/ui/exportPng.ts` does not exist.

- [ ] **Step 3: Implement PNG export helper**

Create `src/ui/exportPng.ts`:

```ts
export function downloadCanvasPng(
  canvas: HTMLCanvasElement,
  filename = 'raytracer-render.png',
  createLink: () => HTMLAnchorElement = () => document.createElement('a'),
): void {
  const link = createLink();
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}
```

- [ ] **Step 4: Implement UI controller**

Create `src/ui/app.ts`:

```ts
import { BOOK_QUALITY_PRESET, DEVELOPMENT_PRESET, RENDER_PRESETS } from '../presets/renderPresets';
import { checkWebGlCapabilities, createWebGlCapabilityAdapter } from '../rendering/capabilities';
import { ProgressiveRenderer } from '../rendering/renderer';
import { computeRenderSize, createRenderSettings } from '../rendering/settings';
import { createFinalScene } from '../scene/finalScene';
import { packSceneForGpu } from '../scene/gpuPacking';
import { downloadCanvasPng } from './exportPng';

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <section class="shell">
      <canvas id="render-canvas" aria-label="Ray traced render"></canvas>
      <aside class="controls" aria-label="Render controls">
        <h1>WebGL Raytracer</h1>
        <label>Preset <select id="preset"></select></label>
        <label>Resolution <input id="resolution" type="range" min="0.1" max="1" step="0.05" value="1" /></label>
        <label>Max depth <input id="max-depth" type="number" min="1" max="50" value="20" /></label>
        <button id="pause">Pause</button>
        <button id="reset">Reset</button>
        <button id="export">Export PNG</button>
        <p id="status" data-testid="status">Initializing</p>
      </aside>
    </section>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>('#render-canvas');
  const presetSelect = root.querySelector<HTMLSelectElement>('#preset');
  const resolutionInput = root.querySelector<HTMLInputElement>('#resolution');
  const maxDepthInput = root.querySelector<HTMLInputElement>('#max-depth');
  const pauseButton = root.querySelector<HTMLButtonElement>('#pause');
  const resetButton = root.querySelector<HTMLButtonElement>('#reset');
  const exportButton = root.querySelector<HTMLButtonElement>('#export');
  const status = root.querySelector<HTMLParagraphElement>('#status');

  if (!canvas || !presetSelect || !resolutionInput || !maxDepthInput || !pauseButton || !resetButton || !exportButton || !status) {
    throw new Error('App controls failed to mount.');
  }

  for (const preset of RENDER_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    presetSelect.append(option);
  }

  let preset = DEVELOPMENT_PRESET;
  let paused = false;
  const scene = packSceneForGpu(createFinalScene());
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  const support = checkWebGlCapabilities(createWebGlCapabilityAdapter(gl));

  if (!support.supported) {
    status.textContent = support.reason;
    return;
  }

  let renderer: ProgressiveRenderer | null = createRenderer(gl);

  function createRenderer(gl: WebGL2RenderingContext): ProgressiveRenderer {
    const settings = createRenderSettings(preset, {
      resolutionScale: Number(resolutionInput.value),
      maxDepth: Number(maxDepthInput.value),
      samplesPerPixel: preset.samplesPerPixel,
      paused,
    });
    const size = computeRenderSize(settings.imageWidth, settings.aspectRatio, settings.resolutionScale);

    return new ProgressiveRenderer({
      canvas,
      gl,
      preset,
      packedScene: scene,
      width: size.width,
      height: size.height,
      maxDepth: settings.maxDepth,
      targetSamples: settings.samplesPerPixel,
    });
  }

  function resetRenderer(): void {
    renderer?.dispose();
    renderer = createRenderer(gl);
  }

  function tick(): void {
    if (renderer && !paused) {
      const stats = renderer.renderFrame();
      status.textContent = `${stats.sampleCount} / ${stats.targetSamples} samples`;
    }
    requestAnimationFrame(tick);
  }

  presetSelect.addEventListener('change', () => {
    preset = presetSelect.value === BOOK_QUALITY_PRESET.id ? BOOK_QUALITY_PRESET : DEVELOPMENT_PRESET;
    maxDepthInput.value = String(preset.maxDepth);
    resetRenderer();
  });

  resolutionInput.addEventListener('input', resetRenderer);
  maxDepthInput.addEventListener('change', resetRenderer);
  resetButton.addEventListener('click', resetRenderer);
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
  });
  exportButton.addEventListener('click', () => downloadCanvasPng(canvas));

  tick();
}
```

- [ ] **Step 5: Update bootstrap**

Replace `src/main.ts` with:

```ts
import './style.css';
import { mountApp } from './ui/app';

const app = document.querySelector<HTMLMainElement>('#app');

if (!app) {
  throw new Error('Missing #app mount point');
}

mountApp(app);
```

- [ ] **Step 6: Expand styles for controls**

Append to `src/style.css`:

```css
.controls label {
  display: grid;
  gap: 6px;
  margin: 0 0 14px;
  font-size: 13px;
  color: #c8d0c9;
}

.controls select,
.controls input,
.controls button {
  min-height: 34px;
  border: 1px solid #465147;
  border-radius: 6px;
  background: #111512;
  color: #f5f7fa;
}

.controls button {
  width: 100%;
  margin: 0 0 8px;
  cursor: pointer;
}

#status {
  min-height: 20px;
  margin: 12px 0 0;
  color: #c8d0c9;
}
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test -- tests/ui/exportPng.test.ts
npm run build
```

Expected: both commands pass.

- [ ] **Step 8: Commit**

```bash
git add src/ui/app.ts src/ui/exportPng.ts src/main.ts src/style.css tests/ui/exportPng.test.ts
git commit -m "feat: wire raytracer UI"
```

## Task 9: Browser Smoke Test And Final Verification

**Files:**
- Create: `tests/smoke/render.spec.ts`
- Modify: `src/ui/app.ts`
- Modify: `src/rendering/renderer.ts`

- [ ] **Step 1: Add smoke-test observability**

Make sure `src/ui/app.ts` keeps `data-testid="status"` on the status element and add this canvas attribute after the first successful render frame:

```ts
canvas.dataset.rendered = stats.sampleCount > 0 ? 'true' : 'false';
```

Place the assignment inside `tick()` immediately after `const stats = renderer.renderFrame();`.

- [ ] **Step 2: Write browser smoke test**

Create `tests/smoke/render.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('renders a nonblank WebGL frame or shows a supported error state', async ({ page }) => {
  await page.goto('/');

  const status = page.getByTestId('status');
  await expect(status).toBeVisible();

  const unsupported = await status.textContent();
  if (unsupported?.includes('required') || unsupported?.includes('not supported')) {
    expect(unsupported.length).toBeGreaterThan(0);
    return;
  }

  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#render-canvas');
    return canvas?.dataset.rendered === 'true';
  });

  const nonblank = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#render-canvas');
    if (!canvas) return false;

    const gl = canvas.getContext('webgl2');
    if (!gl) return false;

    const width = Math.min(canvas.width, 32);
    const height = Math.min(canvas.height, 32);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.some((value, index) => index % 4 !== 3 && value > 0);
  });

  expect(nonblank).toBe(true);
});
```

- [ ] **Step 3: Install Playwright browser**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium browser is installed for Playwright.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run build
npm run test:smoke
```

Expected: all commands pass. The smoke test may accept a clear unsupported-browser state only when WebGL2 or float render targets are unavailable in the test environment.

- [ ] **Step 5: Manual browser check**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL. Open the URL, confirm the canvas progressively refines, the sample count advances, pause stops advancement, reset restarts accumulation, preset changes reset the renderer, and PNG export downloads an image.

- [ ] **Step 6: Commit**

```bash
git add tests/smoke/render.spec.ts src/ui/app.ts src/rendering/renderer.ts
git commit -m "test: add WebGL render smoke coverage"
```

## Final Completion Checklist

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:smoke`.
- [ ] Verify the renderer uses raw WebGL2 and handwritten GLSL only.
- [ ] Verify no Three.js or high-level graphics framework is installed.
- [ ] Verify Development preset has `samplesPerPixel = 10` and `maxDepth = 20`.
- [ ] Verify Book Quality preset has `samplesPerPixel = 500` and `maxDepth = 50`.
- [ ] Verify deterministic scene count remains `485` total spheres for seed `20260611`.
- [ ] Verify the worktree is clean with `git status --short`.
