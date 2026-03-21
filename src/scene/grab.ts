import type { RapierRigidBody } from '@react-three/rapier'

export const grab = {
  body: null as RapierRigidBody | null,
  distance: 0,
  start(body: RapierRigidBody | null, distance: number) {
    this.body = body
    this.distance = distance
    body?.setGravityScale(0, true)
    body?.setLinearDamping(15)
    body?.setAngularDamping(15)
  },
  release() {
    this.body?.setGravityScale(1, true)
    this.body?.setLinearDamping(0)
    this.body?.setAngularDamping(0)
    this.body?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    this.body = null
  },
}
