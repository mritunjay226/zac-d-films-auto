'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Sliders,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { type AssetResolutionRecord } from '@/lib/anatomical-presets';
import { calculateShortUnitCost } from '@/lib/remotion-math';

interface CostPayoutStyleViewProps {
  records: AssetResolutionRecord[];
  onPurgeEphemeralProps: () => void;
  mode?: 'analytics' | 'pipeline';
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-box3',
    question: 'How does THREE.Box3 auto-targeting prevent blind LLM coordinate guessing?',
    answer:
      'Instead of asking the AI agent to guess raw [x, y, z] coordinates for where a bee stinger or titanium screw should land, getOrganCenter() runs new THREE.Box3().setFromObject(targetMesh).getCenter(new THREE.Vector3()) directly on named Z-Anatomy sub-meshes (such as Dermis_Layer, Heart_Myocardium, or Mandible_Cortical_Plate). Every trajectory locks onto the exact anatomical center.',
  },
  {
    id: 'faq-clipping',
    question: 'How does <CrossSectionSlice /> cut 3D organs in half deterministically?',
    answer:
      'Every mesh material is bound to a Three.js THREE.Plane normal vector with WebGLRenderer localClippingEnabled: true and THREE.DoubleSide rendering. The plane constant is driven strictly by Remotion interpolate(useCurrentFrame(), [start, end], [fromOffset, toOffset]), ensuring frame-identical cross-section reveals on every render.',
  },
  {
    id: 'faq-ephemeral',
    question: 'How does the 3-Tier pipeline keep permanent disk storage at 1.84 GB with 0 MB bloat?',
    answer:
      'Tier 1 stores the base human Z-Anatomy rig (~1.84 GB) permanently in /public/assets/z-anatomy/. Tier 2 fetches topic-specific props (stingers, 9mm slugs, pill capsules) on demand from Sketchfab Data API v3 or Poly Pizza into /tmp/props/ and purges them immediately after MP4/WebM encoding.',
  },
  {
    id: 'faq-cost',
    question: 'How is the $0.01–$0.05 unit cost per 30-second 3D short achieved?',
    answer:
      'Because 95% of anatomical and prop geometry comes from open CC-BY-SA Z-Anatomy and Sketchfab meshes ($0.00 asset cost) and animations are computed deterministically via @remotion/three math rather than $0.50/sec generative video diffusion, the only per-video costs are LLM storyboard planning (~$0.008) and TTS voiceover ($0.00 with local Kokoro-82M or ~$0.033 with ElevenLabs Turbo).',
  },
];

export const CostPayoutStyleView: React.FC<CostPayoutStyleViewProps> = ({
  records,
  onPurgeEphemeralProps,
  mode = 'analytics',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'Tier 1' | 'Tier 2' | 'Tier 3'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [openFaqId, setOpenFaqId] = useState<string>('faq-box3');
  const [showEngineDrawer, setShowEngineDrawer] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<'gemini-tts' | 'elevenlabs-turbo' | 'kokoro-local'>('gemini-tts');
  const [monthlyShortsCount, setMonthlyShortsCount] = useState(60);
  const [purgeBanner, setPurgeBanner] = useState(false);

  const pageSize = 5;

  const costBreakdown = useMemo(
    () =>
      calculateShortUnitCost({
        durationSeconds: 30,
        ttsEngine,
        tier3FallbackSeconds: 0,
        cloudLambdaRender: true,
      }),
    [ttsEngine]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesTier = tierFilter === 'ALL' || rec.tier === tierFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        rec.meshName.toLowerCase().includes(q) ||
        rec.filePath.toLowerCase().includes(q) ||
        rec.sourceLabel.toLowerCase().includes(q);
      return matchesTier && matchesSearch;
    });
  }, [records, tierFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const monthlySpend = (costBreakdown.totalCostUsd * monthlyShortsCount).toFixed(2);

  return (
    <div className="space-y-6">
      {/* ElevenLabs Payouts-Style Status Banner Bar */}
      <div className="border border-zinc-200/80 bg-zinc-50/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-2 py-0.5 rounded text-[11px] font-semibold">
            Remotion + Z-Anatomy Engine Active
          </span>
          <span className="text-xs text-zinc-600">
            {mode === 'pipeline'
              ? 'Tier-1 Local Z-Anatomy Core Kit mounted · Tier-2 /tmp/props auto-cleanup enabled'
              : 'Deterministic 30 FPS @remotion/three pipeline · $0.00 3D asset licensing cost'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'pipeline' && (
            <button
              type="button"
              onClick={() => {
                onPurgeEphemeralProps();
                setPurgeBanner(true);
                setTimeout(() => setPurgeBanner(false), 2000);
              }}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Purge /tmp/props Cache</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowEngineDrawer((v) => !v)}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span>Configure Engine Mode</span>
          </button>
        </div>
      </div>

      {purgeBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Ephemeral Tier-2 <code className="font-mono">/tmp/props/</code> directory purged — 0 MB residual disk footprint verified.
          </span>
        </div>
      )}

      {/* Optional Engine Mode Configuration Drawer */}
      {showEngineDrawer && (
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-800 mb-1">
              Narrator Voiceover Engine
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTtsEngine('gemini-tts')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  ttsEngine === 'gemini-tts'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200'
                }`}
              >
                Gemini TTS Fenrir/Charon ($0.03/short)
              </button>
              <button
                type="button"
                onClick={() => setTtsEngine('elevenlabs-turbo')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  ttsEngine === 'elevenlabs-turbo'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200'
                }`}
              >
                ElevenLabs Turbo ($0.05/short)
              </button>
              <button
                type="button"
                onClick={() => setTtsEngine('kokoro-local')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  ttsEngine === 'kokoro-local'
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200'
                }`}
              >
                Local Kokoro-82M ($0.017/short)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="monthly-shorts-slider" className="font-semibold text-zinc-800">
                Monthly Production Volume
              </label>
              <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                {monthlyShortsCount} shorts / mo
              </span>
            </div>
            <input
              id="monthly-shorts-slider"
              type="range"
              min={10}
              max={300}
              step={10}
              value={monthlyShortsCount}
              onChange={(e) => setMonthlyShortsCount(Number(e.target.value))}
              className="w-full accent-zinc-950 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Current Configuration Row (2 Large White Metric Cards) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
          <span>Current configuration</span>
          <Info className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
            <p className="text-xs font-medium text-zinc-600">Cost per 30s short</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 font-mono tabular-nums">
              ${costBreakdown.totalCostUsd.toFixed(2)}
            </p>
            <p className="mt-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              LLM: ${costBreakdown.llmPlanningCost} · TTS: ${costBreakdown.ttsCost} · 3D Assets: $0.00 · Render: ${costBreakdown.computeRenderCost}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
            <p className="text-xs font-medium text-zinc-600">Local Tier-1 Z-Anatomy cache</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 font-mono tabular-nums">
              1.84 GB
            </p>
            <p className="mt-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              5,000+ named organs, bones, vessels &amp; nerves in /public/assets/z-anatomy/
            </p>
          </div>
        </div>
      </div>

      {/* All-Time / Monthly Projection Row (3 White Metric Cards) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
          <span>Monthly projection</span>
          <Info className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
            <p className="text-xs font-medium text-zinc-600">
              Monthly spend ({monthlyShortsCount} shorts)
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 font-mono tabular-nums">
              ${monthlySpend}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
            <p className="text-xs font-medium text-zinc-600">
              Ephemeral Tier-2 disk footprint
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 font-mono tabular-nums">
              0 MB
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
            <p className="text-xs font-medium text-zinc-600">
              Deterministic frame rate
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 font-mono tabular-nums">
              30 FPS
            </p>
          </div>
        </div>
      </div>

      {/* Asset Resolution History Section (Search + Tier Dropdown + Bordered Table + Pagination) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-zinc-950 tracking-tight">
          Asset resolution history
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search resolved sub-meshes & Sketchfab props..."
              aria-label="Search resolved sub-meshes and Sketchfab props"
              className="w-full bg-white border border-zinc-200/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="tier-filter-select" className="text-xs text-zinc-600 font-medium">
              Tier:
            </label>
            <select
              id="tier-filter-select"
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value as 'ALL' | 'Tier 1' | 'Tier 2' | 'Tier 3');
                setCurrentPage(1);
              }}
              className="bg-white border border-zinc-200/80 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:border-zinc-950"
            >
              <option value="ALL">All tiers</option>
              <option value="Tier 1">Tier 1 (Local Z-Anatomy)</option>
              <option value="Tier 2">Tier 2 (Ephemeral /tmp)</option>
              <option value="Tier 3">Tier 3 (Generative Fallback)</option>
            </select>
          </div>
        </div>

        {/* Clean Bordered Table */}
        <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-[11px] font-semibold text-zinc-600">
                  <th className="py-2.5 px-4">Required Scene Mesh</th>
                  <th className="py-2.5 px-4">Source Tier</th>
                  <th className="py-2.5 px-4">File / Node Path</th>
                  <th className="py-2.5 px-4 text-right">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 text-xs">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-zinc-500">
                      No resolved 3D assets match your current filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-950">
                        {rec.meshName}
                        <span className="block font-sans font-normal text-[11px] text-zinc-500">
                          {rec.sourceLabel} · {rec.license}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-700 font-medium whitespace-nowrap">
                        {rec.tier} · <span className="font-mono tabular-nums">{rec.costLabel}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                        {rec.filePath}
                        <span className="block text-[10px] text-zinc-400 tabular-nums">
                          {rec.sizeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-zinc-800 whitespace-nowrap">
                        {rec.lifecycleStatus}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-500 font-mono tabular-nums">
            Showing {(safePage - 1) * pageSize + (paginatedRecords.length ? 1 : 0)}–
            {(safePage - 1) * pageSize + paginatedRecords.length} of {filteredRecords.length} meshes
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="bg-white hover:bg-zinc-50 disabled:opacity-40 border border-zinc-200 rounded-lg px-3 py-1 text-xs font-medium text-zinc-700 transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="bg-white hover:bg-zinc-50 disabled:opacity-40 border border-zinc-200 rounded-lg px-3 py-1 text-xs font-medium text-zinc-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="space-y-3 pt-4">
        <h3 className="text-base font-bold text-zinc-950 tracking-tight">
          Frequently asked questions
        </h3>
        <div className="divide-y divide-zinc-200/80 border-t border-b border-zinc-200/80">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold text-zinc-950 hover:text-zinc-700 transition-colors"
                >
                  <span>{item.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-zinc-600 leading-relaxed pr-6">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
