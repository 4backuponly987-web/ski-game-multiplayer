import * as THREE from 'three';
import { SPECIAL_ZONES } from '../world/SpecialZones.js';

export { HELISKI_DROPS } from './heliData.js';
import { HELISKI_DROPS } from './heliData.js';

export class HeliSystem {
  constructor(scene, terrain, hud, audio) {
    this.scene = scene;
    this.terrain = terrain;
    this.hud = hud;
    this.audio = audio;
    this.riding = false;
    this.time = 0;
    this.duration = 8.5;
    this.drop = HELISKI_DROPS[1];
    this.buildPickupPad();
    this.buildHelicopter();
  }

  buildPickupPad() {
    const x = -130;
    const z = 1100;
    const y = this.terrain.getHeight(x, z);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x263640, roughness: 0.72, metalness: 0.15 });
    const markMat = new THREE.MeshStandardMaterial({ color: 0xf4d452, roughness: 0.72, emissive: 0x4a3b08, emissiveIntensity: 0.25 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.28, 28), padMat);
    pad.position.set(x, y + 0.13, z);
    pad.receiveShadow = true;
    this.scene.add(pad);
    for (const rot of [0, Math.PI / 2]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 11), markMat);
      stripe.rotation.y = rot;
      stripe.position.set(x, y + 0.31, z);
      this.scene.add(stripe);
    }
    this.pickupPoint = new THREE.Vector3(x, y + 0.3, z);
  }

  buildHelicopter() {
    this.root = new THREE.Group();
    this.root.name = 'Heliski Helicopter';
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc93b35, roughness: 0.48, metalness: 0.18 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c252b, roughness: 0.34, metalness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x5e98ad, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.82 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), bodyMat);
    body.scale.set(1.55, 0.8, 1.05);
    this.root.add(body);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), glass);
    cockpit.position.set(0, 0.15, 1.85);
    cockpit.scale.set(1.25, 0.72, 0.72);
    this.root.add(cockpit);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 6.8, 8), bodyMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.15, -4.1);
    this.root.add(tail);
    const skidGeo = new THREE.CylinderGeometry(0.07, 0.07, 5.3, 7);
    for (const side of [-1, 1]) {
      const skid = new THREE.Mesh(skidGeo, dark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(side * 1.45, -1.3, 0.2);
      this.root.add(skid);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 8), dark);
    mast.position.y = 2.0;
    this.root.add(mast);
    this.rotor = new THREE.Group();
    for (const angle of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 11.5), dark);
      blade.rotation.y = angle;
      this.rotor.add(blade);
    }
    this.rotor.position.y = 2.6;
    this.root.add(this.rotor);
    this.root.visible = false;
    this.scene.add(this.root);
  }

  start(physics, dropId = 'central') {
    this.drop = HELISKI_DROPS.find((item) => item.id === dropId) || HELISKI_DROPS[1];
    this.riding = true;
    this.time = 0;
    const start = this.pickupPoint.clone().add(new THREE.Vector3(0, 12, 0));
    physics.setWorldPose(start, new THREE.Vector3(-1, 0, -1).normalize(), 0);
    physics.setActivityMode('heli');
    this.root.visible = true;
    this.root.position.copy(start).add(new THREE.Vector3(0, 1.8, 0));
    this.hud.showMessage(`HELISKI TRANSFER · ${this.drop.name.toUpperCase()} · SPACE TO SKIP`, 3.0);
    this.audio?.heliStart?.();
  }

  targetPosition() {
    const x = this.drop.x;
    const z = this.drop.z;
    return new THREE.Vector3(x, this.terrain.getHeight(x, z) + 4.5, z);
  }

  step(dt, physics, skip = false) {
    if (!this.riding) return null;
    this.time = skip ? this.duration : Math.min(this.duration, this.time + dt);
    const t = Math.min(1, this.time / this.duration);
    const smooth = t * t * (3 - 2 * t);
    const start = this.pickupPoint.clone().add(new THREE.Vector3(0, 15, 0));
    const end = this.targetPosition();
    // Each destination now gets a genuinely different flight path, not just a
    // tiny sideways offset on the same straight transfer. Quadratic Bezier
    // controls make North, Central and South visibly diverge from the resort.
    const c = this.drop.flightControl || { x: -420, y: 300, z: 0 };
    const control = new THREE.Vector3(c.x, Math.max(start.y, end.y) + c.y, c.z);
    const u = 1 - smooth;
    const pos = start.clone().multiplyScalar(u * u)
      .add(control.clone().multiplyScalar(2 * u * smooth))
      .add(end.clone().multiplyScalar(smooth * smooth));
    const nextT = Math.min(1, smooth + 0.012);
    const nu = 1 - nextT;
    const ahead = start.clone().multiplyScalar(nu * nu)
      .add(control.clone().multiplyScalar(2 * nu * nextT))
      .add(end.clone().multiplyScalar(nextT * nextT));
    const forward = ahead.sub(pos).setY(0).normalize();
    if (forward.lengthSq() < 0.01) forward.set(0, 0, 1);
    physics.setWorldPose(pos, forward, 0);
    this.root.position.copy(pos).add(new THREE.Vector3(0, 1.7, 0));
    this.root.rotation.y = Math.atan2(forward.x, forward.z);
    this.rotor.rotation.y += dt * 30;
    this.audio?.setHeliActive?.(true);
    if (t >= 1) {
      this.riding = false;
      this.root.visible = false;
      // Spawn already moving down the local fall line so the rider cannot be
      // left stationary on a remote face. This also makes each drop immediately
      // skiable even when its local slope points away from world +Z.
      const normal = this.terrain.getNormal(end.x, end.z, new THREE.Vector3());
      const downhill = new THREE.Vector3(0, -1, 0).projectOnPlane(normal);
      downhill.y = 0;
      if (downhill.lengthSq() < 0.01) downhill.set(0, 0, 1);
      downhill.normalize();
      physics.resetAt(end.x, end.z, downhill);
      physics.velocity.copy(downhill).multiplyScalar(10.5);
      physics.setActivityMode(`heli-freeride:${this.drop.id}`);
      this.audio?.setHeliActive?.(false);
      this.hud.showMessage(`${this.drop.name.toUpperCase()} · ${this.drop.description.toUpperCase()}`, 3.4);
      return { finished: true, drop: this.drop };
    }
    return { finished: false, drop: this.drop };
  }

  cancel(physics) {
    this.riding = false;
    this.root.visible = false;
    this.audio?.setHeliActive?.(false);
    if (physics?.activityMode === 'heli') physics.setActivityMode(null);
  }
}
