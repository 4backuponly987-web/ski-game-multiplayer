import * as THREE from 'three';

export class SnowFX {
  constructor(scene) {
    this.scene = scene;
    this.trackCapacity = 480;
    this.trackIndex = 0;
    this.lastTrack = null;
    this.trackDummy = new THREE.Object3D();
    const trackGeo = new THREE.PlaneGeometry(0.11, 1);
    trackGeo.rotateX(-Math.PI / 2);
    // Tracks are a subtle light compression mark, not a dark decal. A basic
    // unlit material also prevents steep terrain/shadowing from turning them
    // into black dotted lines.
    const trackMat = new THREE.MeshBasicMaterial({
      color: 0xb3c6d0,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      vertexColors: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const stamp=document.createElement('canvas');stamp.width=32;stamp.height=64;const ctx=stamp.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,32,0);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.45,'rgba(255,255,255,.8)');gradient.addColorStop(.55,'rgba(255,255,255,.8)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,64);
    trackMat.map=new THREE.CanvasTexture(stamp);
    this.tracks = new THREE.InstancedMesh(trackGeo, trackMat, this.trackCapacity);
    this.tracks.frustumCulled = false;
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.trackCapacity; i += 1) this.tracks.setMatrixAt(i, hidden);
    this.tracks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.tracks);

    this.maxParticles = 560;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = Array.from({ length: this.maxParticles }, () => new THREE.Vector3());
    this.life = new Float32Array(this.maxParticles);
    for (let i = 0; i < this.maxParticles * 3; i += 1) this.positions[i] = -9999;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xf7fcff, size: 0.19, transparent: true, opacity: 0.82, depthWrite: false, sizeAttenuation: true });
    this.spray = new THREE.Points(geometry, material);
    this.spray.frustumCulled = false;
    scene.add(this.spray);
    this.particleCursor = 0;
    this.qualityFactor = 1;
    this.landingLatch = false;
    this.lastLandingSerial=-1;this.clock=0;this.expiryClock=0;this.trackAges=new Float32Array(this.trackCapacity).fill(-100);
  }

  setQualityFactor(value) {
    this.qualityFactor = Math.max(0.25, Math.min(1, Number(value) || 1));
  }

  resetTrackContinuity() {
    this.lastTrack = null;
  }

  addTrackSegment(a, b, state) {
    const dir = new THREE.Vector3().subVectors(b, a);
    dir.projectOnPlane(state.normal);
    const length = dir.length();
    if (length < 0.12 || length > 3.2) return;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(state.normal,dir).normalize();
    const mid = a.clone().lerp(b, 0.5);
    const yaw = Math.atan2(dir.x, dir.z);
    const powder = state.surface === 'POWDER';
    const icy = state.surface === 'ICY';
    const widthScale = powder ? 2.05 : icy ? 0.72 : 1;
    const depthOffset = powder ? -0.045 : icy ? 0.005 : -0.012;
    const trackColor = new THREE.Color(powder ? 0xe4f0f5 : icy ? 0xf7fdff : 0xedf5f8);
    for (const side of [-1, 1]) {
      const p = mid.clone().addScaledVector(right, side * 0.205);
      // Keep the decal slightly above the sampled contact plane to avoid z-fighting.
      p.addScaledVector(state.normal,-0.075);
      this.trackDummy.position.copy(p);
      this.trackDummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,state.normal,dir));
      this.trackDummy.scale.set(widthScale, powder ? 1.45 : 1, length);
      this.trackDummy.updateMatrix();
      this.tracks.setMatrixAt(this.trackIndex, this.trackDummy.matrix);
      this.tracks.setColorAt(this.trackIndex, trackColor);
      this.trackAges[this.trackIndex]=this.clock;
      this.trackIndex = (this.trackIndex + 1) % this.trackCapacity;
    }
    this.tracks.instanceMatrix.needsUpdate = true;
    if (this.tracks.instanceColor) this.tracks.instanceColor.needsUpdate = true;
  }

  spawnParticle(origin, velocity, life = 0.65) {
    const i = this.particleCursor;
    this.particleCursor = (this.particleCursor + 1) % this.maxParticles;
    const j = i * 3;
    this.positions[j] = origin.x;
    this.positions[j + 1] = origin.y;
    this.positions[j + 2] = origin.z;
    this.velocities[i].copy(velocity);
    this.life[i] = life;
  }

  update(state, dt, input) {
    if (!state) return;
    this.clock+=dt;
    this.expiryClock-=dt;
    if(this.expiryClock<=0){
      this.expiryClock=.45;
      let expired=false;
      for(let i=0;i<this.trackCapacity;i++)if(this.trackAges[i]>0&&this.clock-this.trackAges[i]>45){this.trackDummy.scale.set(0,0,0);this.trackDummy.updateMatrix();this.tracks.setMatrixAt(i,this.trackDummy.matrix);this.trackAges[i]=-100;expired=true;}
      if(expired)this.tracks.instanceMatrix.needsUpdate=true;
    }
    if (state.grounded && state.skisEquipped && !state.grinding && !state.crashed && state.speed > 3.8) {
      if (this.lastTrack) this.addTrackSegment(this.lastTrack, state.position, state);
      this.lastTrack = state.position.clone();
    } else {
      this.lastTrack = null;
    }

    const braking = (input?.isDown?.('ControlLeft') || input?.isDown?.('ControlRight')) && state.grounded;
    const steering = Math.abs(input?.steerAxis?.() ?? 0);
    const powder = state.surface === 'POWDER';
    // Powder stays clearly visible without filling the third-person camera.
    // Smaller, lower, shorter-lived plumes keep the skier readable at speed.
    this.spray.material.size = powder ? 0.30 : 0.19;
    this.spray.material.opacity = powder ? 0.80 : 0.82;
    const speedIntensity = Math.min(1.08, Math.max(powder ? 0.24 : 0.18, state.speed / (powder ? 25 : 30)));
    const intensity = state.grounded && state.skisEquipped
      ? speedIntensity * (powder ? (steering > 0.25 ? 1.02 : 0.82) : braking ? 0.8 : state.polePushing ? 0.34 : steering > 0.45 ? 0.38 : 0.08)
      : 0;
    const spawnCount = Math.floor(intensity * dt * (powder ? 500 : 360) * this.qualityFactor);
    if ((state.landingSerial||0)!==this.lastLandingSerial && (state.landingSerial||0)>0 && state.skisEquipped) {
      const impact = Math.max(0, state.lastLandingImpact || 0);
      const burstCap = powder ? 92 : 68;
      const burst = Math.floor(Math.min(burstCap, (powder ? 11 + impact * 3.5 : 8 + impact * 2.8) * this.qualityFactor));
      const forward = state.velocity.clone().setY(0);
      if (forward.lengthSq() < 0.01) forward.set(0, 0, 1);
      forward.normalize();
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      for (let n = 0; n < burst; n += 1) {
        const origin = state.position.clone()
          .addScaledVector(right, (Math.random() - 0.5) * (powder ? 1.55 : 1.1))
          .add(new THREE.Vector3(0, 0.08 + Math.random() * 0.28, 0));
        const vel = forward.clone().multiplyScalar(-1.2 - Math.random() * (powder ? 4.6 : 4.5))
          .addScaledVector(right, (Math.random() - 0.5) * (powder ? 7.2 : 7))
          .add(new THREE.Vector3(0, 1.8 + Math.random() * (powder ? 4.8 : 5.2), 0));
        this.spawnParticle(origin, vel, (powder ? 0.82 : 0.7) + Math.random() * 0.3);
      }
      this.landingLatch = true;
      this.lastLandingSerial=state.landingSerial;
    } else if (!state.justLanded) {
      this.landingLatch = false;
    }

    if (state.resting && state.grounded && state.skisEquipped && state.speed > 4) {
      const dir = state.velocity.clone().setY(0);
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        const right = new THREE.Vector3(dir.z, 0, -dir.x);
        const powderRest = state.surface === 'POWDER';
        const seatedCount = Math.floor((powderRest ? 8 : 6) * dt * 60 * this.qualityFactor);
        for (let n = 0; n < seatedCount; n += 1) {
          const side = n % 2 ? -1 : 1;
          const origin = state.position.clone()
            .addScaledVector(right, side * 0.34)
            .addScaledVector(dir, -0.52)
            .add(new THREE.Vector3(0, 0.12, 0));
          const vel = dir.clone().multiplyScalar(-0.8 - Math.random() * (powderRest ? 4.8 : 2.4))
            .addScaledVector(right, side * (0.7 + Math.random() * (powderRest ? 2.6 : 1.4)))
            .add(new THREE.Vector3(0, 1.0 + Math.random() * (powderRest ? 3.2 : 1.6), 0));
          this.spawnParticle(origin, vel, powderRest ? 0.95 : 0.55);
        }
      }
    }

    if (spawnCount > 0) {
      const dir = state.velocity.clone().setY(0).normalize();
      const right = new THREE.Vector3(dir.z, 0, -dir.x);
      for (let n = 0; n < spawnCount; n += 1) {
        const origin = state.position.clone()
          .addScaledVector(right, (Math.random() - 0.5) * (powder ? 1.15 : 0.6))
          .add(new THREE.Vector3(0, 0.08 + Math.random() * (powder ? 0.28 : 0.22), -0.18));
        const vel = dir.clone().multiplyScalar(-1.2 - Math.random() * (powder ? 4.2 : 3))
          .addScaledVector(right, (Math.random() - 0.5) * (powder ? 5.8 : 3))
          .add(new THREE.Vector3(0, 1.0 + Math.random() * (powder ? 3.8 : 2.2), 0));
        this.spawnParticle(origin, vel, powder ? 0.88 : 0.55);
      }
    }

    for (let i = 0; i < this.maxParticles; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) {
        this.positions[j] = this.positions[j + 1] = this.positions[j + 2] = -9999;
        continue;
      }
      const v = this.velocities[i];
      v.y -= 7.5 * dt;
      v.multiplyScalar(Math.max(0.82, 1 - dt * 1.6));
      this.positions[j] += v.x * dt;
      this.positions[j + 1] += v.y * dt;
      this.positions[j + 2] += v.z * dt;
    }
    this.spray.geometry.attributes.position.needsUpdate = true;
  }
}
