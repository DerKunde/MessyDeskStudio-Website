import { lazy, Suspense, useCallback, useState } from 'react'
import './App.css'
import TopBar from './TopBar'
import TutorialScene from './TutorialScene'
import { preloadMessyDeskScene } from './sceneLoader'

// Not loaded on page start – that happens once a CD is inserted in the tutorial (useTvScreen)
const MessyDeskScene = lazy(preloadMessyDeskScene)

type SceneKey = 'tutorial' | 'messyDesk'
type TransitionPhase = 'idle' | 'hiding' | 'revealing'

function App() {
  const [currentScene, setCurrentScene] = useState<SceneKey>('tutorial')
  const [pendingScene, setPendingScene] = useState<SceneKey | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle')

  const switchScene = useCallback((target: SceneKey) => {
    setPendingScene(target)
    setTransitionPhase('hiding')
  }, [])

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'opacity') return
    if (transitionPhase === 'hiding' && pendingScene) {
      setCurrentScene(pendingScene)
      setPendingScene(null)
      setTransitionPhase('revealing')
    } else if (transitionPhase === 'revealing') {
      setTransitionPhase('idle')
    }
  }

  return (
    <>
      <TopBar />
      <div className="app-wrapper">
        {currentScene === 'tutorial'
          ? <TutorialScene onExit={() => switchScene('messyDesk')} />
          // MessyDeskScene handles asset loading inside the canvas with its own Suspense boundary – this one only waits for the code
          : <Suspense fallback={null}><MessyDeskScene /></Suspense>}
        <div
          className={`scene-transition-overlay${transitionPhase === 'hiding' ? ' scene-transition-overlay--active' : ''}`}
          onTransitionEnd={handleTransitionEnd}
        />
      </div>
    </>
  )
}

export default App
