import { useRef, useEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import mugUrl from '../assets/coffee_cup.glb?url'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { useIgnitable } from './useIgnitable'
import { FireEffect } from './FireEffect'

export function Mug({ position }: { position: [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  const { scene } = useGLTF(mugUrl)
  const { burning, onCollisionEnter, onCollisionExit, reset } = useIgnitable(rbRef)
  useRespawn(rbRef, position, { delay: RESPAWN_DELAY, onRespawn: reset })

  useEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
    })
  }, [scene])

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
      <primitive
        object={scene}
        scale={0.07}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (e.button !== 0) return
          e.stopPropagation()
          grab.start(rbRef.current, e.distance)
        }}
      />
      {burning && (
        <Select enabled>
          <FireEffect position={[0, 0, 0]} extents={[0.038, 0.05, 0.038]} />
        </Select>
      )}
    </RigidBody>
  )
}

useGLTF.preload(mugUrl)
