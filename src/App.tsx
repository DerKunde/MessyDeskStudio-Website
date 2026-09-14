import { useCallback, useState } from 'react'
import './App.css'
import TopBar from './TopBar'
import Scene from './Scene'
import TutorialScene from './TutorialScene'

type SceneKey = 'tutorial' | 'main'
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
          ? <TutorialScene onExit={() => switchScene('main')} />
          : <Scene />}
        <div
          className={`scene-transition-overlay${transitionPhase === 'hiding' ? ' scene-transition-overlay--active' : ''}`}
          onTransitionEnd={handleTransitionEnd}
        />
      </div>
    </>
  )
}

export default App
