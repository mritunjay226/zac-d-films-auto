'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  Clapperboard,
  Upload,
  Plus,
  ArrowRight,
  Layers,
  Database,
  Cpu,
  Volume2,
  Play,
} from 'lucide-react';
import { ElevenSidebar, type ActiveTabId } from '@/components/layout/ElevenSidebar';
import { TopUtilityHeader } from '@/components/layout/TopUtilityHeader';
import { Viewport9x16, type SubMeshTelemetryItem } from '@/components/studio/Viewport9x16';
import { StoryboardBeats } from '@/components/studio/StoryboardBeats';
import { CutawayControls } from '@/components/studio/CutawayControls';
import { SceneHierarchy } from '@/components/studio/SceneHierarchy';
import { GlbStockBrowser } from '@/components/studio/GlbStockBrowser';
import { AiDirectorModal } from '@/components/studio/AiDirectorModal';
import { RemotionCodeView } from '@/components/code/RemotionCodeView';
import { CostPayoutStyleView } from '@/components/analytics/CostPayoutStyleView';
import {
  ANATOMICAL_PRESETS,
  INITIAL_ASSET_RESOLUTION_RECORDS,
  type AssetResolutionRecord,
} from '@/lib/anatomical-presets';
import { type StoryboardBeat } from '@/lib/remotion-math';
import { generateSceneCompositionTsx } from '@/lib/code-generator';
import { sfxEngine } from '@/lib/web-audio-sfx';

export default function IIZackStudioPage() {
  const [activeTab, setActiveTab] = useState<ActiveTabId>('studio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    const syncViewportSidebar = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    syncViewportSidebar();
    window.addEventListener('resize', syncViewportSidebar);
    return () => window.removeEventListener('resize', syncViewportSidebar);
  }, []);

  // Active Anatomical Preset & 4-Beat Storyboard State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ANATOMICAL_PRESETS[0].id);
  const activePreset =
    ANATOMICAL_PRESETS.find((p) => p.id === selectedPresetId) || ANATOMICAL_PRESETS[0];

  const [beatsByPreset, setBeatsByPreset] = useState<Record<string, StoryboardBeat[]>>(() => {
    const map: Record<string, StoryboardBeat[]> = {};
    for (const p of ANATOMICAL_PRESETS) {
      map[p.id] = p.beats;
    }
    return map;
  });

  const currentBeats = beatsByPreset[activePreset.id] || activePreset.beats;

  // Deterministic Playback & Cutaway Controls State
  const [currentFrame, setCurrentFrame] = useState<number>(24);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [sliceAxis, setSliceAxis] = useState<'x' | 'y' | 'z'>(activePreset.defaultSliceAxis);
  const [manualSliceOffset, setManualSliceOffset] = useState<number | null>(null);
  const [skinOpacity, setSkinOpacity] = useState<number>(0.88);
  const [pulseFrequency, setPulseFrequency] = useState<number>(0.22);
  const [pulseAmplitude, setPulseAmplitude] = useState<number>(0.08);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

  // Gemini TTS Documentary Narrator State (Fenrir / Charon)
  const [activeNarratorVoice, setActiveNarratorVoice] = useState<'Fenrir' | 'Charon'>('Fenrir');
  const [isSynthesizingQuickTts, setIsSynthesizingQuickTts] = useState<boolean>(false);
  const [activeTtsAudioUrl, setActiveTtsAudioUrl] = useState<string | null>(null);

  // Live Sub-Mesh THREE.Box3 Telemetry & External Binary .GLB State
  const [detectedSubMeshes, setDetectedSubMeshes] = useState<SubMeshTelemetryItem[]>(() =>
    activePreset.subMeshes.map((sm) => ({
      name: sm.name,
      visible: sm.defaultVisible,
      vertices: sm.vertices,
      boxCenter: sm.center,
    }))
  );
  const [targetOrganCenter, setTargetOrganCenter] = useState<[number, number, number]>(
    activePreset.subMeshes[0]?.center || [0, 0, 0]
  );
  const [externalGlbUrl, setExternalGlbUrl] = useState<string | null>(null);
  const [externalGlbName, setExternalGlbName] = useState<string | null>(null);

  // Asset Resolution Records State
  const [assetRecords, setAssetRecords] = useState<AssetResolutionRecord[]>(
    INITIAL_ASSET_RESOLUTION_RECORDS
  );

  // Step-by-Step AI Director Modal State
  const [showPromptModal, setShowPromptModal] = useState(false);

  const slicerSectionRef = useRef<HTMLDivElement | null>(null);
  const glbSectionRef = useRef<HTMLDivElement | null>(null);

  const handleSelectPreset = (presetId: string) => {
    const found = ANATOMICAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSelectedPresetId(found.id);
    setSliceAxis(found.defaultSliceAxis);
    setManualSliceOffset(null);
    setExternalGlbUrl(null);
    setExternalGlbName(null);
    setVisibilityMap({});
    setCurrentFrame(18);
  };

  const handleUpdateBeat = (beatId: string, updated: Partial<StoryboardBeat>) => {
    setBeatsByPreset((prev) => {
      const list = prev[activePreset.id] || activePreset.beats;
      return {
        ...prev,
        [activePreset.id]: list.map((b) => (b.id === beatId ? { ...b, ...updated } : b)),
      };
    });
  };

  const handleToggleSubMesh = (name: string) => {
    setVisibilityMap((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, name) ? prev[name] : true;
      return { ...prev, [name]: !current };
    });
  };

  const handleShowAllSubMeshes = () => {
    setVisibilityMap({});
  };

  const handleLoadExternalGlb = useCallback(
    (url: string, name: string, newRecord?: AssetResolutionRecord) => {
      setExternalGlbUrl(url);
      setExternalGlbName(name);
      setActiveTab('studio');
      if (newRecord) {
        setAssetRecords((prev) => [newRecord, ...prev]);
      }
    },
    []
  );

  const handleClearExternalGlb = useCallback(() => {
    setExternalGlbUrl(null);
    setExternalGlbName(null);
  }, []);

  const handleExportTsx = useCallback(() => {
    const code = generateSceneCompositionTsx(
      activePreset,
      currentBeats,
      sliceAxis,
      skinOpacity
    );
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePreset.id}-SceneComposition.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activePreset, currentBeats, sliceAxis, skinOpacity]);

  // Quick 1-click Gemini TTS synthesis from the Storyboard header
  const handleSynthesizeQuickTts = async (voice: 'Fenrir' | 'Charon') => {
    setActiveNarratorVoice(voice);
    setIsSynthesizingQuickTts(true);
    try {
      const fullScript = currentBeats.map((b) => b.caption).join('. ');
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullScript,
          voice,
          fps: 30,
          totalFrames: 360,
        }),
      });
      const data = await res.json();
      if (res.ok && data.audioDataUrl) {
        setActiveTtsAudioUrl(data.audioDataUrl);
        await sfxEngine.loadNarratorWavDataUrl(data.audioDataUrl);
        sfxEngine.playNarratorFromOffset(0);
      }
    } catch {
      // Ignore error
    } finally {
      setIsSynthesizingQuickTts(false);
    }
  };

  // Commit Step-3 AI Director Pipeline Output to the 9:16 Stage
  const handleCommitDirectorPlan = async (payload: {
    presetId: string;
    beats: StoryboardBeat[];
    narratorVoice: 'Fenrir' | 'Charon';
    ttsAudioDataUrl: string | null;
    newAssetRecord?: AssetResolutionRecord;
  }) => {
    const foundPreset =
      ANATOMICAL_PRESETS.find((p) => p.id === payload.presetId) || ANATOMICAL_PRESETS[0];

    setSelectedPresetId(foundPreset.id);
    setSliceAxis(foundPreset.defaultSliceAxis);
    setManualSliceOffset(null);
    setExternalGlbUrl(null);
    setExternalGlbName(null);
    setVisibilityMap({});

    setBeatsByPreset((prev) => ({
      ...prev,
      [foundPreset.id]: payload.beats,
    }));

    setActiveNarratorVoice(payload.narratorVoice);
    if (payload.ttsAudioDataUrl) {
      setActiveTtsAudioUrl(payload.ttsAudioDataUrl);
      await sfxEngine.loadNarratorWavDataUrl(payload.ttsAudioDataUrl);
    }

    if (payload.newAssetRecord) {
      setAssetRecords((prev) => [payload.newAssetRecord!, ...prev]);
    }

    setActiveTab('studio');
    setCurrentFrame(0);
    setIsPlaying(true);
    sfxEngine.triggerSfx('whoosh');
    if (payload.ttsAudioDataUrl) {
      sfxEngine.playNarratorFromOffset(0);
    }
  };

  const handlePurgeEphemeralProps = () => {
    setAssetRecords((prev) =>
      prev.map((r) =>
        r.tier === 'Tier 2'
          ? { ...r, sizeLabel: '0 MB (Purged)', lifecycleStatus: 'Auto-Purged post-MP4' }
          : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex">
      {/* Left Sidebar (w-60 shrink-0) */}
      <ElevenSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPromptModal={() => setShowPromptModal(true)}
        onOpenGlbModal={() => {
          setActiveTab('studio');
          setTimeout(() => {
            glbSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }}
        onFocusSlicer={() => {
          setActiveTab('studio');
          setTimeout(() => {
            slicerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <TopUtilityHeader
          activeTab={activeTab}
          activePresetName={activePreset.name}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
          onSelectTab={setActiveTab}
          onOpenPromptModal={() => setShowPromptModal(true)}
        />

        {/* Main Content Container */}
        <main className="max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Page Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                3D Cutaway Studio
              </h1>
              <p className="text-xs text-zinc-600 mt-0.5">
                Deterministic @remotion/three anatomical cross-sections · Gemini TTS ({activeNarratorVoice}) · $0.01–$0.05 per short
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create new 3D short</span>
            </button>
          </div>

          {/* 2-Column Horizontal Action Banner Cards with Jewel Micro-Gradient Squircle Icon Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action Banner Card 1: Create 3D cutaway short */}
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100/70 p-4 text-left flex items-center justify-between gap-4 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-sky-400 to-blue-600 shadow-sm shadow-blue-500/20 flex items-center justify-center text-white shrink-0">
                  <Clapperboard className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950">
                    Create 3D cutaway short (Autonomous AI Director)
                  </p>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">
                    3-step approval: Gemini 4-beat script &amp; camera choreography → Gemini TTS ({activeNarratorVoice}) → Auto 3D sync
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 shrink-0 transition-colors" />
            </button>

            {/* Action Banner Card 2: Import Z-Anatomy / Sketchfab .GLB */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('studio');
                setTimeout(() => {
                  glbSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 80);
              }}
              className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100/70 p-4 text-left flex items-center justify-between gap-4 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400 shadow-sm shadow-pink-500/20 flex items-center justify-center text-white shrink-0">
                  <Upload className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-950">
                    Import Z-Anatomy / Sketchfab .GLB
                  </p>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">
                    Stream binary Khronos .glb rigs, query Sketchfab Data API v3, or auto-slice local meshes
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 shrink-0 transition-colors" />
            </button>
          </div>

          {/* 4-Tab Horizontal Underline Navigation Bar */}
          <div
            role="tablist"
            aria-label="Workspace sections"
            className="border-b border-zinc-200 flex items-center gap-6 overflow-x-auto"
          >
            {(
              [
                { id: 'studio', label: 'Studio Workspace' },
                { id: 'pipeline', label: '3-Tier Asset Pipeline' },
                { id: 'code', label: 'Remotion .TSX Code' },
                { id: 'analytics', label: 'Unit Cost & Analytics' },
              ] as { id: ActiveTabId; label: string }[]
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2.5 text-xs transition-colors whitespace-nowrap shrink-0 -mb-px ${
                    isActive
                      ? 'border-b-2 border-zinc-950 text-zinc-950 font-semibold'
                      : 'text-zinc-600 hover:text-zinc-950 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: STUDIO WORKSPACE */}
          {activeTab === 'studio' && (
            <div className="space-y-6">
              {/* 6 Built-In Multi-Layer Sculpted 3D Anatomical Presets Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-950">
                    6 Built-in Multi-Layer 3D Anatomical Cutaway Rigs
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    Active Target: {activePreset.targetMeshName} · Est. ${activePreset.estimatedCostUsd.toFixed(2)}/short
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ANATOMICAL_PRESETS.map((presetItem) => {
                    const isSelected = presetItem.id === activePreset.id && !externalGlbUrl;
                    return (
                      <button
                        key={presetItem.id}
                        type="button"
                        onClick={() => handleSelectPreset(presetItem.id)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-50/90'
                            : 'border-zinc-200/80 bg-white hover:bg-zinc-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-zinc-950 truncate">
                            {presetItem.name}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500 uppercase shrink-0">
                            Axis {presetItem.defaultSliceAxis.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-1 line-clamp-1">
                          {presetItem.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Gemini TTS Documentary Voiceover Audition Bar (when synthesized) */}
              {activeTtsAudioUrl && (
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-zinc-950">
                      Gemini TTS Documentary Track Active ({activeNarratorVoice} · 24kHz WAV)
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      Synced to 30 FPS timeline &amp; .WebM exporter
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio controls src={activeTtsAudioUrl} className="h-8 w-56" />
                    <button
                      type="button"
                      onClick={() => sfxEngine.playNarratorFromOffset(0)}
                      className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Replay Voice</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Studio Main Split: Left 9:16 Contrast-Framed Dark Stage + Right Storyboard & Slicer Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: 9:16 3D Cutaway Viewport */}
                <div className="lg:col-span-4 flex flex-col items-center">
                  <Viewport9x16
                    preset={activePreset}
                    beats={currentBeats}
                    currentFrame={currentFrame}
                    isPlaying={isPlaying}
                    onFrameChange={setCurrentFrame}
                    onTogglePlay={() => setIsPlaying((p) => !p)}
                    sliceAxis={sliceAxis}
                    manualSliceOffset={manualSliceOffset}
                    skinOpacity={skinOpacity}
                    pulseFrequency={pulseFrequency}
                    pulseAmplitude={pulseAmplitude}
                    visibilityMap={visibilityMap}
                    externalGlbUrl={externalGlbUrl}
                    externalGlbName={externalGlbName}
                    onClearExternalGlb={handleClearExternalGlb}
                    onSubMeshesDetected={setDetectedSubMeshes}
                    onTargetCenterComputed={setTargetOrganCenter}
                    onExportTsx={handleExportTsx}
                    narratorVoiceLabel={activeTtsAudioUrl ? activeNarratorVoice : null}
                  />
                </div>

                {/* Right Column: Storyboard Beats + Cutaway Slicer + Sub-Mesh Hierarchy */}
                <div className="lg:col-span-8 space-y-5">
                  <StoryboardBeats
                    beats={currentBeats}
                    currentFrame={currentFrame}
                    onJumpToFrame={(f) => {
                      setIsPlaying(false);
                      setCurrentFrame(f);
                    }}
                    onUpdateBeat={handleUpdateBeat}
                    activeNarratorVoice={activeNarratorVoice}
                    onSynthesizeQuickTts={handleSynthesizeQuickTts}
                    isSynthesizingQuickTts={isSynthesizingQuickTts}
                  />

                  <div ref={slicerSectionRef}>
                    <CutawayControls
                      sliceAxis={sliceAxis}
                      onChangeSliceAxis={setSliceAxis}
                      manualSliceOffset={manualSliceOffset}
                      onChangeManualSliceOffset={setManualSliceOffset}
                      skinOpacity={skinOpacity}
                      onChangeSkinOpacity={setSkinOpacity}
                      pulseFrequency={pulseFrequency}
                      onChangePulseFrequency={setPulseFrequency}
                      pulseAmplitude={pulseAmplitude}
                      onChangePulseAmplitude={setPulseAmplitude}
                    />
                  </div>

                  <SceneHierarchy
                    subMeshes={detectedSubMeshes}
                    visibilityMap={visibilityMap}
                    onToggleSubMesh={handleToggleSubMesh}
                    onShowAllSubMeshes={handleShowAllSubMeshes}
                    targetOrganName={activePreset.targetMeshName}
                    targetOrganCenter={targetOrganCenter}
                    currentFrame={currentFrame}
                  />
                </div>
              </div>

              {/* Bottom Full-Width Live .GLB Stock Browser & Sketchfab API Search */}
              <div ref={glbSectionRef}>
                <GlbStockBrowser
                  activeExternalGlbName={externalGlbName}
                  onLoadGlbUrl={handleLoadExternalGlb}
                />
              </div>
            </div>
          )}

          {/* TAB 2: 3-TIER ASSET PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              {/* 3-Tier Architecture Specification Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-zinc-200/80 bg-white p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-zinc-950" />
                      <span>Tier 1: Permanent Local Core Kit</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-950 tabular-nums">
                      1.84 GB
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Base human mannequin rig + 5,000+ named internal organs, bones, blood vessels, and nerves kept permanently in{' '}
                    <code className="font-mono text-[11px] text-zinc-900">/public/assets/z-anatomy/</code>.
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500 pt-1">
                    Source: Z-Anatomy (Blender / GLB CC-BY-SA) · Cost: $0.00
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/80 bg-white p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-zinc-950" />
                      <span>Tier 2: Ephemeral Topic Props</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-950 tabular-nums">
                      0 MB Perm
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    2–4 topic-specific 3D objects per script (bee stinger, 9mm slug, titanium screw) fetched on demand to{' '}
                    <code className="font-mono text-[11px] text-zinc-900">/tmp/props/</code> and auto-deleted post-MP4.
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500 pt-1">
                    Source: Sketchfab API v3 &amp; Poly Pizza · Cost: $0.00
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200/80 bg-white p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-zinc-950" />
                      <span>Tier 3: Generative 3D / Video Fallback</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-950 tabular-nums">
                      0 MB Perm
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Invoked strictly when Tier-2 search returns no match for ultra-specific props or 5-second fluid/cellular shots.
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500 pt-1">
                    Source: Microsoft TRELLIS.2 / Hunyuan3D / Veo 3.1
                  </p>
                </div>
              </div>

              <GlbStockBrowser
                activeExternalGlbName={externalGlbName}
                onLoadGlbUrl={handleLoadExternalGlb}
              />

              <CostPayoutStyleView
                records={assetRecords}
                onPurgeEphemeralProps={handlePurgeEphemeralProps}
                mode="pipeline"
              />
            </div>
          )}

          {/* TAB 3: REMOTION .TSX CODE */}
          {activeTab === 'code' && (
            <RemotionCodeView
              preset={activePreset}
              beats={currentBeats}
              sliceAxis={sliceAxis}
              skinOpacity={skinOpacity}
            />
          )}

          {/* TAB 4: UNIT COST & ANALYTICS */}
          {activeTab === 'analytics' && (
            <CostPayoutStyleView
              records={assetRecords}
              onPurgeEphemeralProps={handlePurgeEphemeralProps}
              mode="analytics"
            />
          )}
        </main>
      </div>

      {/* Step-by-Step Autonomous AI Director Modal */}
      <AiDirectorModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        initialPresetId={activePreset.id}
        onCommitDirectorPlan={handleCommitDirectorPlan}
      />
    </div>
  );
}
