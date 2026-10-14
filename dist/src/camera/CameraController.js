import * as THREE from 'three';

export class CameraController {
  constructor(camera, canvas, input = null, terrain = null) {
    this.camera = camera;
    this.canvas = canvas;
    this.input = input;
    this.terrain = terrain;
    this.mode = 'third';
    this.orbitYaw = 0;
    this.orbitPitch = 0.08;
    this.currentTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.tmpForward = new THREE.Vector3();
    this.tmpUp = new THREE.Vector3();
    this.tmpRight = new THREE.Vector3();
    this.shake = 0;
    this.headPhase = 0;
    this.speedShakePhase = 0;
    this.cameraEffects = 1;
    this.satelliteActive = false;
    this.satelliteCenter = new THREE.Vector3(0, 340, -100);
    this.satelliteAltitude = 7200;
    this.satelliteTargetPosition = new THREE.Vector3(0, 7540, -100);
    this.satelliteTargetQuaternion = new THREE.Quaternion();
    this.satelliteSaved = null;
    this.satelliteHelper = new THREE.PerspectiveCamera();

    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== canvas) return;
      // While a mouse grab is held, mouse movement is reserved for analogue
      // grab tweaking instead of orbiting the camera.
      if (this.input?.isTweakingGrab()) return;
      this.orbitYaw -= event.movementX * 0.0023;
      this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch - event.movementY * 0.0018, -0.12, 0.47);
    });

    // Mouse wheel zoom works while the satellite map is open.
    canvas.addEventListener('wheel', (event) => {
      if (!this.satelliteActive) return;
      event.preventDefault();
      const direction = Math.sign(event.deltaY || 0);
      const step = Math.max(180, this.satelliteAltitude * 0.085);
      this.satelliteAltitude = THREE.MathUtils.clamp(this.satelliteAltitude + direction * step, 1700, 9200);
      this.satelliteTargetPosition.set(
        this.satelliteCenter.x,
        this.satelliteCenter.y + this.satelliteAltitude,
        this.satelliteCenter.z,
      );
    }, { passive: false });
  }


  enterSatelliteView(state = null) {
    if (this.satelliteActive) return;
    this.satelliteActive = true;
    this.satelliteSaved = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
      far: this.camera.far,
    };
    // The two-mountain resort spans roughly 7.2 km north/south. A true
    // satellite-style view needs a much longer far plane than normal skiing.
    this.camera.far = 18000;
    this.camera.updateProjectionMatrix();
    const centreY = this.terrain?.getHeight?.(0, -100) ?? 340;
    this.satelliteCenter.set(0, centreY + 40, -100);
    this.satelliteAltitude = 7200;
    this.satelliteTargetPosition.set(0, this.satelliteCenter.y + this.satelliteAltitude, -100);
    this.satelliteHelper.position.copy(this.satelliteTargetPosition);
    // North is toward the top of the screen. Camera.lookAt uses the camera's -Z axis,
    // so this now genuinely looks DOWN at the terrain.
    this.satelliteHelper.up.set(0, 0, -1);
    this.satelliteHelper.lookAt(this.satelliteCenter);
    this.satelliteTargetQuaternion.copy(this.satelliteHelper.quaternion);
  }

  updateSatellite(dt = 1 / 60) {
    if (!this.satelliteActive) return;
    const posBlend = 1 - Math.exp(-3.6 * dt);
    const rotBlend = 1 - Math.exp(-4.2 * dt);
    this.camera.position.lerp(this.satelliteTargetPosition, posBlend);
    this.camera.quaternion.slerp(this.satelliteTargetQuaternion, rotBlend);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 56, 1 - Math.exp(-4 * dt));
    this.camera.updateProjectionMatrix();
  }

  exitSatelliteView() {
    if (!this.satelliteActive) return;
    this.satelliteActive = false;
    this.satelliteCenter = new THREE.Vector3(0, 340, -100);
    this.satelliteAltitude = 7200;
    const saved = this.satelliteSaved;
    if (saved) {
      this.camera.position.copy(saved.position);
      this.camera.quaternion.copy(saved.quaternion);
      this.camera.fov = saved.fov;
      this.camera.far = saved.far;
      this.camera.updateProjectionMatrix();
    }
    this.satelliteSaved = null;
  }

  toggleMode() {
    this.mode = this.mode === 'third' ? 'first' : 'third';
    this.orbitYaw = 0;
    this.orbitPitch = this.mode === 'third' ? 0.08 : 0;
    return this.mode;
  }

  addLandingShake(strength) {
    this.shake = Math.max(this.shake, THREE.MathUtils.clamp(strength * 0.036 * this.cameraEffects, 0, 0.24));
  }

  setEffectsAmount(value = 1) {
    this.cameraEffects = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  }

  update(state, dt) {
    const liftMode=String(state.activityMode||'').startsWith('lift:');
    const transition=Boolean(state.transition);
    // Keep a stable world-level horizon in transition features, but preserve the
    // skier's own heading. Older builds replaced the heading with the pipe fall
    // line, which caused the camera to swing as soon as a quarterpipe was entered.
    const levelCamera=liftMode||transition;
    this.tmpUp.copy(state.normal).lerp(new THREE.Vector3(0,1,0),levelCamera?1:state.grounded?0.58:0.9).normalize();
    this.tmpForward.copy(state.forward).projectOnPlane(this.tmpUp).normalize();
    if (this.tmpForward.lengthSq() < 0.01) this.tmpForward.set(0, 0, 1);
    // In switch stance the body faces opposite the direction of travel. First
    // person follows the skier's head rather than magically looking downhill.
    if (this.mode === 'first' && state.switchStance && !state.grinding) this.tmpForward.multiplyScalar(-1);

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(this.tmpUp, this.orbitYaw);
    this.tmpForward.applyQuaternion(yawQuat).normalize();
    this.tmpRight.crossVectors(this.tmpUp, this.tmpForward).normalize();

    const speedT = THREE.MathUtils.clamp(state.speed / 55, 0, 1);
    // Keep a stable gameplay FOV. The old 63 -> 84 degree speed zoom created a
    // pronounced tunnel-vision / fisheye effect at normal downhill speeds.
    // Speed is communicated through motion, snow and audio instead of lens distortion.
    const gameplayFov = 64.5;
    if (Math.abs(this.camera.fov - gameplayFov) > 0.01) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, gameplayFov, 1 - Math.exp(-7.5 * dt));
      this.camera.updateProjectionMatrix();
    }

    if (this.mode === 'first') {
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(this.tmpRight, this.orbitPitch);
      const viewDir = this.tmpForward.clone().applyQuaternion(pitchQuat).normalize();
      this.headPhase += dt * (2.2 + Math.min(18, state.speed) * 0.42);
      const groundedMotion = state.grounded && !state.crashed ? THREE.MathUtils.clamp(state.speed / 30, 0, 1) : 0;
      const bob = Math.sin(this.headPhase) * 0.012 * groundedMotion * this.cameraEffects;
      const sway = Math.sin(this.headPhase * 0.5) * 0.010 * groundedMotion * this.cameraEffects;
      // Character is ~2m tall. Earlier first person sat far above the helmet;
      // this now tracks realistic eye height and leaves skis visible when looking down.
      this.desiredPosition.copy(state.position)
        .addScaledVector(this.tmpUp, 1.53 - (state.suspension||0)*.15 + bob)
        .addScaledVector(this.tmpForward, 0.08)
        .addScaledVector(this.tmpRight, sway);
      this.camera.position.lerp(this.desiredPosition, 1 - Math.exp(-(state.crashed ? 7 : 17) * dt));
      if (this.terrain?.getHeight) {
        const cameraGround = this.terrain.getHeight(this.camera.position.x, this.camera.position.z);
        this.camera.position.y = Math.max(this.camera.position.y, cameraGround + 0.72);
      }
      this.lookTarget.copy(this.camera.position).addScaledVector(viewDir, 18);
      this.camera.lookAt(this.lookTarget);
    } else {
      // Halfpipes, quarterpipes and ordinary pistes all use one third-person
      // camera. There is deliberately no transition-specific distance, heading,
      // look target or roll correction here.
      const distance = liftMode?19:state.grinding?10.5:THREE.MathUtils.lerp(8.35,9.65,speedT);
      const height = (liftMode?7:THREE.MathUtils.lerp(3.0,3.48,speedT))+this.orbitPitch*4.2;
      this.desiredPosition.copy(state.position)
        .addScaledVector(this.tmpUp, height)
        .addScaledVector(this.tmpForward, -distance);
      // Steep couloirs used to let the third-person camera fall through the
      // terrain behind the skier, exposing the underside of the mountain.
      // Clamp the chase camera above the sampled snow surface so Corbet-style
      // terrain remains readable instead of looking torn open.
      if (this.terrain?.getHeight && !transition) {
        const ground = this.terrain.getHeight(this.desiredPosition.x, this.desiredPosition.z);
        this.desiredPosition.y = Math.max(this.desiredPosition.y, ground + 1.35);
      }
      this.camera.position.lerp(this.desiredPosition, 1 - Math.exp(-(liftMode?3:7) * dt));
      if (this.terrain?.getHeight && !transition) {
        const cameraGround = this.terrain.getHeight(this.camera.position.x, this.camera.position.z);
        this.camera.position.y = Math.max(this.camera.position.y, cameraGround + 1.05);
      }
      this.currentTarget.lerp(
        this.lookTarget.copy(state.position).addScaledVector(this.tmpUp, 1.45).addScaledVector(this.tmpForward, 6.5 + speedT * 8.0),
        1 - Math.exp(-10 * dt),
      );
      this.camera.lookAt(this.currentTarget);
    }

    // A very small high-speed rumble starts only above 95 km/h. It ramps in
    // smoothly rather than suddenly vibrating the camera, and respects the
    // camera-effects comfort setting. This is deliberately much gentler than
    // landing/crash shake.
    const speedKmh = state.speed * 3.6;
    const highSpeedT = THREE.MathUtils.clamp((speedKmh - 95) / 55, 0, 1);
    if (highSpeedT > 0 && !liftMode && !state.crashed) {
      this.speedShakePhase += dt * (17 + highSpeedT * 11);
      const comfort = this.mode === 'first' ? 0.52 : 1;
      const amount = (0.010 + highSpeedT * 0.040) * highSpeedT * this.cameraEffects * comfort;
      this.camera.position.addScaledVector(this.tmpRight, Math.sin(this.speedShakePhase * 1.73) * amount);
      this.camera.position.addScaledVector(this.tmpUp, Math.sin(this.speedShakePhase * 2.31 + 0.8) * amount * 0.48);
    }

    if (this.shake > 0.001) {
      const comfort = this.mode === 'first' ? 0.42 : 1;
      const crashComfort = state.crashed ? 0.35 : 1;
      const amount = this.shake * comfort * crashComfort;
      this.camera.position.x += (Math.random() - 0.5) * amount;
      this.camera.position.y += (Math.random() - 0.5) * amount * 0.6;
      this.shake *= Math.exp(-9 * dt);
    } else {
      this.shake = 0;
    }
  }
}
