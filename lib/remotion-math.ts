export type CameraMotionType = 'whip-zoom' | 'slice-orbit' | 'impact-shake';

export type SceneStageType =
  | 'exterior-macro'
  | 'tissue-cutaway'
  | 'cellular-micro'
  | 'neural-cortex';

export type ParticleModeType = 'rbc-stream' | 'toxin-droplets' | 'neural-sparks';

export interface StoryboardBeat {
  id: string;
  beatNumber: 1 | 2 | 3 | 4;
  title: string;
  startFrame: number;
  durationInFrames: number;
  caption: string;
  sfxCue: 'whoosh' | 'squelch' | 'impact' | 'heartbeat' | 'zap';
  cameraTargetZ: number;
  sliceOffset: number;
  targetOrgan: string;
  primitiveType: 'CrossSectionSlice' | 'PropImpact' | 'OrganPulse' | 'CharacterReaction';
  cameraMotion?: CameraMotionType;
  cameraOrbitRange?: [number, number];
  fovKick?: number;
  sceneStage?: SceneStageType;
  particleMode?: ParticleModeType;
}

export interface AnatomicalPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultSliceAxis: 'x' | 'y' | 'z';
  targetMeshName: string;
  propModelName: string;
  estimatedCostUsd: number;
  subMeshes: {
    name: string;
    layer: string;
    tier: 'Tier 1 (Z-Anatomy)' | 'Tier 2 (Sketchfab /tmp)' | 'Tier 3 (Generative)';
    path: string;
    vertices: number;
    defaultVisible: boolean;
    center: [number, number, number];
  }[];
  beats: StoryboardBeat[];
}

export function resolveBeatSceneStage(beat: StoryboardBeat): SceneStageType {
  if (beat.sceneStage) return beat.sceneStage;
  if (beat.beatNumber === 1) return 'exterior-macro';
  if (beat.beatNumber === 2) return 'tissue-cutaway';
  if (beat.beatNumber === 3) return 'cellular-micro';
  return 'neural-cortex';
}

export function resolveBeatParticleMode(beat: StoryboardBeat): ParticleModeType {
  if (beat.particleMode) return beat.particleMode;
  if (beat.beatNumber === 1) return 'toxin-droplets';
  if (beat.beatNumber === 2) return 'toxin-droplets';
  if (beat.beatNumber === 3) return 'rbc-stream';
  return 'neural-sparks';
}

export const SCENE_STAGE_LABELS: Record<SceneStageType, string> = {
  'exterior-macro': 'Scene 1: Exterior Impact',
  'tissue-cutaway': 'Scene 2: Tissue Cutaway',
  'cellular-micro': 'Scene 3: Cellular & RBC Micro',
  'neural-cortex': 'Scene 4: Neural & Brain Cortex',
};

/**
 * Deterministic Remotion-equivalent linear interpolation with clamping.
 */
export function interpolateFrame(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number],
  extrapolate: 'clamp' | 'extend' = 'clamp'
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  if (inMax === inMin) return outMax;
  let t = (frame - inMin) / (inMax - inMin);
  if (extrapolate === 'clamp') {
    t = Math.max(0, Math.min(1, t));
  }
  return outMin + t * (outMax - outMin);
}

/**
 * Deterministic underdamped spring curve matching @remotion/three spring({ frame, fps, config: { damping: 12, stiffness: 120 } })
 */
export function computeDeterministicSpring(
  frame: number,
  startFrame: number,
  fps: number = 30,
  damping: number = 12,
  stiffness: number = 120,
  mass: number = 1
): number {
  const elapsedFrames = frame - startFrame;
  if (elapsedFrames <= 0) return 0;
  const t = elapsedFrames / fps;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    const oscillation =
      Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t);
    return Math.max(0, Math.min(1.18, 1 - envelope * oscillation));
  }
  return 1 - Math.exp(-omega0 * t);
}

/**
 * Deterministic sinusoidal organ pulse scale factor:
 * 1 + Math.sin(frame * frequency) * amplitude
 */
export function computeOrganPulseScale(
  frame: number,
  frequency: number = 0.22,
  amplitude: number = 0.08
): number {
  return 1 + Math.sin(frame * frequency) * amplitude;
}

/**
 * Resolves the active StoryboardBeat for a given frame (0..359)
 */
export function getActiveBeatAtFrame(
  beats: StoryboardBeat[],
  frame: number
): StoryboardBeat {
  const clamped = Math.max(0, Math.min(359, Math.floor(frame)));
  for (const beat of beats) {
    if (
      clamped >= beat.startFrame &&
      clamped < beat.startFrame + beat.durationInFrames
    ) {
      return beat;
    }
  }
  return beats[beats.length - 1];
}

/**
 * Computes deterministic Zack D. Films 3D camera choreography & Whip-Pan Scene Transitions:
 * 1. 'whip-zoom': Fast spring-driven macro whip-pan zoom into targetOrgan center
 * 2. 'slice-orbit': Dynamic azimuth/elevation orbit sweep synchronized with cross-section slicing
 * 3. 'impact-shake': Decaying rotational trauma shake + dynamic FOV kick on prop collision
 * Plus inter-scene Whip-Pan Transition warp at the entry/exit of each beat!
 */
export function computeCameraChoreography(
  beat: StoryboardBeat,
  frame: number,
  fps: number = 30,
  baseTheta: number = 0.32,
  basePhi: number = 0.14
): {
  mode: CameraMotionType;
  sceneStage: SceneStageType;
  isWhipTransition: boolean;
  radius: number;
  theta: number;
  phi: number;
  fov: number;
  shakeOffset: [number, number, number];
  lookAtPullFactor: number;
} {
  const mode: CameraMotionType =
    beat.cameraMotion ||
    (beat.beatNumber === 1
      ? 'whip-zoom'
      : beat.beatNumber === 2
        ? 'slice-orbit'
        : beat.beatNumber === 3
          ? 'impact-shake'
          : 'whip-zoom');

  const sceneStage = resolveBeatSceneStage(beat);
  const localFrame = Math.max(0, frame - beat.startFrame);
  const framesRemaining = Math.max(0, beat.durationInFrames - localFrame);
  const progress = Math.max(0, Math.min(1, localFrame / Math.max(1, beat.durationInFrames)));

  // Zack D. Films Whip-Pan Cut envelope at beat entry (first 9 frames) & exit (last 5 frames)
  const entryWhip = localFrame <= 9 ? Math.pow(1 - localFrame / 9, 2) : 0;
  const exitWhip = framesRemaining <= 5 ? Math.pow(1 - framesRemaining / 5, 2) : 0;
  const whipIntensity = Math.max(entryWhip, exitWhip);
  const isWhipTransition = whipIntensity > 0.12;
  const whipAngleOffset = entryWhip * 0.65 - exitWhip * 0.55;
  const whipFovBoost = whipIntensity * 14;

  if (mode === 'whip-zoom') {
    const whipSpring = computeDeterministicSpring(frame, beat.startFrame, fps, 14, 150, 1);
    const startRadius = beat.cameraTargetZ * 1.48;
    const endRadius = beat.cameraTargetZ * 1.02;
    const radius = startRadius + (endRadius - startRadius) * whipSpring;
    const whipAngle = (1 - Math.min(1, whipSpring)) * 0.42 + whipAngleOffset;
    const fov = 38 + Math.max(0, (1 - Math.min(1, whipSpring)) * 6) + whipFovBoost;
    return {
      mode,
      sceneStage,
      isWhipTransition,
      radius: Number(radius.toFixed(4)),
      theta: Number((baseTheta + whipAngle).toFixed(4)),
      phi: Number((basePhi + (1 - Math.min(1, whipSpring)) * 0.12).toFixed(4)),
      fov: Number(fov.toFixed(2)),
      shakeOffset: [0, 0, 0],
      lookAtPullFactor: Number(Math.min(1, whipSpring).toFixed(3)),
    };
  }

  if (mode === 'slice-orbit') {
    const [orbitStart, orbitEnd] = beat.cameraOrbitRange || [-0.45, 0.55];
    const sweepTheta = interpolateFrame(progress, [0, 1], [orbitStart, orbitEnd], 'clamp');
    const sweepPhi = basePhi + Math.sin(progress * Math.PI) * 0.16;
    const radius = beat.cameraTargetZ * (1.14 - Math.sin(progress * Math.PI) * 0.08);
    return {
      mode,
      sceneStage,
      isWhipTransition,
      radius: Number((radius + whipIntensity * 0.45).toFixed(4)),
      theta: Number((baseTheta + sweepTheta + whipAngleOffset).toFixed(4)),
      phi: Number(sweepPhi.toFixed(4)),
      fov: Number((38 + whipFovBoost).toFixed(2)),
      shakeOffset: [0, 0, 0],
      lookAtPullFactor: 0.85,
    };
  }

  // 'impact-shake': Trauma*trauma decaying shake + dynamic FOV kick on collision
  const impactPeakFrame = 10;
  const framesSinceImpact = localFrame - impactPeakFrame;
  const trauma =
    framesSinceImpact >= 0 && framesSinceImpact <= 32
      ? Math.max(0, 1 - framesSinceImpact / 32)
      : 0;
  const traumaSq = trauma * trauma;
  const maxFovKick = beat.fovKick ?? 8;
  const fov = 38 + traumaSq * maxFovKick + whipFovBoost;

  const shakeX = Number((Math.sin(frame * 2.3) * 0.11 * traumaSq).toFixed(4));
  const shakeY = Number((Math.cos(frame * 2.9) * 0.11 * traumaSq).toFixed(4));
  const shakeZ = Number((Math.sin(frame * 1.7) * 0.07 * traumaSq).toFixed(4));

  return {
    mode,
    sceneStage,
    isWhipTransition,
    radius: Number((beat.cameraTargetZ * 1.1 + whipIntensity * 0.4).toFixed(4)),
    theta: Number((baseTheta + Math.sin(progress * Math.PI) * 0.15 + whipAngleOffset).toFixed(4)),
    phi: basePhi,
    fov: Number(fov.toFixed(2)),
    shakeOffset: [shakeX, shakeY, shakeZ],
    lookAtPullFactor: 0.95,
  };
}

/**
 * Computes word-by-word pop caption state for the active beat at the current frame.
 */
export function getWordByWordCaptionState(
  beat: StoryboardBeat,
  frame: number
): {
  words: string[];
  activeWordIndex: number;
  beatProgress: number;
} {
  const words = beat.caption
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return { words: [], activeWordIndex: -1, beatProgress: 0 };
  }
  const localFrame = Math.max(0, frame - beat.startFrame);
  const beatProgress = Math.max(
    0,
    Math.min(0.9999, localFrame / Math.max(1, beat.durationInFrames))
  );
  const activeWordIndex = Math.min(
    words.length - 1,
    Math.floor(beatProgress * words.length)
  );
  return {
    words,
    activeWordIndex,
    beatProgress,
  };
}

/**
 * Calculates unit cost breakdown per 30-second short.
 */
export function calculateShortUnitCost(options: {
  durationSeconds: number;
  ttsEngine: 'kokoro-local' | 'elevenlabs-turbo' | 'gemini-tts';
  tier3FallbackSeconds: number;
  cloudLambdaRender: boolean;
}): {
  llmPlanningCost: number;
  ttsCost: number;
  tier1And2AssetCost: number;
  tier3FallbackCost: number;
  computeRenderCost: number;
  totalCostUsd: number;
} {
  const llmPlanningCost = 0.008;
  const ttsCost =
    options.ttsEngine === 'kokoro-local'
      ? 0
      : options.ttsEngine === 'gemini-tts'
        ? Number((options.durationSeconds * 0.0004).toFixed(3))
        : Number((options.durationSeconds * 0.0011).toFixed(3));
  const tier1And2AssetCost = 0;
  const tier3FallbackCost = Number(
    (options.tier3FallbackSeconds * 0.042).toFixed(3)
  );
  const computeRenderCost = options.cloudLambdaRender ? 0.009 : 0.002;
  const totalCostUsd = Number(
    (
      llmPlanningCost +
      ttsCost +
      tier1And2AssetCost +
      tier3FallbackCost +
      computeRenderCost
    ).toFixed(3)
  );
  return {
    llmPlanningCost,
    ttsCost,
    tier1And2AssetCost,
    tier3FallbackCost,
    computeRenderCost,
    totalCostUsd,
  };
}
