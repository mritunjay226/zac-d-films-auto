import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interpolateFrame,
  computeDeterministicSpring,
  computeOrganPulseScale,
  getActiveBeatAtFrame,
  getWordByWordCaptionState,
  calculateShortUnitCost,
  computeCameraChoreography,
  resolveBeatSceneStage,
  type StoryboardBeat,
} from './remotion-math.ts';

const sampleBeats: StoryboardBeat[] = [
  {
    id: 'b1',
    beatNumber: 1,
    title: 'Macro Exterior Entry',
    startFrame: 0,
    durationInFrames: 90,
    caption: 'WHEN A BARBED BEE STINGER PIERCES YOUR SKIN',
    sfxCue: 'whoosh',
    cameraTargetZ: 5.2,
    sliceOffset: 0.22,
    targetOrgan: 'Epidermis_Layer',
    primitiveType: 'PropImpact',
    cameraMotion: 'whip-zoom',
    sceneStage: 'exterior-macro',
  },
  {
    id: 'b2',
    beatNumber: 2,
    title: 'Cross-Section Cutaway',
    startFrame: 90,
    durationInFrames: 90,
    caption: 'MICROSCOPIC BARBS LOCK INTO THE DERMIS TISSUE',
    sfxCue: 'squelch',
    cameraTargetZ: 3.6,
    sliceOffset: 0.08,
    targetOrgan: 'Dermis_Layer',
    primitiveType: 'CrossSectionSlice',
    cameraMotion: 'slice-orbit',
    cameraOrbitRange: [-0.4, 0.5],
    sceneStage: 'tissue-cutaway',
  },
  {
    id: 'b3',
    beatNumber: 3,
    title: 'Venom Sac Contraction',
    startFrame: 180,
    durationInFrames: 90,
    caption: 'THE DETACHED VENOM SAC KEEPS PUMPING TOXINS',
    sfxCue: 'heartbeat',
    cameraTargetZ: 2.8,
    sliceOffset: -0.1,
    targetOrgan: 'Capillary_Plexus',
    primitiveType: 'OrganPulse',
    cameraMotion: 'impact-shake',
    fovKick: 8,
    sceneStage: 'cellular-micro',
  },
  {
    id: 'b4',
    beatNumber: 4,
    title: 'Nerve Receptor Firing',
    startFrame: 270,
    durationInFrames: 90,
    caption: 'PAIN SIGNALS FLASH DIRECTLY TO YOUR BRAIN',
    sfxCue: 'zap',
    cameraTargetZ: 3.1,
    sliceOffset: 0.0,
    targetOrgan: 'Nociceptor_Nerve_Root',
    primitiveType: 'CharacterReaction',
    cameraMotion: 'whip-zoom',
    sceneStage: 'neural-cortex',
  },
];

test('interpolateFrame clamps and interpolates linearly', () => {
  assert.equal(interpolateFrame(0, [0, 90], [1.5, -0.5]), 1.5);
  assert.equal(interpolateFrame(45, [0, 90], [1.5, -0.5]), 0.5);
  assert.equal(interpolateFrame(90, [0, 90], [1.5, -0.5]), -0.5);
  assert.equal(interpolateFrame(120, [0, 90], [1.5, -0.5], 'clamp'), -0.5);
});

test('computeDeterministicSpring returns 0 before startFrame and settles near 1', () => {
  assert.equal(computeDeterministicSpring(10, 20, 30), 0);
  const mid = computeDeterministicSpring(25, 20, 30);
  assert.ok(mid > 0.3, `Expected spring mid value > 0.3, got ${mid}`);
  const settled = computeDeterministicSpring(80, 20, 30);
  assert.ok(Math.abs(settled - 1) < 0.01, `Expected spring settled ~1, got ${settled}`);
});

test('computeOrganPulseScale oscillates deterministically around 1.0', () => {
  assert.equal(computeOrganPulseScale(0, 0.2, 0.1), 1);
  const peak = computeOrganPulseScale(Math.PI / (2 * 0.2), 0.2, 0.1);
  assert.ok(Math.abs(peak - 1.1) < 1e-6);
});

test('getActiveBeatAtFrame resolves exact beat and sceneStage across 0..359 frames', () => {
  assert.equal(resolveBeatSceneStage(getActiveBeatAtFrame(sampleBeats, 0)), 'exterior-macro');
  assert.equal(resolveBeatSceneStage(getActiveBeatAtFrame(sampleBeats, 90)), 'tissue-cutaway');
  assert.equal(resolveBeatSceneStage(getActiveBeatAtFrame(sampleBeats, 180)), 'cellular-micro');
  assert.equal(resolveBeatSceneStage(getActiveBeatAtFrame(sampleBeats, 275)), 'neural-cortex');
});

test('getWordByWordCaptionState highlights words sequentially within a beat', () => {
  const startState = getWordByWordCaptionState(sampleBeats[0], 0);
  assert.equal(startState.words[0], 'WHEN');
  assert.equal(startState.activeWordIndex, 0);

  const lateState = getWordByWordCaptionState(sampleBeats[0], 85);
  assert.equal(lateState.activeWordIndex, startState.words.length - 1);
});

test('computeCameraChoreography executes whip-zoom, slice-orbit, impact-shake, and inter-scene whip transitions', () => {
  const whipStart = computeCameraChoreography(sampleBeats[0], 0, 30);
  const whipSettled = computeCameraChoreography(sampleBeats[0], 45, 30);
  assert.equal(whipStart.mode, 'whip-zoom');
  assert.equal(whipStart.isWhipTransition, true);
  assert.equal(whipSettled.isWhipTransition, false);
  assert.ok(whipStart.radius > whipSettled.radius);

  const orbitEarly = computeCameraChoreography(sampleBeats[1], 105, 30);
  const orbitLate = computeCameraChoreography(sampleBeats[1], 170, 30);
  assert.equal(orbitEarly.mode, 'slice-orbit');
  assert.ok(orbitLate.theta > orbitEarly.theta);

  const impactPeak = computeCameraChoreography(sampleBeats[2], 190, 30);
  const impactAfter = computeCameraChoreography(sampleBeats[2], 230, 30);
  assert.equal(impactPeak.mode, 'impact-shake');
  assert.ok(impactPeak.fov > 44);
  assert.equal(impactAfter.fov, 38);
});

test('calculateShortUnitCost stays within $0.01 - $0.05 target across Kokoro, Gemini TTS, and ElevenLabs', () => {
  const localCost = calculateShortUnitCost({
    durationSeconds: 30,
    ttsEngine: 'kokoro-local',
    tier3FallbackSeconds: 0,
    cloudLambdaRender: false,
  });
  assert.equal(localCost.totalCostUsd, 0.01);

  const geminiTtsCost = calculateShortUnitCost({
    durationSeconds: 30,
    ttsEngine: 'gemini-tts',
    tier3FallbackSeconds: 0,
    cloudLambdaRender: true,
  });
  assert.equal(geminiTtsCost.totalCostUsd, 0.029);

  const elevenCost = calculateShortUnitCost({
    durationSeconds: 30,
    ttsEngine: 'elevenlabs-turbo',
    tier3FallbackSeconds: 0,
    cloudLambdaRender: true,
  });
  assert.equal(elevenCost.totalCostUsd, 0.05);
});
