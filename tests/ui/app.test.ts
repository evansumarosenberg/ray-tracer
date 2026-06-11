import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RendererOptions, RenderStats } from '../../src/rendering/renderer';
import type { PackedScene } from '../../src/scene/gpuPacking';

const mocks = vi.hoisted(() => {
  const packedScene = {
    sphereCount: 1,
    spheres: new Float32Array(4),
    materials: new Float32Array(8),
  };

  return {
    capabilityResult: { supported: true } as { supported: true } | { supported: false; reason: string },
    constructorError: null as Error | null,
    renderFrameError: null as Error | null,
    packedScene: packedScene as PackedScene,
    rendererConstructorCalls: [] as RendererOptions[],
    rendererInstances: [] as MockRenderer[],
    createFinalScene: vi.fn(() => ({ scene: true })),
    packSceneForGpu: vi.fn(() => packedScene),
  };
});

class MockRenderer {
  readonly dispose = vi.fn();
  readonly stats = vi.fn<() => RenderStats>(() => this.currentStats());
  readonly renderFrame = vi.fn<() => RenderStats>(() => {
    if (mocks.renderFrameError) {
      throw mocks.renderFrameError;
    }

    this.sampleCount += 1;
    return this.currentStats();
  });

  private sampleCount = 0;

  constructor(readonly options: RendererOptions) {
    mocks.rendererConstructorCalls.push(options);

    if (mocks.constructorError) {
      throw mocks.constructorError;
    }

    mocks.rendererInstances.push(this);
  }

  private currentStats(): RenderStats {
    return {
      sampleCount: this.sampleCount,
      targetSamples: this.options.targetSamples,
      width: this.options.width,
      height: this.options.height,
    };
  }
}

vi.mock('../../src/rendering/capabilities', () => ({
  createWebGlCapabilityAdapter: vi.fn((gl: WebGL2RenderingContext | null) => ({ gl })),
  checkWebGlCapabilities: vi.fn(() => mocks.capabilityResult),
}));

vi.mock('../../src/rendering/renderer', () => ({
  ProgressiveRenderer: MockRenderer,
}));

vi.mock('../../src/scene/finalScene', () => ({
  createFinalScene: mocks.createFinalScene,
}));

vi.mock('../../src/scene/gpuPacking', () => ({
  packSceneForGpu: mocks.packSceneForGpu,
}));

describe('mountApp', () => {
  let root: HTMLElement;
  let frameCallbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let timeoutCallbacks: Map<number, () => void>;
  let nextTimeoutId: number;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;
  let setTimeoutMock: ReturnType<typeof vi.fn>;
  let clearTimeoutMock: ReturnType<typeof vi.fn>;
  let gl: WebGL2RenderingContext;
  let mountApp: typeof import('../../src/ui/app').mountApp;

  beforeEach(async () => {
    const dom = new JSDOM('<main id="app"></main>');
    frameCallbacks = new Map();
    nextFrameId = 1;
    timeoutCallbacks = new Map();
    nextTimeoutId = 1;
    cancelAnimationFrameMock = vi.fn((id: number) => {
      frameCallbacks.delete(id);
    });
    clearTimeoutMock = vi.fn((id: number) => {
      timeoutCallbacks.delete(id);
    });
    gl = { kind: 'webgl2' } as unknown as WebGL2RenderingContext;
    mocks.capabilityResult = { supported: true };
    mocks.constructorError = null;
    mocks.renderFrameError = null;
    mocks.rendererConstructorCalls.length = 0;
    mocks.rendererInstances.length = 0;
    mocks.createFinalScene.mockClear();
    mocks.packSceneForGpu.mockClear();

    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('HTMLElement', dom.window.HTMLElement);
    vi.stubGlobal('HTMLCanvasElement', dom.window.HTMLCanvasElement);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.set(id, callback);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    setTimeoutMock = vi.fn((callback: () => void) => {
      const id = nextTimeoutId;
      nextTimeoutId += 1;
      timeoutCallbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal('setTimeout', setTimeoutMock);
    vi.stubGlobal('clearTimeout', clearTimeoutMock);

    Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => gl),
    });

    root = dom.window.document.querySelector<HTMLElement>('#app')!;
    ({ mountApp } = await import('../../src/ui/app'));
  });

  it('shows unsupported state and disables controls without constructing a renderer', () => {
    mocks.capabilityResult = { supported: false, reason: 'Floating-point framebuffer rendering is not supported.' };

    mountApp(root);
    expect(statusText()).toBe('Initializing');

    runStartup();

    expect(statusText()).toBe('Floating-point framebuffer rendering is not supported.');
    expect(disabledControlIds()).toEqual([
      'preset-select',
      'resolution',
      'max-depth',
      'pause-toggle',
      'reset-render',
      'export-png',
    ]);
    expect(mocks.createFinalScene).not.toHaveBeenCalled();
    expect(mocks.rendererConstructorCalls).toHaveLength(0);
  });

  it('mounts the shell through a paint boundary before scene packing and renderer construction', () => {
    mountApp(root);

    expect(root.querySelector('#render-canvas')).toBeInstanceOf(HTMLCanvasElement);
    expect(statusText()).toBe('Initializing');
    expect(mocks.createFinalScene).not.toHaveBeenCalled();
    expect(mocks.rendererConstructorCalls).toHaveLength(0);

    runNextFrame();

    expect(mocks.createFinalScene).not.toHaveBeenCalled();
    expect(mocks.rendererConstructorCalls).toHaveLength(0);
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 250);

    runNextTimeout();

    expect(mocks.createFinalScene).toHaveBeenCalledOnce();
    expect(mocks.rendererConstructorCalls).toHaveLength(1);
  });

  it('creates Book Quality renderer settings from the preset control', () => {
    mountApp(root);
    runStartup();

    selectPreset('book-quality');

    expect(lastRendererOptions().targetSamples).toBe(500);
    expect(lastRendererOptions().maxDepth).toBe(50);
  });

  it('disposes and recreates the renderer on resolution and preset changes', () => {
    mountApp(root);
    runStartup();
    const firstRenderer = mocks.rendererInstances[0];

    setResolution('0.5');

    expect(firstRenderer.dispose).toHaveBeenCalledOnce();
    expect(lastRendererOptions().width).toBe(600);
    const secondRenderer = mocks.rendererInstances[1];

    selectPreset('book-quality');

    expect(secondRenderer.dispose).toHaveBeenCalledOnce();
    expect(lastRendererOptions().targetSamples).toBe(500);
  });

  it('cleanup cancels RAF and disposes the active renderer', () => {
    const cleanup = mountApp(root);
    runStartup();
    const renderer = mocks.rendererInstances[0];

    cleanup();

    expect(cancelAnimationFrameMock).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });

  it('cleanup before startup cancels pending initialization work', () => {
    const cleanup = mountApp(root);
    runNextFrame();

    cleanup();
    runAllTimeouts();

    expect(clearTimeoutMock).toHaveBeenCalled();
    expect(mocks.createFinalScene).not.toHaveBeenCalled();
    expect(mocks.rendererConstructorCalls).toHaveLength(0);
  });

  it('shows renderer creation failures and recovers on reset', () => {
    mocks.constructorError = new Error('compile failed');
    mountApp(root);
    runStartup();

    expect(statusText()).toBe('Renderer error: compile failed');
    expect(mocks.rendererInstances).toHaveLength(0);

    mocks.constructorError = null;
    click('#reset-render');

    expect(mocks.rendererInstances).toHaveLength(1);
    expect(statusText()).toBe('0 / 10 samples');
  });

  it('handles renderFrame failures and allows reset recovery', () => {
    mountApp(root);
    runStartup();
    const renderer = mocks.rendererInstances[0];
    mocks.renderFrameError = new Error('draw failed');

    runNextFrame();

    expect(statusText()).toBe('Renderer error: draw failed');
    expect(renderer.dispose).toHaveBeenCalledOnce();

    mocks.renderFrameError = null;
    click('#reset-render');

    expect(mocks.rendererInstances).toHaveLength(2);
    expect(statusText()).toBe('0 / 10 samples');
  });

  it('marks the canvas rendered only after a successful non-paused render frame', () => {
    mountApp(root);
    runStartup();

    expect(canvas().dataset.rendered).toBe('false');

    click('#pause-toggle');
    runNextFrame();

    expect(canvas().dataset.rendered).toBe('false');

    click('#pause-toggle');
    runNextFrame();

    expect(canvas().dataset.rendered).toBe('true');
    expect(setTimeoutMock).toHaveBeenLastCalledWith(expect.any(Function), 2000);

    runNextTimeout();
    runNextFrame();

    expect(setTimeoutMock).toHaveBeenLastCalledWith(expect.any(Function), 50);
  });

  it('interrupts pending render pacing when reset recreates the renderer', () => {
    mountApp(root);
    runStartup();
    runNextFrame();

    expect(timeoutCallbacks.size).toBe(1);
    expect(frameCallbacks.size).toBe(0);
    expect(canvas().dataset.rendered).toBe('true');

    click('#reset-render');

    expect(clearTimeoutMock).toHaveBeenCalledWith(2);
    expect(timeoutCallbacks.size).toBe(0);
    expect(frameCallbacks.size).toBe(1);
    expect(canvas().dataset.rendered).toBe('false');

    runNextFrame();

    expect(mocks.rendererInstances[mocks.rendererInstances.length - 1].renderFrame).toHaveBeenCalledOnce();
  });

  it('interrupts pending render pacing when settings recreate the renderer', () => {
    mountApp(root);
    runStartup();
    runNextFrame();

    expect(timeoutCallbacks.size).toBe(1);
    expect(frameCallbacks.size).toBe(0);

    setResolution('0.5');

    expect(clearTimeoutMock).toHaveBeenCalledWith(2);
    expect(timeoutCallbacks.size).toBe(0);
    expect(frameCallbacks.size).toBe(1);
    expect(lastRendererOptions().width).toBe(600);

    runNextFrame();

    expect(mocks.rendererInstances[mocks.rendererInstances.length - 1].renderFrame).toHaveBeenCalledOnce();
  });

  function runStartup(): void {
    runNextFrame();
    runNextTimeout();
  }

  function runNextFrame(): void {
    const next = frameCallbacks.entries().next();

    if (next.done) {
      throw new Error('No queued animation frame');
    }

    const [id, callback] = next.value;
    frameCallbacks.delete(id);
    callback(16);
  }

  function runNextTimeout(): void {
    const next = timeoutCallbacks.entries().next();

    if (next.done) {
      throw new Error('No queued timeout');
    }

    const [id, callback] = next.value;
    timeoutCallbacks.delete(id);
    callback();
  }

  function runAllTimeouts(): void {
    while (timeoutCallbacks.size > 0) {
      runNextTimeout();
    }
  }

  function statusText(): string {
    return root.querySelector<HTMLElement>('[data-testid="status"]')?.textContent ?? '';
  }

  function canvas(): HTMLCanvasElement {
    return root.querySelector<HTMLCanvasElement>('#render-canvas')!;
  }

  function disabledControlIds(): string[] {
    return Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button'))
      .filter((control) => control.disabled)
      .map((control) => control.id);
  }

  function lastRendererOptions(): RendererOptions {
    return mocks.rendererConstructorCalls[mocks.rendererConstructorCalls.length - 1];
  }

  function selectPreset(value: string): void {
    const select = root.querySelector<HTMLSelectElement>('#preset-select')!;
    select.value = value;
    select.dispatchEvent(new window.Event('change'));
  }

  function setResolution(value: string): void {
    const resolution = root.querySelector<HTMLInputElement>('#resolution')!;
    resolution.value = value;
    resolution.dispatchEvent(new window.Event('input'));
  }

  function click(selector: string): void {
    root.querySelector<HTMLButtonElement>(selector)!.click();
  }
});
