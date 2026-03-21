import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'

// Anzahl der Sprites die den Faden bilden
const STRAND_COUNT = 26

export function Ashtray({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })
  const emberRef = useRef<THREE.Mesh>(null)
  const smokeOrigin = useRef(new THREE.Vector3())
  const emberMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const emberLightRef = useRef<THREE.PointLight>(null)
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])

  // Weiches rundes Segment-Textur für den Faden
  const smokeTexture = useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0,   'rgba(200,200,200,1)')
    grad.addColorStop(0.45,'rgba(185,185,185,0.7)')
    grad.addColorStop(0.8, 'rgba(165,165,165,0.2)')
    grad.addColorStop(1,   'rgba(140,140,140,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(({ clock }) => {
    // Ember-Weltposition tracken
    if (emberRef.current) {
      emberRef.current.getWorldPosition(smokeOrigin.current)
    }

    // Glut pulsiert unregelmäßig
    const t = clock.getElapsedTime()
    const pulse = 0.7 + 0.3 * Math.sin(t * 4.1) * Math.sin(t * 2.6 + 0.8)
    if (emberMatRef.current) {
      emberMatRef.current.emissiveIntensity = pulse * 1.6
    }
    if (emberLightRef.current) {
      emberLightRef.current.intensity = pulse * 0.05
    }

    // ── Rauch-Faden: Doppel-S-Kurve ──────────────────────────────────────────
    const phase = t * 0.5        // langsame Gesamtbewegung
    const totalHeight = 0.22     // Gesamthöhe des Fadens

    for (let i = 0; i < STRAND_COUNT; i++) {
      const s = i / (STRAND_COUNT - 1)  // 0 = Glut, 1 = oben

      // Doppel-S: zwei überlagerte Sinuswellen → doppelte S-Form
      const amp = 0.002 + s * s * 0.024       // Amplitude wächst quadratisch nach oben
      const wx =
        amp * Math.sin(s * Math.PI * 2.3 + phase) +
        amp * 0.4 * Math.sin(s * Math.PI * 4.8 + phase * 1.7)
      const wz =
        amp * 0.35 * Math.sin(s * Math.PI * 1.9 + phase * 0.8 + 1.1)

      const sprite = spriteRefs.current[i]
      if (!sprite) return

      sprite.position.set(
        smokeOrigin.current.x + wx,
        smokeOrigin.current.y + s * totalHeight,
        smokeOrigin.current.z + wz
      )

      // Opacity: kurzes Einblenden unten, sanft ausblenden oben
      let opacity = 0
      if (s < 0.06)     opacity = (s / 0.06) * 0.4
      else if (s < 0.55) opacity = 0.4
      else              opacity = 0.4 * (1 - (s - 0.55) / 0.45)
      ;(sprite.material as THREE.SpriteMaterial).opacity = opacity

      // Breite: sehr schmal unten, wächst nach oben
      // Höhe: Segment-Höhe mit Überlappung für Kontinuität
      const segH = (totalHeight / STRAND_COUNT) * 2.0
      const segW = 0.0008 + s * s * 0.012
      sprite.scale.set(Math.max(0.0005, segW), segH, 1)
    }
  })

  return (
    // Äußere Gruppe ohne Transform — Sprites leben in World-Space
    <group>
      <RigidBody
        ref={rbRef}
        colliders="hull"
        mass={0.5}
        restitution={0.1}
        friction={0.8}
        ccd
        position={position}
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

            {/* Weißer Körper — Länge 0.068, Zentrum x=0, Spitze bei x=+0.034 */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.004, 0.004, 0.068, 12]} />
              <meshStandardMaterial color="#ede9db" roughness={0.95} />
            </mesh>

            {/* Filter (orange-braun) am anderen Ende */}
            <mesh position={[-0.043, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.004, 0.004, 0.018, 12]} />
              <meshStandardMaterial color="#c87c32" roughness={0.85} />
            </mesh>

            {/* Glut-Zylinder — direkt an der Körperspitze (x=0.034 bis x=0.042) */}
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

            {/* Sehr dezente Lichtquelle — nur nächste Umgebung */}
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

      {/* Rauch-Faden Sprites — World-Space */}
      {Array.from({ length: STRAND_COUNT }, (_, i) => (
        <sprite key={i} ref={el => { spriteRefs.current[i] = el }}>
          <spriteMaterial
            map={smokeTexture}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}
