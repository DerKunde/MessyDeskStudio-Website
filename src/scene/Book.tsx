import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { useIgnitable } from './useIgnitable'

const BURN_DURATION = 12
const FIRE_COUNT = 45

const HX   = 0.06   // halbe Breite
const HZ   = 0.09   // halbe Tiefe
const HY   = 0.01   // halbe Höhe (Buch ist 0.02 dick)
const MAX_RADIUS = Math.sqrt((2 * HX) ** 2 + (2 * HZ) ** 2)

const CHARRED = new THREE.Color('#1a0800')

// Ecken für Rotation-Tracking (Weltkoordinaten → niedrigste = Brennursprung)
const CORNERS = [
  new THREE.Vector3(-HX, HY, -HZ),
  new THREE.Vector3( HX, HY, -HZ),
  new THREE.Vector3(-HX, HY,  HZ),
  new THREE.Vector3( HX, HY,  HZ),
]

// Alle 5 sichtbaren Flächen des Buches
const FACES = [
  { // Oben
    normal: new THREE.Vector3(0, 1, 0),
    area: 2 * HX * 2 * HZ,
    sample: () => new THREE.Vector3((Math.random() - 0.5) * 2 * HX,  HY, (Math.random() - 0.5) * 2 * HZ),
  },
  { // Vorne (z+)
    normal: new THREE.Vector3(0, 0, 1),
    area: 2 * HX * 2 * HY,
    sample: () => new THREE.Vector3((Math.random() - 0.5) * 2 * HX, (Math.random() - 0.5) * 2 * HY,  HZ),
  },
  { // Hinten (z-)
    normal: new THREE.Vector3(0, 0, -1),
    area: 2 * HX * 2 * HY,
    sample: () => new THREE.Vector3((Math.random() - 0.5) * 2 * HX, (Math.random() - 0.5) * 2 * HY, -HZ),
  },
  { // Links (x-)
    normal: new THREE.Vector3(-1, 0, 0),
    area: 2 * HY * 2 * HZ,
    sample: () => new THREE.Vector3(-HX, (Math.random() - 0.5) * 2 * HY, (Math.random() - 0.5) * 2 * HZ),
  },
  { // Rechts (x+)
    normal: new THREE.Vector3(1, 0, 0),
    area: 2 * HY * 2 * HZ,
    sample: () => new THREE.Vector3( HX, (Math.random() - 0.5) * 2 * HY, (Math.random() - 0.5) * 2 * HZ),
  },
  { // Unten (y-)
    normal: new THREE.Vector3(0, -1, 0),
    area: 2 * HX * 2 * HZ,
    sample: () => new THREE.Vector3((Math.random() - 0.5) * 2 * HX, -HY, (Math.random() - 0.5) * 2 * HZ),
  },
]
const TOTAL_AREA = FACES.reduce((s, f) => s + f.area, 0)

interface FireParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  age: number
  maxAge: number
  phase: number
}

function spawnOnFront(origin: THREE.Vector3, radius: number, phase: number): FireParticle | null {
  for (let attempt = 0; attempt < 15; attempt++) {
    // Fläche gewichtet nach Größe wählen
    let r = Math.random() * TOTAL_AREA
    let face = FACES[FACES.length - 1]
    for (const f of FACES) {
      if (r < f.area) { face = f; break }
      r -= f.area
    }

    const pos = face.sample()

    // Prüfen ob Punkt innerhalb des aktuellen Burn-Radius liegt (XZ-Distanz vom Ursprung)
    const dx = pos.x - origin.x
    const dz = pos.z - origin.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > radius * (0.15 + Math.random() * 0.95)) continue

    const speed = 0.04 + Math.random() * 0.06
    const n = face.normal
    return {
      pos,
      vel: new THREE.Vector3(
        n.x * speed * 0.5 + (Math.random() - 0.5) * 0.015,
        n.y * speed + (1 - Math.abs(n.y)) * 0.03 + 0.015,
        n.z * speed * 0.5 + (Math.random() - 0.5) * 0.015
      ),
      age: 0,
      maxAge: 0.3 + Math.random() * 0.5,
      phase,
    }
  }
  return null
}

const _q = new THREE.Quaternion()
const _v = new THREE.Vector3()

export function Book({ position, color, burning: defaultBurning = false }: {
  position: [number, number, number]
  color: string
  burning?: boolean
}) {
  const rbRef      = useRef<RapierRigidBody>(null)
  const matRef     = useRef<THREE.MeshStandardMaterial>(null)
  const burnTime   = useRef(0)
  const particles  = useRef<(FireParticle | null)[]>([])
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])
  const burnOrigin = useRef(CORNERS[0].clone())
  const baseColor  = useMemo(() => new THREE.Color(color), [color])

  const { burning, onCollisionEnter, onCollisionExit, reset } = useIgnitable(rbRef, defaultBurning)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY, onRespawn: () => { reset(); burnTime.current = 0; particles.current = [] } })

  useFrame((_, delta) => {
    if (!burning) return

    // Niedrigste Ecke in Weltkoordinaten → Brennursprung
    const rb = rbRef.current
    if (rb) {
      const rot = rb.rotation()
      _q.set(rot.x, rot.y, rot.z, rot.w)
      let lowestY = Infinity
      for (const corner of CORNERS) {
        _v.copy(corner).applyQuaternion(_q)
        if (_v.y < lowestY) { lowestY = _v.y; burnOrigin.current.copy(corner) }
      }
    }

    burnTime.current = Math.min(burnTime.current + delta, BURN_DURATION)
    const progress = burnTime.current / BURN_DURATION
    const radius   = progress * MAX_RADIUS

    if (matRef.current) matRef.current.color.lerpColors(baseColor, CHARRED, progress)

    while (particles.current.length < FIRE_COUNT) particles.current.push(null)

    for (let i = 0; i < FIRE_COUNT; i++) {
      const sprite = spriteRefs.current[i]
      if (!sprite) continue

      let p = particles.current[i]
      if (!p || p.age >= p.maxAge) {
        const fresh = spawnOnFront(burnOrigin.current, radius, i * 0.73)
        particles.current[i] = fresh
        if (!fresh) { sprite.visible = false; continue }
        p = fresh
      }

      p.age += delta
      const t = p.age / p.maxAge

      p.pos.addScaledVector(p.vel, delta)
      p.pos.x += Math.sin(p.age * 3.5 + p.phase) * delta * 0.012
      p.pos.z += Math.cos(p.age * 2.8 + p.phase) * delta * 0.009

      sprite.visible = true
      sprite.position.copy(p.pos)

      const mat = sprite.material as THREE.SpriteMaterial
      if (t < 0.5) {
        mat.color.setRGB(1, t, 0)
      } else {
        mat.color.setRGB(1, 0.5 + (t - 0.5), 0)
      }
      if (t < 0.15) {
        mat.opacity = t / 0.15
      } else if (t > 0.65) {
        mat.opacity = 1 - (t - 0.65) / 0.35
      } else {
        mat.opacity = 1
      }

      sprite.scale.setScalar(0.018 + Math.sin(t * Math.PI) * 0.025)
    }
  })

  return (
    <RigidBody
      ref={rbRef}
      colliders="cuboid"
      mass={0.5}
      restitution={0.05}
      friction={0.9}
      ccd
      position={position}
      onCollisionEnter={onCollisionEnter}
      onCollisionExit={onCollisionExit}
    >
      <mesh
        castShadow
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          grab.start(rbRef.current, e.distance)
        }}
      >
        <boxGeometry args={[0.12, 0.02, 0.18]} />
        <meshStandardMaterial ref={matRef} color={color} roughness={0.8} />
      </mesh>
      {burning && (
        <Select enabled>
          {Array.from({ length: FIRE_COUNT }, (_, i) => (
            <sprite key={i} ref={el => { spriteRefs.current[i] = el }} visible={false}>
              <spriteMaterial
                color="red"
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          ))}
        </Select>
      )}
    </RigidBody>
  )
}
