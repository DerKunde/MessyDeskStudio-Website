import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const LOOK_AT   = new THREE.Vector3(0, 1, -1)
const MAX_OFFSET = 0.12
const LERP_SPEED = 0.04

export function CameraController() {
  const { camera } = useThree()
  const basePos   = useRef(new THREE.Vector3())
  const mouse     = useRef(new THREE.Vector2())
  const targetPos = useRef(new THREE.Vector3())

  useEffect(() => {
    camera.lookAt(LOOK_AT)
    basePos.current.copy(camera.position)
    targetPos.current.copy(camera.position)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth)  *  2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * -2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'p') return
      const p = camera.position
      console.log(`camera position: [${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}]`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  useFrame(() => {
    targetPos.current.set(
      basePos.current.x - mouse.current.x * MAX_OFFSET,
      basePos.current.y - mouse.current.y * MAX_OFFSET * 0.5,
      basePos.current.z
    )
    camera.position.lerp(targetPos.current, LERP_SPEED)
    camera.lookAt(LOOK_AT)
  })

  return null
}
