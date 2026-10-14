import { snapHalfTurnDegrees } from './trickMath.js';

function spinLabel(radians) {
  const snapped = snapHalfTurnDegrees(radians);
  if (!snapped) return null;
  return `${radians <= 0 ? 'CW' : 'CCW'} ${snapped}`;
}

function flipLabel(radians) {
  const snapped = snapHalfTurnDegrees(radians);
  if (!snapped) return null;
  const flips = Math.max(1, Math.round(snapped / 360));
  const direction = radians >= 0 ? 'FRONT FLIP' : 'BACK FLIP';
  return flips === 1 ? direction : `${flips}× ${direction}`;
}

export class TrickSystem {
  constructor(save, hud, challenges) {
    this.save = save;
    this.hud = hud;
    this.challenges = challenges;
    this.multiplier = 1;
    this.lineScore = 0;
    this.comboTimer = 0;
    this.uniqueGrinds = new Set();
    this.recentTricks = [];
    this.hud.updateCombo(this.multiplier, this.lineScore);
  }

  resetLine(message = '') {
    if (this.lineScore > 0 && message) this.hud.showMessage(message, 1.1);
    this.multiplier = 1;
    this.lineScore = 0;
    this.comboTimer = 0;
    this.hud.updateCombo(this.multiplier, this.lineScore);
    this.recentTricks = [];
  }

  step(state, dt = 1 / 120) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.resetLine('LINE BANKED');
    }

    if (state.justEndedGrind && state.lastGrindDistance > 1.5) {
      const base = Math.round(state.lastGrindDistance * 24);
      const result = {
        name: `${state.lastGrindType || '50-50'} · ${state.lastGrindDistance.toFixed(0)} m`,
        baseScore: base,
        grindDistance: state.lastGrindDistance,
        grindType: state.lastGrindType || '50-50',
        spinDegrees: 0,
        flipDegrees: 0,
        grab: null,
      };
      this.uniqueGrinds.add(result.grindType);
      this.commit(result, state, false, 1);
    }

    if (!state.justLanded) return;

    // v0.3 called normal jump impacts "hard landings" far too often. A proper
    // line loss now requires a genuinely severe impact; medium impacts are just
    // sketchy and preserve the combo.
    if (state.lastLandingImpact > 18.5) {
      this.hud.showTrick('HARD LANDING · LINE LOST', 0, 1.25, 0, this.multiplier);
      this.resetLine();
      return;
    }

    const spinDegrees = snapHalfTurnDegrees(state.lastAirYaw);
    const flipDegrees = snapHalfTurnDegrees(state.lastAirPitch);
    const spin = spinLabel(state.lastAirYaw);
    const flip = flipLabel(state.lastAirPitch);
    const parts = [];
    let baseScore = 0;

    if (spin) {
      parts.push(spin);
      baseScore += Math.round(spinDegrees * 1.4);
    }
    if (flip) {
      parts.push(flip);
      baseScore += Math.round(flipDegrees * 1.72);
    }
    if ((state.lastSpreadEagleTime ?? 0) >= 0.18) {
      const held = Math.min(1.4, state.lastSpreadEagleTime);
      parts.push(held > 0.7 ? 'HELD SPREAD EAGLE' : 'SPREAD EAGLE');
      baseScore += Math.round(230 + held * 210);
    }
    if ((state.lastCrossSkisTime ?? 0) >= 0.16) {
      const held = Math.min(1.2, state.lastCrossSkisTime);
      parts.push(held > 0.65 ? 'HELD CROSSED SKIS' : 'CROSSED SKIS');
      baseScore += Math.round(190 + held * 180);
    }
    if ((state.lastDaffyTime ?? 0) >= 0.14) {
      const held = Math.min(1.35, state.lastDaffyTime);
      parts.push(held > 0.65 ? 'HELD DAFFY' : 'DAFFY');
      baseScore += Math.round(250 + held * 220);
    }

    if (state.lastAirGrab) {
      const tweakAmount = state.lastAirGrabTweak?.magnitude ?? 0;
      const tweaked = tweakAmount >= 0.22;
      const directional = /METHOD|STIFFY|CROSSBONE/.test(state.lastAirGrab);
      parts.push(directional
        ? `${state.lastAirGrab}${tweaked ? ` · ${Math.round(tweakAmount * 100)}% TWEAK` : ''}`
        : `${state.lastAirGrab}${tweaked ? ' TWEAK' : ''} GRAB`);
      const mouseDouble = state.lastAirGrab === 'DOUBLE';
      const advanced = /FS|BS|JAPAN|STALEFISH|METHOD|STIFFY|CROSSBONE/.test(state.lastAirGrab);
      baseScore += mouseDouble ? 410 : advanced ? 420 : 275;
      if (tweaked) baseScore += Math.round(120 + tweakAmount * 230);
      const hold = state.lastAirGrabTime ?? 0;
      if (hold >= 0.35) {
        const holdBonus = Math.min(260, Math.round((hold - 0.25) * 210));
        baseScore += holdBonus;
        if (hold >= 0.75) parts.push('HELD');
      }
    }

    if (baseScore <= 0) return;
    if (state.lastSwitchLanding && spinDegrees >= 180) parts.push('TO SWITCH');
    if (parts.length > 1) baseScore = Math.round(baseScore * (1 + (parts.length - 1) * 0.2));

    const sketchy = state.lastLandingImpact > 13.5;
    const clean = !sketchy && state.lastLandingImpact < 7.0 && (spinDegrees >= 180 || flipDegrees >= 360 || state.lastAirGrab || (state.lastDaffyTime ?? 0) >= 0.14);
    const landingFactor = sketchy ? 0.82 : clean ? 1.08 : 1;
    if (sketchy) parts.push('SKETCHY');
    else if (clean) parts.push('CLEAN');

    this.commit({
      name: parts.join(' + '),
      baseScore,
      grindDistance: 0,
      grindType: null,
      spinDegrees,
      flipDegrees,
      grab: state.lastAirGrab,
      spreadEagle: (state.lastSpreadEagleTime ?? 0) >= 0.18,
      crossSkis: (state.lastCrossSkisTime ?? 0) >= 0.16,
      daffy: (state.lastDaffyTime ?? 0) >= 0.14,
      daffyTime: state.lastDaffyTime ?? 0,
      grabTweak: state.lastAirGrabTweak?.magnitude ?? 0,
    }, state, true, landingFactor);
  }

  commit(result, state, awardCredits, landingFactor = 1) {
    const signature = `${result.spinDegrees || 0}|${result.flipDegrees || 0}|${result.grab || ''}|${result.grindType || ''}`;
    const repeatCount = this.recentTricks.filter((entry) => entry === signature).length;
    const repetitionFactor = repeatCount === 0 ? 1 : repeatCount === 1 ? 0.78 : 0.58;
    const landedScore = Math.round(result.baseScore * this.multiplier * landingFactor * repetitionFactor);
    this.recentTricks.push(signature);
    if (this.recentTricks.length > 5) this.recentTricks.shift();
    this.lineScore += landedScore;
    const multiplierStep = landingFactor < 1 ? 0.1 : 0.25;
    this.multiplier = Math.min(5, Math.round((this.multiplier + multiplierStep) * 4) / 4);
    this.comboTimer = landingFactor < 1 ? 4.5 : 6.5;

    this.save.addTrickScore(landedScore);
    if (landedScore >= 120) { this.save.addXP(Math.min(70, Math.max(2, Math.floor(landedScore / 55)))); this.hud.updateProgress(this.save); }
    let credits = 0;
    if (awardCredits && landedScore >= 300) {
      credits = Math.max(3, Math.min(40, Math.floor(landedScore / 185)));
      this.save.addCredits(credits);
      this.hud.updateCredits(this.save.getCredits());
    }

    this.hud.updateCombo(this.multiplier, this.lineScore);
    const displayName = repetitionFactor < 1 ? `${result.name} · REPEAT ×${repetitionFactor.toFixed(2)}` : result.name;
    this.hud.showTrick(displayName, landedScore, 2.1, credits, this.multiplier);
    this.challenges.onTrick({
      ...result,
      score: landedScore,
      lineScore: this.lineScore,
      multiplier: this.multiplier,
      uniqueGrinds: this.uniqueGrinds.size,
    }, state);
  }
}
