export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.humOsc = this.ctx.createOscillator();
      this.humOsc.type = 'sawtooth';
      this.humOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'sine';
      this.subOsc.frequency.setValueAtTime(40, this.ctx.currentTime);

      this.subGain = this.ctx.createGain();
      this.subGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.humOsc.connect(this.filterNode);
      this.subOsc.connect(this.subGain);
      this.filterNode.connect(this.humGain);

      this.humGain.connect(this.analyser);
      this.subGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.humOsc.start();
      this.subOsc.start();

      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.humGain && this.subGain && this.ctx) {
      this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.subGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateCursedHum(progress: number, domainId: string) {
    if (
      !this.isInitialized ||
      this.isMuted ||
      !this.ctx ||
      !this.humGain ||
      !this.subGain ||
      !this.filterNode ||
      !this.humOsc
    )
      return;

    const baseGain = Math.min(0.12, 0.02 + progress * 0.12);
    const filterFreq = 120 + progress * 640;

    let basePitch = 55;
    if (domainId === 'malevolent-shrine') basePitch = 46;
    else if (domainId === 'infinite-void') basePitch = 65;
    else if (domainId === 'chimera-shadow') basePitch = 52;
    else if (domainId === 'authentic-mutual-love') basePitch = 58;
    else if (domainId === 'idle-death-gamble') basePitch = 73;
    else if (domainId === 'self-embodiment-of-perfection') basePitch = 49;

    const currentPitch = basePitch + progress * 24;

    this.humGain.gain.setTargetAtTime(baseGain, this.ctx.currentTime, 0.05);
    this.subGain.gain.setTargetAtTime(baseGain * 0.8, this.ctx.currentTime, 0.05);
    this.filterNode.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
    this.humOsc.frequency.setTargetAtTime(currentPitch, this.ctx.currentTime, 0.05);
  }

  public playMudraChime(stepPitchMultiplier: number = 1.0) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const frequencies = [440, 880, 1320, 1760].map((f) => f * stepPitchMultiplier);
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.14 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 1.7);
    });
  }

  public playJackpotFanfare() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.16, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.65);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.7);
    });
  }

  public playBarrierShatter() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(now);

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.8);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.85);
  }

  public playBlackFlash() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.exponentialRampToValueAtTime(20, now + 0.6);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(45, now);
    osc2.frequency.exponentialRampToValueAtTime(15, now + 0.7);

    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(40) as unknown as Float32Array<ArrayBuffer>;
    waveShaper.oversample = '4x';

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(waveShaper);
    osc2.connect(waveShaper);
    waveShaper.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  }

  public playSlash() {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.linearRampToValueAtTime(120, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  public getVisualizerData(): Uint8Array | null {
    if (!this.analyser || !this.isInitialized || this.isMuted) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
