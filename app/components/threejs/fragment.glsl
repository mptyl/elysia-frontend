varying vec3 vNormal;
varying vec3 vColor;
varying float vNoiseVal;
uniform float uNoiseStrength;

void main() {

  float grain = fract(sin(vNoiseVal * uNoiseStrength * 1000.0) * uNoiseStrength * 1000.0);
  grain = 0.5 + grain * 0.8;

  vec3 finalColor = vColor * grain;

  // Alpha based on luminance: dark (unlit) areas become transparent,
  // lit/colored areas stay opaque. Works on both light and dark backgrounds.
  float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
  float alpha = smoothstep(0.06, 0.30, luminance);

  gl_FragColor = vec4(finalColor, alpha);
}
