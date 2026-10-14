export class ReplayUI {
  constructor(game, replay) {
    this.game = game;
    this.replay = replay;
    this.root = document.querySelector('#replay-editor');
    this.scrub = document.querySelector('#replay-scrub');
    this.time = document.querySelector('#replay-time');
    this.play = document.querySelector('#replay-play');
    this.camera = document.querySelector('#replay-camera');
    this.loop = document.querySelector('#replay-loop');
    this.meta = document.querySelector('#replay-meta');
    this.trim = document.querySelector('#replay-trim');

    document.querySelector('#replay-close')?.addEventListener('click', () => this.game.closeReplayEditor());
    this.play?.addEventListener('click', () => { this.replay.togglePlaying(); this.sync(); });
    this.camera?.addEventListener('click', () => { this.replay.cycleCameraMode(); this.sync(); });
    this.loop?.addEventListener('click', () => { this.replay.setLoop(!this.replay.loop); this.sync(); });
    document.querySelector('#replay-in')?.addEventListener('click', () => { this.replay.setTrimIn(); this.sync(); });
    document.querySelector('#replay-out')?.addEventListener('click', () => { this.replay.setTrimOut(); this.sync(); });
    document.querySelector('#replay-reset-trim')?.addEventListener('click', () => { this.replay.resetTrim(); this.sync(); });
    this.root?.querySelectorAll('[data-replay-speed]').forEach((button) => {
      button.addEventListener('click', () => { this.replay.setSpeed(Number(button.dataset.replaySpeed)); this.sync(); });
    });
    this.scrub?.addEventListener('input', () => {
      this.replay.setPlaying(false);
      this.replay.seek(Number(this.scrub.value));
      this.sync();
    });
  }

  show(show) {
    this.root?.classList.toggle('hidden', !show);
    this.root?.setAttribute('aria-hidden', String(!show));
    if (show) this.sync(true);
  }

  formatTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe - mins * 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  }

  sync(forceBounds = false) {
    if (!this.root || !this.replay.editorOpen) return;
    const duration = this.replay.duration;
    if (forceBounds || Number(this.scrub.max) !== duration) {
      this.scrub.min = '0';
      this.scrub.max = String(duration || 0.01);
      this.scrub.step = String(this.replay.sampleInterval);
    }
    this.scrub.value = String(this.replay.playbackTime);
    this.play.textContent = this.replay.playing ? 'PAUSE' : 'PLAY';
    this.camera.textContent = `CAMERA · ${this.replay.cameraMode.toUpperCase()}`;
    this.loop.textContent = this.replay.loop ? 'LOOP · ON' : 'LOOP · OFF';
    this.root.querySelectorAll('[data-replay-speed]').forEach((button) => button.classList.toggle('active', Number(button.dataset.replaySpeed) === this.replay.playbackSpeed));
    this.time.textContent = `${this.formatTime(this.replay.playbackTime)} / ${this.formatTime(duration)}`;
    this.trim.textContent = `TRIM ${this.formatTime(this.replay.trimIn)} → ${this.formatTime(this.replay.trimOut)}`;
    const frame = this.replay.getCurrentFrameInfo();
    const speed = Math.round((frame.speed || 0) * 3.6);
    const extras = [frame.surface, frame.trick].filter(Boolean).join(' · ');
    this.meta.textContent = `${speed} KM/H${extras ? ` · ${extras}` : ''}`;
  }

  update() {
    if (this.replay.editorOpen) this.sync();
  }
}
