# Multi-Scene 3D Composition, Subsurface Organic Shaders & Dynamic Particle Systems

Upgrade **IIZackStudio** so every 30-second 9:16 short transitions across **4 distinct 3D scenes (Beat 1: Exterior Impact $\rightarrow$ Beat 2: Tissue Cross-Section $\rightarrow$ Beat 3: Microscopic Cellular & Capillary Flow $\rightarrow$ Beat 4: Neural Synapse & Brain Cortex)** with Zack D. Films whip-pan zoom cuts, organic subsurface scattering/wet clearcoat materials, procedural cellular micro-bump textures, and frame-locked 3D particle systems.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and rendering decisions reflect your confirmed selections from the planning interview:

- **Confirmed Decision 1 — 4 Distinct 3D Scenes Per Video**: Instead of holding on a single static anatomical model for all 360 frames, each of the 4 storyboard beats renders its own dedicated 3D scene stage (`sceneStage: 'exterior-macro' | 'tissue-cutaway' | 'cellular-micro' | 'neural-cortex'`), automatically switching the active 3D environment on beat boundaries (`0f`, `90f`, `180f`, `270f`) or allowing per-beat scene customization.
- **Confirmed Decision 2 — Organic Subsurface Transmission, Procedural Cellular Bump Maps & Dynamic 3D Particles**:
  - **Organic Tissue Shaders**: Upgrade all anatomical materials to `THREE.MeshPhysicalMaterial` featuring subsurface `transmission`, `thickness`, `attenuationColor` (deep crimson/dermal scatter), `sheen`, and wet mucosal `clearcoat` (`clearcoat: 0.85`, `clearcoatRoughness: 0.12`).
  - **Procedural Micro-Bump & High-Poly Geometry**: Generate procedural Voronoi/cellular `THREE.CanvasTexture` bump and roughness maps in memory and increase lathe/tube/icosahedron subdivision density so close-up macro shots reveal organic pore, bone trabeculae, and muscle striation detail.
  - **Frame-Locked 3D Particle Systems (`THREE.InstancedMesh`)**: Add deterministic, frame-driven instanced 3D particle streams for biconcave **Red Blood Cells (Erythrocytes)** flowing through vessels, **Venom / Acid / Debris Droplets** dispersing on impact, and **Action-Potential Neural Sparks** traveling along axons into the brain.
- **Confirmed Decision 3 — Zack D. Films Whip-Pan Zoom Scene Transitions**: Every beat boundary executes a fast exponential whip-pan zoom-out/zoom-in transition (`whipTransitionProgress`) synchronized with a `whoosh` SFX cue and dynamic FOV warp ($38^\circ \rightarrow 54^\circ \rightarrow 38^\circ$) as the stage cuts from Exterior $\rightarrow$ Tissue $\rightarrow$ Cellular $\rightarrow$ Brain.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates the 9:16 3D viewport from a single-object viewer into a true **multi-scene 3D documentary compositor** where each beat in a video dives deeper in scale—from macroscopic exterior impact down to tissue cross-sections, microscopic bloodstream cells, and cerebral pain/signal processing.
- **Target Audience / Persona**: Creators producing high-retention 9:16 science, medical, and mechanical explainer shorts who need authentic Zack D. Films visual variety and tactile organic rendering.
- **Key Value**: Eliminates visual monotony by giving every 3-second beat its own distinct 3D environment, particle dynamics, and wet subsurface PBR lighting while keeping frame scrubbing 100% deterministic.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Multi-Scene Playback & Timeline Scrubbing**: As the playhead advances across Beats 1–4 (`0–90f`, `90–180f`, `180–270f`, `270–360f`), the 9:16 viewport smoothly whip-pans between four distinct 3D scene rigs:
     - **Scene 1 (`0–89f` — Exterior & Entry Impact)**: Macro anatomical exterior + incoming high-detail prop (barbed stinger, 9mm full-metal-jacket slug, threaded titanium implant, acoustic shockwave rings) with surface compression.
     - **Scene 2 (`90–179f` — Deep Tissue Cross-Section Cutaway)**: Multi-layer anatomical cross-section (`Material.clippingPlanes`) with wet clearcoat dermis/myocardium/cortical bone and a glowing laser slice rim.
     - **Scene 3 (`180–269f` — Microscopic Cellular & Capillary Stream)**: High-magnification microvascular lumen with flowing biconcave red blood cells (`THREE.InstancedMesh`), pulsing cellular membranes, and dispersing toxin/medicine droplets.
     - **Scene 4 (`270–359f` — Neural Pathway & Sagittal Brain Cortex)**: Translucent sagittal cranium and folded cerebral cortex (`Cerebral_Cortex`) with glowing cyan/amber synaptic action-potential particles racing up the spinal/cranial nerve tract into the somatosensory cortex.
  2. **Per-Beat 3D Scene Stage Selector & Shader Controls**: In the **4-Beat Storyboard & Camera Choreography** panel and **AI Director Modal**, each beat card displays its assigned **3D Scene Stage badge** (`Scene 1: Exterior Impact`, `Scene 2: Tissue Cutaway`, `Scene 3: Cellular Micro`, `Scene 4: Neural Brain`) and allows the user to switch any beat's 3D scene stage or particle density.
  3. **Viewport HUD Scene & Particle Telemetry**: The top HUD inside the dark 9:16 frame displays the active Scene Stage (`SCENE 3/4: CELLULAR MICRO`), active camera transition state (`WHIP-CUT`), and active particle stream (`RBC + VENOM STREAM`).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Retains the **ElevenLabs (ElevenCreative) Minimalist Light-Mode Design System** (`#FFFFFF` / `#FAFAFA` monochrome workspace, `#E4E4E7` hairline borders, `#09090B` primary buttons) while dramatically enriching the contrast-framed `#080b12` 9:16 3D stage with 3-point studio rim lighting, warm subsurface tissue glow, and specular wet highlights.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Pre-Compiled 4-Stage Scene Graph with Visibility Switching**
  - *Chosen Approach*: Build all 4 scene stage groups (`exteriorGroup`, `cutawayGroup`, `cellularGroup`, `neuralBrainGroup`) plus their instanced particle systems inside the anatomical rig builder and toggle active stage visibility + whip-zoom transform per frame based on `activeBeat.sceneStage`.
  - *Why*: Pre-compiling all 4 scene stages into GPU memory (`renderer.compile(scene, camera)`) ensures zero frame-drop or shader-compile stutter when the timeline crosses beat boundaries (`89f -> 90f`, `179f -> 180f`, `269f -> 270f`) during 30 FPS playback or `.WebM` composite recording.
  - *Alternatives Considered*: Disposing and rebuilding Three.js geometries on every beat boundary was rejected because it causes a 40–80ms GC pause during live playback.
- **Decision 2 — Procedural Canvas Bump/Roughness Maps + `MeshPhysicalMaterial` Subsurface**
  - *Chosen Approach*: Synthesize tileable cellular Voronoi and striated fibrous `THREE.CanvasTexture` bump maps at startup and pair them with `THREE.MeshPhysicalMaterial` (`transmission`, `thickness`, `attenuationColor`, `clearcoat`, `sheen`).
  - *Why*: Delivers tactile, organic wet-tissue realism and micro-surface detail at 0 KB external texture download cost and 0 network latency.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     IIZackStudio Multi-Scene Engine                        │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │            4-Beat Storyboard & AI Director (/api/director)           │  │
│  │  Beat 1: Exterior -> Beat 2: Cutaway -> Beat 3: Cellular -> Beat 4   │  │
│  └──────────────┬───────────────────────────────────────┬───────────────┘  │
│                 │                                       │                  │
│                 ▼                                       ▼                  │
│  ┌─────────────────────────────────────┐ ┌──────────────────────────────┐  │
│  │   Multi-Scene Procedural Rig Graph  │ │  PBR Subsurface & Particles  │  │
│  │  - Stage 1: Macro Exterior + Prop   │ │  - MeshPhysicalMaterial SSS  │  │
│  │  - Stage 2: Deep Tissue Slicer      │ │  - Cellular Voronoi Bump Map │  │
│  │  - Stage 3: Capillary + RBC Stream  │ │  - InstancedMesh Erythrocytes│  │
│  │  - Stage 4: Neural Synapse + Brain  │ │  - Synaptic Spark Emitters   │  │
│  └──────────────┬──────────────────────┘ └──────────────┬───────────────┘  │
│                 └───────────────────┬───────────────────┘                  │
│                                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │        9:16 WebGL Stage & Deterministic Whip-Zoom Compositor         │  │
│  │  - Frame-locked Whip-Pan Cut (FOV 38° -> 54° -> 38° + Whoosh SFX)    │  │
│  │  - Real-time .WebM Composite Recorder + Remotion .TSX Code Generator │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **Extended `StoryboardBeat` (`SceneStageType`)**:
  - Adds `sceneStage: 'exterior-macro' | 'tissue-cutaway' | 'cellular-micro' | 'neural-cortex'` and `particleMode: 'rbc-stream' | 'toxin-droplets' | 'neural-sparks' | 'debris-burst'`.
- **Multi-Scene Rig Structure (`BuiltAnatomicalRig`)**:
  - Holds `stageGroups: Record<SceneStageType, THREE.Group>`, `instancedParticles: { rbcMesh: THREE.InstancedMesh; dropletMesh: THREE.InstancedMesh; sparkMesh: THREE.InstancedMesh }`, and shared procedural cellular bump textures.

### Interactive Component & State Mapping
- **Viewport Multi-Scene Render Loop**: On every frame `f`, resolves `activeBeat = getActiveBeatAtFrame(beats, f)` and activates `stageGroups[activeBeat.sceneStage]`. During the first 8 frames and last 6 frames of each beat, applies a deterministic whip-pan zoom transition (`computeSceneTransitionWhip`) that accelerates azimuth rotation and kicks FOV up to $54^\circ$ before snapping cleanly into the new scene's target organ center.
- **Storyboard Beat Inspector & AI Director Modal**: Adds a **3D Scene Stage** selector dropdown (`Scene 1: Macro Exterior`, `Scene 2: Tissue Cutaway`, `Scene 3: Cellular & Capillary Micro`, `Scene 4: Neural Brain Cortex`) and **Particle Stream** selector to every beat card so users can customize or preview any scene stage on demand.
- **Generated Remotion `.TSX` Code**: Updates `SceneComposition.tsx` code output to emit `<Sequence>` blocks wrapping distinct `<ThreeCanvas>` / scene stage components for each of the 4 beats.
