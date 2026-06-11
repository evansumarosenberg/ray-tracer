export function createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error('Failed to create WebGL shader.');
  }

  try {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error.';
      throw new Error(`Failed to compile WebGL shader: ${info}`);
    }
  } catch (error) {
    gl.deleteShader(shader);
    throw error;
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  let vertexShader: WebGLShader | null = null;
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;

  try {
    vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();

    if (!program) {
      throw new Error('Failed to create WebGL program.');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program) ?? 'Unknown program link error.';
      throw new Error(`Failed to link WebGL program: ${info}`);
    }

    return program;
  } catch (error) {
    if (program) {
      gl.deleteProgram(program);
    }

    throw error;
  } finally {
    if (vertexShader) {
      gl.deleteShader(vertexShader);
    }

    if (fragmentShader) {
      gl.deleteShader(fragmentShader);
    }
  }
}

export function createFloatTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Float texture dimensions must be finite positive integers.');
  }

  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

  if (width > maxTextureSize || height > maxTextureSize) {
    throw new Error(`Float texture dimensions exceed MAX_TEXTURE_SIZE ${maxTextureSize}.`);
  }

  const texture = gl.createTexture();

  if (!texture) {
    throw new Error('Failed to create WebGL texture.');
  }

  const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
    const error = gl.getError();

    if (error !== gl.NO_ERROR) {
      throw new Error(`Failed to allocate float texture; WebGL error ${formatGlEnum(error)}.`);
    }
  } catch (error) {
    gl.deleteTexture(texture);
    throw error;
  } finally {
    gl.bindTexture(gl.TEXTURE_2D, previousTexture);
  }

  return texture;
}

export function createFramebufferForTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
): WebGLFramebuffer {
  const framebuffer = gl.createFramebuffer();

  if (!framebuffer) {
    throw new Error('Failed to create WebGL framebuffer.');
  }

  const previousDrawFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;

  try {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL framebuffer is incomplete: ${formatGlEnum(status)}.`);
    }
  } catch (error) {
    gl.deleteFramebuffer(framebuffer);
    throw error;
  } finally {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDrawFramebuffer);
  }

  return framebuffer;
}

function formatGlEnum(value: GLenum): string {
  return `0x${value.toString(16).padStart(4, '0')}`;
}
