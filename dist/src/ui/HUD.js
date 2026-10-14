export class HUD {
  constructor() {
    this.root = document.querySelector('#hud');
    this.speed = document.querySelector('#speed-value');
    this.altitude = document.querySelector('#altitude-value');
    this.state = document.querySelector('#state-label');
    this.surface = document.querySelector('#surface-label');
    this.run = document.querySelector('#run-label');
    this.credits = document.querySelector('#credits-value');
    this.level = document.querySelector('#level-value');
    this.xp = document.querySelector('#xp-value');
    this.combo = document.querySelector('#combo-value');
    this.comboScore = document.querySelector('#combo-score');
    this.message = document.querySelector('#center-message');
    this.trick = document.querySelector('#trick-popup');
    this.interaction = document.querySelector('#interaction-prompt');
    this.crosshair = document.querySelector('#crosshair');
    this.flash = document.querySelector('#damage-flash');
    this.raceCard = document.querySelector('#race-card');
    this.raceName = document.querySelector('#race-name');
    this.raceTimer = document.querySelector('#race-timer');
    this.raceGates = document.querySelector('#race-gates');
    this.messageTimer = 0;
    this.trickTimer = 0;
    this.flashTimer = 0;
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
    this.root.setAttribute('aria-hidden', String(!visible));
    this.crosshair.classList.toggle('hidden', !visible);
  }

  update(state, dt, input, runInfo = null) {
    const setText=(node,value)=>{const text=String(value);if(node&&node.textContent!==text)node.textContent=text;};
    setText(this.speed,Math.round(state.speed * 3.6));
    setText(this.altitude,`${Math.max(0, Math.round(state.position.y))} m`);
    const crouch = false;
    let stateText='CARVING';
    if (!state.skisEquipped && !state.grounded) stateText = state.spreadEagle ? 'SPREAD FLIGHT' : 'SKIS OFF · AIRBORNE';
    else if (!state.skisEquipped) stateText = state.speed > 0.5 ? 'WALKING' : 'ON FOOT';
    else if (state.grinding) stateText = state.grindType || 'GRINDING';
    else if (!state.grounded) {
      if (state.spreadEagle) stateText = 'SPREAD EAGLE';
      else if (state.crossSkis) stateText = 'CROSSED SKIS';
      else if (state.daffy) stateText = 'DAFFY';
      else if (state.skiJumpPose) stateText = 'V-STYLE FLIGHT';
      else if (state.currentGrab) {
        const tweak = state.currentGrabTweak?.magnitude ?? 0;
        stateText = `${state.currentGrab} GRAB${tweak >= 0.22 ? ` · TWEAK ${Math.round(tweak * 100)}%` : ''}`;
      } else stateText = 'AIRBORNE';
    }
    else if (state.resting) stateText = 'SEATED GLIDE';
    else if (state.polePushing) {
      const side = state.polePushSide === 'left' ? 'LEFT POLE PUSH' : state.polePushSide === 'right' ? 'RIGHT POLE PUSH' : 'DOUBLE POLE PUSH';
      stateText = state.switchStance ? `SWITCH · ${side}` : side;
    }
    else if (state.manualType) stateText = state.switchStance ? `SWITCH · ${state.manualType}` : state.manualType;
    else if (input.isBrakeHeld?.() ?? (input.isDown('KeyS') || input.isDown('ControlLeft') || input.isDown('ControlRight'))) stateText = state.switchStance ? 'SWITCH · PIZZA BRAKE' : 'PIZZA BRAKE';
    else if (crouch && (state.pumpCharge ?? 0) > 0.1) stateText = `PUMP · ${Math.round(state.pumpCharge * 100)}%`;
    else if (crouch) stateText = state.switchStance ? 'SWITCH · CROUCHED' : 'CROUCHED';
    else stateText = state.switchStance ? 'SWITCH · CARVING' : 'CARVING';
    setText(this.state,stateText);

    setText(this.surface,state.surface || 'GROOMED');
    const runText=runInfo?.run && runInfo.distance <= runInfo.run.width + 24
      ? `${runInfo.run.difficulty} · ${runInfo.run.name.toUpperCase()}`
      : 'OFF-PISTE';
    setText(this.run,runText);

    if (this.messageTimer > 0 && (this.messageTimer -= dt) <= 0) this.message.classList.add('hidden');
    if (this.trickTimer > 0 && (this.trickTimer -= dt) <= 0) this.trick.classList.add('hidden');
    if (this.flashTimer > 0 && (this.flashTimer -= dt) <= 0) this.flash.classList.remove('active');
  }

  updateProgress(save) {
    if (!save || !this.level || !this.xp) return;
    const p = save.getLevelProgress();
    this.level.textContent = String(p.level);
    this.xp.textContent = `${p.xp.toLocaleString()} XP`;
  }

  updateCredits(value) { this.credits.textContent = Math.max(0, Math.round(value)); }

  updateCombo(multiplier = 1, lineScore = 0) {
    if (!this.combo || !this.comboScore) return;
    this.combo.textContent = `${multiplier.toFixed(1)}×`;
    this.comboScore.textContent = Math.round(lineScore).toLocaleString();
    this.combo.parentElement?.classList.toggle('hot', multiplier >= 2);
  }

  setRace(info) {
    if (!this.raceCard) return;
    if (!info) {
      this.raceCard.classList.add('hidden');
      return;
    }
    this.raceCard.classList.remove('hidden');
    this.raceName.textContent = info.name || (info.freestyle ? 'FREESTYLE' : 'RACE');
    if (info.flight) {
      this.raceTimer.textContent = `${Number(info.airtime || 0).toFixed(2)}s AIR`;
      this.raceGates.textContent = `${Number(info.distance || 0).toFixed(1)} M · ${Math.round(Number(info.speed || 0) * 3.6)} KM/H`;
    } else if (info.freestyle) {
      this.raceTimer.textContent = `${Math.max(0, Math.ceil(info.timeLeft ?? 0))}s`;
      this.raceGates.textContent = info.countdown > 0 ? `${info.countdown}…` : `${Math.round(info.score ?? 0).toLocaleString()} PTS`;
    } else {
      this.raceTimer.textContent = Number(info.timer || 0).toFixed(2);
      this.raceGates.textContent = info.failed ? 'MISSED GATE' : info.countdown > 0 ? `${info.countdown}…` : `${info.gate ?? 0} / ${info.gateCount ?? 0}`;
    }
  }

  setInteraction(text = '') {
    const next=String(text||'');
    if(this.interaction.textContent!==next)this.interaction.textContent=next;
    const shouldHide=!next;
    if(this.interaction.classList.contains('hidden')!==shouldHide)this.interaction.classList.toggle('hidden',shouldHide);
  }

  showMessage(text, duration = 1.8) {
    this.message.textContent = text;
    this.message.classList.remove('hidden');
    this.messageTimer = duration;
  }

  showTrick(name, score, duration = 1.8, credits = 0, multiplier = 1) {
    this.trick.innerHTML = `<strong>${name}</strong><span>${score > 0 ? `${score.toLocaleString()} PTS · ${multiplier.toFixed(1)}× LINE` : ''}${credits ? ` · +${credits} C` : ''}</span>`;
    this.trick.classList.remove('hidden');
    this.trickTimer = duration;
  }

  collision(kind, speed) {
    this.flash.classList.add('active');
    this.flashTimer = 0.14;
    this.showMessage(`${kind === 'tree' ? 'TREE' : kind === 'log' ? 'FALLEN LOG' : kind === 'station' ? 'LIFT STATION' : kind === 'building' ? 'BUILDING' : kind === 'pole' ? 'PISTE POLE' : kind === 'rope' ? 'BOUNDARY ROPE' : 'ROCK'} IMPACT · ${Math.round(speed * 3.6)} km/h`, 1.25);
  }
}
