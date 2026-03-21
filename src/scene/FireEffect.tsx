import { useRef, useMemo } from 'react'
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

function spawnParticle(origin: THREE.Vector3, phase: number): Particle {
  return {
    pos: new THREE.Vector3(
      origin.x + (Math.random() - 0.5) * 0.02,
      origin.y,
      origin.z + (Math.random() - 0.5) * 0.02
    ),
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 0.015,
      0.05 + Math.random() * 0.07,
      (Math.random() - 0.5) * 0.015
    ),
    age: 0,
    maxAge: 0.4 + Math.random() * 0.5,
    phase,
  }
}

export function FireEffect({ position }: { position: [number, number, number] }) {
  const origin = useMemo(() => new THREE.Vector3(...position), [position])
  const spriteRefs = useRef<(THREE.Sprite | null)[]>([])
  const particles = useRef<Particle[]>([])

  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = spawnParticle(origin, i * 0.7)
      p.age = Math.random() * p.maxAge
      particles.current.push(p)
    }
  }

  useFrame((_, delta) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles.current[i]
      const sprite = spriteRefs.current[i]
      if (!sprite) continue

      p.age += delta

      if (p.age >= p.maxAge) {
        particles.current[i] = spawnParticle(origin, p.phase)
        continue
      }

      const t = p.age / p.maxAge

      p.pos.addScaledVector(p.vel, delta)
      p.pos.x += Math.sin(p.age * 3.5 + p.phase) * delta * 0.012
      p.pos.z += Math.cos(p.age * 2.8 + p.phase) * delta * 0.009

      sprite.position.copy(p.pos)

      const mat = sprite.material as THREE.SpriteMaterial

      // Farbe: rot (jung) → orange → gelb (alt)
      if (t < 0.5) {
        mat.color.setRGB(1, t, 0)
      } else {
        mat.color.setRGB(1, 0.5 + (t - 0.5), 0)
      }

      // Opacity: kurz einblenden, dann ausblenden
      if (t < 0.15) {
        mat.opacity = t / 0.15
      } else if (t > 0.65) {
        mat.opacity = 1 - (t - 0.65) / 0.35
      } else {
        mat.opacity = 1
      }

      // Skalierung: wächst kurz an, schrumpft dann
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
