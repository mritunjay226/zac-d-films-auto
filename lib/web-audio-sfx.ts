export type SfxCueType = 'whoosh' | 'squelch' | 'impact' | 'heartbeat' | 'zap';

class WebAudioSfxEngine {
  private ctx: AudioContext | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private narratorAudioBuffer: AudioBuffer | null = null;
  private activeNarratorSource: AudioBufferSourceNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.streamDest = this.ctx.createMediaStreamDestination();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getAudioStream(): MediaStream | null {
    this.ensureContext();
    return this.streamDest ? this.streamDest.stream : null;
  }

  private connectOutput(node: AudioNode) {
    if (!this.ctx) return;
    node.connect(this.ctx.destination);
    if (this.streamDest) {
      node.connect(this.streamDest);
    }
  }

  /**
   * Decodes and stores a Gemini TTS WAV data URL (`data:audio/wav;base64,...`)
   * so it can play through the Web Audio graph and record into .WebM exports.
   */
  public async loadNarratorWavDataUrl(dataUrl: string): Promise<number> {
    const ctx = this.ensureContext();
    if (!ctx) return 0;
    try {
      const res = await fetch(dataUrl);
      const arrayBuf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      this.narratorAudioBuffer = decoded;
      return decoded.duration;
    } catch {
      return 0;
    }
  }

  public playNarratorFromOffset(offsetSeconds: number = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.narratorAudioBuffer) return;

    this.stopNarrator();
    const source = ctx.createBufferSource();
    source.buffer = this.narratorAudioBuffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.95;
    source.connect(gain);
    this.connectOutput(gain);

    const safeOffset = Math.max(
      0,
      Math.min(this.narratorAudioBuffer.duration - 0.05, offsetSeconds)
    );
    source.start(0, safeOffset);
    this.activeNarratorSource = source;
  }

  public stopNarrator() {
    if (this.activeNarratorSource) {
      try {
        this.activeNarratorSource.stop();
      } catch {
        // Ignore if already stopped
      }
      this.activeNarratorSource = null;
    }
  }

  public hasNarratorTrack(): boolean {
    return this.narratorAudioBuffer !== null;
  }

  public triggerSfx(cue: SfxCueType) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (cue === 'whoosh') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.32);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.32);
      filter.Q.value = 2.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      noise.connect(filter);
      filter.connect(gain);
      this.connectOutput(gain);
      noise.start(now);
      noise.stop(now + 0.32);
    } else if (cue === 'squelch') {
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const mainGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.26);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(38, now);
      modGain.gain.setValueAtTime(140, now);

      mainGain.gain.setValueAtTime(0.22, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(mainGain);
      this.connectOutput(mainGain);

      osc.start(now);
      mod.start(now);
      osc.stop(now + 0.26);
      mod.stop(now + 0.26);
    } else if (cue === 'impact') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);

      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

      osc.connect(gain);
      this.connectOutput(gain);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (cue === 'heartbeat') {
      [0, 0.14].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 78 : 64, now + offset);
        osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.12);

        gain.gain.setValueAtTime(idx === 0 ? 0.36 : 0.26, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);

        osc.connect(gain);
        this.connectOutput(gain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } else if (cue === 'zap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1850, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      osc.connect(gain);
      this.connectOutput(gain);
      osc.start(now);
      osc.stop(now + 0.19);
    }
  }
}

export const sfxEngine = new WebAudioSfxEngine();
