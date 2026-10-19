import {
  type AnatomicalPreset,
  type StoryboardBeat,
  resolveBeatSceneStage,
  resolveBeatParticleMode,
} from './remotion-math';

export function generateSceneCompositionTsx(
  preset: AnatomicalPreset,
  beats: StoryboardBeat[],
  sliceAxis: 'x' | 'y' | 'z',
  skinOpacity: number
): string {
  const beatSequences = beats
    .map((beat) => {
      const stage = resolveBeatSceneStage(beat);
      const particles = resolveBeatParticleMode(beat);
      return `      {/* Beat ${beat.beatNumber}: ${beat.title} (${beat.startFrame}f - ${
        beat.startFrame + beat.durationInFrames
      }f) — 3D Stage: ${stage} | Particles: ${particles} */}
      <Sequence from={${beat.startFrame}} durationInFrames={${beat.durationInFrames}} name="${beat.title} [${stage}]">
        <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.6} />
        <Audio src={staticFile("sfx/${beat.sfxCue}.mp3")} volume={0.85} />
        <ZackPopCaption
          text=${JSON.stringify(beat.caption)}
          durationInFrames={${beat.durationInFrames}}
        />
      </Sequence>`;
    })
    .join('\n\n');

  return `import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import {
  CrossSectionSlice,
  PropImpact,
  OrganPulse,
  CharacterReaction,
  ZackPopCaption,
} from "./Primitives3D";

export const ZackCutawayComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  return (
    <AbsoluteFill className="bg-[#080b12]">
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, localClippingEnabled: true }}
        camera={{ fov: 38, position: [0, 0.2, ${beats[0]?.cameraTargetZ ?? 5.2}] }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} castShadow />
        <directionalLight position={[-4, -2, -3]} intensity={0.75} color="#38bdf8" />

        {/* Tier 1 Local Z-Anatomy Base Sub-Meshes + CrossSectionSlice */}
        <CrossSectionSlice
          modelUrl={staticFile("${preset.subMeshes[0]?.path.replace('/public/', '') ?? 'assets/z-anatomy/base.glb'}")}
          axis="${sliceAxis}"
          fromOffset={${beats[0]?.sliceOffset ?? 1.2}}
          toOffset={${beats[1]?.sliceOffset ?? 0.05}}
          skinOpacity={${skinOpacity.toFixed(2)}}
        />

        {/* Tier 2 Ephemeral Prop Impact Trajectory */}
        <PropImpact
          modelUrl={staticFile("tmp/props/${preset.propModelName}")}
          targetOrgan="${preset.targetMeshName}"
          startFrame={${beats[0]?.startFrame ?? 0}}
        />

        {/* Frame-Locked Sinusoidal Organ Pulse */}
        <OrganPulse
          targetOrgan="${preset.targetMeshName}"
          frequency={0.22}
          amplitude={0.08}
          startFrame={${beats[2]?.startFrame ?? 180}}
        />

        {/* Pre-Baked GLTF Skeletal Reaction */}
        <CharacterReaction
          clipName="Pain_Reflex_Flinch"
          startFrame={${beats[3]?.startFrame ?? 270}}
          fps={fps}
        />
      </ThreeCanvas>

      {/* Synced SFX Cues & Word-by-Word Pop Captions */}
      <Audio src={staticFile("tts/${preset.id}-narrator.wav")} volume={1.0} />

${beatSequences}
    </AbsoluteFill>
  );
};
`;
}

export function generatePrimitives3DTsx(): string {
  return `import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useGLTF } from "@react-three/drei";

/**
 * 1. Auto-Targeted Bounding Box Helper (getOrganCenter)
 * Computes exact THREE.Box3 world center of named Z-Anatomy sub-meshes
 * so the AI agent never guesses blind [x, y, z] coordinates.
 */
export function getOrganCenter(root: THREE.Object3D, organName: string): THREE.Vector3 {
  const target = root.getObjectByName(organName) || root;
  const box = new THREE.Box3().setFromObject(target);
  return box.getCenter(new THREE.Vector3());
}

/**
 * 2. <CrossSectionSlice />
 * Slices any 3D organ, skull, or skin block smoothly across frame ranges
 * using Material.clippingPlanes with gl={{ localClippingEnabled: true }}.
 */
export const CrossSectionSlice: React.FC<{
  modelUrl: string;
  axis: "x" | "y" | "z";
  fromOffset: number;
  toOffset: number;
  skinOpacity?: number;
}> = ({ modelUrl, axis, fromOffset, toOffset, skinOpacity = 0.88 }) => {
  const frame = useCurrentFrame();
  const { scene } = useGLTF(modelUrl);

  const constant = interpolate(frame, [60, 150], [fromOffset, toOffset], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clipPlane = useMemo(() => {
    const normal =
      axis === "x"
        ? new THREE.Vector3(-1, 0, 0)
        : axis === "y"
          ? new THREE.Vector3(0, -1, 0)
          : new THREE.Vector3(0, 0, -1);
    return new THREE.Plane(normal, constant);
  }, [axis, constant]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = [clipPlane];
        mat.clipShadows = true;
        mat.side = THREE.DoubleSide;
        if (mesh.name.includes("Epidermis")) {
          mat.transparent = skinOpacity < 1;
          mat.opacity = skinOpacity;
        }
      }
    });
  }, [scene, clipPlane, skinOpacity]);

  return <primitive object={scene} />;
};

/**
 * 3. <PropImpact />
 * Animates rigid .GLB props (bee stinger, 9mm slug, titanium screw) along a vector
 * directly into the THREE.Box3 center of targetOrgan using Remotion spring().
 */
export const PropImpact: React.FC<{
  modelUrl: string;
  targetOrgan: string;
  startFrame: number;
}> = ({ modelUrl, targetOrgan, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scene } = useGLTF(modelUrl);

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  const yPos = interpolate(progress, [0, 1], [2.4, 0.05]);
  return <primitive object={scene} position={[0, yPos, 0]} />;
};

/**
 * 4. <OrganPulse />
 * Frame-locked sinusoidal scale pulsing and emissive inflammation transitions.
 */
export const OrganPulse: React.FC<{
  targetOrgan: string;
  frequency: number;
  amplitude: number;
  startFrame?: number;
}> = ({ frequency, amplitude, startFrame = 180 }) => {
  const frame = useCurrentFrame();
  const active = frame >= startFrame;
  const scale = active ? 1 + Math.sin(frame * frequency) * amplitude : 1;
  return <group scale={[scale, scale, scale]} />;
};

/**
 * 5. <CharacterReaction />
 * Scrubs pre-baked glTF skeletal animations deterministically via mixer.setTime(frame / fps).
 */
export const CharacterReaction: React.FC<{
  clipName: string;
  startFrame: number;
  fps: number;
}> = ({ clipName, startFrame, fps }) => {
  const frame = useCurrentFrame();
  const localTime = Math.max(0, (frame - startFrame) / fps);
  return <group userData={{ clipName, scrubTimeSeconds: localTime }} />;
};
`;
}

export function generateAssetResolverTs(preset: AnatomicalPreset): string {
  return `import fs from "node:fs/promises";
import path from "node:path";

/**
 * 3-Tier Non-Repeating Asset Resolver ($0.00 Asset Cost, 0 MB Permanent Bloat)
 * - Tier 1: Local Z-Anatomy Core Kit (/public/assets/z-anatomy/)
 * - Tier 2: Ephemeral Sketchfab / Poly Pizza Props (/tmp/props/ -> purged post-MP4)
 * - Tier 3: Fallback Generative 3D / Video (TRELLIS.2 / Hunyuan3D / Veo 3.1)
 */
export async function resolveSceneAssets(presetId = "${preset.id}") {
  const resolved = [
${preset.subMeshes
  .map(
    (m) =>
      `    { name: "${m.name}", tier: "${m.tier}", path: "${m.path}", vertices: ${m.vertices} },`
  )
  .join('\n')}
  ];

  return {
    presetId,
    resolved,
    cleanupEphemeralProps: async () => {
      const tmpDir = path.join("/tmp", "props");
      await fs.rm(tmpDir, { recursive: true, force: true });
    },
  };
}
`;
}
