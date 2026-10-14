import * as THREE from 'three';

/** Static spatial hash; collision membership never changes with graphics quality. */
export class CollisionSystem {
  constructor(colliders) {
    this.colliders = colliders;
    this.tmpNormal = new THREE.Vector3();
    this.cooldown = 0;
    this.cellSize = 32;
    this.cells = new Map();
    for (const c of colliders) {
      const r = c.radius + 1;
      for (let x = Math.floor((c.x-r)/32); x <= Math.floor((c.x+r)/32); x++) {
        for (let z = Math.floor((c.z-r)/32); z <= Math.floor((c.z+r)/32); z++) {
          const key = `${x},${z}`;
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(c);
        }
      }
    }
  }
  step(dt, physics) {
    this.cooldown = Math.max(0, this.cooldown-dt);
    const pos = physics.position;
    const candidates = this.cells.get(`${Math.floor(pos.x/32)},${Math.floor(pos.z/32)}`) || [];
    let event = null;
    for (const c of candidates) {
      if (pos.y > c.y+c.height+1.5 || pos.y < c.y-1.5) continue;
      const dx=pos.x-c.x, dz=pos.z-c.z, radius=c.radius+0.55;
      const distance=Math.hypot(dx,dz);
      if (distance >= radius) continue;
      if (distance > 1e-5) this.tmpNormal.set(dx/distance,0,dz/distance);
      else {
        this.tmpNormal.copy(physics.velocity).setY(0).negate().normalize();
        if (this.tmpNormal.lengthSq()<0.1) this.tmpNormal.set(1,0,0);
      }
      const speed=physics.velocity.length();
      physics.applyObstacleCollision(this.tmpNormal,radius-distance,Math.min(1,speed/22));
      if (this.cooldown<=0 && !event) { this.cooldown=0.45; event={kind:c.kind,speed}; }
    }
    return event;
  }
}
