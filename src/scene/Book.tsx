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

const HX = 0.06
const HZ = 0.09
const TOP_Y = 0.01
const MAX_RADIUS = Math.sqrt((2 * HX) ** 2 + (2 * HZ) ** 2)

const CHARRED = new THREE.Color('#1a0800')

const CORNERS = [
  new THREE.Vector3(-HX, TOP_Y, -HZ),
  new THREE.Vector3( HX, TOP_Y, -HZ),
  new THREE.Vector3(-HX, TOP_Y,  HZ),
  new THREE.Vector3( HX, TOP_Y,  HZ),
]

interface FireParticle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  age: number
  maxAge: number
  phase: number
}

function spawnOnFront(origin: THREE.Vector3, radius: number, phase: number): FireParticle | null {
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2
    const r = radius * (0.15 + Math.random() * 0.95)
    const x = origin.x + r * Math.cos(angle)
    const z = origin.z + r * Math.sin(angle)
    if (x >= -HX && x <= HX && z >= -HZ && z <= HZ) {
      return {
        pos: new THREE.Vector3(x, TOP_Y, z),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0.05 + Math.random() * 0.08,
          (Math.random() - 0.5) * 0.02
        ),
        age: 0,
        maxAge: 0.3 + Math.random() * 0.5,
        phase,
      }
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
  const rbRef = useRef<RapierRigidBody>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })

  const { burning, onCollisionEnter, onCollisionExit } = useIgnitable(rbRef, defaultBurning)

  const burnTime = useRef(0)
  const particles = useRef<(FireParticle | null)[]>([])
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])
  const burnOrigin = useRef(CORNERS[0].clone())
  const baseColor = useMemo(() => new THREE.Color(color), [color])

  useFrame((_, delta) => {
    if (!burning) return

    const rb = rbRef.current
    if (rb) {
      const rot = rb.rotation()
      _q.set(rot.x, rot.y, rot.z, rot.w)
      let lowestWorldY = Infinity
      for (const corner of CORNERS) {
        _v.copy(corner).applyQuaternion(_q)
        if (_v.y < lowestWorldY) {
          lowestWorldY = _v.y
          burnOrigin.current.copy(corner)
        }
      }
    }

    burnTime.current = Math.min(burnTime.current + delta, BURN_DURATION)
    const progress = burnTime.current / BURN_DURATION
    const radius = progress * MAX_RADIUS

    if (matRef.current) {
      matRef.current.color.lerpColors(baseColor, CHARRED, progress)
    }

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
