import * as THREE from 'three';

/**
 * Lightweight in-memory replay recorder/editor.
 *
 * It records the rendered skier hierarchy rather than re-simulating physics.
 * That makes playback deterministic, cheap, and resistant to future physics
 * changes. Frames are sampled at 20 Hz and capped to the most recent 45 s.
 */
export class ReplaySystem {
  constructor(skier, camera, { sampleRate = 20, maxSeconds = 45 } = {}) {
    this.skier = skier;
    this.camera = camera;
    this.sampleRate = Math.max(5, Math.min(30, Number(sampleRate) || 20));
    this.sampleInterval = 1 / this.sampleRate;
    this.maxSeconds = Math.max(10, Math.min(90, Number(maxSeconds) || 45));
    this.maxFrames = Math.ceil(this.sampleRate * this.maxSeconds) + 2;

    this.nodes = [];
    skier.root.traverse((node) => this.nodes.push(node));

    this.frames = [];
    this.captureAccumulator = 0;
    this.editorOpen = false;
    this.playing = false;
    this.playbackTime = 0;
    this.playbackSpeed = 1;
    this.cameraMode = 'recorded';
    this.loop = true;
    this.trimIn = 0;
    this.trimOut = 0;
    this.liveBackup = null;

    this.tmpQuatA = new THREE.Quaternion();
    this.tmpQuatB = new THREE.Quaternion();
    this.tmpForward = new THREE.Vector3();
    this.tmpRight = new THREE.Vector3();
    this.tmpLook = new THREE.Vector3();
  }

  reset() {
    this.frames.length = 0;
    this.captureAccumulator = 0;
    this.playbackTime = 0;
    this.trimIn = 0;
    this.trimOut = 0;
    this.playing = false;
  }

  get duration() {
    return this.frames.length > 1 ? (this.frames.length - 1) * this.sampleInterval : 0;
  }

  get hasReplay() {
    return this.frames.length >= 2;
  }

  snapshotNodes() {
    const data = new Float32Array(this.nodes.length * 10);
    const visible = new Uint8Array(this.nodes.length);
    for (let i = 0; i < this.nodes.length; i += 1) {
      const node = this.nodes[i];
      const j = i * 10;
      data[j] = node.position.x;
      data[j + 1] = node.position.y;
      data[j + 2] = node.position.z;
      data[j + 3] = node.quaternion.x;
      data[j + 4] = node.quaternion.y;
      data[j + 5] = node.quaternion.z;
      data[j + 6] = node.quaternion.w;
      data[j + 7] = node.scale.x;
      data[j + 8] = node.scale.y;
      data[j + 9] = node.scale.z;
      visible[i] = node.visible ? 1 : 0;
    }
    return { data, visible };
  }

  snapshotCamera() {
    return new Float32Array([
      this.camera.position.x, this.camera.position.y, this.camera.position.z,
      this.camera.quaternion.x, this.camera.quaternion.y, this.camera.quaternion.z, this.camera.quaternion.w,
      this.camera.fov,
    ]);
  }

  capture(dt, state = null) {
    if (this.editorOpen || !this.skier?.root || !this.camera) return;
    this.captureAccumulator += Math.max(0, Number(dt) || 0);
    if (this.captureAccumulator < this.sampleInterval) return;
    // Keep the cadence stable without trying to back-fill multiple duplicate frames.
    this.captureAccumulator %= this.sampleInterval;
    const nodeSnapshot = this.snapshotNodes();
    this.frames.push({
      data: nodeSnapshot.data,
      visible: nodeSnapshot.visible,
      camera: this.snapshotCamera(),
      speed: Number(state?.speed) || 0,
      surface: String(state?.surface || ''),
      trick: String(state?.currentGrab || state?.manualType || state?.grindType || ''),
    });
    if (this.frames.length > this.maxFrames) {
      const excess = this.frames.length - this.maxFrames;
      this.frames.splice(0, excess);
    }
    this.trimOut = this.duration;
  }

  captureLiveBackup() {
    const nodes = this.snapshotNodes();
    return {
      data: nodes.data,
      visible: nodes.visible,
      camera: this.snapshotCamera(),
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot) return;
    this.applyNodeData(snapshot.data, snapshot.visible, snapshot.data, snapshot.visible, 0);
    this.applyRecordedCamera(snapshot.camera, snapshot.camera, 0);
  }

  beginEditor() {
    if (!this.hasReplay || this.editorOpen) return false;
    this.liveBackup = this.captureLiveBackup();
    this.editorOpen = true;
    this.playing = false;
    this.trimIn = Math.max(0, Math.min(this.trimIn, this.duration));
    this.trimOut = Math.max(this.trimIn + this.sampleInterval, Math.min(this.trimOut || this.duration, this.duration));
    this.playbackTime = Math.max(this.trimIn, Math.min(this.playbackTime || this.trimIn, this.trimOut));
    this.applyTime(this.playbackTime);
    return true;
  }

  endEditor() {
    if (!this.editorOpen) return;
    this.playing = false;
    this.editorOpen = false;
    this.restoreSnapshot(this.liveBackup);
    this.liveBackup = null;
  }

  setPlaying(value) {
    this.playing = Boolean(value);
    if (this.playing && this.playbackTime >= this.trimOut - 1e-4) this.playbackTime = this.trimIn;
    return this.playing;
  }

  togglePlaying() {
    return this.setPlaying(!this.playing);
  }

  setSpeed(value) {
    const allowed = [0.25, 0.5, 1, 2];
    const requested = Number(value) || 1;
    this.playbackSpeed = allowed.reduce((best, candidate) => Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best, 1);
    return this.playbackSpeed;
  }

  setCameraMode(mode) {
    this.cameraMode = ['recorded', 'follow', 'side'].includes(mode) ? mode : 'recorded';
    this.applyTime(this.playbackTime);
    return this.cameraMode;
  }

  cycleCameraMode() {
    const modes = ['recorded', 'follow', 'side'];
    const index = modes.indexOf(this.cameraMode);
    return this.setCameraMode(modes[(index + 1) % modes.length]);
  }

  setLoop(value) {
    this.loop = Boolean(value);
    return this.loop;
  }

  seek(time) {
    this.playbackTime = Math.max(this.trimIn, Math.min(Number(time) || 0, this.trimOut || this.duration));
    this.applyTime(this.playbackTime);
    return this.playbackTime;
  }

  setTrimIn(time = this.playbackTime) {
    const maxIn = Math.max(0, this.trimOut - this.sampleInterval);
    this.trimIn = Math.max(0, Math.min(Number(time) || 0, maxIn));
    if (this.playbackTime < this.trimIn) this.seek(this.trimIn);
    return this.trimIn;
  }

  setTrimOut(time = this.playbackTime) {
    const minOut = Math.min(this.duration, this.trimIn + this.sampleInterval);
    this.trimOut = Math.max(minOut, Math.min(Number(time) || this.duration, this.duration));
    if (this.playbackTime > this.trimOut) this.seek(this.trimOut);
    return this.trimOut;
  }

  resetTrim() {
    this.trimIn = 0;
    this.trimOut = this.duration;
    this.seek(this.trimIn);
  }

  update(dt) {
    if (!this.editorOpen) return;
    if (this.playing) {
      this.playbackTime += Math.max(0, Number(dt) || 0) * this.playbackSpeed;
      if (this.playbackTime > this.trimOut) {
        if (this.loop) {
          const span = Math.max(this.sampleInterval, this.trimOut - this.trimIn);
          this.playbackTime = this.trimIn + ((this.playbackTime - this.trimIn) % span);
        } else {
          this.playbackTime = this.trimOut;
          this.playing = false;
        }
      }
    }
    this.applyTime(this.playbackTime);
  }

  applyNodeData(a, visibleA, b, visibleB, alpha) {
    if (!a || !b) return;
    const t = Math.max(0, Math.min(1, alpha));
    for (let i = 0; i < this.nodes.length; i += 1) {
      const node = this.nodes[i];
      const j = i * 10;
      node.position.set(
        THREE.MathUtils.lerp(a[j], b[j], t),
        THREE.MathUtils.lerp(a[j + 1], b[j + 1], t),
        THREE.MathUtils.lerp(a[j + 2], b[j + 2], t),
      );
      this.tmpQuatA.set(a[j + 3], a[j + 4], a[j + 5], a[j + 6]);
      this.tmpQuatB.set(b[j + 3], b[j + 4], b[j + 5], b[j + 6]);
      node.quaternion.slerpQuaternions(this.tmpQuatA, this.tmpQuatB, t);
      node.scale.set(
        THREE.MathUtils.lerp(a[j + 7], b[j + 7], t),
        THREE.MathUtils.lerp(a[j + 8], b[j + 8], t),
        THREE.MathUtils.lerp(a[j + 9], b[j + 9], t),
      );
      node.visible = t < 0.5 ? Boolean(visibleA?.[i]) : Boolean(visibleB?.[i]);
    }
  }

  applyRecordedCamera(a, b, alpha) {
    const t = Math.max(0, Math.min(1, alpha));
    this.camera.position.set(
      THREE.MathUtils.lerp(a[0], b[0], t),
      THREE.MathUtils.lerp(a[1], b[1], t),
      THREE.MathUtils.lerp(a[2], b[2], t),
    );
    this.tmpQuatA.set(a[3], a[4], a[5], a[6]);
    this.tmpQuatB.set(b[3], b[4], b[5], b[6]);
    this.camera.quaternion.slerpQuaternions(this.tmpQuatA, this.tmpQuatB, t);
    this.camera.fov = THREE.MathUtils.lerp(a[7], b[7], t);
    this.camera.updateProjectionMatrix();
  }

  applyFollowCamera(sideView = false) {
    const root = this.skier.root;
    const position = root.position;
    this.tmpForward.set(0, 0, 1).applyQuaternion(root.quaternion).setY(0);
    if (this.tmpForward.lengthSq() < 1e-5) this.tmpForward.set(0, 0, 1);
    this.tmpForward.normalize();
    this.tmpRight.set(this.tmpForward.z, 0, -this.tmpForward.x).normalize();
    if (sideView) {
      this.camera.position.copy(position).addScaledVector(this.tmpRight, 8.5).add(new THREE.Vector3(0, 2.8, 0));
    } else {
      this.camera.position.copy(position).addScaledVector(this.tmpForward, -7.8).add(new THREE.Vector3(0, 3.1, 0));
    }
    this.tmpLook.copy(position).add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(this.tmpForward, 1.4);
    this.camera.lookAt(this.tmpLook);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
  }

  applyTime(time) {
    if (!this.frames.length) return;
    const clamped = Math.max(0, Math.min(Number(time) || 0, this.duration));
    const raw = clamped / this.sampleInterval;
    const i0 = Math.max(0, Math.min(this.frames.length - 1, Math.floor(raw)));
    const i1 = Math.max(0, Math.min(this.frames.length - 1, i0 + 1));
    const alpha = i0 === i1 ? 0 : raw - i0;
    const a = this.frames[i0];
    const b = this.frames[i1];
    this.applyNodeData(a.data, a.visible, b.data, b.visible, alpha);
    if (this.cameraMode !== 'recorded' && this.skier?.headRig) this.skier.headRig.visible = true;
    if (this.cameraMode === 'recorded') this.applyRecordedCamera(a.camera, b.camera, alpha);
    else this.applyFollowCamera(this.cameraMode === 'side');
  }

  getCurrentFrameInfo() {
    if (!this.frames.length) return { speed: 0, surface: '', trick: '' };
    const index = Math.max(0, Math.min(this.frames.length - 1, Math.round(this.playbackTime / this.sampleInterval)));
    return this.frames[index];
  }
}
