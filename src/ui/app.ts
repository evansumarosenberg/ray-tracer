import { RENDER_PRESETS, type RenderPreset } from '../presets/renderPresets';
import { createWebGlCapabilityAdapter, checkWebGlCapabilities } from '../rendering/capabilities';
import { ProgressiveRenderer } from '../rendering/renderer';
import { computeRenderSize, createRenderSettings } from '../rendering/settings';
import { createFinalScene } from '../scene/finalScene';
import { packSceneForGpu, type PackedScene } from '../scene/gpuPacking';
import { downloadCanvasPng } from './exportPng';

interface AppState {
  preset: RenderPreset;
  resolutionScale: number;
  maxDepth: number;
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

        <label class="control-field" for="resolution-scale">
          <span>Resolution</span>
          <select id="resolution-scale">
            <option value="1">100%</option>
            <option value="0.75">75%</option>
            <option value="0.5">50%</option>
            <option value="0.25">25%</option>
          </select>
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
  const resolutionScaleSelect = requireElement<HTMLSelectElement>(root, '#resolution-scale');
  const maxDepthInput = requireElement<HTMLInputElement>(root, '#max-depth');
  const pauseToggle = requireElement<HTMLButtonElement>(root, '#pause-toggle');
  const resetButton = requireElement<HTMLButtonElement>(root, '#reset-render');
  const exportButton = requireElement<HTMLButtonElement>(root, '#export-png');
  const controls = [presetSelect, resolutionScaleSelect, maxDepthInput, pauseToggle, resetButton, exportButton];
  const state: AppState = {
    preset: RENDER_PRESETS[0],
    resolutionScale: 1,
    maxDepth: RENDER_PRESETS[0].maxDepth,
    paused: false,
  };
  let renderer: ProgressiveRenderer | null = null;
  let packedScene: PackedScene | null = null;
  let animationFrameId = 0;
  let disposed = false;

  for (const preset of RENDER_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.label;
    presetSelect.append(option);
  }

  presetSelect.value = state.preset.id;
  resolutionScaleSelect.value = String(state.resolutionScale);
  maxDepthInput.value = String(state.maxDepth);

  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  const capabilities = checkWebGlCapabilities(createWebGlCapabilityAdapter(gl));

  if (!capabilities.supported) {
    status.textContent = capabilities.reason;
    disableControls(controls);
    return () => {
      disposed = true;
    };
  }

  if (!gl) {
    status.textContent = 'WebGL2 is required.';
    disableControls(controls);
    return () => {
      disposed = true;
    };
  }

  const webGl = gl;
  packedScene = packSceneForGpu(createFinalScene());

  function recreateRenderer(): void {
    const previousRenderer = renderer;
    renderer = null;
    previousRenderer?.dispose();

    try {
      const settings = createRenderSettings(state.preset, {
        resolutionScale: state.resolutionScale,
        maxDepth: Number(maxDepthInput.value),
      });
      const renderSize = computeRenderSize(settings.imageWidth, settings.aspectRatio, settings.resolutionScale);
      canvas.width = renderSize.width;
      canvas.height = renderSize.height;
      state.maxDepth = settings.maxDepth;
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

    if (renderer) {
      const stats = state.paused ? renderer.stats() : renderer.renderFrame();
      status.textContent = `${stats.sampleCount} / ${stats.targetSamples} samples`;
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  presetSelect.addEventListener('change', () => {
    const nextPreset = RENDER_PRESETS.find((preset) => preset.id === presetSelect.value);

    if (!nextPreset) {
      return;
    }

    state.preset = nextPreset;
    state.maxDepth = nextPreset.maxDepth;
    maxDepthInput.value = String(nextPreset.maxDepth);
    recreateRenderer();
  });

  resolutionScaleSelect.addEventListener('change', () => {
    state.resolutionScale = Number(resolutionScaleSelect.value);
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

  recreateRenderer();
  animationFrameId = requestAnimationFrame(renderLoop);

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrameId);
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
