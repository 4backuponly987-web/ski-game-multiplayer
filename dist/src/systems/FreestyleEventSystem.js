import * as THREE from 'three';
import { getRun } from '../world/RunDefinitions.js';

export { FREESTYLE_EVENTS } from './freestyleEventData.js';
import { FREESTYLE_EVENTS, freestyleMedal } from './freestyleEventData.js';

export class FreestyleEventSystem {
  constructor(save, hud, challenges = null) {
    this.save = save;
    this.hud = hud;
    this.challenges = challenges;
    this.event = null;
    this.countdown = 0;
    this.timeLeft = 0;
    this.running = false;
    this.startTotalScore = 0;
    this.score = 0;
    this.lastCountdownSecond = null;
  }

  arm(eventId, physics) {
    const event = FREESTYLE_EVENTS.find((item) => item.id === eventId);
    if (!event) return false;
    this.cancel();
    this.event = event;
    this.countdown = 3.15;
    this.timeLeft = event.duration;
    this.running = false;
    this.startTotalScore = this.save.data.totalTrickScore || 0;
    this.score = 0;
    this.lastCountdownSecond = 4;
    const run = getRun('park');
    const z = -1080;
    physics.resetAt(run.centerAt(z) + event.offsetX, z, new THREE.Vector3(0, 0, 1));
    this.hud.showMessage(`${event.lane} PARK · ${event.name.toUpperCase()} · GET READY`, 2.2);
    return true;
  }

  cancel() {
    this.event = null;
    this.countdown = 0;
    this.timeLeft = 0;
    this.running = false;
    this.score = 0;
    this.hud.setRace(null);
  }

  updateFixed(dt, physics) {
    if (!this.event) return false;
    if (this.countdown > 0) {
      physics.velocity.set(0, 0, 0);
      this.countdown = Math.max(0, this.countdown - dt);
      const sec = Math.ceil(this.countdown);
      if (sec !== this.lastCountdownSecond) {
        this.lastCountdownSecond = sec;
        this.hud.showMessage(sec > 0 ? String(sec) : 'DROP!', sec > 0 ? 0.75 : 1.0);
      }
      if (this.countdown <= 0) {
        this.running = true;
        this.startTotalScore = this.save.data.totalTrickScore || 0;
      }
      this.hud.setRace({ name: this.event.name, timeLeft: this.event.duration, score: 0, countdown: Math.ceil(this.countdown), freestyle: true });
      return true;
    }
    return false;
  }

  update(dt) {
    if (!this.event || !this.running) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.score = Math.max(0, Math.round((this.save.data.totalTrickScore || 0) - this.startTotalScore));
    this.hud.setRace({ name: this.event.name, timeLeft: this.timeLeft, score: this.score, freestyle: true });
    if (this.timeLeft <= 0) this.finish();
  }

  finish() {
    if (!this.event || !this.running) return;
    this.running = false;
    this.score = Math.max(0, Math.round((this.save.data.totalTrickScore || 0) - this.startTotalScore));
    const medal = freestyleMedal(this.score, this.event.thresholds);
    const previous = this.save.getFreestyleBest(this.event.id);
    const isPB = previous == null || this.score > previous;
    if (isPB) this.save.setFreestyleBest(this.event.id, this.score);
    const medalMultiplier = medal === 'GOLD' ? 1 : medal === 'SILVER' ? 0.72 : medal === 'BRONZE' ? 0.48 : 0.18;
    const reward = isPB ? Math.round(this.event.reward * medalMultiplier) : 0;
    const xp = isPB ? Math.max(35, Math.round(reward * 0.78)) : 0;
    if (reward) this.save.addCredits(reward);
    if (xp) this.save.addXP(xp);
    this.challenges?.onFreestyleEvent?.(this.event.id, medal, this.score);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    this.hud.showMessage(`${medal} · ${this.score.toLocaleString()} PTS${isPB ? ' · PERSONAL BEST' : ''}${reward ? ` · +${reward} C · +${xp} XP` : ''}`, 4.0);
    this.hud.setRace({ name: this.event.name, timeLeft: 0, score: this.score, freestyle: true, finished: true, medal });
  }

  getEvents() {
    return FREESTYLE_EVENTS.map((event) => ({ ...event, best: this.save.getFreestyleBest(event.id) }));
  }
}
