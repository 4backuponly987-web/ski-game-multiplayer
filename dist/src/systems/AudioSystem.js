export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.windGain = null;
    this.skiGain = null;
    this.powderGain = null;
    this.grindGain = null;
    this.liftGain = null;
    this.heliGain = null;
    this.avalancheGain = null;
    this.heliActive = false;
    this.avalancheActive = false;
    this.lastPolePhase = 0;
    this.wasGrinding = false;
    this.muted = false;
    this.gameplayActive = false;
    this.birdTimer = 4.5;
    this.lastAudioTime = 0;
    this.wasPowder = false;
  }

  ensureStarted() {
    if (!this.context) this.createGraph();
    if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
  }

  createNoiseBuffer(seconds = 2.5) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  createNoiseLoop(filterType, frequency) {
    const source = this.context.createBufferSource();
    source.buffer = this.createNoiseBuffer();
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    source.connect(filter);
    source.start();
    return { source, filter };
  }

  createGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(this.context.destination);

    const wind = this.createNoiseLoop('lowpass', 950);
    this.windGain = this.context.createGain();
    this.windGain.gain.value = 0;
    wind.filter.connect(this.windGain);
    this.windGain.connect(this.master);

    const ski = this.createNoiseLoop('highpass', 1250);
    this.skiFilter = ski.filter;
    this.skiGain = this.context.createGain();
    this.skiGain.gain.value = 0;
    ski.filter.connect(this.skiGain);
    this.skiGain.connect(this.master);

    // A separate low, soft snow wash gives powder its own audible texture
    // instead of merely making the groomed ski hiss louder.
    const powder = this.createNoiseLoop('lowpass', 720);
    this.powderFilter = powder.filter;
    this.powderGain = this.context.createGain();
    this.powderGain.gain.value = 0;
    powder.filter.connect(this.powderGain);
    this.powderGain.connect(this.master);

    const grind = this.createNoiseLoop('bandpass', 2500);
    grind.filter.Q.value = 2.2;
    this.grindGain = this.context.createGain();
    this.grindGain.gain.value = 0;
    grind.filter.connect(this.grindGain);
    this.grindGain.connect(this.master);

    const liftOsc = this.context.createOscillator();
    liftOsc.type = 'triangle';
    liftOsc.frequency.value = 72;
    this.liftGain = this.context.createGain();
    this.liftGain.gain.value = 0;
    liftOsc.connect(this.liftGain);
    this.liftGain.connect(this.master);
    liftOsc.start();

    const heli = this.createNoiseLoop('bandpass', 115);
    heli.filter.Q.value = 0.7;
    this.heliGain = this.context.createGain();
    this.heliGain.gain.value = 0;
    heli.filter.connect(this.heliGain);
    this.heliGain.connect(this.master);

    const avalanche = this.createNoiseLoop('lowpass', 430);
    this.avalancheGain = this.context.createGain();
    this.avalancheGain.gain.value = 0;
    avalanche.filter.connect(this.avalancheGain);
    this.avalancheGain.connect(this.master);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted || !this.gameplayActive ? 0 : 0.72, this.context.currentTime, 0.035);
    }
    return this.muted;
  }

  toggleMute() {
    this.ensureStarted();
    return this.setMuted(!this.muted);
  }

  setGameplayActive(active) {
    this.gameplayActive = Boolean(active);
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.gameplayActive && !this.muted ? 0.72 : 0, now, 0.02);
    if (!this.gameplayActive) {
      for (const gain of [this.windGain, this.skiGain, this.powderGain, this.grindGain, this.liftGain, this.heliGain, this.avalancheGain]) {
        gain?.gain.setTargetAtTime(0, now, 0.035);
      }
    }
  }

  update(state, { liftRiding = false, weather = null } = {}) {
    if (!this.context || !this.windGain) return;
    const now = this.context.currentTime;
    const elapsed = this.lastAudioTime ? Math.max(0, Math.min(0.12, now - this.lastAudioTime)) : 0;
    this.lastAudioTime = now;
    if (!this.gameplayActive) {
      for (const gain of [this.windGain, this.skiGain, this.powderGain, this.grindGain, this.liftGain, this.heliGain, this.avalancheGain]) {
        gain?.gain.setTargetAtTime(0, now, 0.035);
      }
      return;
    }
    const speed = state?.speed ?? 0;
    const speedT = Math.min(1, speed / 55);
    const weatherWind = weather?.wind ?? 0;
    const wind = 0.018 + speedT * 0.055 + speedT * speedT * 0.235 + weatherWind * 0.075;
    const ski = state?.grounded && state?.skisEquipped !== false && !liftRiding ? Math.min(0.18, 0.018 + speed * 0.0028) : 0;
    this.skiFilter?.frequency.setTargetAtTime(state?.surface === 'POWDER' ? 650 : state?.surface === 'ICY' ? 2700 : 1400 + (state?.slip || 0) * 800, now, 0.08);
    const inPowder = state?.surface === 'POWDER' && state?.grounded && state?.skisEquipped !== false && !liftRiding;
    const powderBoost = inPowder ? 1.14 : 1;
    const powderWash = inPowder ? Math.min(0.15, 0.024 + speed * 0.0036 + Math.abs(state?.slip || 0) * 0.025) : 0;
    const grind = state?.grinding ? Math.min(0.34, 0.10 + speed * 0.0046) : 0;
    const lift = liftRiding ? 0.045 : 0;
    const heli = this.heliActive ? 0.17 : 0;
    const avalanche = this.avalancheActive ? 0.26 : 0;

    this.windGain.gain.setTargetAtTime(wind, now, 0.08);
    this.skiGain.gain.setTargetAtTime(ski * powderBoost, now, 0.045);
    this.powderGain?.gain.setTargetAtTime(powderWash, now, 0.07);
    this.powderFilter?.frequency.setTargetAtTime(520 + Math.min(420, speed * 9), now, 0.12);
    this.grindGain.gain.setTargetAtTime(grind, now, 0.03);
    this.liftGain.gain.setTargetAtTime(lift, now, 0.08);
    this.heliGain?.gain.setTargetAtTime(heli, now, 0.08);
    this.avalancheGain?.gain.setTargetAtTime(avalanche, now, 0.06);

    if (inPowder && !this.wasPowder && speed > 4) {
      this.playTone({ frequency: 150, endFrequency: 82, duration: 0.16, gain: 0.024, type: 'triangle' });
    }
    this.wasPowder = Boolean(inPowder);

    // Sparse procedural bird calls keep quiet areas alive without requiring
    // external audio files. They only occur in calm-ish weather and are kept
    // subtle so they disappear naturally once the skier is moving fast.
    const calmWeather = !['snow', 'blizzard', 'night'].includes(weather?.id || '');
    this.birdTimer -= elapsed;
    if (this.birdTimer <= 0 && calmWeather && !liftRiding && speed < 22) {
      this.playBirdChirp();
      this.birdTimer = 6.5 + Math.random() * 9.0;
    }

    // Rails now have an unmistakable metal scrape: a louder continuous bandpass
    // bed plus a short metallic bite the instant the skis make contact.
    if (state?.grinding && !this.wasGrinding) {
      this.playTone({ frequency: 1850, endFrequency: 1180, duration: 0.085, gain: 0.055, type: 'sawtooth' });
      this.playTone({ frequency: 520, endFrequency: 390, duration: 0.12, gain: 0.035, type: 'triangle' });
    }
    this.wasGrinding = Boolean(state?.grinding);

    if (state?.polePushing) {
      const phase = state.polePushPhase ?? 0;
      if (phase < this.lastPolePhase && phase < 0.18) {
        this.playTone({ frequency: 185, endFrequency: 115, duration: 0.055, gain: 0.027, type: 'triangle' });
      }
      this.lastPolePhase = phase;
    } else this.lastPolePhase = 0;
  }

  playTone({ frequency = 120, duration = 0.12, gain = 0.08, type = 'sine', endFrequency = null } = {}) {
    if (!this.context || !this.master || this.muted || !this.gameplayActive) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  }

  playBirdChirp() {
    if (!this.context || !this.master || this.muted || !this.gameplayActive) return;
    const now = this.context.currentTime;
    const notes = [1680, 2050, 1840];
    notes.forEach((frequency, index) => {
      const osc = this.context.createOscillator();
      const amp = this.context.createGain();
      const start = now + index * 0.085;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.12, start + 0.055);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(0.012, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
      osc.connect(amp); amp.connect(this.master);
      osc.start(start); osc.stop(start + 0.09);
      osc.onended = () => { osc.disconnect(); amp.disconnect(); };
    });
  }

  landing(impact) {
    this.ensureStarted();
    const strength = Math.min(1, Math.max(0, (impact - 2.5) / 12));
    if (strength <= 0) return;
    this.playTone({ frequency: 95, endFrequency: 48, duration: 0.13 + strength * 0.08, gain: 0.035 + strength * 0.12, type: 'triangle' });
  }

  collision(speed) {
    this.ensureStarted();
    const strength = Math.min(1, Math.max(0.2, speed / 25));
    this.playTone({ frequency: 150, endFrequency: 45, duration: 0.18, gain: 0.07 + strength * 0.1, type: 'sawtooth' });
  }

  liftBoard() {
    this.ensureStarted();
    this.playTone({ frequency: 340, endFrequency: 520, duration: 0.16, gain: 0.055, type: 'triangle' });
  }

  trickLanded() {
    this.ensureStarted();
    this.playTone({ frequency: 520, endFrequency: 760, duration: 0.11, gain: 0.035, type: 'sine' });
  }

  setHeliActive(active) {
    this.ensureStarted();
    this.heliActive = Boolean(active);
  }

  heliStart() {
    this.ensureStarted();
    this.playTone({ frequency: 68, endFrequency: 96, duration: 0.7, gain: 0.05, type: 'sawtooth' });
  }

  setAvalancheActive(active) {
    this.ensureStarted();
    this.avalancheActive = Boolean(active);
  }

  avalancheWarning() {
    this.ensureStarted();
    this.playTone({ frequency: 420, endFrequency: 190, duration: 0.55, gain: 0.08, type: 'sawtooth' });
  }

}
