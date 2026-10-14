import * as THREE from 'three';

export class SessionMarkerSystem {
  constructor(scene, terrain) {
    this.terrain = terrain;
    this.pose = null;
    this.group = new THREE.Group();
    this.group.visible = false;

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x7ce8ff, emissive: 0x245d70, emissiveIntensity: 0.65, roughness: 0.4 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe9f8ff, roughness: 0.45 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 8, 22), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.8, 6), poleMat);
    pole.position.y = 1.4;
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.06), ringMat);
    flag.position.set(0.47, 2.45, 0);
    this.group.add(ring, pole, flag);
    scene.add(this.group);
  }

  set(physics) {
    this.pose = physics.capturePose();
    const p = this.pose.position;
    this.group.position.set(p.x, this.terrain.getHeight(p.x, p.z) + 0.05, p.z);
    this.group.visible = true;
    return true;
  }

  restore(physics) {
    if (!this.pose) return false;
    return physics.restorePose(this.pose, 1.8);
  }

  hasMarker() {
    return Boolean(this.pose);
  }
}
