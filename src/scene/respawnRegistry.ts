import type { RapierRigidBody } from '@react-three/rapier'

export const respawnRegistry = new Map<RapierRigidBody, () => void>()