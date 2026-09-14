import { useProgress } from '@react-three/drei'

type SceneModule = typeof import('./MessyDeskScene')

let scenePromise: Promise<SceneModule> | null = null
let codeLoaded = false

// Lädt Code und Assets der Hauptszene – mehrfach aufrufbar, lädt nur einmal.
// Die Assets starten beim Auswerten der Module über deren useGLTF.preload / useLoader.preload
export function preloadMessyDeskScene() {
  scenePromise ??= import('./MessyDeskScene').then((module) => {
    codeLoaded = true
    return module
  })
  return scenePromise
}

// 0 … 1 – erst 1, wenn Code und alle Assets der Hauptszene geladen sind
export function messyDeskSceneLoadProgress() {
  if (!codeLoaded) return 0
  // Die Preloads starten synchron beim Auswerten des Codes – ist danach nichts mehr aktiv, ist alles da.
  // drei normiert progress pro Lade-Durchgang, die schon geladenen Tutorial-Assets zählen nicht mit
  const { active, progress } = useProgress.getState()
  return active ? progress / 100 : 1
}
