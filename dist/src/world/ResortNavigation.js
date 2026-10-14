import * as THREE from 'three';
import { RESORT_JUNCTION_SIGNS, getStation } from './ResortNetwork.js';

export function signSprite(title, lines) {
  if (typeof document === 'undefined') return new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#10293a'; ctx.fillRect(12, 12, 1000, 488);
  ctx.strokeStyle = '#d7eef7'; ctx.lineWidth = 10; ctx.strokeRect(18, 18, 988, 476);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.font = '700 54px Arial'; ctx.fillText(title, 60, 72);
  ctx.font = '700 39px Arial';
  lines.slice(0, 4).forEach((line, i) => {
    const y = 160 + i * 78;
    ctx.fillStyle = i % 2 ? '#d8f1ff' : '#ffffff';
    ctx.fillText(`→ ${line[0]}`, 62, y);
    ctx.font = '500 28px Arial'; ctx.fillStyle = '#9fd0e5'; ctx.fillText(line[1], 560, y);
    ctx.font = '700 39px Arial';
  });
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(19, 9.5, 1);
  return sprite;
}

export class ResortNavigation {
  constructor(scene, terrain) {
    this.scene = scene; this.terrain = terrain;
    this.buildSigns();
  }

  buildSigns() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x42535c, roughness: 0.64, metalness: 0.25 });
    for (const sign of RESORT_JUNCTION_SIGNS) {
      const station = getStation(sign.at); if (!station) continue;
      const y = this.terrain.getHeight(station.x, station.z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.5, 8), poleMat);
      pole.position.set(station.x, y + 2.25, station.z); pole.castShadow = true; this.scene.add(pole);
      const sprite = signSprite(station.name, sign.lines);
      sprite.position.set(station.x, y + 6.4, station.z); this.scene.add(sprite);
    }
  }
}
