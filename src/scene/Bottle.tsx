import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import bottleUrl from '../assets/bottle1.glb?url'
import { grab } from './grab'
import useRespawn from './useRespawn'
import { RESPAWN_DELAY } from './constants'
import { FireEffect } from './FireEffect'

export function Bottle({ position, scale = 1 }: { position: [number, number, number]; scale?: number | [number, number, number] }) {
  const rbRef = useRef<RapierRigidBody>(null)
  const { scene } = useGLTF(bottleUrl)

  useRespawn(rbRef, position, { delay: RESPAWN_DELAY })

  useEffect(() => {
    const glassMat = new THREE.MeshPhysicalMaterial({
      transmission: 1,
      thickness: 0.5,
      roughness: 0.05,
      ior: 1.5,
      color: '#c8e8f0',
      transparent: true,
    })
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = glassMat
      mesh.castShadow = true
    })
    return () => glassMat.dispose()
  }, [scene])

  return (
    <RigidBody
      ref={rbRef}
      colliders="hull"
      mass={0.3}
      restitution={0.05}
      friction={0.8}
      ccd
      position={position}
    >
      <primitive
        object={scene}
        scale={scale}
        onPointerDown={(e: any) => {
          if (e.button !== 0) return
          e.stopPropagation()
          grab.start(rbRef.current, e.distance)
        }}
      />
      <Select enabled>
        <FireEffect position={[0, 0.15, 0]} />
      </Select>
    </RigidBody>
  )
}

useGLTF.preload(bottleUrl)
