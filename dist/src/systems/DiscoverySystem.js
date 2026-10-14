import * as THREE from 'three';
import { getRun } from '../world/RunDefinitions.js';

export const DISCOVERIES = Object.freeze([
  { id: 'eagles-perch', name: "Eagle's Perch", runId: 'wild', z: -520, offsetX: -128, reward: 180 },
  { id: 'powder-chute', name: 'Hidden Powder Chute', runId: 'wild', z: 280, offsetX: 116, reward: 220 },
  { id: 'pine-glade', name: 'Pine Line Glade', runId: 'pine', z: 65, offsetX: -58, reward: 160 },
  { id: 'wind-lip', name: 'Velocity Wind Lip', runId: 'velocity', z: -120, offsetX: 76, reward: 180 },
  { id: 'park-transfer', name: 'Summit Park Transfer Deck', runId: 'park', z: 370, offsetX: -72, reward: 150 },
]);

export class DiscoverySystem {
  constructor(scene, terrain, save, hud, challenges = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.save = save;
    this.hud = hud;
    this.challenges = challenges;
    this.points = DISCOVERIES.map((item) => {
      const run = getRun(item.runId);
      const x = run.centerAt(item.z) + item.offsetX;
      return { ...item, x, y: terrain.getHeight(x, item.z) };
    });
    this.createMarkers();
  }

  createMarkers() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf4cf66, emissive: 0x5a3b05, emissiveIntensity: 0.55, roughness: 0.42 });
    for (const point of this.points) {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 7, 28), mat);
      ring.position.set(point.x, point.y + 0.12, point.z);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat);
      beacon.position.set(point.x, point.y + 1.45, point.z);
      group.add(beacon);
      group.name = `Discovery ${point.name}`;
      this.scene.add(group);
    }
  }

  update(state) {
    if (!state || state.crashed) return;
    for (const point of this.points) {
      if (this.save.hasDiscovery(point.id)) continue;
      const dx = state.position.x - point.x;
      const dz = state.position.z - point.z;
      if (dx * dx + dz * dz <= 26 * 26) {
        this.save.addDiscovery(point.id);
        this.save.addCredits(point.reward);
        this.save.addXP(Math.round(point.reward * 0.8));
        this.hud.updateCredits(this.save.getCredits());
        this.hud.updateProgress(this.save);
        this.challenges?.onDiscovery(this.save.data.discoveries.length);
        this.hud.showMessage(`DISCOVERED · ${point.name.toUpperCase()} · +${point.reward} C`, 3.2);
      }
    }
  }
}
