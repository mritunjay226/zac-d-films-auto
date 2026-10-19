'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Mic,
  Video,
  Box,
  ArrowRight,
  Volume2,
  Play,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  type StoryboardBeat,
  type CameraMotionType,
  type SceneStageType,
  resolveBeatSceneStage,
  SCENE_STAGE_LABELS,
} from '@/lib/remotion-math';
import { ANATOMICAL_PRESETS, type AssetResolutionRecord } from '@/lib/anatomical-presets';
import { sfxEngine } from '@/lib/web-audio-sfx';

interface AiDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPresetId: string;
  onCommitDirectorPlan: (payload: {
    presetId: string;
    beats: StoryboardBeat[];
    narratorVoice: 'Fenrir' | 'Charon';
    ttsAudioDataUrl: string | null;
    newAssetRecord?: AssetResolutionRecord;
  }) => void;
}

const SAMPLE_PROMPTS = [
  'How a Titanium Dental Screw Fuses into the Jawbone',
  'What Happens When a 9mm Bullet Hits a Kevlar Vest',
  'How a Barbed Honeybee Stinger Pumps Venom into Dermal Capillaries',
  'Why a 160dB Shockwave Ruptures Your Eardrum & Cochlea',
];

export const AiDirectorModal: React.FC<AiDirectorModalProps> = ({
  isOpen,
  onClose,
  initialPresetId,
  onCommitDirectorPlan,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [promptInput, setPromptInput] = useState(
    'How a Titanium Dental Screw Fuses into the Jawbone'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1 State: Script & Camera Choreography
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [proposedBeats, setProposedBeats] = useState<StoryboardBeat[]>([]);
  const [recommendedPresetId, setRecommendedPresetId] = useState<string>(initialPresetId);
  const [recommendedTargetOrgan, setRecommendedTargetOrgan] = useState<string>('Dermis_Layer');
  const [recommendedSketchfabQuery, setRecommendedSketchfabQuery] = useState<string>(
    'dental titanium implant tooth'
  );
  const [scriptSource, setScriptSource] = useState<string>('gemini-3.8-flash');

  // Step 2 State: Gemini TTS Voiceover Synthesis
  const [selectedVoice, setSelectedVoice] = useState<'Fenrir' | 'Charon'>('Fenrir');
  const [isSynthesizingTts, setIsSynthesizingTts] = useState(false);
  const [ttsAudioDataUrl, setTtsAudioDataUrl] = useState<string | null>(null);
  const [ttsWordCount, setTtsWordCount] = useState<number>(0);
  const [ttsEngineLabel, setTtsEngineLabel] = useState<string>('gemini-3.8-flash-lite-tts');

  // Step 3 State: Automatic 3D Asset & Sketchfab Resolution
  const [isResolvingAssets, setIsResolvingAssets] = useState(false);
  const [matchedSketchfabProp, setMatchedSketchfabProp] = useState<{
    uid: string;
    name: string;
    author: string;
    vertexCount: number;
    ephemeralPath: string;
  } | null>(null);

  if (!isOpen) return null;

  const matchedPresetObj =
    ANATOMICAL_PRESETS.find((p) => p.id === recommendedPresetId) || ANATOMICAL_PRESETS[0];

  // Step 1 Action: Generate 4-Beat Script & Zack D. Films Camera Plan via /api/director
  const handleRunStep1Script = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) {
      setErrorMsg('Please enter an anatomical or mechanical topic prompt.');
      return;
    }
    setErrorMsg(null);
    setIsGeneratingScript(true);

    try {
      const res = await fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: promptInput,
          voice: selectedVoice,
          includeAssets: true,
          includeTts: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.beats)) {
        setErrorMsg(data.error || 'Failed to generate 4-beat storyboard.');
      } else {
        setProposedBeats(data.beats);
        if (data.recommendedPresetId) setRecommendedPresetId(data.recommendedPresetId);
        if (data.recommendedTargetOrgan) setRecommendedTargetOrgan(data.recommendedTargetOrgan);
        if (data.recommendedSketchfabQuery) {
          setRecommendedSketchfabQuery(data.recommendedSketchfabQuery);
        }
        if (data.assets?.matchedProp) {
          const mp = data.assets.matchedProp;
          setMatchedSketchfabProp({
            uid: mp.uid,
            name: mp.name,
            author: mp.author,
            vertexCount: mp.vertexCount,
            ephemeralPath: mp.ephemeralTmpPath,
          });
        }
        setScriptSource(data.source || 'gemini-3.8-flash');
      }
    } catch {
      setErrorMsg('Network error contacting /api/director.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Step 2 Action: Synthesize Gemini TTS Voiceover (Fenrir / Charon)
  const handleRunStep2Tts = async (voiceOverride?: 'Fenrir' | 'Charon') => {
    const targetVoice = voiceOverride || selectedVoice;
    setSelectedVoice(targetVoice);
    setIsSynthesizingTts(true);
    setErrorMsg(null);

    const activeBeats =
      proposedBeats.length > 0 ? proposedBeats : matchedPresetObj.beats;
    const fullNarrationScript = activeBeats.map((b) => b.caption).join('. ');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullNarrationScript,
          voice: targetVoice,
          fps: 30,
          totalFrames: 360,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioDataUrl) {
        setTtsAudioDataUrl(data.audioDataUrl);
        setTtsWordCount(data.wordCount || 36);
        setTtsEngineLabel(data.engine || 'gemini-3.8-flash-lite-tts');
        await sfxEngine.loadNarratorWavDataUrl(data.audioDataUrl);
      } else {
        setErrorMsg(data.error || 'Could not synthesize Gemini TTS audio.');
      }
    } catch {
      setErrorMsg('Network error synthesizing Gemini TTS voiceover.');
    } finally {
      setIsSynthesizingTts(false);
    }
  };

  // Step 3 Action: Auto-Resolve Tier 1 Z-Anatomy Rig & Tier 2 Sketchfab Prop
  const handleRunStep3AssetResolve = async () => {
    setStep(3);
    setIsResolvingAssets(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/sketchfab?q=${encodeURIComponent(recommendedSketchfabQuery)}`
      );
      const data = await res.json();
      const firstMatch = data.results?.[0];
      if (firstMatch) {
        setMatchedSketchfabProp({
          uid: firstMatch.uid,
          name: firstMatch.name,
          author: firstMatch.author,
          vertexCount: firstMatch.vertexCount,
          ephemeralPath: firstMatch.ephemeralTmpPath || `/tmp/props/${matchedPresetObj.propModelName}`,
        });
      }
    } catch {
      // Fallback prop metadata
    } finally {
      setIsResolvingAssets(false);
    }
  };

  const handleUpdateProposedBeat = (
    beatId: string,
    patch: Partial<StoryboardBeat>
  ) => {
    setProposedBeats((prev) =>
      prev.map((b) => (b.id === beatId ? { ...b, ...patch } : b))
    );
  };

  const handleFinalCommit = () => {
    const finalBeats =
      proposedBeats.length > 0 ? proposedBeats : matchedPresetObj.beats;

    const newRecord: AssetResolutionRecord | undefined = matchedSketchfabProp
      ? {
          id: `ai-prop-${Date.now()}`,
          meshName: `${matchedSketchfabProp.name.replace(/\s+/g, '_')}.glb`,
          tier: 'Tier 2',
          sourceLabel: `Sketchfab v3 (@${matchedSketchfabProp.author})`,
          filePath: matchedSketchfabProp.ephemeralPath,
          sizeLabel: '2.9 MB',
          costLabel: '$0.00',
          lifecycleStatus: 'Auto-Purged post-MP4',
          license: 'CC-BY-4.0',
        }
      : undefined;

    onCommitDirectorPlan({
      presetId: recommendedPresetId,
      beats: finalBeats,
      narratorVoice: selectedVoice,
      ttsAudioDataUrl,
      newAssetRecord: newRecord,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-director-modal-title"
      className="fixed inset-0 z-50 bg-zinc-950/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-sky-400 to-blue-600 shadow-sm shadow-blue-500/20 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="ai-director-modal-title"
                className="text-sm font-bold text-zinc-950 tracking-tight"
              >
                Autonomous AI Director — Step-by-Step Pipeline
              </h2>
              <p className="text-[11px] text-zinc-600">
                Gemini 3.8 Script &amp; Camera Choreography · Gemini TTS ({selectedVoice}) · Automatic 3D Rig &amp; Prop Sync
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close AI Director modal"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Stage Stepper Header */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              num: 1,
              title: '1. Script & Camera Plan',
              sub: 'Gemini 4-Beat + Zack Moves',
            },
            {
              num: 2,
              title: '2. Gemini TTS Voiceover',
              sub: 'Fenrir / Charon 24kHz WAV',
            },
            {
              num: 3,
              title: '3. Auto-Import 3D & Sync',
              sub: 'Z-Anatomy + Sketchfab /tmp',
            },
          ].map((item) => {
            const isActive = step === item.num;
            const isCompleted = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num === 1) setStep(1);
                  if (item.num === 2 && proposedBeats.length > 0) setStep(2);
                  if (item.num === 3 && proposedBeats.length > 0) handleRunStep3AssetResolve();
                }}
                className={`rounded-xl border p-2.5 text-left transition-colors flex items-center gap-2.5 ${
                  isActive
                    ? 'border-zinc-950 bg-zinc-50'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-zinc-200/80 bg-white'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.num}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950 truncate">{item.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate font-mono">{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: AI SCRIPT & ZACK D. FILMS CAMERA CHOREOGRAPHY REVIEW */}
        {step === 1 && (
          <div className="space-y-4">
            <form onSubmit={handleRunStep1Script} className="space-y-3">
              <div>
                <label
                  htmlFor="ai-director-prompt-input"
                  className="block text-xs font-semibold text-zinc-800 mb-1"
                >
                  Enter a Zack D. Films 3D explainer topic:
                </label>
                <div className="flex gap-2">
                  <input
                    id="ai-director-prompt-input"
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g., How a titanium dental screw fuses into the jawbone..."
                    className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                  />
                  <button
                    type="submit"
                    disabled={isGeneratingScript}
                    className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isGeneratingScript ? 'Directing...' : 'Generate Script & Camera Plan'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setPromptInput(sp)}
                    className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded-lg px-2.5 py-1 text-[11px] text-zinc-700 transition-colors"
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </form>

            {proposedBeats.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-zinc-200/80">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-zinc-950">
                    Proposed 4-Beat Script &amp; Camera Choreography ({scriptSource})
                  </span>
                  <span className="font-mono text-[11px] text-zinc-600">
                    Matched Rig: <strong>{matchedPresetObj.name}</strong> · Target:{' '}
                    <code>{recommendedTargetOrgan}</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {proposedBeats.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-950">
                          Beat {b.beatNumber}: {b.title}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                          {b.startFrame}–{b.startFrame + b.durationInFrames}f
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-zinc-700" />
                          3D Scene:
                        </span>
                        <select
                          aria-label={`Beat ${b.beatNumber} 3D scene stage`}
                          value={resolveBeatSceneStage(b)}
                          onChange={(e) =>
                            handleUpdateProposedBeat(b.id, {
                              sceneStage: e.target.value as SceneStageType,
                            })
                          }
                          className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900"
                        >
                          {(Object.keys(SCENE_STAGE_LABELS) as SceneStageType[]).map((stKey) => (
                            <option key={stKey} value={stKey}>
                              {SCENE_STAGE_LABELS[stKey]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={b.caption}
                        aria-label={`Beat ${b.beatNumber} narration script`}
                        onChange={(e) =>
                          handleUpdateProposedBeat(b.id, {
                            caption: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-zinc-900"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                          <Video className="w-3 h-3 text-zinc-800" />
                          <select
                            aria-label={`Beat ${b.beatNumber} camera choreography`}
                            value={b.cameraMotion || 'whip-zoom'}
                            onChange={(e) =>
                              handleUpdateProposedBeat(b.id, {
                                cameraMotion: e.target.value as CameraMotionType,
                              })
                            }
                            className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-900"
                          >
                            <option value="whip-zoom">whip-zoom (Macro Target)</option>
                            <option value="slice-orbit">slice-orbit (Cutaway Sweep)</option>
                            <option value="impact-shake">impact-shake (Trauma + FOV Kick)</option>
                          </select>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">
                          SFX: {b.sfxCue}.mp3
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2);
                      if (!ttsAudioDataUrl) {
                        handleRunStep2Tts(selectedVoice);
                      }
                    }}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Approve Script &amp; Generate Gemini TTS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: GEMINI TTS DOCUMENTARY VOICEOVER SYNTHESIS & AUDITION */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-zinc-950">
                    Gemini Text-to-Speech Documentary Narrator (gemini-3.8-flash-lite-tts)
                  </h3>
                  <p className="text-[11px] text-zinc-600">
                    Select deep authoritative voice persona with fast punchy Zack D. Films pacing
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(['Fenrir', 'Charon'] as const).map((voiceName) => (
                    <button
                      key={voiceName}
                      type="button"
                      disabled={isSynthesizingTts}
                      onClick={() => handleRunStep2Tts(voiceName)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        selectedVoice === voiceName
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{voiceName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white border border-zinc-200 p-3 text-xs font-semibold text-zinc-800 leading-relaxed">
                &ldquo;
                {(proposedBeats.length > 0 ? proposedBeats : matchedPresetObj.beats)
                  .map((b) => b.caption)
                  .join(' · ')}
                &rdquo;
              </div>

              {isSynthesizingTts ? (
                <div className="py-4 text-center text-xs font-mono text-zinc-600 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>
                    Synthesizing 24kHz mono WAV via gemini-3.8-flash-lite-tts ({selectedVoice})...
                  </span>
                </div>
              ) : (
                ttsAudioDataUrl && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600">
                      <span className="flex items-center gap-1.5 text-zinc-950 font-semibold">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {ttsEngineLabel} · Voice: {selectedVoice}
                        </span>
                      </span>
                      <span>
                        {ttsWordCount} words aligned · 24,000 Hz PCM WAV · $0.012
                      </span>
                    </div>

                    <audio
                      controls
                      src={ttsAudioDataUrl}
                      className="w-full h-9"
                    />
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
              >
                ← Back to Script &amp; Camera Plan
              </button>

              <button
                type="button"
                disabled={isSynthesizingTts}
                onClick={handleRunStep3AssetResolve}
                className="bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Approve Voice &amp; Auto-Import 3D Assets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: AUTOMATIC 3D RIG & SKETCHFAB PROP IMPORT + TIMELINE SYNC */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tier-1 Z-Anatomy Cutaway Rig</span>
                  </span>
                  <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    Auto-Matched
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900">{matchedPresetObj.name}</p>
                <p className="text-[11px] text-zinc-600">{matchedPresetObj.description}</p>
                <p className="font-mono text-[11px] text-zinc-500">
                  THREE.Box3 Focus: <code>{recommendedTargetOrgan}</code> · Axis{' '}
                  {matchedPresetObj.defaultSliceAxis.toUpperCase()}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" />
                    <span>Tier-2 Ephemeral Sketchfab Prop</span>
                  </span>
                  <span className="font-mono text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                    {isResolvingAssets ? 'Querying v3...' : 'Mounted /tmp'}
                  </span>
                </div>
                {matchedSketchfabProp ? (
                  <>
                    <p className="text-xs font-bold text-zinc-900">
                      {matchedSketchfabProp.name}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-600">
                      Path: {matchedSketchfabProp.ephemeralPath}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500">
                      {matchedSketchfabProp.vertexCount.toLocaleString()} verts · CC-BY · $0.00
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-zinc-600 font-mono">
                    Prop: /tmp/props/{matchedPresetObj.propModelName}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-zinc-900">
                  Ready to lock 4-beat Zack D. Films camera rig + {selectedVoice} Gemini TTS WAV to 9:16 timeline
                </span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">
                360 frames @ 30 FPS
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
              >
                ← Back to Gemini TTS
              </button>

              <button
                type="button"
                onClick={handleFinalCommit}
                className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl px-5 py-2.5 text-xs font-semibold flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Commit to 9:16 Stage &amp; Play Short</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
