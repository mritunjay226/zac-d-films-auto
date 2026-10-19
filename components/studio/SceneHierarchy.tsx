'use client';

import React from 'react';
import { Eye, EyeOff, Box, Crosshair } from 'lucide-react';
import { type SubMeshTelemetryItem } from './Viewport9x16';

interface SceneHierarchyProps {
  subMeshes: SubMeshTelemetryItem[];
  visibilityMap: Record<string, boolean>;
  onToggleSubMesh: (name: string) => void;
  onShowAllSubMeshes: () => void;
  targetOrganName: string;
  targetOrganCenter: [number, number, number];
  currentFrame: number;
}

export const SceneHierarchy: React.FC<SceneHierarchyProps> = ({
  subMeshes,
  visibilityMap,
  onToggleSubMesh,
  onShowAllSubMeshes,
  targetOrganName,
  targetOrganCenter,
  currentFrame,
}) => {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-zinc-950" />
          <h3 className="text-xs font-bold text-zinc-950">
            Z-Anatomy Sub-Mesh Hierarchy &amp; THREE.Box3 Telemetry
          </h3>
        </div>
        <button
          type="button"
          onClick={onShowAllSubMeshes}
          className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950"
        >
          Show All Layers
        </button>
      </div>

      {/* Auto-Targeted Bounding Box Center Readout */}
      <div className="rounded-lg bg-zinc-50/80 border border-zinc-200/70 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-700">
          <Crosshair className="w-3.5 h-3.5 text-zinc-950" />
          <span>
            Auto-Targeted <code className="font-mono font-semibold text-zinc-950">getOrganCenter(&quot;{targetOrganName}&quot;)</code>
          </span>
        </div>
        <span className="font-mono font-semibold text-zinc-950 tabular-nums">
          [{targetOrganCenter[0].toFixed(2)}, {targetOrganCenter[1].toFixed(2)},{' '}
          {targetOrganCenter[2].toFixed(2)}] · Frame {currentFrame}
        </span>
      </div>

      {/* Sub-Mesh Visibility Toggles List */}
      <div className="divide-y divide-zinc-100 border border-zinc-200/70 rounded-lg overflow-hidden">
        {subMeshes.map((item) => {
          const isVisible =
            Object.prototype.hasOwnProperty.call(visibilityMap, item.name)
              ? visibilityMap[item.name]
              : true;

          return (
            <div
              key={item.name}
              className="px-3 py-2 bg-white hover:bg-zinc-50/70 flex items-center justify-between gap-2 text-xs transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleSubMesh(item.name)}
                  aria-label={`Toggle visibility for ${item.name}`}
                  className={`p-1 rounded-md border transition-colors ${
                    isVisible
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-400 border-zinc-200 hover:text-zinc-700'
                  }`}
                >
                  {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <span
                  className={`font-mono text-[11px] truncate ${
                    isVisible ? 'font-semibold text-zinc-950' : 'text-zinc-400 line-through'
                  }`}
                >
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">
                <span>
                  [{item.boxCenter[0]}, {item.boxCenter[1]}, {item.boxCenter[2]}]
                </span>
                <span>{item.vertices.toLocaleString()} verts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
