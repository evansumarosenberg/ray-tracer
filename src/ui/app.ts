import { RENDER_PRESETS, type RenderPreset } from '../presets/renderPresets';
import { createWebGlCapabilityAdapter, checkWebGlCapabilities } from '../rendering/capabilities';
import { ProgressiveRenderer } from '../rendering/renderer';
import { computeRenderSize, createRenderSettings } from '../rendering/settings';
import { createFinalScene } from '../scene/finalScene';
import { packSceneForGpu, type PackedScene } from '../scene/gpuPacking';
import { downloadCanvasPng } from './exportPng';

const STARTUP_RENDER_DELAY_MS = 250;
const FIRST_RENDER_OBSERVABILITY_DELAY_MS = 2_000;
const PROGRESSIVE_SAMPLE_DELAY_MS = 50;

interface AppState {
  preset: RenderPreset;
  resolutionScale: number;
  paused: boolean;
}

export function mountApp(root: HTMLElement): () => void {
  root.innerHTML = `
    <section class="shell">
      <canvas id="render-canvas" width="960" height="540" aria-label="Ray traced render"></canvas>
      <aside class="controls" aria-label="Render controls">
        <h1>WebGL Raytracer</h1>
        <p id="status" data-testid="status">Initializing</p>

        <label class="control-field" for="preset-select">
          <span>Preset</span>
          <select id="preset-select"></select>
        </label>

        <label class="control-field" for="resolution">
          <span>Resolution</span>
          <input id="resolution" type="range" min="0.1" max="1" step="0.05" value="1" />
        </label>

        <label class="control-field" for="max-depth">
          <span>Max depth</span>
          <input id="max-depth" type="number" min="1" max="50" step="1" />
        </label>

        <div class="control-actions">
          <button id="pause-toggle" type="button">Pause</button>
          <button id="reset-render" type="button">Reset</button>
          <button id="export-png" type="button">Export PNG</button>
        </div>
      </aside>
    </section>
  `;

  const canvas = requireElement<HTMLCanvasElement>(root, '#render-canvas');
  const status = requireElement<HTMLParagraphElement>(root, '#status');
  const presetSelect = requireElement<HTMLSelectElement>(root, '#preset-select');
  const resolutionInput = requireElement<HTMLInputElement>(root, '#resolution');
  const maxDepthInput = requireElement<HTMLInputElement>(root, '#max-depth');
  const pauseToggle = requireElement<HTMLButtonElement>(root, '#pause-toggle');
  const resetButton = requireElement<HTMLButtonElement>(root, '#reset-render');
  const exportButton = requireElement<HTMLButtonElement>(root, '#export-png');
  const controls = [presetSelect, resolutionInput, maxDepthInput, pauseToggle, resetButton, exportButton];
  canvas.dataset.rendered = 'false';
  const state: AppState = {
    preset: RENDER_PRESETS[0],
    resolutionScale: 1,
    paused: false,
  };
  let renderer: ProgressiveRenderer | null = null;
  let packedScene: PackedScene | null = null;
  let webGl: WebGL2RenderingContext | null = null;
  let animationFrameId = 0;
  let initializationTimeoutId = 0;
  let renderLoopTimeoutId = 0;
  let disposed = false;

  for (const preset of RENDER_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    presetSelect.append(option);
  }

  presetSelect.value = state.preset.id;
  resolutionInput.value = String(state.resolutionScale);
  maxDepthInput.value = String(state.preset.maxDepth);

  function recreateRenderer(): void {
    if (!packedScene || !webGl) {
      return;
    }

    const previousRenderer = renderer;
    renderer = null;
    canvas.dataset.rendered = 'false';
    previousRenderer?.dispose();

    try {
      const settings = createRenderSettings(state.preset, {
        resolutionScale: state.resolutionScale,
        maxDepth: Number(maxDepthInput.value),
      });
      const renderSize = computeRenderSize(settings.imageWidth, settings.aspectRatio, settings.resolutionScale);
      canvas.width = renderSize.width;
      canvas.height = renderSize.height;
      maxDepthInput.value = String(settings.maxDepth);
      renderer = new ProgressiveRenderer({
        canvas,
        gl: webGl,
        preset: state.preset,
        packedScene: requirePackedScene(packedScene),
        width: renderSize.width,
        height: renderSize.height,
        maxDepth: settings.maxDepth,
        targetSamples: state.preset.samplesPerPixel,
      });
      status.textContent = '0 / ' + state.preset.samplesPerPixel + ' samples';
    } catch (error) {
      status.textContent = renderErrorMessage(error);
      renderer = null;
    }
  }

  function renderLoop(): void {
    if (disposed) {
      return;
    }

    let nextRenderDelayMs = 0;

    if (renderer) {
      try {
        const stats = state.paused ? renderer.stats() : renderer.renderFrame();
        if (!state.paused) {
          canvas.dataset.rendered = stats.sampleCount > 0 ? 'true' : 'false';
          nextRenderDelayMs =
            stats.sampleCount === 1 ? FIRST_RENDER_OBSERVABILITY_DELAY_MS : PROGRESSIVE_SAMPLE_DELAY_MS;
        }
        status.textContent = `${stats.sampleCount} / ${stats.targetSamples} samples`;
      } catch (error) {
        status.textContent = renderErrorMessage(error);
        canvas.dataset.rendered = 'false';
        renderer.dispose();
        renderer = null;
      }
    }

    scheduleRenderLoop(nextRenderDelayMs);
  }

  function scheduleRenderLoop(delayMs: number): void {
    if (disposed) {
      return;
    }

    if (delayMs > 0) {
      // Leave a small browser task gap between expensive progressive samples.
      renderLoopTimeoutId = window.setTimeout(() => {
        renderLoopTimeoutId = 0;
        animationFrameId = requestAnimationFrame(renderLoop);
      }, delayMs);
      return;
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  function initializeRenderer(): void {
    initializationTimeoutId = 0;

    if (disposed) {
      return;
    }

    try {
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
      const capabilities = checkWebGlCapabilities(createWebGlCapabilityAdapter(gl));

      if (!capabilities.supported) {
        status.textContent = capabilities.reason;
        disableControls(controls);
        return;
      }

      if (!gl) {
        status.textContent = 'WebGL2 is required.';
        disableControls(controls);
        return;
      }

      webGl = gl;
      packedScene = packSceneForGpu(createFinalScene());
      recreateRenderer();
    } catch (error) {
      status.textContent = renderErrorMessage(error);
      renderer = null;
    }

    scheduleRenderLoop(0);
  }

  function scheduleInitializationAfterPaint(): void {
    if (disposed) {
      return;
    }

    // First WebGL setup/draw can be expensive; keep startup observable before beginning it.
    initializationTimeoutId = window.setTimeout(initializeRenderer, STARTUP_RENDER_DELAY_MS);
  }

  presetSelect.addEventListener('change', () => {
    const nextPreset = RENDER_PRESETS.find((preset) => preset.id === presetSelect.value);

    if (!nextPreset) {
      return;
    }

    state.preset = nextPreset;
    maxDepthInput.value = String(nextPreset.maxDepth);
    recreateRenderer();
  });

  resolutionInput.addEventListener('input', () => {
    state.resolutionScale = Number(resolutionInput.value);
    recreateRenderer();
  });

  maxDepthInput.addEventListener('change', () => {
    recreateRenderer();
  });

  resetButton.addEventListener('click', () => {
    recreateRenderer();
  });

  pauseToggle.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseToggle.textContent = state.paused ? 'Resume' : 'Pause';
  });

  exportButton.addEventListener('click', () => {
    downloadCanvasPng(canvas);
  });

  animationFrameId = requestAnimationFrame(scheduleInitializationAfterPaint);

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrameId);
    if (initializationTimeoutId !== 0) {
      clearTimeout(initializationTimeoutId);
      initializationTimeoutId = 0;
    }
    if (renderLoopTimeoutId !== 0) {
      clearTimeout(renderLoopTimeoutId);
      renderLoopTimeoutId = 0;
    }
    renderer?.dispose();
    renderer = null;
  };
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing UI element: ${selector}`);
  }

  return element;
}

function disableControls(controls: readonly HTMLElement[]): void {
  for (const control of controls) {
    if ('disabled' in control) {
      control.disabled = true;
    }
  }
}

function requirePackedScene(packedScene: PackedScene | null): PackedScene {
  if (!packedScene) {
    throw new Error('Scene data has not been initialized.');
  }

  return packedScene;
}

function renderErrorMessage(error: unknown): string {
  return error instanceof Error ? `Renderer error: ${error.message}` : 'Renderer error: Unknown failure';
}
