import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 28

interface Particle {
  pos: THREE.Vector3
  vel: THREE.Vector3
  age: number
  maxAge: number
  phase: number
}

function makeVel(normal: THREE.Vector3): THREE.Vector3 {
  const speed = 0.04 + Math.random() * 0.06
  return new THREE.Vector3(
    normal.x * speed * 0.5 + (Math.random() - 0.5) * 0.015,
    normal.y * speed + (1 - Math.abs(normal.y)) * 0.03 + 0.015,
    normal.z * speed * 0.5 + (Math.random() - 0.5) * 0.015
  )
}

const UP = new THREE.Vector3(0, 1, 0)

function spawnPoint(origin: THREE.Vector3, phase: number): Particle {
  return {
    pos: new THREE.Vector3(
      origin.x + (Math.random() - 0.5) * 0.02,
      origin.y,
      origin.z + (Math.random() - 0.5) * 0.02
    ),
    vel: makeVel(UP),
    age: 0,
    maxAge: 0.4 + Math.random() * 0.5,
    phase,
  }
}

function spawnBox(center: THREE.Vector3, hx: number, hy: number, hz: number, phase: number): Particle {
  const topA    = 4 * hx * hz
  const frontA  = 4 * hx * hy
  const backA   = 4 * hx * hy
  const leftA   = 4 * hy * hz
  const rightA  = 4 * hy * hz
  const bottomA = 4 * hx * hz
  const total   = topA + frontA + backA + leftA + rightA + bottomA

  let r = Math.random() * total
  let pos: THREE.Vector3
  let normal: THREE.Vector3

  if (r < topA) {
    pos = new THREE.Vector3(
      center.x + (Math.random() - 0.5) * 2 * hx,
      center.y + hy,
      center.z + (Math.random() - 0.5) * 2 * hz
    )
    normal = UP
  } else if ((r -= topA) < frontA) {
    pos = new THREE.Vector3(
      center.x + (Math.random() - 0.5) * 2 * hx,
      center.y + (Math.random() - 0.5) * 2 * hy,
      center.z + hz
    )
    normal = new THREE.Vector3(0, 0, 1)
  } else if ((r -= frontA) < backA) {
    pos = new THREE.Vector3(
      center.x + (Math.random() - 0.5) * 2 * hx,
      center.y + (Math.random() - 0.5) * 2 * hy,
      center.z - hz
    )
    normal = new THREE.Vector3(0, 0, -1)
  } else if ((r -= backA) < leftA) {
    pos = new THREE.Vector3(
      center.x - hx,
      center.y + (Math.random() - 0.5) * 2 * hy,
      center.z + (Math.random() - 0.5) * 2 * hz
    )
    normal = new THREE.Vector3(-1, 0, 0)
  } else if ((r -= leftA) < rightA) {
    pos = new THREE.Vector3(
      center.x + hx,
      center.y + (Math.random() - 0.5) * 2 * hy,
      center.z + (Math.random() - 0.5) * 2 * hz
    )
    normal = new THREE.Vector3(1, 0, 0)
  } else {
    pos = new THREE.Vector3(
      center.x + (Math.random() - 0.5) * 2 * hx,
      center.y - hy,
      center.z + (Math.random() - 0.5) * 2 * hz
    )
    normal = new THREE.Vector3(0, -1, 0)
  }

  return { pos, vel: makeVel(normal), age: 0, maxAge: 0.4 + Math.random() * 0.5, phase }
}

export function FireEffect({
  position,
  extents,
}: {
  position: [number, number, number]
  extents?: [number, number, number]
}) {
  const origin = useMemo(() => new THREE.Vector3(...position), [position])
  const ext    = useMemo(() => extents ? new THREE.Vector3(...extents) : null, [extents])

  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])
  const particles  = useRef<Particle[]>([])

  useEffect(() => {
    particles.current = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = ext
        ? spawnBox(origin, ext.x, ext.y, ext.z, i * 0.7)
        : spawnPoint(origin, i * 0.7)
      p.age = Math.random() * p.maxAge
      particles.current.push(p)
    }
  }, [origin, ext])

  useFrame((_, delta) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles.current[i]
      const sprite = spriteRefs.current[i]
      if (!sprite) continue

      p.age += delta

      if (p.age >= p.maxAge) {
        particles.current[i] = ext
          ? spawnBox(origin, ext.x, ext.y, ext.z, p.phase)
          : spawnPoint(origin, p.phase)
        continue
      }

      const t = p.age / p.maxAge

      p.pos.addScaledVector(p.vel, delta)
      p.pos.x += Math.sin(p.age * 3.5 + p.phase) * delta * 0.012
      p.pos.z += Math.cos(p.age * 2.8 + p.phase) * delta * 0.009

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

      sprite.scale.setScalar(0.015 + Math.sin(t * Math.PI) * 0.025)
    }
  })

  return (
    <group>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <sprite key={i} ref={el => { spriteRefs.current[i] = el }}>
          <spriteMaterial
            color="red"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
