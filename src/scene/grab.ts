import type { RapierRigidBody } from '@react-three/rapier'

export const grab = {
  body: null as RapierRigidBody | null,
  distance: 0,
  start(body: RapierRigidBody | null, distance: number) {
    this.body = body
    this.distance = distance
    body?.setBodyType(2, true) // 2 = KinematicPositionBased → ignoriert Gravity
  },
  release() {
    this.body?.setBodyType(0, true) // 0 = Dynamic → Gravity aktiv
    this.body = null
  },
}
