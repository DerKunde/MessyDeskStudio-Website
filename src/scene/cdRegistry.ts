import type { RapierRigidBody } from '@react-three/rapier'

export type CdInfo = {
  name: string          // Anzeigename auf dem TV, z. B. „GREEN“
  screenColor: string   // Farbe des Namens auf dem TV – hellere Variante der Label-Farbe, damit sie auf Schwarz lesbar ist
}

// Alle CD-Körper – damit das CD-Fach der PlayStation erkennt, ob ein gegriffenes Objekt eine CD ist
export const cdRegistry = new Map<RapierRigidBody, CdInfo>()

// Aktuell eingelegte CD – setzt das CD-Fach der PlayStation, der TV liest sie pro Frame
export const insertedDisc = { current: null as CdInfo | null }
