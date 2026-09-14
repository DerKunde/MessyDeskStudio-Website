export const LIGHT_CONE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vPos;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vPos = position;
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const LIGHT_CONE_FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <dithering_pars_fragment>

  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vPos;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 p = vPos * 2.5;
    p.y -= uTime * 0.25;
    float n = noise(p) * 0.6 + noise(p * 2.1 + 5.0) * 0.4;

    float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);

    float rim = abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float sideFade = smoothstep(0.0, 0.45, rim);

    float density = n * uOpacity * edgeFade * sideFade;

    gl_FragColor = vec4(uColor * density, 1.0);
    #include <dithering_fragment>
  }
`
