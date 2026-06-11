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
      return gl ? gl.getExtension(name) !== null : false;
    },
    canRenderToFloatTexture(): boolean {
      if (!gl) {
        return false;
      }

      let texture: WebGLTexture | null = null;
      let framebuffer: WebGLFramebuffer | null = null;
      const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
      const previousDrawFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;

      try {
        texture = gl.createTexture();

        if (!texture) {
          return false;
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);

        framebuffer = gl.createFramebuffer();

        if (!framebuffer) {
          return false;
        }

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        return gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      } catch {
        return false;
      } finally {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDrawFramebuffer);
        gl.bindTexture(gl.TEXTURE_2D, previousTexture);

        if (framebuffer) {
          gl.deleteFramebuffer(framebuffer);
        }

        if (texture) {
          gl.deleteTexture(texture);
        }
      }
    },
  };
}
