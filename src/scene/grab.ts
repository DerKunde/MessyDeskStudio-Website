import type { RapierRigidBody } from '@react-three/rapier'
import { cursor } from './cursor'

type GrabListener = (body: RapierRigidBody) => void

// Slots like the PlayStation's CD tray react to specific bodies being grabbed/released
const startListeners   = new Set<GrabListener>()
const releaseListeners = new Set<GrabListener>()

function subscribe(listeners: Set<GrabListener>, listener: GrabListener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export const grab = {
  body: null as RapierRigidBody | null,
  distance: 0,
  start(body: RapierRigidBody | null, distance: number) {
    // Listeners first – e.g. the CD tray makes an inserted (kinematic) CD dynamic again
    // before gravity and damping for holding are set
    if (body) startListeners.forEach((l) => l(body))
    this.body = body
    this.distance = distance
    cursor.setGrabbing(body !== null)
    body?.setGravityScale(0, true)
    body?.setLinearDamping(15)
    body?.setAngularDamping(15)
  },
  release() {
    const body = this.body
    body?.setGravityScale(1, true)
    body?.setLinearDamping(0)
    body?.setAngularDamping(0)
    body?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body = null
    cursor.setGrabbing(false)
    // Listeners last – the body then has normal gravity again and no leftover velocity
    if (body) releaseListeners.forEach((l) => l(body))
  },
  onStart:   (listener: GrabListener) => subscribe(startListeners, listener),
  onRelease: (listener: GrabListener) => subscribe(releaseListeners, listener),
}
