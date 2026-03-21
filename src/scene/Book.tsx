import { useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'

export function Book({ position, color }: { position: [number, number, number]; color: string }) {
  const rbRef = useRef<RapierRigidBody>(null)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })
  return (
    <RigidBody ref={rbRef} colliders="cuboid" mass={0.5} restitution={0.05} friction={0.9} ccd position={position}>
      <mesh
        castShadow
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <boxGeometry args={[0.12, 0.02, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </RigidBody>
  )
}
