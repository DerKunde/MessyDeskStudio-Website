import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useInputMode } from '../hooks/useInputMode'

const LOOK_AT    = new THREE.Vector3(0, 1, -1)
const MAX_OFFSET = 0.12
const LERP_SPEED = 0.04

export function CameraController() {
  const { camera } = useThree()
  const inputMode  = useInputMode()
  const basePos    = useRef(new THREE.Vector3())
  const mouse      = useRef(new THREE.Vector2())
  const targetPos  = useRef(new THREE.Vector3())
  const neutral    = useRef<{ beta: number; gamma: number } | null>(null)

  useEffect(() => {
    camera.lookAt(LOOK_AT)
    basePos.current.copy(camera.position)
    targetPos.current.copy(camera.position)
  }, [])

  useEffect(() => {
    if (inputMode !== 'mouse') return
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth)  *  2 - 1
      mouse.current.y = (e.clientY / window.innerHeight) * -2 + 1
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [inputMode])

  useEffect(() => {
    if (inputMode !== 'touch') return

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      if (!neutral.current) {
        neutral.current = { beta: e.beta, gamma: e.gamma }
        return
      }
      mouse.current.x = Math.max(-1, Math.min(1, (e.gamma - neutral.current.gamma) / 20))
      mouse.current.y = Math.max(-1, Math.min(1, (e.beta  - neutral.current.beta)  / 20))
    }

    const addListener = () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        ;(DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') window.addEventListener('deviceorientation', onOrientation)
          })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', onOrientation)
      }
    }

    window.addEventListener('touchstart', addListener, { once: true })
    return () => {
      window.removeEventListener('touchstart', addListener)
      window.removeEventListener('deviceorientation', onOrientation)
    }
  }, [inputMode])

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