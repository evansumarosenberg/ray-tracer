export const displayFragmentShader = `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uAccumulation;
uniform int uSampleCount;

void main() {
  vec3 accumulated = texture(uAccumulation, vUv).rgb;
  vec3 averaged = accumulated / float(max(uSampleCount, 1));
  vec3 gammaCorrected = sqrt(max(averaged, vec3(0.0)));
  outColor = vec4(clamp(gammaCorrected, 0.0, 1.0), 1.0);
}
`;
