type FakeTexture = { readonly kind: 'texture'; readonly id: number };
type FakeFramebuffer = { readonly kind: 'framebuffer'; readonly id: number };
type FakeShader = { readonly kind: 'shader'; readonly id: number; readonly type: number };
type FakeProgram = { readonly kind: 'program'; readonly id: number };
type FakeVertexArray = { readonly kind: 'vertexArray'; readonly id: number };

interface FakeWebGlOptions {
  readonly createFramebufferReturnsNull?: boolean;
  readonly framebufferStatus?: number;
  readonly maxTextureSize?: number;
  readonly texImage2DThrows?: boolean;
  readonly texImage2DError?: number;
  readonly texSubImage2DError?: number;
  readonly missingUniforms?: readonly string[];
}

export class FakeWebGl2 {
  readonly TEXTURE_2D = 0x0de1;
  readonly TEXTURE_BINDING_2D = 0x8069;
  readonly TEXTURE_MIN_FILTER = 0x2801;
  readonly TEXTURE_MAG_FILTER = 0x2800;
  readonly TEXTURE_WRAP_S = 0x2802;
  readonly TEXTURE_WRAP_T = 0x2803;
  readonly NEAREST = 0x2600;
  readonly CLAMP_TO_EDGE = 0x812f;
  readonly RGBA32F = 0x8814;
  readonly RGBA = 0x1908;
  readonly FLOAT = 0x1406;
  readonly FRAMEBUFFER = 0x8d40;
  readonly DRAW_FRAMEBUFFER = 0x8ca9;
  readonly READ_FRAMEBUFFER = 0x8ca8;
  readonly FRAMEBUFFER_BINDING = 0x8ca6;
  readonly DRAW_FRAMEBUFFER_BINDING = 0x8ca6;
  readonly READ_FRAMEBUFFER_BINDING = 0x8caa;
  readonly COLOR_ATTACHMENT0 = 0x8ce0;
  readonly FRAMEBUFFER_COMPLETE = 0x8cd5;
  readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8cd6;
  readonly MAX_TEXTURE_SIZE = 0x0d33;
  readonly COLOR_CLEAR_VALUE = 0x0c22;
  readonly COLOR_BUFFER_BIT = 0x4000;
  readonly VIEWPORT = 0x0ba2;
  readonly TRIANGLES = 0x0004;
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPILE_STATUS = 0x8b81;
  readonly LINK_STATUS = 0x8b82;
  readonly TEXTURE0 = 0x84c0;
  readonly NO_ERROR = 0;
  readonly OUT_OF_MEMORY = 0x0505;

  readonly deletedTextures: FakeTexture[] = [];
  readonly deletedFramebuffers: FakeFramebuffer[] = [];
  readonly deletedShaders: FakeShader[] = [];
  readonly deletedPrograms: FakeProgram[] = [];
  readonly deletedVertexArrays: FakeVertexArray[] = [];
  readonly clearCalls: Array<{ framebuffer: FakeFramebuffer | null; color: readonly [number, number, number, number] }> =
    [];
  readonly drawCalls: Array<{ program: FakeProgram | null; framebuffer: FakeFramebuffer | null }> = [];

  textureBinding: FakeTexture | null = { kind: 'texture', id: -1 };
  drawFramebufferBinding: FakeFramebuffer | null = { kind: 'framebuffer', id: -2 };
  readFramebufferBinding: FakeFramebuffer | null = { kind: 'framebuffer', id: -3 };
  vertexArrayBinding: FakeVertexArray | null = null;
  currentProgram: FakeProgram | null = null;
  clearColorValue: [number, number, number, number] = [0.25, 0.5, 0.75, 1];
  viewportValue: [number, number, number, number] = [1, 2, 3, 4];
  texImage2DCalls = 0;
  texSubImage2DCalls = 0;

  private nextTextureId = 1;
  private nextFramebufferId = 1;
  private nextShaderId = 1;
  private nextProgramId = 1;
  private nextVertexArrayId = 1;
  private error = this.NO_ERROR;

  constructor(private readonly options: FakeWebGlOptions = {}) {}

  asWebGl2(): WebGL2RenderingContext {
    return this as unknown as WebGL2RenderingContext;
  }

  createTexture(): WebGLTexture {
    return { kind: 'texture', id: this.nextTextureId++ } as unknown as WebGLTexture;
  }

  deleteTexture(texture: WebGLTexture | null): void {
    if (texture) {
      this.deletedTextures.push(texture as unknown as FakeTexture);
    }
  }

  bindTexture(_target: GLenum, texture: WebGLTexture | null): void {
    this.textureBinding = texture as FakeTexture | null;
  }

  texParameteri(): void {}

  texImage2D(): void {
    this.texImage2DCalls += 1;

    if (this.options.texImage2DThrows) {
      throw new Error('texImage2D failed');
    }

    this.error = this.options.texImage2DError ?? this.NO_ERROR;
  }

  texSubImage2D(): void {
    this.texSubImage2DCalls += 1;
    this.error = this.options.texSubImage2DError ?? this.NO_ERROR;
  }

  createFramebuffer(): WebGLFramebuffer | null {
    if (this.options.createFramebufferReturnsNull) {
      return null;
    }

    return { kind: 'framebuffer', id: this.nextFramebufferId++ } as unknown as WebGLFramebuffer;
  }

  deleteFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (framebuffer) {
      this.deletedFramebuffers.push(framebuffer as unknown as FakeFramebuffer);
    }
  }

  bindFramebuffer(target: GLenum, framebuffer: WebGLFramebuffer | null): void {
    const value = framebuffer as FakeFramebuffer | null;

    if (target === this.DRAW_FRAMEBUFFER) {
      this.drawFramebufferBinding = value;
      return;
    }

    if (target === this.READ_FRAMEBUFFER) {
      this.readFramebufferBinding = value;
      return;
    }

    if (target === this.FRAMEBUFFER) {
      this.drawFramebufferBinding = value;
      this.readFramebufferBinding = value;
    }
  }

  framebufferTexture2D(): void {}

  checkFramebufferStatus(): GLenum {
    return this.options.framebufferStatus ?? this.FRAMEBUFFER_COMPLETE;
  }

  getParameter(parameter: GLenum): unknown {
    if (parameter === this.TEXTURE_BINDING_2D) {
      return this.textureBinding;
    }

    if (parameter === this.DRAW_FRAMEBUFFER_BINDING || parameter === this.FRAMEBUFFER_BINDING) {
      return this.drawFramebufferBinding;
    }

    if (parameter === this.READ_FRAMEBUFFER_BINDING) {
      return this.readFramebufferBinding;
    }

    if (parameter === this.MAX_TEXTURE_SIZE) {
      return this.options.maxTextureSize ?? 4096;
    }

    if (parameter === this.COLOR_CLEAR_VALUE) {
      return new Float32Array(this.clearColorValue);
    }

    if (parameter === this.VIEWPORT) {
      return new Int32Array(this.viewportValue);
    }

    return null;
  }

  getError(): GLenum {
    const current = this.error;
    this.error = this.NO_ERROR;
    return current;
  }

  createShader(type: GLenum): WebGLShader {
    return { kind: 'shader', id: this.nextShaderId++, type } as unknown as WebGLShader;
  }

  shaderSource(): void {}

  compileShader(): void {}

  getShaderParameter(): boolean {
    return true;
  }

  getShaderInfoLog(): string | null {
    return null;
  }

  deleteShader(shader: WebGLShader | null): void {
    if (shader) {
      this.deletedShaders.push(shader as unknown as FakeShader);
    }
  }

  createProgram(): WebGLProgram {
    return { kind: 'program', id: this.nextProgramId++ } as unknown as WebGLProgram;
  }

  attachShader(): void {}

  linkProgram(): void {}

  getProgramParameter(): boolean {
    return true;
  }

  getProgramInfoLog(): string | null {
    return null;
  }

  deleteProgram(program: WebGLProgram | null): void {
    if (program) {
      this.deletedPrograms.push(program as unknown as FakeProgram);
    }
  }

  createVertexArray(): WebGLVertexArrayObject {
    return { kind: 'vertexArray', id: this.nextVertexArrayId++ } as unknown as WebGLVertexArrayObject;
  }

  bindVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
    this.vertexArrayBinding = vertexArray as FakeVertexArray | null;
  }

  deleteVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
    if (vertexArray) {
      this.deletedVertexArrays.push(vertexArray as unknown as FakeVertexArray);
    }
  }

  getUniformLocation(_program: WebGLProgram, name: string): WebGLUniformLocation | null {
    if (this.options.missingUniforms?.includes(name)) {
      return null;
    }

    return { name } as unknown as WebGLUniformLocation;
  }

  useProgram(program: WebGLProgram | null): void {
    this.currentProgram = program as FakeProgram | null;
  }

  uniform1i(): void {}

  uniform2f(): void {}

  uniform3f(): void {}

  activeTexture(): void {}

  viewport(x: number, y: number, width: number, height: number): void {
    this.viewportValue = [x, y, width, height];
  }

  clearColor(red: number, green: number, blue: number, alpha: number): void {
    this.clearColorValue = [red, green, blue, alpha];
  }

  clear(mask: GLbitfield): void {
    if (mask === this.COLOR_BUFFER_BIT) {
      this.clearCalls.push({ framebuffer: this.drawFramebufferBinding, color: [...this.clearColorValue] });
    }
  }

  drawArrays(): void {
    this.drawCalls.push({ program: this.currentProgram, framebuffer: this.drawFramebufferBinding });
  }
}
