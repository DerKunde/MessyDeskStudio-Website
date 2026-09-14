import { useProgress } from '@react-three/drei'

type SceneModule = typeof import('./MessyDeskScene')

let scenePromise: Promise<SceneModule> | null = null
let codeLoaded = false

// Loads code and assets of the main scene – safe to call repeatedly, loads only once.
// Asset loading starts when the modules are evaluated, via their useGLTF.preload / useLoader.preload
export function preloadMessyDeskScene() {
  scenePromise ??= import('./MessyDeskScene').then((module) => {
    codeLoaded = true
    return module
  })
  return scenePromise
}

// 0 … 1 – only 1 once the code and all assets of the main scene are loaded
export function messyDeskSceneLoadProgress() {
  if (!codeLoaded) return 0
  // The preloads start synchronously when the code is evaluated – if nothing is active afterwards, everything is loaded.
  // drei normalizes progress per loading batch, so the already loaded tutorial assets don't count
  const { active, progress } = useProgress.getState()
  return active ? progress / 100 : 1
}
