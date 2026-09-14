export const HOLO_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

// Waves travel downward (toward the CD tray): sharp bottom edge, tail upward.
// uPhase is advanced on the CPU – so the speed can change without the waves jumping
export const HOLO_FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <dithering_pars_fragment>

  uniform float uTime;
  uniform float uPhase;
  uniform float uIntensity;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  const float WAVE_COUNT = 3.0;

  void main() {
    float y = vUv.y;

    float s = fract(y * WAVE_COUNT + uPhase);
    float waves = pow(1.0 - s, 5.0);

    // Fade in from the top, stronger toward the tray + base glow at the bottom
    float heightFade = smoothstep(1.0, 0.6, y);
    float baseGlow   = pow(1.0 - y, 3.0) * 0.35;

    // Sides (silhouette) brighter than the center
    float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float rim    = 0.35 + 0.65 * pow(1.0 - facing, 1.5);

    float scanlines = 0.85 + 0.15 * sin(y * 120.0);
    float flicker   = 0.93 + 0.07 * sin(uTime * 37.0) * sin(uTime * 13.0);

    float density = (waves * heightFade + baseGlow) * rim * scanlines * flicker * uIntensity;

    gl_FragColor = vec4(uColor * density, 1.0);
    // Convert to sRGB like meshBasicMaterial – otherwise the purple looks darker than the ring at the bottom
    #include <colorspace_fragment>
    #include <dithering_fragment>
  }
`
