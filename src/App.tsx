import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { SpaceEnvironment } from './components/SpaceEnvironment'
import { OphanimEntity } from './components/OphanimEntity'
import type { EntityState, TransitionState } from './hooks/useEntityState'
import { useEntityState } from './hooks/useEntityState'
import './index.css'

interface SceneProps {
  currentState: EntityState
  transition: TransitionState
}

function Scene({ currentState, transition }: SceneProps) {
  return (
    <>
      <SpaceEnvironment />
      <OphanimEntity currentState={currentState} transition={transition} />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

interface StateUIProps {
  currentState: EntityState
  transitionTo: (state: EntityState) => void
}

function StateUI({ currentState, transitionTo }: StateUIProps) {
  const states: EntityState[] = ['resting', 'thinking', 'acting']
  const keys = { resting: 'R', thinking: 'T', acting: 'A' }

  return (
    <div className="ui-overlay">
      {states.map((state) => (
        <button
          key={state}
          className={`state-indicator ${state} ${currentState === state ? 'active' : ''}`}
          onClick={() => transitionTo(state)}
        >
          {state}
          <span className="key-hint">[{keys[state]}]</span>
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { currentState, transition, transitionTo } = useEntityState()
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        setAutoRotate(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Canvas
        camera={{
          position: [0, 3, 10],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: false,
        }}
        style={{ background: '#000000' }}
      >
        <color attach="background" args={['#000000']} />
        <Scene currentState={currentState} transition={transition} />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={25}
          target={[0, 2, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      <StateUI currentState={currentState} transitionTo={transitionTo} />
    </>
  )
}
