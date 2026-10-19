import React from 'react';
import { type AnatomicalPreset, type StoryboardBeat, getWordByWordCaptionState } from '@/lib/remotion-math';

export interface SceneCompositionProps {
  preset: AnatomicalPreset;
  beats: StoryboardBeat[];
  currentFrame: number;
  fps: number;
}

/**
 * Declarative Remotion SceneComposition wrapper representing the 4-beat <Sequence> timeline
 * and word-by-word Zack D. Films pop caption layer.
 */
export const SceneCompositionOverlay: React.FC<SceneCompositionProps> = ({
  beats,
  currentFrame,
}) => {
  const activeBeat =
    beats.find(
      (b) => currentFrame >= b.startFrame && currentFrame < b.startFrame + b.durationInFrames
    ) || beats[0];

  const { words, activeWordIndex } = getWordByWordCaptionState(activeBeat, currentFrame);

  return (
    <div
      className="pointer-events-none absolute inset-x-3 bottom-14 z-10 flex flex-col items-center text-center select-none"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 px-2 py-1.5">
        {words.map((word, idx) => {
          const isCurrent = idx === activeWordIndex;
          return (
            <span
              key={`${word}-${idx}`}
              className={`inline-block font-extrabold tracking-tight uppercase transition-transform duration-75 ${
                isCurrent
                  ? 'scale-110 rounded bg-amber-400 px-1.5 py-0.5 text-zinc-950 shadow-sm'
                  : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
              } text-xs sm:text-sm`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
