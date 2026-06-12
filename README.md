# WebGL Raytracer

A browser-based path tracer inspired by the final scene from
[_Ray Tracing in One Weekend_](https://raytracing.github.io/books/RayTracingInOneWeekend.html).

This project adapts the book's CPU renderer into a TypeScript + Vite app that runs the final render
progressively in raw WebGL2. The scene is generated deterministically on the CPU, packed into GPU
textures, and rendered with handwritten GLSL shaders.

A live browser demo is available on [GitHub Pages](https://evansumarosenberg.github.io/ray-tracer/).

## Features

- Progressive WebGL2 path tracing with accumulation over many samples.
- Fixed seeded final scene with 485 spheres.
- Book-style camera settings: 16:9 aspect ratio, 1200px base width, defocus blur, and final-scene view.
- Two quality presets:
  - Development: 10 samples per pixel, max depth 20.
  - Book Quality: 500 samples per pixel, max depth 50.
- Lambertian, metal, and dielectric materials.
- Pause, reset, resolution scale, max-depth controls, and PNG export.
- Browser capability checks for WebGL2 and floating-point render targets.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

The render starts with the Development preset for reasonable iteration speed. Switch to Book Quality
for the high-sample final image.

## Scripts

```bash
npm test
```

Runs the Vitest unit test suite.

```bash
npm run build
```

Type-checks the project and builds the production bundle.

```bash
npm run test:smoke
```

Runs the Playwright smoke test. In a supported browser environment, it verifies that WebGL produces a
nonblank rendered frame. In an unsupported environment, it accepts only clear WebGL capability
messages.

## Architecture

The renderer is split into a small CPU-side setup layer and a GPU-side path tracing layer.

- `src/math/`: vector math, deterministic RNG, and book camera construction.
- `src/presets/`: render-quality and camera presets.
- `src/scene/`: deterministic final scene generation and GPU packing.
- `src/rendering/`: WebGL2 capability checks, shader/program helpers, texture/framebuffer setup, and
  the progressive renderer lifecycle.
- `src/shaders/`: GLSL ES 3.00 fullscreen, path tracing, and display shaders.
- `src/ui/`: DOM controls, render status, pause/reset, and PNG export.
- `tests/`: deterministic guardrails for CPU scene generation, packing, settings, shaders, renderer
  lifecycle, UI behavior, and browser smoke coverage.

## Fidelity And Browser Notes

The implementation follows the methodology and final-scene structure from
[_Ray Tracing in One Weekend_](https://raytracing.github.io/books/RayTracingInOneWeekend.html), with
browser-appropriate adaptations:

- The scene is fixed-seed and generated on the CPU instead of inside GLSL.
- Rendering converges progressively in the browser rather than writing a PPM file.
- PNG export is provided for the browser runtime.
- The smoke test verifies a nonblank WebGL frame, not pixel-perfect parity with the reference image.

WebGL2 support and floating-point framebuffer support are required. If either is missing, the app
shows a clear unsupported-state message instead of attempting to render.

## Author and License

This implementation was agentically engineered by [Evan Suma Rosenberg](https://scholar.google.com/citations?user=Hg0rPkAAAAAJ) using OpenAI Codex and GPT 5.5. It is released under the MIT License.
