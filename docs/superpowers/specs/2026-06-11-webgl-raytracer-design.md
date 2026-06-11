# WebGL Raytracer Design

Date: 2026-06-11

## Goal

Build a TypeScript + Vite single-page WebGL2 app that faithfully adapts the final renderer from
*Ray Tracing in One Weekend* to a browser runtime.

The project is a final-renderer adaptation, not a chapter-by-chapter learning playground, scene
editor, camera explorer, or framework demo. The app should render the book's final random-sphere
scene, converge progressively in the browser, and keep the implementation close enough to the book
that the path-tracing logic is easy to compare with the source material.

Primary references:

- Book: https://raytracing.github.io/books/RayTracingInOneWeekend.html
- Reference source: https://github.com/RayTracing/raytracing.github.io/blob/release/src/InOneWeekend/main.cc

## Product Scope

The app renders the book's final random-sphere scene with deterministic scene generation. A fixed
seed is used so every reload, test run, and subagent task sees the same world.

Rendering is progressive. The first frames are noisy, then the canvas refines as more samples are
accumulated. The app should remain usable while converging rather than blocking the browser on a
single long render.

Visible controls are limited to render-quality concerns:

- Quality preset.
- Resolution scale or effective image width.
- Max depth.
- Sample accumulation progress.
- Pause, resume, and reset.
- PNG export of the current converged canvas.

The app will not expose scene editing, camera controls, material editing, timeline controls, or
chapter/milestone toggles. PNG export is an intentional browser-native deviation from the book's
PPM output.

## Fidelity Requirements

The renderer targets the final scene from *Ray Tracing in One Weekend*:

- Ground sphere with neutral Lambertian material.
- Random grid of small spheres from `a = -11..10` and `b = -11..10`.
- Book exclusion rule around the large sphere at `(4, 0.2, 0)`.
- Random material choice thresholds:
  - Diffuse when `choose_mat < 0.8`.
  - Metal when `choose_mat < 0.95`.
  - Dielectric otherwise.
- Three large spheres:
  - Center glass sphere at `(0, 1, 0)`, radius `1.0`, index of refraction `1.5`.
  - Left diffuse sphere at `(-4, 1, 0)`, radius `1.0`, albedo `(0.4, 0.2, 0.1)`.
  - Right metal sphere at `(4, 1, 0)`, radius `1.0`, albedo `(0.7, 0.6, 0.5)`, fuzz `0.0`.

The shader should implement the final book material and camera model:

- Ray-sphere intersection with nearest-hit selection.
- Lambertian scatter.
- Metal reflection with fuzz.
- Dielectric refraction.
- Schlick reflectance approximation.
- Antialiasing via random pixel jitter.
- Defocus blur from a disk aperture.
- Sky gradient background.
- Iterative ray-bounce loop equivalent to the book's recursive `ray_color`.
- Linear color accumulation with gamma-correct display.

## Quality Presets

Two named presets define the difference between fast validation and the high-quality final target.
The book's final listing uses `samples_per_pixel = 500` and `max_depth = 50`; the project sample
source lowers these values to `samples_per_pixel = 10` and `max_depth = 20` for reasonable
development and validation runtimes.

### Development

The development preset mirrors the project sample source defaults where practical:

- Aspect ratio: `16.0 / 9.0`.
- Canonical image width: `1200`, with resolution scale allowed for practical browser iteration.
- Samples per pixel target: `10`.
- Max depth: `20`.
- Vertical field of view: `20`.
- Look from: `(13, 2, 3)`.
- Look at: `(0, 0, 0)`.
- View up: `(0, 1, 0)`.
- Defocus angle: `0.6`.
- Focus distance: `10.0`.

### Book Quality

The book-quality preset uses the same scene and camera parameters, but raises the sample target to
the high-quality value described by the book:

- Samples per pixel target: `500`.
- Max depth: `50`.

Users may lower quality settings from the active preset for performance. A setting change that
affects the image resets accumulation.

## Technical Architecture

The app uses raw WebGL2 with handwritten GLSL. It must not use Three.js or any high-level graphics
library. Local helper modules may wrap repetitive WebGL boilerplate when doing so keeps the raw API
explicit.

TypeScript responsibilities:

- Vite app bootstrapping.
- Canvas setup and resize handling.
- WebGL2 context acquisition.
- Required extension/capability checks.
- Shader compilation and link error reporting.
- Texture, framebuffer, and fullscreen draw setup.
- Progressive accumulation lifecycle.
- Deterministic scene generation.
- Scene packing into GPU-friendly typed arrays.
- Preset and render settings validation.
- UI state, pause/resume/reset/export actions, and unsupported-browser messaging.

GLSL responsibilities:

- Generate camera rays.
- Generate per-pixel/per-sample random values.
- Find ray-sphere intersections against uploaded scene arrays.
- Apply material scatter rules.
- Accumulate path throughput iteratively up to max depth.
- Write one or more new samples into the accumulation target per frame.
- Display the averaged and gamma-corrected current image.

Progressive accumulation should use a ping-pong framebuffer/texture pipeline or equivalent. The
renderer tracks the current accumulated sample count and displays the average of accumulated linear
samples. The implementation must avoid recursive shader logic and use bounded loops suitable for
WebGL2.

## WebGL Capability Requirements

The app targets WebGL2 only. On startup it checks for the capabilities needed for floating-point
or high-precision accumulation render targets. If the browser or GPU cannot support the required
pipeline, the app shows a clear unsupported-browser state instead of rendering a broken canvas.

The capability check should be written as testable TypeScript logic with the WebGL-specific calls
isolated behind a small adapter.

## Project Structure

Recommended source boundaries:

- `src/math/`: vector, RNG, camera, and deterministic math utilities.
- `src/scene/`: scene generation, material and sphere types, GPU packing.
- `src/presets/`: Development and Book Quality settings.
- `src/rendering/`: WebGL2 context setup, shader compilation, textures, framebuffers,
  accumulation pipeline, and renderer lifecycle.
- `src/shaders/`: GLSL source for path tracing and display.
- `src/ui/`: DOM controls, render-state wiring, pause/reset/export actions, and error messages.

Each unit should have one clear purpose and communicate through typed interfaces. Scene generation
and camera math should be understandable and testable without reading WebGL code.

## Testing Requirements

Deterministic TypeScript logic requires automated tests. These tests are important guardrails for
subagents and future changes.

Required CPU-side test coverage:

- Seeded RNG repeatability.
- Scene generation determinism.
- Final-scene sphere counts and exclusion rule.
- Material category invariants and parameter ranges.
- Preset values.
- Camera basis and viewport math.
- Render setting validation and accumulation-reset decisions.
- WebGL capability decision logic with mocked WebGL adapters.

Shader and rendering behavior should be guarded by focused smoke checks:

- Shader compile and link failures surface useful logs.
- A minimal supported WebGL2 render path can draw and accumulate nonblank pixels.
- Unsupported capability paths show the expected user-facing state.

Full per-branch unit testing of GLSL material behavior is out of scope for the initial design.

## Acceptance Criteria

The project is complete when:

- A Vite + TypeScript app starts locally and renders through raw WebGL2.
- The default scene is deterministic and matches the book's final-scene construction.
- Progressive convergence accumulates samples over frames and resets when render-affecting settings
  change.
- Development and Book Quality presets are available and match the requirements above.
- The renderer implements Lambertian, metal, dielectric, defocus blur, antialiasing, sky gradient,
  gamma correction, and iterative max-depth path tracing.
- Required WebGL2 capabilities are checked before rendering.
- Unsupported browsers or GPUs receive a clear error state.
- PNG export captures the current displayed render.
- Deterministic CPU-side tests pass.
- A render smoke check verifies that the WebGL pipeline can produce nonblank output in a supported
  environment.

## Non-Goals

- WebGL1 support.
- Three.js or any high-level rendering framework.
- Scene editing.
- Camera controls.
- Chapter-by-chapter visualization.
- CPU renderer parity implementation.
- PPM export.
- Advanced acceleration structures beyond the simple sphere list. Any acceleration structure should
  require a separate follow-up design.
