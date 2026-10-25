// Realistic Photobook Sound Effects and Ambient Music Synthesizer
// Pure Web Audio API - zero external network dependencies, 100% offline-ready

class PhotobookAudioService {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isBgmPlaying = false;
  private bgmIntervalId: any = null;
  private currentBgmType: 'gentle-piano' | 'warm-vinyl' | 'summer-breeze' | 'none' = 'none';
  private isMuted = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.35;
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Realistic paper page flip sound effect with crisp rustle and deep body
  public playPageFlipSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;

      // 1. White noise burst with low-pass & bandpass for paper friction
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1400, now);
      bandpass.frequency.exponentialRampToValueAtTime(450, now + 0.15);
      bandpass.Q.setValueAtTime(1.8, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noiseSource.start(now);
      noiseSource.stop(now + 0.18);

      // 2. Subtle low thump for binding page turn
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Audio playback failed silently
    }
  }

  // Play gentle subtle shutter click when capturing or editing
  public playShutterSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // Ambient BGM Synthesis
  public startBgm(type: 'gentle-piano' | 'warm-vinyl' | 'summer-breeze') {
    this.stopBgm();
    this.initCtx();
    if (!this.ctx || !this.bgmGain) return;

    this.currentBgmType = type;
    this.isBgmPlaying = true;

    if (type === 'gentle-piano') {
      this.playGentlePianoSequence();
    } else if (type === 'warm-vinyl') {
      this.playWarmVinylSequence();
    } else if (type === 'summer-breeze') {
      this.playSummerBreezeSequence();
    }
  }

  public stopBgm() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.isBgmPlaying = false;
    this.currentBgmType = 'none';
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.sfxGain && this.bgmGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, now);
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, now);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  public getCurrentBgmType() {
    return this.currentBgmType;
  }

  // Pentatonic gentle piano chords
  private playGentlePianoSequence() {
    if (!this.ctx || !this.bgmGain) return;

    // Chords: Cmaj9, Am9, Fmaj7, G6
    const chordProgressions = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // C E G B D
      [220.00, 261.63, 329.63, 392.00, 493.88], // A C E G B
      [174.61, 220.00, 261.63, 329.63, 392.00], // F A C E G
      [196.00, 246.94, 293.66, 329.63, 392.00], // G B D E G
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGain || this.isMuted) return;
      const now = this.ctx.currentTime;
      const chord = chordProgressions[chordIdx % chordProgressions.length];
      chordIdx++;

      // Arpeggiate chord gently
      chord.forEach((freq, noteIdx) => {
        if (!this.ctx || !this.bgmGain) return;
        const noteTime = now + noteIdx * 0.12;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        // Warm sine + subtle triangle overtone
        osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        // Gentle envelope: soft attack, long decay
        noteGain.gain.setValueAtTime(0, noteTime);
        noteGain.gain.linearRampToValueAtTime(0.06, noteTime + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 2.8);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGain);

        osc.start(noteTime);
        osc.stop(noteTime + 3.0);
      });
    };

    playChord();
    this.bgmIntervalId = setInterval(playChord, 3800);
  }

  // Warm lo-fi vinyl crackle with soft Rhodes chords
  private playWarmVinylSequence() {
    if (!this.ctx || !this.bgmGain) return;

    const chords = [
      [261.63, 311.13, 392.00, 466.16], // Cm7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 349.23], // Fmaj7
      [196.00, 246.94, 293.66, 392.00], // G7
    ];

    let chordIdx = 0;

    const playStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGain || this.isMuted) return;
      const now = this.ctx.currentTime;
      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((freq, i) => {
        if (!this.ctx || !this.bgmGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const noteGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        // Mellow lo-fi filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);

        noteGain.gain.setValueAtTime(0, now + i * 0.08);
        noteGain.gain.linearRampToValueAtTime(0.07, now + i * 0.08 + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 3.2);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.bgmGain);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 3.5);
      });
    };

    playStep();
    this.bgmIntervalId = setInterval(playStep, 4200);
  }

  // Gentle coastal breeze and meditative wind chimes
  private playSummerBreezeSequence() {
    if (!this.ctx || !this.bgmGain) return;

    const chimeFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

    const playChime = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGain || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Pick 2 random chimes
      const f1 = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
      const f2 = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];

      [f1, f2].forEach((freq, idx) => {
        if (!this.ctx || !this.bgmGain) return;
        const t = now + idx * 0.25;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(t);
        osc.stop(t + 2.2);
      });
    };

    playChime();
    this.bgmIntervalId = setInterval(playChime, 3000);
  }
}

export const photobookAudio = new PhotobookAudioService();
