export const CRT_SCREEN_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const CRT_SCREEN_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  varying vec2 vUv;

  vec2 barrelDistort(vec2 uv, float amount) {
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    return uv + cc * dist * amount;
  }

  void main() {
    vec2 uv = barrelDistort(vUv, 0.35);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float aberration = 0.003;
    float r = texture2D(uMap, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(uMap, uv).g;
    float b = texture2D(uMap, uv - vec2(aberration, 0.0)).b;
    vec3 color = vec3(r, g, b);

    float scanline = sin(uv.y * 800.0) * 0.04;
    color -= scanline;

    vec2 vig = uv - 0.5;
    float vignette = 1.0 - dot(vig, vig) * 1.2;
    color *= vignette;

    float flicker = 0.98 + 0.02 * sin(uTime * 60.0);
    color *= flicker;

    gl_FragColor = vec4(color, 1.0);
  }
`
