import { useLoader } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as THREE from 'three'
import deskUrl from '../assets/desk.fbx?url'

export function Desk() {
  const fbx = useLoader(FBXLoader, deskUrl)

  fbx.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={fbx} scale={0.002} rotation={[0, Math.PI / 2, 0]} />
    </RigidBody>
  )
}
