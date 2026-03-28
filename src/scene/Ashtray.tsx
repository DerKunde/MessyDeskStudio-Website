import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { useIgnitable } from './useIgnitable'

const SMOKE_HEIGHT = 0.22
// Wie viele vergangene Positionen gespeichert werden.
// uv.y=0 → aktueller Frame, uv.y=1 → ältester Eintrag
const HISTORY_SIZE = 64

const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform sampler2D uHistoryTex;
  uniform vec2 uCurrentPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // Twist the plane into a rising 3D helix
    float twist = uv.y * 3.5 + uTime * 0.35;
    float r = position.x;

    vec3 pos = position;
    pos.x = cos(twist) * r;
    pos.z = sin(twist) * r;

    // S-Kurve: Amplitude wächst mit Bewegungsgeschwindigkeit
    float turbulence = clamp(uSpeed * 6.0, 0.0, 1.0);
    float amp = uv.y * uv.y * (0.018 + turbulence * 0.028);
    float phase = uTime * 0.5;
    pos.x += amp * (sin(uv.y * 3.14159 * 2.3 + phase) + 0.4 * sin(uv.y * 3.14159 * 4.8 + phase * 1.7));
    pos.z += amp * 0.35 * sin(uv.y * 3.14159 * 1.9 + phase * 0.8 + 1.1);

    // Physikalischer Trail: jede Höhe zeigt wo die Glut zum Emissionszeitpunkt war.
    // uv.y=0 → gerade emittiert (aktuelle Position), uv.y=1 → ältester Rauch
    vec2 histPos = texture2D(uHistoryTex, vec2(uv.y, 0.5)).rg;
    pos.x += histPos.x - uCurrentPos.x;
    pos.z += histPos.y - uCurrentPos.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uSpeed;
  varying vec2 vUv;

  void main() {
    vec2 uv = vec2(vUv.x, vUv.y - uTime * 0.12);
    float noise = texture2D(uTexture, uv).r;

    // Bei hoher Geschwindigkeit: breitere smoothstep-Spanne → fragmentierter, aufgerissener Rauch
    float turbulence = clamp(uSpeed * 6.0, 0.0, 1.0);
    float lo = mix(0.35, 0.18, turbulence);
    float hi = mix(0.65, 0.82, turbulence);
    float smoke = smoothstep(lo, hi, noise);

    float fadeX = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
    float fadeY = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float alpha = smoke * fadeX * fadeY * mix(0.32, 0.42, turbulence);

    gl_FragColor = vec4(0.78, 0.78, 0.78, alpha);
  }
`

function generateNoiseTexture(): THREE.Texture {
  const size = 256
  const gridSize = 16

  let seed = 42
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }

  const grid: number[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, rand)
  )

  const smoothstep = (t: number) => t * t * (3 - 2 * t)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)

  const sample = (x: number, y: number): number => {
    const xi = Math.floor(x * gridSize)
    const yi = Math.floor(y * gridSize)
    const fx = smoothstep(x * gridSize - xi)
    const fy = smoothstep(y * gridSize - yi)
    const x0 = xi % gridSize
    const x1 = (xi + 1) % gridSize
    const y0 = yi % gridSize
    const y1 = (yi + 1) % gridSize
    return lerp(
      lerp(grid[x0][y0], grid[x1][y0], fx),
      lerp(grid[x0][y1], grid[x1][y1], fx),
      fy
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size
      const ny = y / size
      const v =
        sample(nx,      ny)      * 0.5   +
        sample(nx * 2,  ny * 2)  * 0.25  +
        sample(nx * 4,  ny * 4)  * 0.125 +
        sample(nx * 8,  ny * 8)  * 0.0625
      const val = Math.round((v / 0.9375) * 255)
      const idx = (y * size + x) * 4
      imageData.data[idx]     = val
      imageData.data[idx + 1] = val
      imageData.data[idx + 2] = val
      imageData.data[idx + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

export function Ashtray({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  const { reset, onCollisionEnter, onCollisionExit } = useIgnitable(rbRef, true)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY, onRespawn: reset })

  const emberRef = useRef<THREE.Mesh>(null)
  const smokeRef = useRef<THREE.Mesh>(null)
  const smokeOrigin = useRef(new THREE.Vector3())
  const emberMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const emberLightRef = useRef<THREE.PointLight>(null)

  // Positionshistory: RGBA-Float-Textur, HISTORY_SIZE × 1
  // R = world X, G = world Z (Y wird nicht benötigt, da das Mesh sowieso steigt)
  const historyData = useRef(new Float32Array(HISTORY_SIZE * 4))
  const historyInitialized = useRef(false)
  const smoothSpeed = useRef(0)
  const historyTex = useMemo(() => {
    const tex = new THREE.DataTexture(
      historyData.current,
      HISTORY_SIZE, 1,
      THREE.RGBAFormat,
      THREE.FloatType,
    )
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearFilter
    return tex
  }, [])

  const noiseTexture = useMemo(() => generateNoiseTexture(), [])

  const smokeMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTexture:    { value: noiseTexture },
      uTime:       { value: 0 },
      uSpeed:      { value: 0 },
      uHistoryTex: { value: historyTex },
      uCurrentPos: { value: new THREE.Vector2() },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  }), [noiseTexture, historyTex])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (emberRef.current) {
      emberRef.current.getWorldPosition(smokeOrigin.current)
    }

    // History initialisieren sobald die erste echte Ember-Position bekannt ist
    const d = historyData.current
    if (!historyInitialized.current && smokeOrigin.current.lengthSq() > 0) {
      for (let i = 0; i < HISTORY_SIZE; i++) {
        d[i * 4]     = smokeOrigin.current.x
        d[i * 4 + 1] = smokeOrigin.current.z
      }
      historyInitialized.current = true
    }

    // Buffer nach vorne schieben, aktuelle Position an Index 0
    for (let i = HISTORY_SIZE - 1; i > 0; i--) {
      d[i * 4]     = d[(i - 1) * 4]
      d[i * 4 + 1] = d[(i - 1) * 4 + 1]
    }
    d[0] = smokeOrigin.current.x
    d[1] = smokeOrigin.current.z
    historyTex.needsUpdate = true

    // Geschwindigkeit aus den letzten 8 History-Einträgen ableiten
    const sdx = d[0] - d[8 * 4]
    const sdz = d[1] - d[8 * 4 + 1]
    smoothSpeed.current = THREE.MathUtils.lerp(
      smoothSpeed.current,
      Math.sqrt(sdx * sdx + sdz * sdz),
      0.15
    )

    if (smokeRef.current) {
      smokeRef.current.position.set(
        smokeOrigin.current.x,
        smokeOrigin.current.y + SMOKE_HEIGHT / 2,
        smokeOrigin.current.z
      )
      smokeMat.uniforms.uTime.value = t
      smokeMat.uniforms.uSpeed.value = smoothSpeed.current
      smokeMat.uniforms.uCurrentPos.value.set(smokeOrigin.current.x, smokeOrigin.current.z)
    }

    // Ember pulse
    const pulse = 0.7 + 0.3 * Math.sin(t * 4.1) * Math.sin(t * 2.6 + 0.8)
    if (emberMatRef.current) {
      emberMatRef.current.emissiveIntensity = pulse * 1.6
    }
    if (emberLightRef.current) {
      emberLightRef.current.intensity = pulse * 0.05
    }
  })

  return (
    <group>
      <RigidBody
        ref={rbRef}
        colliders="hull"
        mass={0.5}
        restitution={0.1}
        friction={0.8}
        ccd
        position={position}
        onCollisionEnter={onCollisionEnter}
        onCollisionExit={onCollisionExit}
      >
        {/* Aschenbecher-Körper */}
        <mesh
          castShadow
          receiveShadow
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            grab.start(rbRef.current, e.distance)
          }}
        >
          <cylinderGeometry args={[0.065, 0.058, 0.018, 32]} />
          <meshStandardMaterial color="#252525" roughness={0.35} metalness={0.45} />
        </mesh>

        {/* Innere Vertiefung */}
        <mesh position={[0, 0.006, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.006, 32]} />
          <meshStandardMaterial color="#181818" roughness={0.95} />
        </mesh>

        {/* Zigaretten-Gruppe */}
        <group position={[0.004, 0.017, 0.008]} rotation={[0, Math.PI / 7, 0]}>
          <group rotation={[0, 0, Math.PI / 15]}>

            {/* Weißer Körper */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.004, 0.004, 0.068, 12]} />
              <meshStandardMaterial color="#ede9db" roughness={0.95} />
            </mesh>

            {/* Filter */}
            <mesh position={[-0.043, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.004, 0.004, 0.018, 12]} />
              <meshStandardMaterial color="#c87c32" roughness={0.85} />
            </mesh>

            {/* Glut */}
            <mesh ref={emberRef} position={[0.038, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.004, 0.003, 0.008, 12]} />
              <meshStandardMaterial
                ref={emberMatRef}
                color="#ff5500"
                emissive="#ff3300"
                emissiveIntensity={1.6}
                roughness={0.55}
              />
            </mesh>

            <pointLight
              ref={emberLightRef}
              position={[0.038, 0, 0]}
              color="#ff6600"
              intensity={0.05}
              distance={0.1}
              decay={2}
            />
          </group>
        </group>
      </RigidBody>

      {/* Rauch — Shader-Plane in World-Space */}
      <mesh ref={smokeRef} material={smokeMat}>
        <planeGeometry args={[0.014, SMOKE_HEIGHT, 1, 24]} />
      </mesh>
    </group>
  )
}
