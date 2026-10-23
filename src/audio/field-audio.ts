type SoundEvent = 'footstep' | 'latch' | 'inspect' | 'tool' | 'switch' | 'power' | 'radio' | 'arc';

export class FieldAudio {
  private context: AudioContext | null = null;
  private ambience: GainNode | null = null;
  private powerHum: GainNode | null = null;
  private muted = false;
  private lastStep = 0;

  unlock() {
    if (this.muted) return;
    try {
      if (!this.context) {
        const ctx = new AudioContext();
        this.context = ctx;
        const seconds = 2;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        // Procedural low-pressure wind/noise floor: no external audio files.
        let seed = 94751;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data[i] = seed / 2147483648 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 170;
        this.ambience = ctx.createGain();
        this.ambience.gain.value = 0.012;
        noise.connect(filter).connect(this.ambience).connect(ctx.destination);
        noise.start();

        const hum = ctx.createOscillator();
        hum.type = 'sine';
        hum.frequency.value = 55;
        this.powerHum = ctx.createGain();
        this.powerHum.gain.value = 0;
        hum.connect(this.powerHum).connect(ctx.destination);
        hum.start();
      }
      if (this.context.state === 'suspended') void this.context.resume();
    } catch {
      // Audio is enhancement; Safari restrictions may disallow it entirely.
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.context) {
      if (this.muted) void this.context.suspend();
      else void this.context.resume();
    }
  }

  private tone(freq: number, duration: number, gain: number,
    kind: OscillatorType = 'sine', bend = 0.67) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = kind;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(22, freq * bend), t + duration);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  play(which: SoundEvent) {
    this.unlock();
    const time = this.context?.currentTime ?? 0;
    if (which === 'footstep') {
      if (time - this.lastStep < 0.20) return;
      this.lastStep = time;
      this.tone(115 + Math.random() * 22, 0.065, 0.036, 'triangle', 0.40);
      return;
    }
    if (which === 'latch') {
      this.tone(650, 0.095, 0.045, 'square', 0.25);
      this.tone(138, 0.15, 0.055, 'triangle', 0.47);
    } else if (which === 'inspect') {
      this.tone(430, 0.07, 0.015, 'sine', 1.28);
    } else if (which === 'tool') {
      this.tone(550, 0.085, 0.031, 'triangle', 0.55);
      this.tone(230, 0.12, 0.026, 'square', 0.55);
    } else if (which === 'switch') {
      this.tone(290, 0.09, 0.05, 'square', 0.55);
    } else if (which === 'arc') {
      this.tone(1250, 0.07, 0.042, 'sawtooth', 0.3);
      this.tone(360, 0.13, 0.019, 'square', 0.33);
    } else if (which === 'radio') {
      this.tone(710, 0.065, 0.017, 'sine', 1.07);
      this.tone(960, 0.10, 0.014, 'sine', 0.88);
    } else if (which === 'power') {
      this.tone(270, 0.24, 0.028, 'sine', 1.65);
      this.tone(540, 0.47, 0.022, 'sine', 1.27);
    }
  }

  update(powered: boolean) {
    const ctx = this.context;
    if (!ctx || !this.powerHum) return;
    this.powerHum.gain.setTargetAtTime(powered && !this.muted ? 0.012 : 0, ctx.currentTime, 0.3);
  }
}
