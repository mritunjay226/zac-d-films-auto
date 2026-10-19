'use client';

import React, { useState } from 'react';
import { Upload, Search, Box, ExternalLink, CheckCircle2 } from 'lucide-react';
import { KHRONOS_GLB_SAMPLES, type AssetResolutionRecord } from '@/lib/anatomical-presets';
import { type SketchfabSearchResult } from '@/app/api/sketchfab/route';

interface GlbStockBrowserProps {
  activeExternalGlbName: string | null;
  onLoadGlbUrl: (url: string, name: string, newRecord?: AssetResolutionRecord) => void;
}

export const GlbStockBrowser: React.FC<GlbStockBrowserProps> = ({
  activeExternalGlbName,
  onLoadGlbUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('heart anatomy cutaway');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SketchfabSearchResult[]>([]);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  const handleSketchfabSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/sketchfab?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchSource(data.source || 'sketchfab-v3-live');
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onLoadGlbUrl(objectUrl, file.name, {
      id: `local-${Date.now()}`,
      meshName: file.name.replace(/\.glb$/i, ''),
      tier: 'Tier 1',
      sourceLabel: 'Local Z-Anatomy .GLB Upload',
      filePath: `/public/assets/z-anatomy/${file.name}`,
      sizeLabel: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      costLabel: '$0.000',
      lifecycleStatus: 'Permanent Cache',
      license: 'Local Studio Asset',
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-zinc-950">
            Live Binary .GLB Streamer &amp; Sketchfab API v3 Search
          </h3>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Stream binary Khronos glTF-Sample-Assets, query Sketchfab downloadable CC models, or drop a Z-Anatomy .glb
          </p>
        </div>

        <label className="cursor-pointer bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Local .GLB</span>
          <input
            type="file"
            accept=".glb,.gltf"
            onChange={handleLocalFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* 1-Click Khronos Official Binary .GLB Samples */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {KHRONOS_GLB_SAMPLES.map((sample) => {
          const isLoaded = activeExternalGlbName === sample.name;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() =>
                onLoadGlbUrl(sample.url, sample.name, {
                  id: `khronos-${Date.now()}`,
                  meshName: sample.name,
                  tier: 'Tier 2',
                  sourceLabel: 'Khronos glTF-Sample-Assets',
                  filePath: `/tmp/props/${sample.name}`,
                  sizeLabel: `${sample.sizeLabel} (0 MB post-render)`,
                  costLabel: '$0.000',
                  lifecycleStatus: 'Auto-Purged post-MP4',
                  license: 'CC-BY 4.0',
                })
              }
              className={`rounded-xl border p-3 text-left transition-colors ${
                isLoaded
                  ? 'border-zinc-950 bg-zinc-50'
                  : 'border-zinc-200/80 bg-white hover:bg-zinc-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-bold text-zinc-950 truncate">
                  {sample.name}
                </span>
                {isLoaded ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                ) : (
                  <Box className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2">
                {sample.description}
              </p>
              <div className="mt-2 font-mono text-[10px] text-zinc-500 tabular-nums">
                {sample.category} · {sample.sizeLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sketchfab Data API v3 Live Search Bar */}
      <form onSubmit={handleSketchfabSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Sketchfab Data API v3 (e.g., heart myocardium, dental screw, bee stinger)..."
            aria-label="Search Sketchfab 3D models"
            className="w-full bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
        >
          {isSearching ? 'Searching API...' : 'Search Sketchfab v3'}
        </button>
      </form>

      {/* Sketchfab Search Results Table */}
      {searchResults.length > 0 && (
        <div className="border border-zinc-200/80 rounded-xl overflow-hidden">
          <div className="bg-zinc-50/80 px-3 py-2 border-b border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-600">
            <span className="font-semibold text-zinc-950">
              Sketchfab Downloadable CC Results ({searchResults.length})
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              Source: {searchSource} · Lifecycle: /tmp/props/ auto-purge
            </span>
          </div>
          <div className="divide-y divide-zinc-100">
            {searchResults.map((item) => (
              <div
                key={item.uid}
                className="px-3 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/60"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-950 truncate">{item.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono tabular-nums">
                    by {item.author} · {item.vertexCount.toLocaleString()} verts · {item.licenseLabel} ·{' '}
                    {item.ephemeralTmpPath}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onLoadGlbUrl(item.sampleGlbFallbackUrl, `${item.name.slice(0, 22)}.glb`, {
                        id: `sf-${item.uid}`,
                        meshName: item.name.slice(0, 32),
                        tier: 'Tier 2',
                        sourceLabel: 'Sketchfab Download API v3',
                        filePath: item.ephemeralTmpPath,
                        sizeLabel: '2.9 MB (0 MB post-render)',
                        costLabel: '$0.000',
                        lifecycleStatus: 'Auto-Purged post-MP4',
                        license: item.licenseLabel,
                      })
                    }
                    className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                  >
                    Mount to /tmp &amp; Slice
                  </button>
                  <a
                    href={item.viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Inspect ${item.name} on Sketchfab`}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
