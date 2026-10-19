'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, FileCode2 } from 'lucide-react';
import { type AnatomicalPreset, type StoryboardBeat } from '@/lib/remotion-math';
import {
  generateSceneCompositionTsx,
  generatePrimitives3DTsx,
  generateAssetResolverTs,
} from '@/lib/code-generator';

interface RemotionCodeViewProps {
  preset: AnatomicalPreset;
  beats: StoryboardBeat[];
  sliceAxis: 'x' | 'y' | 'z';
  skinOpacity: number;
}

type CodeFileKey = 'SceneComposition.tsx' | 'Primitives3D.tsx' | 'assetResolver.ts';

export const RemotionCodeView: React.FC<RemotionCodeViewProps> = ({
  preset,
  beats,
  sliceAxis,
  skinOpacity,
}) => {
  const [activeFile, setActiveFile] = useState<CodeFileKey>('SceneComposition.tsx');
  const [copied, setCopied] = useState(false);

  const files: Record<CodeFileKey, string> = {
    'SceneComposition.tsx': generateSceneCompositionTsx(
      preset,
      beats,
      sliceAxis,
      skinOpacity
    ),
    'Primitives3D.tsx': generatePrimitives3DTsx(),
    'assetResolver.ts': generateAssetResolverTs(preset),
  };

  const currentCode = files[activeFile];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-950">
            Deterministic @remotion/three TypeScript Source
          </h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            Live-synchronized with your 4-beat storyboard, {sliceAxis.toUpperCase()}-axis clipping plane, and Z-Anatomy sub-meshes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFile}
            className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {activeFile}</span>
          </button>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
        <div className="bg-zinc-50/80 border-b border-zinc-200/80 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            {(['SceneComposition.tsx', 'Primitives3D.tsx', 'assetResolver.ts'] as CodeFileKey[]).map(
              (fileName) => (
                <button
                  key={fileName}
                  type="button"
                  onClick={() => setActiveFile(fileName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                    activeFile === fileName
                      ? 'bg-zinc-950 text-white font-semibold'
                      : 'bg-white text-zinc-600 border border-zinc-200/80 hover:text-zinc-950'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </button>
              )
            )}
          </div>

          <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
            npx remotion render src/index.ts ZackCutawayComposition out/{preset.id}.mp4
          </span>
        </div>

        <pre className="p-4 bg-[#09090b] text-zinc-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[560px]">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
