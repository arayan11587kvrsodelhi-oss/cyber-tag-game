import { WeaponType } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public setSfxVolume(vol: number) {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- LASER BLASTER SOUNDS ---

  public playLaserShot(weapon: WeaponType) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    if (weapon === 'pulse') {
      // Classic crisp laser blaster zap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      // Pitch drop
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

      // Amplitude envelope
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      // Lowpass filter for punch
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.15);

    } else if (weapon === 'rail') {
      // Heavy high-energy railgun zap with subsonic thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.28);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      // Add crackle noise
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.35);
      noise.start(t);
      noise.stop(t + 0.16);

    } else if (weapon === 'scatter') {
      // Shotgun multi-chirp burst
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.015;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800 + i * 200, t + offset);
        osc.frequency.exponentialRampToValueAtTime(120, t + offset + 0.1);

        gain.gain.setValueAtTime(0.2, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + offset);
        osc.stop(t + offset + 0.13);
      }

    } else if (weapon === 'rapid') {
      // Rapid pulse chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.07);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }

  // --- HIT FEEDBACK & COMBAT AUDIO ---

  public playHitConfirm(isHeadshot: boolean = false) {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // Sharp ping
    const freq = isHeadshot ? 2100 : 1600;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.setValueAtTime(freq * 1.25, t + 0.04);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  public playDamageTaken() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playShieldBreak() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Distorted glass sizzle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.35);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  public playEliminationSound() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Arpeggiated digital chord for scoring a tag
    const notes = [440, 660, 880, 1320];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.25, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
    });
  }

  public playDeRezDeath() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Powering down digital collapse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  public playJumpPad() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  public playPowerupPickup() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(0.28, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.18);
    });
  }

  public playOverheat() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(400, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playRespawn() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.48);
  }

  public startAmbient() {
    if (!this.musicEnabled) return;
    this.init();
    if (!this.ctx || !this.musicGain || this.ambientOsc) return;

    try {
      const t = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, t);

      this.ambientOsc = this.ctx.createOscillator();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(55, t); // Deep low A drone

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);

      this.ambientOsc.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.musicGain);

      this.ambientOsc.start();
    } catch {
      // Ignore background audio autoplay issues until user interaction
    }
  }

  public stopAmbient() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch {
        // Safe disconnect
      }
      this.ambientOsc = null;
    }
  }
}

export const sound = new SoundEngine();
