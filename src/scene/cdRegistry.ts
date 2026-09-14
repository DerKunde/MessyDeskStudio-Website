import type { RapierRigidBody } from '@react-three/rapier'

// Alle CD-Körper – damit das CD-Fach der PlayStation erkennt, ob ein gegriffenes Objekt eine CD ist
export const cdRegistry = new Set<RapierRigidBody>()
