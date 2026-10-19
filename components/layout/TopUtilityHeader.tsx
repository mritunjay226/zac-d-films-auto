'use client';

import React, { useState } from 'react';
import {
  PanelLeft,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Folder,
  Bell,
  X,
} from 'lucide-react';
import { type ActiveTabId } from './ElevenSidebar';

interface TopUtilityHeaderProps {
  activeTab: ActiveTabId;
  activePresetName: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onSelectTab: (tab: ActiveTabId) => void;
  onOpenPromptModal: () => void;
}

const TAB_LABELS: Record<ActiveTabId, string> = {
  studio: '3D Cutaway Studio',
  pipeline: '3-Tier Asset Pipeline',
  code: 'Remotion .TSX Code',
  analytics: 'Unit Cost & Analytics',
};

export const TopUtilityHeader: React.FC<TopUtilityHeaderProps> = ({
  activeTab,
  activePresetName,
  onToggleSidebar,
  onSelectTab,
  onOpenPromptModal,
}) => {
  const [activePopover, setActivePopover] = useState<'feedback' | 'docs' | 'notify' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  return (
    <header className="h-13 border-b border-zinc-100 px-6 flex items-center justify-between bg-white/95 sticky top-0 z-20">
      {/* Left: Sidebar collapse icon + breadcrumb section title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle left navigation sidebar"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-colors"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="font-semibold text-zinc-950 whitespace-nowrap">
            {TAB_LABELS[activeTab]}
          </span>
          <span className="text-zinc-400" aria-hidden="true">
            /
          </span>
          <span className="text-zinc-600 truncate">{activePresetName}</span>
        </div>
      </div>

      {/* Right: Feedback, Docs, Ask bordered utility buttons + Folder, Bell, Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
        <button
          type="button"
          onClick={() =>
            setActivePopover((cur) => (cur === 'feedback' ? null : 'feedback'))
          }
          className="hidden sm:flex bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors items-center gap-1.5 whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
          <span>Feedback</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePopover((cur) => (cur === 'docs' ? null : 'docs'))}
          className="hidden sm:flex bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors items-center gap-1.5 whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
          <span>Docs</span>
        </button>

        <button
          type="button"
          onClick={onOpenPromptModal}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
          <span>Ask</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('pipeline')}
          aria-label="Open 3-Tier Asset Pipeline files"
          className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
        >
          <Folder className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setActivePopover((cur) => (cur === 'notify' ? null : 'notify'))}
          aria-label="Engine render notifications"
          className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('analytics')}
          aria-label="Workspace account and unit economics"
          className="w-7 h-7 rounded-full bg-zinc-950 text-white text-[11px] font-bold flex items-center justify-center shrink-0"
        >
          ZD
        </button>

        {/* Interactive Utility Popover */}
        {activePopover && (
          <div className="absolute right-0 top-10 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg p-4 z-40 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="font-semibold text-zinc-950">
                {activePopover === 'feedback'
                  ? 'Send Studio Feedback'
                  : activePopover === 'docs'
                    ? '@remotion/three + Z-Anatomy Spec'
                    : 'Render Pipeline Status'}
              </span>
              <button
                type="button"
                aria-label="Close popover"
                onClick={() => setActivePopover(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activePopover === 'feedback' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!feedbackText.trim()) return;
                  setFeedbackSubmitted(true);
                  setFeedbackText('');
                  setTimeout(() => {
                    setFeedbackSubmitted(false);
                    setActivePopover(null);
                  }, 1500);
                }}
                className="mt-3 space-y-2.5"
              >
                <textarea
                  rows={3}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share feedback on cutaway shaders, Z-Anatomy sub-meshes, or frame timing..."
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950"
                />
                <div className="flex items-center justify-end gap-2">
                  {feedbackSubmitted && (
                    <span className="text-emerald-700 font-medium">Thank you!</span>
                  )}
                  <button
                    type="submit"
                    className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}

            {activePopover === 'docs' && (
              <div className="mt-3 space-y-2 text-zinc-600 leading-relaxed">
                <p>
                  <strong className="text-zinc-950">1. Auto-Target THREE.Box3:</strong>{' '}
                  Resolves exact world centers of named Z-Anatomy meshes without LLM coordinate guessing.
                </p>
                <p>
                  <strong className="text-zinc-950">2. Material.clippingPlanes:</strong>{' '}
                  Slices organs smoothly across frame ranges with <code className="font-mono text-zinc-900">localClippingEnabled: true</code>.
                </p>
                <p>
                  <strong className="text-zinc-950">3. Ephemeral /tmp Lifecycle:</strong>{' '}
                  Tier-2 Sketchfab props auto-purge after WebM/MP4 export for 0 MB permanent bloat.
                </p>
              </div>
            )}

            {activePopover === 'notify' && (
              <div className="mt-3 space-y-2 text-zinc-600">
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200/80">
                  <p className="font-semibold text-zinc-950">Tier-1 Z-Anatomy Cache Ready</p>
                  <p className="text-[11px] mt-0.5 font-mono tabular-nums">
                    1.84 GB mounted · 5,000+ anatomical structures indexed
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-200/80">
                  <p className="font-semibold text-zinc-950">Ephemeral /tmp/props Clean</p>
                  <p className="text-[11px] mt-0.5 font-mono tabular-nums">
                    0 MB residual disk usage · Auto-purge active
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
