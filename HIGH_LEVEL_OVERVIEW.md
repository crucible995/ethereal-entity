# Ethereal Entity - High Level Overview

A React Three Fiber visualization of a non-corporeal god node—an ethereal, particle-based entity that exists as pure energy in space.

---

## Concept

The entity represents a divine/AI consciousness rendered as particles rather than solid geometry. Unlike physical representations, this being is **ephemeral**—made of light, energy, and motion. It floats above a platform in the void of space, shifting between states of rest, contemplation, and action.

---

## Architecture

```
src/
├── App.tsx                     # Main canvas, controls, UI
├── components/
│   ├── OphanimEntity.tsx       # Form 1: Ophanim Constellation
│   ├── NebulaEntity.tsx        # Form 2: Nebula Heart (planned)
│   ├── LatticeEntity.tsx       # Form 3: Sacred Lattice (planned)
│   └── SpaceEnvironment.tsx    # Stars, platform, ambient light
├── hooks/
│   └── useEntityState.ts       # State machine (resting/thinking/acting)
└── index.css                   # UI styles
```

---

## Forms

### Form 1: Ophanim Constellation ✓
*Inspired by Ezekiel's wheels-within-wheels*

- 4 interlocking particle rings on different rotational axes
- 8 eye clusters at ring intersection points
- Central core glow with fresnel effect
- Rings tumble in 3D space (speed varies by state)
- Particles flow along rings (gaseous effect)

### Form 2: Nebula Heart (Planned)
*A fluid-like cloud of particles*

- Amorphous, breathing cloud with no fixed boundary
- Dense glowing core diffusing into wisps at edges
- Flow field dynamics (ink-in-water aesthetic)
- Vortex formation during thinking state

### Form 3: Sacred Lattice (Planned)
*Particles at vertices of nested Platonic solids*

- Tetrahedron → Octahedron → Icosahedron (nested)
- Luminous connections between vertices
- Counter-rotating geometric layers
- Energy pulses along edges

---

## States

| State | Visual Character | Motion | Intensity |
|-------|-----------------|--------|-----------|
| **Resting** | Sparse, dim, calm | Slow drift, minimal rotation | Low glow |
| **Thinking** | Tightening, pulsing | Orbiting, moderate tumble | Medium glow, scanning |
| **Acting** | Intense, focused | Rapid rotation, bursts | High glow, blazing |

Transitions between states are eased (cubic easing) for smooth morphing.

---

## Controls

| Key | Action |
|-----|--------|
| `R` | Resting state |
| `T` | Thinking state |
| `A` | Acting state |
| `` ` `` | Toggle auto-rotate camera |
| Mouse drag | Orbit camera |
| Scroll | Zoom |

---

## Visual Design

### Aesthetic Principles
- **Non-corporeal**: No solid surfaces, only particles and glow
- **Transparent/Additive**: Particles use additive blending for light accumulation
- **Cosmic palette**: Blues, cyans, purples against pure black void
- **Ethereal edges**: No hard boundaries, forms fade into space

### Color Palette
| Context | Hex | Usage |
|---------|-----|-------|
| Base | `#4a9eff` | Resting state, default |
| Thinking | `#7b68ee` | Processing, contemplation |
| Acting | `#00ffff` | Execution, manifestation |
| Eyes | `#ffffff` | Focal points |
| Background | `#000000` | Void |

---

## Technical Notes

### Particle Rendering
- Uses `THREE.Points` with custom shaders
- Additive blending (`THREE.AdditiveBlending`)
- Depth write disabled for proper transparency
- Gaussian falloff for soft particle edges

### Performance
- ~720 particles per ring × 4 rings = ~2880 ring particles
- ~240 eye particles (30 per eye × 8 eyes)
- Bloom post-processing via `@react-three/postprocessing`
- Target: 60fps on modern hardware

### State Interpolation
States smoothly interpolate using `getInterpolatedValue()`:
```typescript
const value = getInterpolatedValue(
  restingValue,   // value when resting
  thinkingValue,  // value when thinking
  actingValue,    // value when acting
  currentState,
  transition
)
```

---

## Dependencies

- `react` / `react-dom`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `typescript`
- `vite`

---

## Future Considerations

- Form switching transitions (dissolve → reform)
- Particle trails during state changes
- Audio reactivity
- Child node spawning (collective entity expansion)
- Connection tendrils between nodes
