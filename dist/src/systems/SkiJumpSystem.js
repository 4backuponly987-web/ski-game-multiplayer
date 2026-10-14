import * as THREE from 'three';
import { SPECIAL_ZONES } from '../world/SpecialZones.js';

export const SKI_JUMP_EVENT = {
  id: 'alpine-flight',
  name: 'Alpine Flight K120',
  medals: { gold: 165, silver: 140, bronze: 115 },
};

function makeTakeoffRibbon(terrain, zone, material) {
  const positions = [];
  const indices = [];
  const startZ = zone.takeoffZ - 118;
  const endZ = zone.takeoffZ + 2;
  const segments = 30;
  const halfWidth = 12;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const z = THREE.MathUtils.lerp(startZ, endZ, t);
    for (const side of [-1, 1]) {
      const x = zone.centerX + side * halfWidth;
      const y = terrain.getHeight(x, z) + 0.07;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2; const b = a + 1; const c = a + 2; const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material); mesh.receiveShadow = true;
  return mesh;
}

export class SkiJumpSystem {
  constructor(scene, terrain, save, hud, challenges = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.save = save;
    this.hud = hud;
    this.challenges = challenges;
    this.active = false;
    this.airborneStarted = false;
    this.takeoffPoint = null;
    this.airtime = 0;
    this.currentDistance = 0;
    this.bestDistance = Number(save.getSetting('skiJumpBest', 0)) || 0;
    this.venueBuilt = false;
  }

  buildVenue() {
    const zone = SPECIAL_ZONES.skiJump;
    const metal = new THREE.MeshStandardMaterial({ color: 0x42525d, roughness: 0.46, metalness: 0.55 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2f8fd0, roughness: 0.5, emissive: 0x0a2f48, emissiveIntensity: 0.28 });
    const snow = new THREE.MeshStandardMaterial({ color: 0xe8f2f6, roughness: 0.96 });
    const y = this.terrain.getHeight(zone.centerX, zone.startZ + 50);
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(13, 7, 10), metal);
    body.position.set(zone.centerX, y + 4, zone.startZ + 45); house.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.6, 12), snow);
    roof.position.set(zone.centerX, y + 7.7, zone.startZ + 45); house.add(roof);
    this.scene.add(house);

    // The takeoff table is a visible overlay on the real terrain surface. The
    // collision remains the same terrain height sampler, so visuals/physics agree.
    this.scene.add(makeTakeoffRibbon(this.terrain, zone, new THREE.MeshStandardMaterial({ color: 0xd9edf5, roughness: 0.83 })));
    for (const side of [-1, 1]) {
      const x = zone.centerX + side * 12.2;
      const points = [];
      for (let i = 0; i <= 18; i += 1) {
        const z = THREE.MathUtils.lerp(zone.takeoffZ - 118, zone.takeoffZ + 2, i / 18);
        points.push(new THREE.Vector3(x, this.terrain.getHeight(x, z) + 0.32, z));
      }
      const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.09, 6, false), blue);
      edge.castShadow = true; this.scene.add(edge);
    }
    const lipY = this.terrain.getHeight(zone.centerX, zone.takeoffZ);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(25.5, 0.18, 1.1), blue);
    lip.position.set(zone.centerX, lipY + 0.12, zone.takeoffZ); lip.receiveShadow = true; this.scene.add(lip);

    for (let distance = 60; distance <= 220; distance += 20) {
      const z = zone.takeoffZ + distance;
      const yy = this.terrain.getHeight(zone.centerX + zone.halfWidth * 0.68, z);
      const board = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.0, 0.35), blue);
      board.position.set(zone.centerX + zone.halfWidth * 0.68, yy + 1.2, z); this.scene.add(board);
      const stripeY = this.terrain.getHeight(zone.centerX, z) + 0.075;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(30, 0.04, 0.45), blue);
      stripe.position.set(zone.centerX, stripeY, z); this.scene.add(stripe);
    }
  }

  start(physics) {
    if (!this.venueBuilt) { this.buildVenue(); this.venueBuilt = true; }
    const zone = SPECIAL_ZONES.skiJump;
    physics.resetAt(zone.spawn.x, zone.spawn.z, new THREE.Vector3(0, 0, 1));
    physics.setActivityMode('ski-jump');
    this.active = true;
    this.airborneStarted = false;
    this.takeoffPoint = null;
    this.airtime = 0;
    this.currentDistance = 0;
    this.hud.setRace({ flight: true, name: 'ALPINE FLIGHT', airtime: 0, distance: 0, speed: 0 });
    this.hud.showMessage('ALPINE FLIGHT · RIDE THE TAKEOFF RAMP · W V-STYLE · F SPREAD EAGLE', 3.2);
  }

  cancel(physics) {
    if (physics?.activityMode === 'ski-jump') physics.setActivityMode(null);
    this.active = false;
    this.airborneStarted = false;
    this.hud.setRace(null);
  }

  update(state, physics, dt = 1 / 120) {
    if (!this.active) return;
    const zone = SPECIAL_ZONES.skiJump;

    // Leave the physical takeoff table with the exact velocity generated by the
    // ramp. No hidden upward impulse is applied.
    if (!this.airborneStarted && state.grounded && state.position.z >= zone.takeoffZ - 1.4 && state.position.z <= zone.takeoffZ + 5 && state.speed > 14) {
      this.takeoffPoint = state.position.clone();
      this.airborneStarted = physics.leaveTerrainLip();
      this.airtime = 0;
      this.currentDistance = 0;
    }

    if (this.airborneStarted && !state.grounded) {
      this.airtime += dt;
      const dz = state.position.z - (this.takeoffPoint?.z ?? zone.takeoffZ);
      const dx = state.position.x - (this.takeoffPoint?.x ?? zone.centerX);
      this.currentDistance = Math.max(0, Math.hypot(dx, dz));
      this.hud.setRace({ flight: true, name: 'ALPINE FLIGHT', airtime: this.airtime, distance: this.currentDistance, speed: state.speed });
    } else if (!this.airborneStarted) {
      this.hud.setRace({ flight: true, name: 'ALPINE FLIGHT · INRUN', airtime: 0, distance: 0, speed: state.speed });
    }

    if (this.airborneStarted && state.justLanded) {
      const distance = this.currentDistance;
      const medal = distance >= SKI_JUMP_EVENT.medals.gold ? 'GOLD' : distance >= SKI_JUMP_EVENT.medals.silver ? 'SILVER' : distance >= SKI_JUMP_EVENT.medals.bronze ? 'BRONZE' : null;
      const quality = state.lastLandingImpact < 6 ? 'CLEAN' : state.lastLandingImpact < 11 ? 'HEAVY' : 'ROUGH';
      if (distance > this.bestDistance) { this.bestDistance = distance; this.save.setSetting('skiJumpBest', Number(distance.toFixed(1))); }
      this.challenges?.onSkiJump(distance);
      const credits = medal === 'GOLD' ? 180 : medal === 'SILVER' ? 110 : medal === 'BRONZE' ? 70 : 25;
      this.save.addCredits(credits); this.save.addXP(credits);
      this.hud.updateCredits(this.save.getCredits()); this.hud.updateProgress(this.save);
      this.hud.showMessage(`${distance.toFixed(1)} M · ${this.airtime.toFixed(2)}s AIR · ${quality} · ${medal || 'RECORDED'} · BEST ${this.bestDistance.toFixed(1)} M`, 4.5);
      this.hud.setRace({ flight: true, name: `ALPINE FLIGHT · ${quality}`, airtime: this.airtime, distance, speed: state.speed });
      this.airborneStarted = false; this.takeoffPoint = null; this.airtime = 0; this.currentDistance = 0;
    }
  }
}
