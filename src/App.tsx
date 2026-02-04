import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { SpaceEnvironment } from './components/SpaceEnvironment'
import { OphanimEntity } from './components/OphanimEntity'
import { NebulaEntity } from './components/NebulaEntity'
import type { EntityState, TransitionState } from './hooks/useEntityState'
import { useEntityState } from './hooks/useEntityState'
import './index.css'

type EntityForm = 'ophanim' | 'nebula' | 'lattice'

interface SceneProps {
  currentState: EntityState
  transition: TransitionState
  form: EntityForm
}

function Scene({ currentState, transition, form }: SceneProps) {
  return (
    <>
      <SpaceEnvironment />
      {form === 'ophanim' && (
        <OphanimEntity currentState={currentState} transition={transition} />
      )}
      {form === 'nebula' && (
        <NebulaEntity currentState={currentState} transition={transition} />
      )}
      {form === 'lattice' && (
        <OphanimEntity currentState={currentState} transition={transition} />
      )}

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

interface FormSwitcherProps {
  currentForm: EntityForm
  setForm: (form: EntityForm) => void
}

function FormSwitcher({ currentForm, setForm }: FormSwitcherProps) {
  const forms: { id: EntityForm; label: string; available: boolean }[] = [
    { id: 'ophanim', label: 'Ophanim', available: true },
    { id: 'nebula', label: 'Nebula', available: true },
    { id: 'lattice', label: 'Lattice', available: false },
  ]

  return (
    <div className="form-switcher">
      <div className="form-switcher-label">Form</div>
      <div className="form-switcher-options">
        {forms.map((form) => (
          <button
            key={form.id}
            className={`form-option ${currentForm === form.id ? 'active' : ''} ${!form.available ? 'disabled' : ''}`}
            onClick={() => form.available && setForm(form.id)}
            disabled={!form.available}
          >
            {form.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { currentState, transition, transitionTo } = useEntityState()
  const [autoRotate, setAutoRotate] = useState(true)
  const [form, setForm] = useState<EntityForm>('ophanim')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`') {
        setAutoRotate(prev => !prev)
      }
      // Number keys for quick form switching
      if (e.key === '1') setForm('ophanim')
      if (e.key === '2') setForm('nebula')
      // if (e.key === '3') setForm('lattice') // Not available yet
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
        <Scene currentState={currentState} transition={transition} form={form} />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={25}
          target={[0, 2, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      <FormSwitcher currentForm={form} setForm={setForm} />
      <StateUI currentState={currentState} transitionTo={transitionTo} />
    </>
  )
}
