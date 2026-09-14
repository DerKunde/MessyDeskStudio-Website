import type { RapierRigidBody } from '@react-three/rapier'

/** All rigid bodies that are currently burning */
export const burningBodies = new Set<RapierRigidBody>()

/** Rigid body → ignite callback, for all flammable objects */
export const ignitableRegistry = new Map<RapierRigidBody, () => void>()
