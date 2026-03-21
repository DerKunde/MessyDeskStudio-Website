import { useRef } from 'react'
import { Select } from '@react-three/postprocessing'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { useIgnitable } from './useIgnitable'
import { FireEffect } from './FireEffect'

export function Mug({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })
  const { burning, onCollisionEnter, onCollisionExit } = useIgnitable(rbRef)

  return (
    <RigidBody
      ref={rbRef}
      colliders="hull"
      mass={0.4}
      restitution={0.2}
      friction={0.7}
      ccd
      position={position}
      onCollisionEnter={onCollisionEnter}
      onCollisionExit={onCollisionExit}
    >
      <mesh
        castShadow
        onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); grab.start(rbRef.current, e.distance) }}
      >
        <cylinderGeometry args={[0.038, 0.032, 0.1, 16]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
      {burning && (
        <Select enabled>
          <FireEffect position={[0, 0, 0]} extents={[0.038, 0.05, 0.038]} />
        </Select>
      )}
    </RigidBody>
  )
}
