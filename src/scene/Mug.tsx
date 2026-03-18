import { useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { grab } from './grab'

export function Mug({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody ref={rbRef} colliders="hull" mass={0.4} restitution={0.2} friction={0.7} ccd position={position}>
      <mesh
        castShadow
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <cylinderGeometry args={[0.038, 0.032, 0.1, 16]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}
