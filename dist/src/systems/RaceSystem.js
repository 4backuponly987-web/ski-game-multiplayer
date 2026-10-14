import * as THREE from 'three';
import { getRun } from '../world/RunDefinitions.js';
import { medalForTime, passedGate, missedGate, raceDirectionYaw } from './raceMath.js';

export const RACE_EVENTS = Object.freeze([
  {
    id: 'flow-gs', name: 'Alpine Flow GS', type: 'GIANT SLALOM', runId: 'flow',
    startZ: -1020, finishZ: 1015, gateCount: 11, halfWidth: 15,
    thresholds: { gold: 46, silver: 55, bronze: 68 }, reward: 420,
    description: 'Wide alternating gates reward clean carving and carrying speed across the whole blue piste.',
  },
  {
    id: 'velocity-downhill', name: 'Velocity Downhill', type: 'DOWNHILL', runId: 'velocity',
    startZ: -1035, finishZ: 1030, gateCount: 8, halfWidth: 28,
    thresholds: { gold: 35, silver: 43, bronze: 54 }, reward: 520,
    description: 'Stay in the fall line, clear every mandatory speed gate and survive the exposed black face.',
  },
  {
    id: 'pine-slalom', name: 'Pine Line Slalom', type: 'SLALOM', runId: 'pine',
    startZ: -995, finishZ: 980, gateCount: 15, halfWidth: 9,
    thresholds: { gold: 54, silver: 65, bronze: 79 }, reward: 480,
    description: 'Tight red/blue gates snake through the forest corridor. Precision matters more than raw speed.',
  },
]);


function createGroundArrow(group, terrain, from, target, color = 0xffd34a, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 2.9);
  shape.lineTo(1.45, 0.9);
  shape.lineTo(0.6, 0.9);
  shape.lineTo(0.6, -2.2);
  shape.lineTo(-0.6, -2.2);
  shape.lineTo(-0.6, 0.9);
  shape.lineTo(-1.45, 0.9);
  shape.lineTo(0, 2.9);
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.94, side: THREE.DoubleSide,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  });
  const arrowGroup = new THREE.Group();
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const yaw = raceDirectionYaw(from, target);
  [0.46, 0.66, 0.82].forEach((t, idx) => {
    const x = THREE.MathUtils.lerp(from.x, target.x, t);
    const z = THREE.MathUtils.lerp(from.z, target.z, t);
    const y = terrain.getHeight(x, z) + 0.14 + idx * 0.003;
    const mesh = new THREE.Mesh(geo, mat);
    // Shape tip is +Y. +90° around X maps it to +Z, then yaw aims that
    // downhill arrow directly at the CURRENT mandatory gate.
    mesh.rotation.set(0, yaw, 0);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale * (idx === 0 ? 1.28 : idx === 1 ? 1.08 : 0.92));
    mesh.renderOrder = 20;
    arrowGroup.add(mesh);
  });
  group.add(arrowGroup);
  return arrowGroup;
}

function buildGates(event) {
  const run = getRun(event.runId);
  const gates = [];
  for (let i = 0; i < event.gateCount; i += 1) {
    const t = (i + 1) / (event.gateCount + 1);
    const z = THREE.MathUtils.lerp(event.startZ + 45, event.finishZ - 45, t);
    const alternating = event.type === 'DOWNHILL' ? Math.sin(i * 1.7) * 5 : (i % 2 === 0 ? -1 : 1) * (event.type === 'SLALOM' ? 10 : 19);
    gates.push({ z, x: run.centerAt(z) + alternating, halfWidth: event.halfWidth, index: i });
  }
  return gates;
}

export class RaceSystem {
  constructor(scene, terrain, save, hud, challenges = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.save = save;
    this.hud = hud;
    this.challenges = challenges;
    this.groups = new Map();
    this.event = null;
    this.gates = [];
    this.gateIndex = 0;
    this.elapsed = 0;
    this.countdown = 0;
    this.running = false;
    this.failed = false;
    this.lastZ = -Infinity;
    this.lastCountdownSecond = null;
    // Race gates are built only when the player starts a race. Keeping three
    // complete gate courses out of initial boot removes unnecessary startup work.
  }

  createVisuals(eventId = null) {
    const poleGeo = new THREE.CylinderGeometry(0.055, 0.065, 2.7, 7);
    for (const event of RACE_EVENTS) {
      if (eventId && event.id !== eventId) continue;
      if (this.groups.has(event.id)) continue;
      const group = new THREE.Group();
      group.name = `${event.name} race gates`;
      group.visible = false;
      const gates = buildGates(event);
      const arrowGroups = [];
      const run = getRun(event.runId);
      gates.forEach((gate, i) => {
        const mat = new THREE.MeshStandardMaterial({
          color: i % 2 ? 0xe03f47 : 0x318fd4,
          roughness: 0.55,
          emissive: i % 2 ? 0x421014 : 0x0d3150,
          emissiveIntensity: 0.28,
        });
        for (const side of [-1, 1]) {
          const x = gate.x + side * gate.halfWidth;
          const y = this.terrain.getHeight(x, gate.z);
          const pole = new THREE.Mesh(poleGeo, mat);
          pole.position.set(x, y + 1.35, gate.z);
          pole.castShadow = true;
          group.add(pole);
        }
        const previous = i === 0
          ? { x: run.centerAt(event.startZ), z: event.startZ }
          : { x: gates[i - 1].x, z: gates[i - 1].z };
        const arrows = createGroundArrow(
          group,
          this.terrain,
          previous,
          gate,
          i % 2 ? 0xff685d : 0x4fd0ff,
          event.type === 'DOWNHILL' ? 1.50 : 1.26,
        );
        arrows.visible = false;
        arrowGroups.push(arrows);
      });
      this.scene.add(group);
      this.groups.set(event.id, { group, gates, arrowGroups });
    }
  }

  updateTargetArrows() {
    if (!this.event) return;
    const entry = this.groups.get(this.event.id);
    if (!entry?.arrowGroups) return;
    entry.arrowGroups.forEach((group, index) => {
      group.visible = !this.failed && index === this.gateIndex;
    });
  }

  arm(eventId, physics) {
    const event = RACE_EVENTS.find((item) => item.id === eventId);
    if (!event) return false;
    if (!this.groups.has(event.id)) this.createVisuals(event.id);
    this.cancel();
    this.event = event;
    this.gates = this.groups.get(event.id)?.gates || buildGates(event);
    this.groups.get(event.id).group.visible = true;
    this.gateIndex = 0;
    this.updateTargetArrows();
    this.elapsed = 0;
    this.countdown = 3.15;
    this.lastCountdownSecond = 4;
    this.running = false;
    this.failed = false;
    this.lastZ = event.startZ - 8;
    const run = getRun(event.runId);
    physics.resetAt(run.centerAt(event.startZ - 18), event.startZ - 18, new THREE.Vector3(0, 0, 1));
    this.hud.showMessage(`${event.type} · ${event.name.toUpperCase()} · GET READY`, 2.2);
    return true;
  }

  cancel() {
    if (this.event && this.groups.get(this.event.id)) this.groups.get(this.event.id).group.visible = false;
    this.event = null;
    this.gates = [];
    this.gateIndex = 0;
    this.elapsed = 0;
    this.countdown = 0;
    this.running = false;
    this.failed = false;
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
        this.hud.showMessage(sec > 0 ? String(sec) : 'GO!', sec > 0 ? 0.75 : 1.0);
      }
      if (this.countdown <= 0) {
        this.running = true;
        this.lastZ = physics.position.z;
      }
      this.hud.setRace({ name: this.event.name, timer: 0, gate: 0, gateCount: this.gates.length, countdown: Math.ceil(this.countdown) });
      return true;
    }
    return false;
  }

  update(state, dt) {
    if (!this.event || !this.running || this.failed) return;
    this.elapsed += dt;
    const gate = this.gates[this.gateIndex];
    if (gate && passedGate(this.lastZ, state.position, gate)) {
      this.gateIndex += 1;
      this.updateTargetArrows();
      this.hud.showMessage(`GATE ${this.gateIndex}/${this.gates.length}`, 0.55);
    } else if (gate && missedGate(state.position, gate)) {
      this.failed = true;
      this.running = false;
      this.updateTargetArrows();
      this.hud.showMessage(`MISSED GATE ${this.gateIndex + 1} · R TO RETRY`, 2.4);
    }
    this.lastZ = state.position.z;

    if (this.gateIndex >= this.gates.length && state.position.z >= this.event.finishZ) this.finish();
    this.hud.setRace({
      name: this.event.name,
      timer: this.elapsed,
      gate: this.gateIndex,
      gateCount: this.gates.length,
      failed: this.failed,
    });
  }

  finish() {
    if (!this.event || !this.running) return;
    this.running = false;
    const time = this.elapsed;
    const medal = medalForTime(time, this.event.thresholds);
    this.challenges?.onRace(this.event.id, medal);
    const previous = this.save.getRaceBest(this.event.id);
    const isPB = previous == null || time < previous;
    if (isPB) this.save.setRaceBest(this.event.id, time);
    let reward = 0;
    let xp = 0;
    if (isPB) {
      reward = previous == null ? this.event.reward : 90;
      xp = previous == null ? Math.round(this.event.reward * 0.75) : 80;
      this.save.addCredits(reward);
      this.save.addXP(xp);
      this.hud.updateCredits(this.save.getCredits());
      this.hud.updateProgress(this.save);
    }
    this.hud.showMessage(`${medal} · ${time.toFixed(2)}s${isPB ? ' · PERSONAL BEST' : ''}${reward ? ` · +${reward} C · +${xp} XP` : ''}`, 4.0);
    this.hud.setRace({ name: this.event.name, timer: time, gate: this.gates.length, gateCount: this.gates.length, finished: true, medal });
  }

  getEvents() {
    return RACE_EVENTS.map((event) => ({ ...event, best: this.save.getRaceBest(event.id) }));
  }
}
