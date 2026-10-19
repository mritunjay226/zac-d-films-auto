'use client';

import React from 'react';
import { Scissors, Eye, Activity, Volume2 } from 'lucide-react';
import { sfxEngine, type SfxCueType } from '@/lib/web-audio-sfx';

interface CutawayControlsProps {
  sliceAxis: 'x' | 'y' | 'z';
  onChangeSliceAxis: (axis: 'x' | 'y' | 'z') => void;
  manualSliceOffset: number | null;
  onChangeManualSliceOffset: (offset: number | null) => void;
  skinOpacity: number;
  onChangeSkinOpacity: (opacity: number) => void;
  pulseFrequency: number;
  onChangePulseFrequency: (freq: number) => void;
  pulseAmplitude: number;
  onChangePulseAmplitude: (amp: number) => void;
}

const SFX_CUES: { id: SfxCueType; label: string }[] = [
  { id: 'whoosh', label: 'Whoosh' },
  { id: 'squelch', label: 'Squelch' },
  { id: 'impact', label: 'Impact' },
  { id: 'heartbeat', label: 'Heartbeat' },
  { id: 'zap', label: 'Synapse Zap' },
];

export const CutawayControls: React.FC<CutawayControlsProps> = ({
  sliceAxis,
  onChangeSliceAxis,
  manualSliceOffset,
  onChangeManualSliceOffset,
  skinOpacity,
  onChangeSkinOpacity,
  pulseFrequency,
  onChangePulseFrequency,
  pulseAmplitude,
  onChangePulseAmplitude,
}) => {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-zinc-950" />
          <h3 className="text-xs font-bold text-zinc-950">
            Cross-Section Slicer &amp; Shader Controls
          </h3>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
          gl.localClippingEnabled = true
        </span>
      </div>

      {/* Axis Selector + Manual / Beat-Driven Slice Plane Slider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-[11px] font-semibold text-zinc-600 mb-1.5">
            Clipping Plane Axis (&lt;CrossSectionSlice /&gt;)
          </span>
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => onChangeSliceAxis(axis)}
                className={`flex-1 py-1 rounded-md text-xs font-mono font-semibold uppercase transition-colors ${
                  sliceAxis === axis
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Axis {axis.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <label htmlFor="manual-slice-range" className="font-semibold text-zinc-600">
              Slice Plane Constant
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                {manualSliceOffset !== null ? manualSliceOffset.toFixed(2) : 'Auto (Beat)'}
              </span>
              {manualSliceOffset !== null && (
                <button
                  type="button"
                  onClick={() => onChangeManualSliceOffset(null)}
                  className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-950 underline"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
          <input
            id="manual-slice-range"
            type="range"
            min={-1.0}
            max={1.6}
            step={0.02}
            value={manualSliceOffset ?? 0.25}
            onChange={(e) => onChangeManualSliceOffset(Number(e.target.value))}
            className="w-full accent-zinc-950 cursor-pointer"
          />
        </div>
      </div>

      {/* X-Ray Skin Opacity + OrganPulse Frequency & Amplitude */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <label htmlFor="skin-opacity-range" className="font-semibold text-zinc-600 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>X-Ray Outer Opacity</span>
            </label>
            <span className="font-mono font-semibold text-zinc-950 tabular-nums">
              {Math.round(skinOpacity * 100)}%
            </span>
          </div>
          <input
            id="skin-opacity-range"
            type="range"
            min={0.1}
            max={1.0}
            step={0.02}
            value={skinOpacity}
            onChange={(e) => onChangeSkinOpacity(Number(e.target.value))}
            className="w-full accent-zinc-950 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <label htmlFor="pulse-freq-range" className="font-semibold text-zinc-600 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>OrganPulse Freq</span>
            </label>
            <span className="font-mono font-semibold text-zinc-950 tabular-nums">
              {pulseFrequency.toFixed(2)} rad/f
            </span>
          </div>
          <input
            id="pulse-freq-range"
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={pulseFrequency}
            onChange={(e) => onChangePulseFrequency(Number(e.target.value))}
            className="w-full accent-zinc-950 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <label htmlFor="pulse-amp-range" className="font-semibold text-zinc-600">
              Pulse Amplitude
            </label>
            <span className="font-mono font-semibold text-zinc-950 tabular-nums">
              ±{Math.round(pulseAmplitude * 100)}%
            </span>
          </div>
          <input
            id="pulse-amp-range"
            type="range"
            min={0.0}
            max={0.22}
            step={0.01}
            value={pulseAmplitude}
            onChange={(e) => onChangePulseAmplitude(Number(e.target.value))}
            className="w-full accent-zinc-950 cursor-pointer"
          />
        </div>
      </div>

      {/* Synthesized Web Audio SFX Audition Pads */}
      <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
          <span>Trigger Frame-Accurate SFX Cues:</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {SFX_CUES.map((cue) => (
            <button
              key={cue.id}
              type="button"
              onClick={() => sfxEngine.triggerSfx(cue.id)}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors whitespace-nowrap"
            >
              {cue.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
