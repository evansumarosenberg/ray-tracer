type FakeTexture = { readonly kind: 'texture'; readonly id: number };
type FakeFramebuffer = { readonly kind: 'framebuffer'; readonly id: number };

interface FakeWebGlOptions {
  readonly createFramebufferReturnsNull?: boolean;
  readonly framebufferStatus?: number;
  readonly maxTextureSize?: number;
  readonly texImage2DThrows?: boolean;
  readonly texImage2DError?: number;
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
  readonly NO_ERROR = 0;
  readonly OUT_OF_MEMORY = 0x0505;

  readonly deletedTextures: FakeTexture[] = [];
  readonly deletedFramebuffers: FakeFramebuffer[] = [];

  textureBinding: FakeTexture | null = { kind: 'texture', id: -1 };
  drawFramebufferBinding: FakeFramebuffer | null = { kind: 'framebuffer', id: -2 };
  readFramebufferBinding: FakeFramebuffer | null = { kind: 'framebuffer', id: -3 };
  texImage2DCalls = 0;

  private nextTextureId = 1;
  private nextFramebufferId = 1;
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

    return null;
  }

  getError(): GLenum {
    const current = this.error;
    this.error = this.NO_ERROR;
    return current;
  }
}
