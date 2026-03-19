import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { grab } from './grab'
import { useInputMode } from '../hooks/useInputMode'

type PointerPos = { x: number; y: number }
type PinchState = { dist: number; midX: number; midY: number }

export function GrabController() {
  const { camera, gl } = useThree()
  const inputMode      = useInputMode()
  const raycaster      = useRef(new THREE.Raycaster())
  const mouse          = useRef(new THREE.Vector2())
  const lastXY         = useRef({ x: 0, y: 0 })
  const objRotation    = useRef(new THREE.Quaternion())
  const activePointers = useRef(new Map<number, PointerPos>())
  const pinch          = useRef<PinchState | null>(null)
  const grabOffset     = useRef(new THREE.Vector3())
  const wasRotating    = useRef(false)

  useEffect(() => {
    const canvas = gl.domElement

    const applyRotation = (dx: number, dy: number) => {
      if (!grab.body) return
      const up    = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3()
      camera.getWorldDirection(right)
      right.crossVectors(up, right).normalize()
      const qY = new THREE.Quaternion().setFromAxisAngle(up,    -dx * 0.01)
      const qX = new THREE.Quaternion().setFromAxisAngle(right, -dy * 0.01)
      objRotation.current.premultiply(qY).premultiply(qX)
      grab.body.setRotation(
        { x: objRotation.current.x, y: objRotation.current.y, z: objRotation.current.z, w: objRotation.current.w },
        true
      )
      grab.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    const moveToPoint = (clientX: number, clientY: number) => {
      if (!grab.body) return
      mouse.current.x = (clientX / canvas.clientWidth)  *  2 - 1
      mouse.current.y = (clientY / canvas.clientHeight) * -2 + 1
      raycaster.current.setFromCamera(mouse.current, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.at(grab.distance, target)
      target.add(grabOffset.current)
      grab.body.setTranslation({ x: target.x, y: target.y, z: target.z }, true)
      grab.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      grab.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    const onDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (inputMode === 'touch' && activePointers.current.size === 2 && grab.body) {
        const pts = [...activePointers.current.values()]
        const dx  = pts[1].x - pts[0].x
        const dy  = pts[1].y - pts[0].y
        pinch.current = {
          dist: Math.sqrt(dx * dx + dy * dy),
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
        }
        const r = grab.body.rotation()
        objRotation.current.set(r.x, r.y, r.z, r.w)
        return
      }

      if (inputMode === 'mouse' && e.button === 0) {
        grabOffset.current.set(0, 0, 0)
        wasRotating.current = false
      }

      if (inputMode === 'mouse' && e.button === 2 && grab.body) {
        const r = grab.body.rotation()
        objRotation.current.set(r.x, r.y, r.z, r.w)
        lastXY.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onMove = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!grab.body) return

      if (inputMode === 'touch') {
        if (activePointers.current.size >= 2 && pinch.current) {
          const pts     = [...activePointers.current.values()]
          const dx      = pts[1].x - pts[0].x
          const dy      = pts[1].y - pts[0].y
          const newDist = Math.sqrt(dx * dx + dy * dy)
          const newMidX = (pts[0].x + pts[1].x) / 2
          const newMidY = (pts[0].y + pts[1].y) / 2

          grab.distance = Math.max(0.1, grab.distance + (pinch.current.dist - newDist) * 0.005)
          applyRotation(newMidX - pinch.current.midX, newMidY - pinch.current.midY)
          moveToPoint(newMidX, newMidY)

          pinch.current = { dist: newDist, midX: newMidX, midY: newMidY }
        } else {
          moveToPoint(e.clientX, e.clientY)
        }
        return
      }

      // Desktop
      const dx = e.clientX - lastXY.current.x
      const dy = e.clientY - lastXY.current.y
      lastXY.current = { x: e.clientX, y: e.clientY }

      if ((e.buttons & 2) !== 0) {
        wasRotating.current = true
        applyRotation(dx, dy)
      } else {
        if (wasRotating.current) {
          // Erster Move nach RMB-Release: Offset berechnen damit Objekt nicht springt
          mouse.current.x = (e.clientX / canvas.clientWidth)  *  2 - 1
          mouse.current.y = (e.clientY / canvas.clientHeight) * -2 + 1
          raycaster.current.setFromCamera(mouse.current, camera)
          const rayTarget = new THREE.Vector3()
          raycaster.current.ray.at(grab.distance, rayTarget)
          const pos = grab.body.translation()
          grabOffset.current.set(pos.x - rayTarget.x, pos.y - rayTarget.y, pos.z - rayTarget.z)
          wasRotating.current = false
        }
        moveToPoint(e.clientX, e.clientY)
      }
    }

    const onUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId)
      if (activePointers.current.size < 2) pinch.current = null

      const release = inputMode === 'touch'
        ? activePointers.current.size === 0
        : e.button === 0
      if (release) grab.release()
    }

    const onWheel = (e: WheelEvent) => {
      if (!grab.body) return
      e.preventDefault()
      grab.distance = Math.max(0.1, grab.distance - e.deltaY * 0.001)
      raycaster.current.setFromCamera(mouse.current, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.at(grab.distance, target)
      target.add(grabOffset.current)
      grab.body.setTranslation({ x: target.x, y: target.y, z: target.z }, true)
      grab.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    canvas.addEventListener('pointerdown',  onDown)
    canvas.addEventListener('pointermove',  onMove)
    canvas.addEventListener('pointerup',    onUp)
    canvas.addEventListener('wheel',        onWheel, { passive: false })
    canvas.addEventListener('contextmenu',  (e) => e.preventDefault())

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup',   onUp)
      canvas.removeEventListener('wheel',       onWheel)
    }
  }, [camera, gl, inputMode])

  return null
}