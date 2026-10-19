'use client';

import React, { useState } from 'react';
import {
  Home,
  Layers,
  GitBranch,
  FolderOpen,
  Sparkles,
  Scissors,
  Bone,
  Volume2,
  Code2,
  BarChart3,
  Send,
  ChevronDown,
  Terminal,
  Check,
} from 'lucide-react';

export type ActiveTabId = 'studio' | 'pipeline' | 'code' | 'analytics';

interface ElevenSidebarProps {
  activeTab: ActiveTabId;
  onSelectTab: (tab: ActiveTabId) => void;
  onOpenPromptModal: () => void;
  onOpenGlbModal: () => void;
  onFocusSlicer: () => void;
  isCollapsed: boolean;
}

export const ElevenSidebar: React.FC<ElevenSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPromptModal,
  onOpenGlbModal,
  onFocusSlicer,
  isCollapsed,
}) => {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('ElevenCreative 3D');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [activeNavKey, setActiveNavKey] = useState<string>('studio');

  if (isCollapsed) {
    return null;
  }

  const handleNavClick = (key: string, tab: ActiveTabId, extra?: () => void) => {
    setActiveNavKey(key);
    onSelectTab(tab);
    if (extra) extra();
  };

  return (
    <>
      {/* Mobile Backdrop when Sidebar is open on < lg viewports */}
      {!isCollapsed && (
        <div
          onClick={() => handleNavClick(activeNavKey, activeTab)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-zinc-950/30 lg:hidden"
        />
      )}
      <aside
        aria-label="Primary Sidebar Navigation"
        className="fixed inset-y-0 left-0 z-40 lg:static w-60 shrink-0 border-r border-zinc-200/80 bg-white flex flex-col justify-between p-3 select-none shadow-xl lg:shadow-none"
      >
      <div>
        {/* Top Brand Wordmark */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-base font-extrabold tracking-tight text-zinc-950">
            IIZackStudio
          </span>
          <span className="font-mono text-[10px] font-medium text-zinc-400 tabular-nums">
            v2.5
          </span>
        </div>

        {/* Workspace Switcher Pill with Orange-Amber Micro-Gradient Squircle */}
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => setWorkspaceOpen((prev) => !prev)}
            aria-expanded={workspaceOpen}
            aria-label="Switch active workspace"
            className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-zinc-50/70 transition-colors flex items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 shadow-xs shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                aria-hidden="true"
              >
                Z
              </span>
              <span className="text-xs font-semibold text-zinc-950 truncate">
                {activeWorkspace}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {workspaceOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-md py-1 z-30">
              {['ElevenCreative 3D', 'Z-Anatomy Medical Lab', 'Shorts Render Farm'].map((ws) => (
                <button
                  key={ws}
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setWorkspaceOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-left text-zinc-700 hover:bg-zinc-50 flex items-center justify-between"
                >
                  <span className="truncate">{ws}</span>
                  {activeWorkspace === ws && <Check className="w-3 h-3 text-zinc-950 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Navigation Group */}
        <nav aria-label="Main workspace sections" className="space-y-0.5 mt-3">
          <button
            type="button"
            onClick={() => handleNavClick('home', 'studio')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeNavKey === 'home' && activeTab === 'studio'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('studio', 'studio')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeNavKey === 'studio' && activeTab === 'studio'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>3D Cutaway Studio</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('flows', 'code')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeNavKey === 'flows' && activeTab === 'code'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span>Scene Flows</span>
            </span>
            <span className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('assets', 'pipeline')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeNavKey === 'assets' && activeTab === 'pipeline'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Asset Files</span>
          </button>
        </nav>

        {/* PINNED Section */}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 px-2 pt-5 pb-1.5 flex items-center justify-between">
          <span>Pinned</span>
        </div>

        <nav aria-label="Pinned tools" className="space-y-0.5">
          <button
            type="button"
            onClick={() => handleNavClick('prompt', 'studio', onOpenPromptModal)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Prompt to 3D Short</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('slicer', 'studio', onFocusSlicer)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors whitespace-nowrap"
          >
            <Scissors className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Cross-Section Slicer</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('atlas', 'pipeline', onOpenGlbModal)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors whitespace-nowrap"
          >
            <Bone className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Z-Anatomy Atlas</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('sfx', 'studio', onFocusSlicer)}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors whitespace-nowrap"
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Voice & SFX Sync</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('remotion', 'code')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Remotion Code</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('cost', 'analytics')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-zinc-100/90 text-zinc-950 font-semibold'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <span>Cost & Analytics</span>
          </button>
        </nav>
      </div>

      {/* Bottom Pinned Invite Card & Developers Bar */}
      <div className="space-y-2 pt-4">
        <div className="bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-zinc-950">Invite team members</p>
              <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
                Collaborate on 3D cutaway rigs & Remotion sequences
              </p>
            </div>
            <button
              type="button"
              aria-label="Invite team member"
              onClick={() => setShowInviteInput((v) => !v)}
              className="shrink-0 w-7 h-7 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {showInviteInput && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                setInviteSent(true);
                setInviteEmail('');
                setTimeout(() => {
                  setInviteSent(false);
                  setShowInviteInput(false);
                }, 2000);
              }}
              className="mt-2.5 flex items-center gap-1.5"
            >
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@studio.io"
                aria-label="Teammate email"
                className="w-full min-w-0 bg-white border border-zinc-200 rounded-md px-2 py-1 text-[11px] text-zinc-900 focus:outline-none focus:border-zinc-950"
              />
              <button
                type="submit"
                className="px-2 py-1 rounded-md bg-zinc-950 text-white text-[11px] font-semibold hover:bg-zinc-800 shrink-0"
              >
                Send
              </button>
            </form>
          )}
          {inviteSent && (
            <p className="mt-1.5 text-[11px] font-medium text-emerald-700">
              Workspace invite dispatched.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('code')}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Developers</span>
          </span>
          <span className="font-mono text-[10px] text-zinc-400">&lt;&gt;</span>
        </button>
      </div>
    </aside>
    </>
  );
};
