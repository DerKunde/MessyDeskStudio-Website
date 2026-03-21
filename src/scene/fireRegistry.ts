import type { RapierRigidBody } from '@react-three/rapier'

/** Alle RigidBodies die aktuell brennen */
export const burningBodies = new Set<RapierRigidBody>()

/** RigidBody → Zünde-Callback für alle brennbaren Objekte */
export const ignitableRegistry = new Map<RapierRigidBody, () => void>()
