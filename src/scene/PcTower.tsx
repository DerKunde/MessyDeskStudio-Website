import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

export function PcTower() {
  const hue = useRef(0)
  const glassRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((_, delta) => {
    hue.current = (hue.current + delta * 0.15) % 1
    glassRef.current?.emissive.setHSL(hue.current, 1, 0.4)
    lightRef.current?.color.setHSL(hue.current, 1, 0.02)
  })

  return (
    <RigidBody type="fixed" colliders="cuboid">
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.96, 0.48]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* glass panel – linke Seite */}
      <mesh position={[-0.112, 0, 0]}>
        <boxGeometry args={[0.004, 0.92, 0.44]} />
        <meshStandardMaterial
          ref={glassRef}
          color="#050505"
          emissive="#ff00ff"
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
          roughness={0}
          metalness={0.1}
        />
      </mesh>
      {/* RGB light shines left out of the glass panel */}
      <pointLight ref={lightRef} position={[-0.18, 0, 0]} intensity={4} distance={2.2} decay={2} />
    </group>
    </RigidBody>
  )
}
