import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useInputMode } from '../hooks/useInputMode'
import { grab } from './grab'

type DeviceOrientationEventStatic = typeof DeviceOrientationEvent & {
  requestPermission: () => Promise<'granted' | 'denied'>
}

// Mausrad-Zoom (ohne gegriffenes Objekt): Kamera fährt von der Startposition zu `near`
// und blickt dabei von `lookAt` zu `nearLookAt`
export type CameraZoom = {
  near: THREE.Vector3
  nearLookAt?: THREE.Vector3
}

const LOOK_AT    = new THREE.Vector3(0, 1, -1)
const MAX_OFFSET = 0.12
const LERP_SPEED = 0.04
const ZOOM_SPEED = 0.001

export function CameraController({ lookAt = LOOK_AT, zoom }: { lookAt?: THREE.Vector3; zoom?: CameraZoom } = {}) {
  const { camera, gl } = useThree()
  const inputMode  = useInputMode()
  const farPos     = useRef(new THREE.Vector3())
  const basePos    = useRef(new THREE.Vector3())
  const mouse      = useRef(new THREE.Vector2())
  const targetPos  = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())
  const currentLook = useRef(new THREE.Vector3())
  const zoomT      = useRef(0)
  const neutral    = useRef<{ beta: number; gamma: number } | null>(null)

  useEffect(() => {
    camera.lookAt(lookAt)
    farPos.current.copy(camera.position)
    basePos.current.copy(camera.position)
    targetPos.current.copy(camera.position)
    currentLook.current.copy(lookAt)
    zoomT.current = 0
  }, [camera, lookAt])

  useEffect(() => {
    if (!zoom) return
    const canvas = gl.domElement
    const onWheel = (e: WheelEvent) => {
      // Mit gegriffenem Objekt steuert das Mausrad den Greifabstand (GrabController)
      if (grab.body) return
      e.preventDefault()
      zoomT.current = THREE.MathUtils.clamp(zoomT.current - e.deltaY * ZOOM_SPEED, 0, 1)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [gl, zoom])

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
        typeof (DeviceOrientationEvent as unknown as DeviceOrientationEventStatic).requestPermission === 'function'
      ) {
        ;(DeviceOrientationEvent as unknown as DeviceOrientationEventStatic).requestPermission()
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
    if (zoom) {
      const t = zoomT.current
      // x/z linear, y mit Ease-In – die Kamera sinkt erst kaum, nah am Ziel dann stärker ab
      basePos.current.set(
        THREE.MathUtils.lerp(farPos.current.x, zoom.near.x, t),
        THREE.MathUtils.lerp(farPos.current.y, zoom.near.y, t * t),
        THREE.MathUtils.lerp(farPos.current.z, zoom.near.z, t)
      )
      targetLook.current.lerpVectors(lookAt, zoom.nearLookAt ?? lookAt, t)
    } else {
      targetLook.current.copy(lookAt)
    }

    targetPos.current.set(
      basePos.current.x - mouse.current.x * MAX_OFFSET,
      basePos.current.y - mouse.current.y * MAX_OFFSET * 0.5,
      basePos.current.z
    )
    camera.position.lerp(targetPos.current, LERP_SPEED)
    currentLook.current.lerp(targetLook.current, LERP_SPEED)
    camera.lookAt(currentLook.current)
  })

  return null
}