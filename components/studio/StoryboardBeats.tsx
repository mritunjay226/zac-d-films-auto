'use client';

import React, { useState } from 'react';
import { Volume2, SlidersHorizontal, Play, Video, Mic, Layers } from 'lucide-react';
import {
  type StoryboardBeat,
  type CameraMotionType,
  type SceneStageType,
  type ParticleModeType,
  resolveBeatSceneStage,
  resolveBeatParticleMode,
  SCENE_STAGE_LABELS,
} from '@/lib/remotion-math';
import { sfxEngine, type SfxCueType } from '@/lib/web-audio-sfx';

interface StoryboardBeatsProps {
  beats: StoryboardBeat[];
  currentFrame: number;
  onJumpToFrame: (frame: number) => void;
  onUpdateBeat: (beatId: string, updated: Partial<StoryboardBeat>) => void;
  activeNarratorVoice: 'Fenrir' | 'Charon';
  onSynthesizeQuickTts: (voice: 'Fenrir' | 'Charon') => void;
  isSynthesizingQuickTts: boolean;
}

const SFX_OPTIONS: SfxCueType[] = ['whoosh', 'squelch', 'impact', 'heartbeat', 'zap'];

const CAMERA_MOTION_OPTIONS: { value: CameraMotionType; label: string }[] = [
  { value: 'whip-zoom', label: 'Macro Whip-Pan Zoom (targetOrgan)' },
  { value: 'slice-orbit', label: 'Dynamic Orbit Sweep (Cross-Section Sync)' },
  { value: 'impact-shake', label: 'Impact Trauma Shake + FOV Kick' },
];

const SCENE_STAGE_OPTIONS: { value: SceneStageType; label: string }[] = [
  { value: 'exterior-macro', label: 'Scene 1: Exterior Macro & Prop Impact' },
  { value: 'tissue-cutaway', label: 'Scene 2: Deep Tissue Cross-Section Cutaway' },
  { value: 'cellular-micro', label: 'Scene 3: Microscopic Cellular & RBC Stream' },
  { value: 'neural-cortex', label: 'Scene 4: Neural Pathway & Brain Cortex' },
];

const PARTICLE_MODE_OPTIONS: { value: ParticleModeType; label: string }[] = [
  { value: 'toxin-droplets', label: 'Bio-Fluid / Toxin / Pellet Droplets (32x)' },
  { value: 'rbc-stream', label: 'Biconcave Red Blood Cells Stream (36x)' },
  { value: 'neural-sparks', label: 'Action-Potential Neural Sparks (28x)' },
];

export const StoryboardBeats: React.FC<StoryboardBeatsProps> = ({
  beats,
  currentFrame,
  onJumpToFrame,
  onUpdateBeat,
  activeNarratorVoice,
  onSynthesizeQuickTts,
  isSynthesizingQuickTts,
}) => {
  const [selectedBeatId, setSelectedBeatId] = useState<string>(beats[0]?.id || '');

  const activeEditingBeat =
    beats.find((b) => b.id === selectedBeatId) || beats[0];

  const getBeatCameraMotion = (beat: StoryboardBeat): CameraMotionType =>
    beat.cameraMotion ||
    (beat.beatNumber === 1
      ? 'whip-zoom'
      : beat.beatNumber === 2
        ? 'slice-orbit'
        : beat.beatNumber === 3
          ? 'impact-shake'
          : 'whip-zoom');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-950 tracking-tight">
            4-Scene Multi-Stage &lt;Sequence&gt; &amp; Camera Choreography
          </h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            Each 90-frame beat renders a distinct 3D scene stage (Exterior → Tissue → Cellular → Brain) with whip-pan cuts
          </p>
        </div>

        {/* Quick Gemini TTS Documentary Voice Bar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isSynthesizingQuickTts}
            onClick={() => onSynthesizeQuickTts('Fenrir')}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              activeNarratorVoice === 'Fenrir'
                ? 'bg-zinc-950 text-white border-zinc-950'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>
              {isSynthesizingQuickTts && activeNarratorVoice === 'Fenrir'
                ? 'Synthesizing...'
                : 'Gemini TTS: Fenrir'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSynthesizingQuickTts}
            onClick={() => onSynthesizeQuickTts('Charon')}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              activeNarratorVoice === 'Charon'
                ? 'bg-zinc-950 text-white border-zinc-950'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>
              {isSynthesizingQuickTts && activeNarratorVoice === 'Charon'
                ? 'Synthesizing...'
                : 'Charon'}
            </span>
          </button>
        </div>
      </div>

      {/* 4 Beat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {beats.map((beat) => {
          const isPlayheadInside =
            currentFrame >= beat.startFrame &&
            currentFrame < beat.startFrame + beat.durationInFrames;
          const isSelected = activeEditingBeat?.id === beat.id;
          const camMove = getBeatCameraMotion(beat);
          const sceneStage = resolveBeatSceneStage(beat);

          return (
            <div
              key={beat.id}
              onClick={() => {
                setSelectedBeatId(beat.id);
                onJumpToFrame(beat.startFrame + 12);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedBeatId(beat.id);
                  onJumpToFrame(beat.startFrame + 12);
                }
              }}
              className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'border-zinc-950 bg-zinc-50/90'
                  : isPlayheadInside
                    ? 'border-zinc-400 bg-white'
                    : 'border-zinc-200/80 bg-white hover:bg-zinc-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-zinc-950 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {beat.beatNumber}
                  </span>
                  <span className="text-xs font-bold text-zinc-950 truncate">
                    {beat.title}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums shrink-0">
                  {beat.startFrame}–{beat.startFrame + beat.durationInFrames}f
                </span>
              </div>

              {/* Distinct 3D Scene Stage Pill */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 border border-zinc-200/80 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                  <Layers className="w-2.5 h-2.5 text-zinc-700" />
                  <span>{SCENE_STAGE_LABELS[sceneStage]}</span>
                </span>
              </div>

              <p className="mt-2 text-xs font-semibold text-zinc-800 line-clamp-2 leading-snug">
                &ldquo;{beat.caption}&rdquo;
              </p>

              <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 font-mono tabular-nums">
                <span className="flex items-center gap-1 truncate">
                  <Video className="w-3 h-3 text-zinc-700 shrink-0" />
                  <span>{camMove}</span>
                  <span>·</span>
                  <span>Z:{beat.cameraTargetZ}m</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sfxEngine.triggerSfx(beat.sfxCue);
                  }}
                  aria-label={`Audition ${beat.sfxCue} sound effect`}
                  className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-950 font-sans font-medium shrink-0"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>{beat.sfxCue}.mp3</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Beat Keyframe, 3D Scene Stage & Camera Choreography Editor */}
      {activeEditingBeat && (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-700" />
              <h4 className="text-xs font-bold text-zinc-950">
                Beat {activeEditingBeat.beatNumber} Scene Stage &amp; Camera Inspector — {activeEditingBeat.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                onJumpToFrame(activeEditingBeat.startFrame + 10);
                sfxEngine.triggerSfx(activeEditingBeat.sfxCue);
              }}
              className="bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-zinc-800 flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>Preview Scene {activeEditingBeat.beatNumber}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Word-by-Word Pop Caption Input */}
            <div className="md:col-span-2">
              <label
                htmlFor="beat-caption-input"
                className="block text-[11px] font-semibold text-zinc-600 mb-1"
              >
                Word-by-Word Pop Caption &amp; Gemini TTS Narration Script
              </label>
              <input
                id="beat-caption-input"
                type="text"
                value={activeEditingBeat.caption}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    caption: e.target.value.toUpperCase(),
                  })
                }
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-950 focus:outline-none focus:border-zinc-950"
              />
            </div>

            {/* Distinct 3D Scene Stage Selector */}
            <div>
              <label
                htmlFor="beat-scene-stage-select"
                className="block text-[11px] font-semibold text-zinc-600 mb-1"
              >
                Active 3D Scene Stage (Multi-Scene Rig)
              </label>
              <select
                id="beat-scene-stage-select"
                value={resolveBeatSceneStage(activeEditingBeat)}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    sceneStage: e.target.value as SceneStageType,
                  })
                }
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none focus:border-zinc-950"
              >
                {SCENE_STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3D Particle System Selector */}
            <div>
              <label
                htmlFor="beat-particle-mode-select"
                className="block text-[11px] font-semibold text-zinc-600 mb-1"
              >
                Instanced 3D Particle System
              </label>
              <select
                id="beat-particle-mode-select"
                value={resolveBeatParticleMode(activeEditingBeat)}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    particleMode: e.target.value as ParticleModeType,
                  })
                }
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none focus:border-zinc-950"
              >
                {PARTICLE_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zack D. Films Camera Choreography Selector */}
            <div>
              <label
                htmlFor="beat-camera-motion-select"
                className="block text-[11px] font-semibold text-zinc-600 mb-1"
              >
                Zack D. Films Camera Choreography Mode
              </label>
              <select
                id="beat-camera-motion-select"
                value={getBeatCameraMotion(activeEditingBeat)}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    cameraMotion: e.target.value as CameraMotionType,
                  })
                }
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none focus:border-zinc-950"
              >
                {CAMERA_MOTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SFX Cue Selector */}
            <div>
              <label
                htmlFor="beat-sfx-select"
                className="block text-[11px] font-semibold text-zinc-600 mb-1"
              >
                Frame-Locked SFX Cue (/public/sfx/)
              </label>
              <select
                id="beat-sfx-select"
                value={activeEditingBeat.sfxCue}
                onChange={(e) => {
                  const nextCue = e.target.value as SfxCueType;
                  onUpdateBeat(activeEditingBeat.id, { sfxCue: nextCue });
                  sfxEngine.triggerSfx(nextCue);
                }}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 font-medium focus:outline-none focus:border-zinc-950"
              >
                {SFX_OPTIONS.map((cue) => (
                  <option key={cue} value={cue}>
                    {cue}.mp3 (Synthesized + Whip Whoosh)
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Zoom Target Z */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label htmlFor="beat-camz-slider" className="font-semibold text-zinc-600">
                  Camera Target Zoom Z
                </label>
                <span className="font-mono text-zinc-950 font-semibold tabular-nums">
                  {activeEditingBeat.cameraTargetZ.toFixed(2)}m
                </span>
              </div>
              <input
                id="beat-camz-slider"
                type="range"
                min={2.5}
                max={6.0}
                step={0.05}
                value={activeEditingBeat.cameraTargetZ}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    cameraTargetZ: Number(e.target.value),
                  })
                }
                className="w-full accent-zinc-950 cursor-pointer"
              />
            </div>

            {/* Beat Cross-Section Slice Target Offset */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label htmlFor="beat-slice-slider" className="font-semibold text-zinc-600">
                  Beat Target Slice Offset
                </label>
                <span className="font-mono text-zinc-950 font-semibold tabular-nums">
                  {activeEditingBeat.sliceOffset.toFixed(2)}
                </span>
              </div>
              <input
                id="beat-slice-slider"
                type="range"
                min={-0.8}
                max={1.6}
                step={0.02}
                value={activeEditingBeat.sliceOffset}
                onChange={(e) =>
                  onUpdateBeat(activeEditingBeat.id, {
                    sliceOffset: Number(e.target.value),
                  })
                }
                className="w-full accent-zinc-950 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
