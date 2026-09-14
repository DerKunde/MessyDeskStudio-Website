import type { RapierRigidBody } from '@react-three/rapier'

export type CdInfo = {
  name: string          // display name on the TV, e.g. "GREEN"
  screenColor: string   // color of the name on the TV – lighter variant of the label color so it's readable on black
}

// All CD bodies – lets the PlayStation's tray tell whether a grabbed object is a CD
export const cdRegistry = new Map<RapierRigidBody, CdInfo>()

// Currently inserted CD – set by the PlayStation's tray, read by the TV every frame
export const insertedDisc = { current: null as CdInfo | null }
