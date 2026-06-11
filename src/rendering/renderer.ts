import { buildCamera, type BuiltCamera } from '../math/camera';
import type { RenderPreset } from '../presets/renderPresets';
import type { PackedScene } from '../scene/gpuPacking';
import { displayFragmentShader } from '../shaders/display.frag';
import { fullscreenVertexShader } from '../shaders/fullscreen.vert';
import { pathTraceFragmentShader } from '../shaders/pathTrace.frag';
import { createFloatTexture, createFramebufferForTexture, createProgram } from './glUtils';

const PREVIOUS_ACCUMULATION_TEXTURE_UNIT = 0;
const SPHERE_DATA_TEXTURE_UNIT = 1;
const MATERIAL_DATA_TEXTURE_UNIT = 2;
const DISPLAY_ACCUMULATION_TEXTURE_UNIT = 0;

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

interface PathTraceUniforms {
  previousAccumulation: WebGLUniformLocation;
  sphereData: WebGLUniformLocation;
  materialData: WebGLUniformLocation;
  sphereCount: WebGLUniformLocation;
  frameIndex: WebGLUniformLocation;
  maxDepth: WebGLUniformLocation;
  resolution: WebGLUniformLocation;
  cameraCenter: WebGLUniformLocation;
  pixel00: WebGLUniformLocation;
  pixelDeltaU: WebGLUniformLocation;
  pixelDeltaV: WebGLUniformLocation;
  defocusDiskU: WebGLUniformLocation;
  defocusDiskV: WebGLUniformLocation;
}

interface DisplayUniforms {
  accumulation: WebGLUniformLocation;
  sampleCount: WebGLUniformLocation;
}

export class ProgressiveRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: BuiltCamera;
  private readonly pathProgram: WebGLProgram;
  private readonly displayProgram: WebGLProgram;
  private readonly vertexArray: WebGLVertexArrayObject;
  private readonly pathUniforms: PathTraceUniforms;
  private readonly displayUniforms: DisplayUniforms;
  private readonly accumulationTextures: readonly [WebGLTexture, WebGLTexture];
  private readonly accumulationFramebuffers: readonly [WebGLFramebuffer, WebGLFramebuffer];
  private readonly sphereTexture: WebGLTexture;
  private readonly materialTexture: WebGLTexture;

  private sampleCount = 0;
  private currentAccumulationIndex = 0;
  private disposed = false;

  constructor(private readonly options: RendererOptions) {
    this.gl = options.gl;
    this.canvas = options.canvas;
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.camera = buildCamera(options.preset.camera, options.width, options.height);

    const vertexArray = this.gl.createVertexArray();

    if (!vertexArray) {
      throw new Error('Failed to create WebGL vertex array.');
    }

    this.vertexArray = vertexArray;
    this.pathProgram = createProgram(this.gl, fullscreenVertexShader, pathTraceFragmentShader);
    this.displayProgram = createProgram(this.gl, fullscreenVertexShader, displayFragmentShader);
    this.pathUniforms = createPathTraceUniforms(this.gl, this.pathProgram);
    this.displayUniforms = createDisplayUniforms(this.gl, this.displayProgram);
    this.accumulationTextures = [
      createFloatTexture(this.gl, options.width, options.height),
      createFloatTexture(this.gl, options.width, options.height),
    ];
    this.accumulationFramebuffers = [
      createFramebufferForTexture(this.gl, this.accumulationTextures[0]),
      createFramebufferForTexture(this.gl, this.accumulationTextures[1]),
    ];
    this.sphereTexture = createFloatDataTexture(
      this.gl,
      options.packedScene.sphereCount,
      1,
      options.packedScene.spheres,
      'sphere data',
    );
    this.materialTexture = createFloatDataTexture(
      this.gl,
      options.packedScene.sphereCount * 2,
      1,
      options.packedScene.materials,
      'material data',
    );

    this.configureStaticUniforms();
    this.reset();
  }

  renderFrame(): RenderStats {
    this.assertActive();

    if (this.sampleCount < this.options.targetSamples) {
      this.renderAccumulationSample();
    }

    this.renderDisplay();
    return this.stats();
  }

  reset(): void {
    this.assertActive();

    this.sampleCount = 0;
    this.currentAccumulationIndex = 0;
    clearFramebuffers(this.gl, this.accumulationFramebuffers, this.options.width, this.options.height);
  }

  stats(): RenderStats {
    return {
      sampleCount: this.sampleCount,
      targetSamples: this.options.targetSamples,
      width: this.options.width,
      height: this.options.height,
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.gl.deleteProgram(this.pathProgram);
    this.gl.deleteProgram(this.displayProgram);
    this.gl.deleteVertexArray(this.vertexArray);

    for (const framebuffer of this.accumulationFramebuffers) {
      this.gl.deleteFramebuffer(framebuffer);
    }

    for (const texture of this.accumulationTextures) {
      this.gl.deleteTexture(texture);
    }

    this.gl.deleteTexture(this.sphereTexture);
    this.gl.deleteTexture(this.materialTexture);
    this.disposed = true;
  }

  private renderAccumulationSample(): void {
    const writeIndex = 1 - this.currentAccumulationIndex;
    const readIndex = this.currentAccumulationIndex;

    this.gl.viewport(0, 0, this.options.width, this.options.height);
    this.gl.useProgram(this.pathProgram);
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.accumulationFramebuffers[writeIndex]);

    bindTextureUnit(this.gl, PREVIOUS_ACCUMULATION_TEXTURE_UNIT, this.accumulationTextures[readIndex]);
    bindTextureUnit(this.gl, SPHERE_DATA_TEXTURE_UNIT, this.sphereTexture);
    bindTextureUnit(this.gl, MATERIAL_DATA_TEXTURE_UNIT, this.materialTexture);
    this.uploadPathTraceUniforms();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);

    this.currentAccumulationIndex = writeIndex;
    this.sampleCount += 1;
  }

  private renderDisplay(): void {
    this.gl.viewport(0, 0, this.options.width, this.options.height);
    this.gl.useProgram(this.displayProgram);
    this.gl.bindVertexArray(this.vertexArray);
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, null);
    bindTextureUnit(
      this.gl,
      DISPLAY_ACCUMULATION_TEXTURE_UNIT,
      this.accumulationTextures[this.currentAccumulationIndex],
    );
    this.gl.uniform1i(this.displayUniforms.sampleCount, this.sampleCount);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    this.gl.bindVertexArray(null);
  }

  private configureStaticUniforms(): void {
    this.gl.useProgram(this.pathProgram);
    this.gl.uniform1i(this.pathUniforms.previousAccumulation, PREVIOUS_ACCUMULATION_TEXTURE_UNIT);
    this.gl.uniform1i(this.pathUniforms.sphereData, SPHERE_DATA_TEXTURE_UNIT);
    this.gl.uniform1i(this.pathUniforms.materialData, MATERIAL_DATA_TEXTURE_UNIT);

    this.gl.useProgram(this.displayProgram);
    this.gl.uniform1i(this.displayUniforms.accumulation, DISPLAY_ACCUMULATION_TEXTURE_UNIT);
    this.gl.useProgram(null);
  }

  private uploadPathTraceUniforms(): void {
    this.gl.uniform1i(this.pathUniforms.sphereCount, this.options.packedScene.sphereCount);
    this.gl.uniform1i(this.pathUniforms.frameIndex, this.sampleCount);
    this.gl.uniform1i(this.pathUniforms.maxDepth, this.options.maxDepth);
    this.gl.uniform2f(this.pathUniforms.resolution, this.options.width, this.options.height);
    uniformVec3(this.gl, this.pathUniforms.cameraCenter, this.camera.center);
    uniformVec3(this.gl, this.pathUniforms.pixel00, this.camera.pixel00);
    uniformVec3(this.gl, this.pathUniforms.pixelDeltaU, this.camera.pixelDeltaU);
    uniformVec3(this.gl, this.pathUniforms.pixelDeltaV, this.camera.pixelDeltaV);
    uniformVec3(this.gl, this.pathUniforms.defocusDiskU, this.camera.defocusDiskU);
    uniformVec3(this.gl, this.pathUniforms.defocusDiskV, this.camera.defocusDiskV);
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('ProgressiveRenderer has been disposed.');
    }
  }
}

function createPathTraceUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): PathTraceUniforms {
  return {
    previousAccumulation: requiredUniform(gl, program, 'uPreviousAccumulation'),
    sphereData: requiredUniform(gl, program, 'uSphereData'),
    materialData: requiredUniform(gl, program, 'uMaterialData'),
    sphereCount: requiredUniform(gl, program, 'uSphereCount'),
    frameIndex: requiredUniform(gl, program, 'uFrameIndex'),
    maxDepth: requiredUniform(gl, program, 'uMaxDepth'),
    resolution: requiredUniform(gl, program, 'uResolution'),
    cameraCenter: requiredUniform(gl, program, 'uCameraCenter'),
    pixel00: requiredUniform(gl, program, 'uPixel00'),
    pixelDeltaU: requiredUniform(gl, program, 'uPixelDeltaU'),
    pixelDeltaV: requiredUniform(gl, program, 'uPixelDeltaV'),
    defocusDiskU: requiredUniform(gl, program, 'uDefocusDiskU'),
    defocusDiskV: requiredUniform(gl, program, 'uDefocusDiskV'),
  };
}

function createDisplayUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): DisplayUniforms {
  return {
    accumulation: requiredUniform(gl, program, 'uAccumulation'),
    sampleCount: requiredUniform(gl, program, 'uSampleCount'),
  };
}

function requiredUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);

  if (!location) {
    throw new Error(`Missing required WebGL uniform: ${name}`);
  }

  return location;
}

function bindTextureUnit(gl: WebGL2RenderingContext, unit: number, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function uniformVec3(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation,
  value: readonly [number, number, number],
): void {
  gl.uniform3f(location, value[0], value[1], value[2]);
}

function createFloatDataTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Float32Array,
  label: string,
): WebGLTexture {
  const texture = createFloatTexture(gl, width, height);
  const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, data);
    const error = gl.getError();

    if (error !== gl.NO_ERROR) {
      throw new Error(`Failed to upload ${label}; WebGL error ${formatGlEnum(error)}.`);
    }
  } catch (error) {
    gl.deleteTexture(texture);
    throw error;
  } finally {
    gl.bindTexture(gl.TEXTURE_2D, previousTexture);
  }

  return texture;
}

function clearFramebuffers(
  gl: WebGL2RenderingContext,
  framebuffers: readonly WebGLFramebuffer[],
  width: number,
  height: number,
): void {
  const previousDrawFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
  const previousClearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array;

  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);

  for (const framebuffer of framebuffers) {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDrawFramebuffer);
  gl.clearColor(previousClearColor[0], previousClearColor[1], previousClearColor[2], previousClearColor[3]);
}

function formatGlEnum(value: GLenum): string {
  return `0x${value.toString(16).padStart(4, '0')}`;
}
