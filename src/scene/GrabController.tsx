import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { grab } from './grab'

export function GrabController() {
  const { camera, gl } = useThree()
  const raycaster   = useRef(new THREE.Raycaster())
  const mouse       = useRef(new THREE.Vector2())
  const lastXY      = useRef({ x: 0, y: 0 })
  const objRotation = useRef(new THREE.Quaternion())

  useEffect(() => {
    const canvas = gl.domElement

    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 || !grab.body) return
      const r = grab.body.rotation()
      objRotation.current.set(r.x, r.y, r.z, r.w)
      lastXY.current = { x: e.clientX, y: e.clientY }
    }

    const onMove = (e: PointerEvent) => {
      if (!grab.body) return

      const dx = e.clientX - lastXY.current.x
      const dy = e.clientY - lastXY.current.y
      lastXY.current = { x: e.clientX, y: e.clientY }

      if ((e.buttons & 2) !== 0) {
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
      } else {
        mouse.current.x = (e.clientX / canvas.clientWidth)  *  2 - 1
        mouse.current.y = (e.clientY / canvas.clientHeight) * -2 + 1
        raycaster.current.setFromCamera(mouse.current, camera)
        const target = new THREE.Vector3()
        raycaster.current.ray.at(grab.distance, target)
        grab.body.setTranslation({ x: target.x, y: target.y, z: target.z }, true)
        grab.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        grab.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }

    const onUp = (e: PointerEvent) => { if (e.button === 0) grab.release() }

    const onWheel = (e: WheelEvent) => {
      if (!grab.body) return
      e.preventDefault()
      grab.distance = Math.max(0.1, grab.distance - e.deltaY * 0.001)
      raycaster.current.setFromCamera(mouse.current, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.at(grab.distance, target)
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
  }, [camera, gl])

  return null
}
