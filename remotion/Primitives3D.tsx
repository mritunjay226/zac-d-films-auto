import React from 'react';
import * as THREE from 'three';
import {
  interpolateFrame,
  computeDeterministicSpring,
  computeOrganPulseScale,
} from '@/lib/remotion-math';

/**
 * 1. Auto-Targeted Bounding Box Helper (getOrganCenter)
 * Uses new THREE.Box3().setFromObject(targetMesh).getCenter(new THREE.Vector3())
 * on named Z-Anatomy sub-meshes so the AI agent never guesses blind [x, y, z] coordinates.
 */
export function getOrganCenter(root: THREE.Object3D, targetName: string): THREE.Vector3 {
  const target = root.getObjectByName(targetName) || root;
  const box = new THREE.Box3().setFromObject(target);
  return box.getCenter(new THREE.Vector3());
}

/**
 * 2. CrossSectionSlice Helper
 * Updates a Three.js Plane constant deterministically from frame and axis.
 */
export function computeCrossSectionPlane(
  axis: 'x' | 'y' | 'z',
  frame: number,
  fromOffset: number,
  toOffset: number
): THREE.Plane {
  const constant = interpolateFrame(frame, [0, 90], [fromOffset, toOffset], 'clamp');
  const normal =
    axis === 'x'
      ? new THREE.Vector3(-1, 0, 0)
      : axis === 'y'
        ? new THREE.Vector3(0, -1, 0)
        : new THREE.Vector3(0, 0, -1);
  return new THREE.Plane(normal, constant);
}

/**
 * 3. PropImpact Helper
 * Computes deterministic spring position & impact scale deformation.
 */
export function computePropImpactTransform(
  frame: number,
  startFrame: number,
  fps: number,
  startPos: [number, number, number],
  targetCenter: [number, number, number]
): {
  position: [number, number, number];
  flattenScaleY: number;
  cameraShakeOffset: number;
} {
  const progress = computeDeterministicSpring(frame, startFrame, fps, 12, 120, 1);
  const px = interpolateFrame(progress, [0, 1], [startPos[0], targetCenter[0]], 'extend');
  const py = interpolateFrame(progress, [0, 1], [startPos[1], targetCenter[1]], 'extend');
  const pz = interpolateFrame(progress, [0, 1], [startPos[2], targetCenter[2]], 'extend');

  const impactWindow = frame - startFrame;
  const isImpacting = impactWindow >= 8 && impactWindow <= 28;
  const flattenScaleY = isImpacting
    ? 1 - Math.sin(((impactWindow - 8) / 20) * Math.PI) * 0.16
    : 1;
  const cameraShakeOffset = isImpacting
    ? Math.sin(frame * 1.9) * 0.045 * Math.exp(-(impactWindow - 8) * 0.12)
    : 0;

  return {
    position: [px, py, pz],
    flattenScaleY,
    cameraShakeOffset,
  };
}

/**
 * 4. OrganPulse Helper
 * Applies frame-locked sinusoidal scale pulsing (1 + Math.sin(frame * frequency) * amplitude)
 */
export function computeOrganPulseState(
  frame: number,
  frequency: number = 0.22,
  amplitude: number = 0.08
): { scale: number; emissiveIntensity: number } {
  const scale = computeOrganPulseScale(frame, frequency, amplitude);
  const emissiveIntensity = 0.25 + Math.max(0, Math.sin(frame * frequency)) * 0.55;
  return { scale, emissiveIntensity };
}

/**
 * 5. CharacterReaction Helper
 * Scrubs pre-baked glTF skeletal animations deterministically via mixer.setTime(frame / fps)
 */
export function scrubCharacterReactionMixer(
  mixer: THREE.AnimationMixer | null,
  frame: number,
  fps: number = 30
): number {
  const timeSeconds = Math.max(0, frame / fps);
  if (mixer) {
    mixer.setTime(timeSeconds);
  }
  return timeSeconds;
}

export const Primitives3DDocumentationBadge: React.FC = () => (
  <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
    @remotion/three · 5 Primitives Active
  </span>
);
