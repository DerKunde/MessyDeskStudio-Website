import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  KB_LAYOUT, KB_BASE_W, KB_BASE_H, KB_BASE_D,
  KB_KEY_H, KB_Y_REST, KB_Y_PRESSED, KB_UNIT_D,
} from './constants'
import { grab } from './grab'
import { PostIt } from './PostIt'

export function Keyboard({ position }: { position: [number, number, number] }) {
  const rbRef       = useRef<RapierRigidBody>(null)
  const pressed     = useRef<Set<string>>(new Set())
  const meshRefs    = useRef<Map<string, THREE.Mesh>>(new Map())

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => pressed.current.add(e.code)
    const onUp   = (e: KeyboardEvent) => pressed.current.delete(e.code)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup',   onUp)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = Math.min(1, delta * 25)
    meshRefs.current.forEach((mesh, code) => {
      const isPressed = pressed.current.has(code)
      const targetY   = isPressed ? KB_Y_PRESSED : KB_Y_REST
      mesh.position.y += (targetY - mesh.position.y) * speed
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity += ((isPressed ? 0.9 : 0) - mat.emissiveIntensity) * speed
    })
  })

  return (
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.6} restitution={0.1} friction={0.8} ccd position={position}>
      {/* Base plate */}
      <mesh
        castShadow
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <boxGeometry args={[KB_BASE_W, KB_BASE_H, KB_BASE_D]} />
        <meshStandardMaterial color="light-grey" roughness={0.5} metalness={1} />
      </mesh>

      {/* Keycaps */}
      {KB_LAYOUT.map(key => (
        <mesh
          key={key.code}
          ref={(instance: THREE.Mesh | null) => {
            if (instance) meshRefs.current.set(key.code, instance)
            else          meshRefs.current.delete(key.code)
          }}
          position={[key.x, KB_Y_REST, key.z]}
          castShadow
        >
          <boxGeometry args={[key.keyW - 0.001, KB_KEY_H, KB_UNIT_D - 0.001]} />
          <meshStandardMaterial
            color="#2a2a2a"
            roughness={0.6}
            metalness={0.1}
            emissive="#6320EE"
            emissiveIntensity={0}
          />
        </mesh>
      ))}

      <PostIt position={[0.05, -KB_BASE_H / 2 - 0.001, 0.01]} />
    </RigidBody>
  )
}
