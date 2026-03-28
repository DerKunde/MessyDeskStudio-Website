import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import neonSignUrl from '../assets/NeonSign.glb?url'

export function NeonSign() {
  const { scene } = useGLTF(neonSignUrl)
  const t = useRef(0)
  const emissiveMats = useRef<THREE.MeshStandardMaterial[]>([])

  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.emissiveIntensity > 0) {
          mats.push(mat)
        }
      }
    })
    emissiveMats.current = mats
  }, [scene])

  useFrame((_, delta) => {
    t.current += delta
    const flicker =
      1 +
      0.06 * Math.sin(t.current * 8.7) +
      0.04 * Math.sin(t.current * 31.4 + 2.1) +
      0.02 * Math.sin(t.current * 53.2 + 0.7)
    for (const mat of emissiveMats.current) {
      // eslint-disable-next-line react-hooks/immutability
      mat.emissiveIntensity = flicker
    }
  })

  return (
    <primitive object={scene} position={[0, 2, -2.13]} rotation={[Math.PI / 2, 0, 0]} scale={0.8} />
  )
}

useGLTF.preload(neonSignUrl)
