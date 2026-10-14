import * as THREE from 'three';
import { SPECIAL_ZONES } from '../world/SpecialZones.js';

export class AvalancheSystem {
  constructor(scene, terrain, save, hud, audio, challenges = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.save = save;
    this.hud = hud;
    this.audio = audio;
    this.challenges = challenges;
    this.state = 'idle';
    this.timer = 0;
    this.frontZ = 0;
    this.zoneId = null;
    this.triggered = new Set();
    this.createVisual();
  }

  createVisual() {
    const geometry = new THREE.BufferGeometry();
    this.count = 420;
    this.positions = new Float32Array(this.count * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xeaf5fa, size: 1.35, transparent: true, opacity: 0.72, depthWrite: false });
    this.points = new THREE.Points(geometry, mat);
    this.points.visible = false;
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  maybeTrigger(state) {
    if (this.state !== 'idle' || state.crashed || !state.skisEquipped) return;
    const p = state.position;
    const heli = SPECIAL_ZONES.heli;
    const inHeli = Math.abs(p.x - heli.centerX) < heli.halfWidth && p.z > -520 && p.z < -420;
    const inWild = p.x < -650 && p.x > -1040 && p.z > 250 && p.z < 340;
    const id = inHeli ? 'heli-avalanche' : inWild ? 'wild-avalanche' : null;
    if (!id || this.triggered.has(id)) return;
    this.triggered.add(id);
    this.zoneId = id;
    this.state = 'warning';
    this.timer = 2.8;
    this.frontZ = p.z - 105;
    this.hud.showMessage('⚠ AVALANCHE WARNING · SKI FOR SAFE TERRAIN', 2.8);
    this.audio?.avalancheWarning?.();
  }

  update(dt, state, physics) {
    this.maybeTrigger(state);
    if (this.state === 'idle') return;
    this.timer -= dt;
    if (this.state === 'warning') {
      if (this.timer <= 0) {
        this.state = 'running';
        this.timer = 10.5;
        this.points.visible = true;
        this.audio?.setAvalancheActive?.(true);
      }
      return;
    }

    if (this.state === 'running') {
      this.frontZ += dt * 31;
      const p = state.position;
      const centerX = this.zoneId === 'heli-avalanche' ? SPECIAL_ZONES.heli.centerX : -825;
      for (let i = 0; i < this.count; i += 1) {
        const angle = i * 2.399963 + this.timer * 0.8;
        const lateral = Math.sin(angle * 1.73) * 145 + Math.cos(angle) * 45;
        const z = this.frontZ - (i % 34) * 2.5 + Math.sin(angle) * 9;
        const x = centerX + lateral;
        const y = this.terrain.getHeight(x, z) + 0.6 + (i % 9) * 0.35;
        const j = i * 3;
        this.positions[j] = x;
        this.positions[j + 1] = y;
        this.positions[j + 2] = z;
      }
      this.points.geometry.attributes.position.needsUpdate = true;

      const caught = Math.abs(p.x - centerX) < 175 && p.z < this.frontZ + 18 && p.z > this.frontZ - 28;
      if (caught && !state.crashed) {
        physics.bail('AVALANCHE', 1.5);
        this.hud.showMessage('CAUGHT BY AVALANCHE · RECOVERING', 2.2);
        this.finish(false);
        return;
      }
      if (this.timer <= 0 || p.z > this.frontZ + 145) this.finish(true);
    }
  }

  finish(escaped) {
    this.points.visible = false;
    this.audio?.setAvalancheActive?.(false);
    if (escaped) {
      this.save.addCredits(140);
      this.save.addXP(180);
      this.hud.updateCredits(this.save.getCredits());
      this.hud.updateProgress(this.save);
      this.challenges?.onAvalancheEscape();
      this.hud.showMessage('AVALANCHE ESCAPED · +140 C · +180 XP', 2.8);
    }
    this.state = 'idle';
    this.timer = 0;
    this.zoneId = null;
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.zoneId = null;
    this.triggered.clear();
    this.points.visible = false;
    this.audio?.setAvalancheActive?.(false);
  }
}
