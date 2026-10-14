import {railPoint,railTangent,railClosest} from '../world/railPath.js';
import * as THREE from 'three';
import { aerodynamicDrag, stoppingDrag, turnRateForSpeed } from './physicsMath.js';
import { changesSwitchStance, isUnsafeFlipLanding, isUnsafeSpinLanding, rotationLandingError, flipLandingErrorDegrees } from '../systems/trickMath.js';
import { polePushAcceleration, pumpChargeGain, pumpReleaseBoost, polePushMode, polePushStrength } from './propulsionMath.js';
import { flightLiftAcceleration, flightHorizontalDrag } from './flightMath.js';

import { angularVelocity, edgeResponse, suspensionStep, transitionPump } from './dynamicsMath.js';
import {pipeSection,pipeNormal,advancePipe} from './pipeContact.js';
import {decomposeButterYaw,grindExitProfile} from './freestylePoseMath.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const GRAVITY = new THREE.Vector3(0, -9.81, 0);
const GRAVITY_SCALE = 1.04;
const MAX_SPEED = 58; // ~209 km/h cap: faster resort feel without absurd runaway speeds.
const CONTACT_HEIGHT = 0.12;
const GRIND_HEIGHT = 0.12;

const SURFACE = {
  GROOMED: { grip: 1.0, rolling: 0.055, carve: 0.78 },
  PARK: { grip: 1.03, rolling: 0.060, carve: 0.76 },
  POWDER: { grip: 0.62, rolling: 0.46, carve: 1.18 },
  ICY: { grip: 0.57, rolling: 0.028, carve: 0.56 },
};

export class SkiPhysics {
  constructor(terrain, input) {
    this.terrain = terrain;
    this.input = input;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1); // direction of travel, not necessarily body facing
    this.normal = new THREE.Vector3(0, 1, 0);
    this.grounded = true;
    this.surface = 'GROOMED';
    this.switchStance = false;
    this.skisEquipped = true;
    this.activityMode = null;
    this.resting = false;
    this.polePushing = false;
    this.polePushSide = null;
    this.polePushPhase = 0;
    this.wasPolePushing = false;
    this.lastPolePushSide = null;
    this.manualType = null;
    this.crossSkis = false;
    this.crossSkisTime = 0;
    this.lastCrossSkisTime = 0;
    this.pumpCharge = 0;
    this.pumpCooldown = 0;
    this.wasPumping = false;
    this.previousNormalY = 1;
    this.spreadEagle = false;
    this.spreadEagleTime = 0;
    this.lastSpreadEagleTime = 0;
    this.skiJumpPose = false;
    this.daffy = false;
    this.daffyTime = 0;
    this.lastDaffyTime = 0;
    this.butterDirection = 0;
    this.butterYaw = 0;
    this.butterTime = 0;
    this.wasButtering = false;
    this.bestButterDegrees = 0;

    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.lastAirYaw = 0;
    this.lastAirPitch = 0;
    this.lastAirGrab = null;
    this.lastAirGrabTime = 0;
    this.lastAirGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.lastLandingImpact = 0;
    this.lastLandingSpinError = 0;
    this.lastLandingFlipError = 0;
    this.lastSwitchLanding = false;
    this.justLanded = false;
    this.crashed = false;
    this.justCrashed = false;
    this.crashTimer = 0;
    this.crashReason = '';

    this.grind = null;
    this.grindT = 0;
    this.grindSpeed = 0;
    this.grindType = null;
    this.grindDistance = 0;
    this.grindEntryOffset = new THREE.Vector3();
    this.grindEntryBlend = 1;
    this.justEndedGrind = false;
    this.lastGrindDistance = 0;
    this.lastGrindType = null;

    this.transport = new THREE.Quaternion();
    this.previousPosition = new THREE.Vector3();
    this.previousContact = null;
    this.tmpA = new THREE.Vector3();
    this.tmpB = new THREE.Vector3();
    this.tmpC = new THREE.Vector3();
    this.featureSampler = null;
    this.reset();
  }

  setFeatureSampler(fn) {
    this.featureSampler = typeof fn === 'function' ? fn : null;
  }

  getContactSurface(x, z) {
    const terrainHeight = this.terrain.getHeight(x, z);
    const feature = this.featureSampler?.(x, z) || null;
    if (feature && feature.height > terrainHeight + 0.015) return feature;
    this.terrain.getNormal(x, z, this.tmpC);
    const transition=this.terrain.getTransition?.(x,z)||null;
    const section=pipeSection(transition,x,z);
    if(section)pipeNormal(this.terrain,transition,section,this.tmpC);
    return { height: terrainHeight, normal: this.tmpC.clone(), ramp: null, t: 0, transition, section };
  }

  reset() {
    this.resetAt(0, -875);
  }

  resetAt(x, z, forward = new THREE.Vector3(0, 0, 1)) {
    const y = this.terrain.getHeight(x, z) + CONTACT_HEIGHT;
    this.position.set(x, y, z);
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.suspension = 0; this.suspensionRate = 0; this.surfaceLoad = 1; this.slip = 0;
    this.transition = null; this.detachTimer = 0; this.landingSerial = 0; this.pipeAir=null;this.transitionAscending=false;
    this.activityMode = null;
    this.resting = false;
    this.velocity.copy(forward).setY(0).normalize().multiplyScalar(2.2);
    this.forward.copy(forward).setY(0).normalize();
    if (this.forward.lengthSq() < 0.1) this.forward.set(0, 0, 1);
    this.terrain.getNormal(x, z, this.normal);
    this.grounded = true;
    this.surface = this.terrain.getSurface(x, z);
    this.switchStance = false;
    this.skisEquipped = true;
    this.polePushing = false;
    this.polePushSide = null;
    this.polePushPhase = 0;
    this.wasPolePushing = false;
    this.lastPolePushSide = null;
    this.manualType = null;
    this.crossSkis = false;
    this.crossSkisTime = 0;
    this.lastCrossSkisTime = 0;
    this.pumpCharge = 0;
    this.pumpCooldown = 0;
    this.wasPumping = false;
    this.previousNormalY = this.normal.y;
    this.spreadEagle = false;
    this.spreadEagleTime = 0;
    this.lastSpreadEagleTime = 0;
    this.skiJumpPose = false;
    this.daffy = false;
    this.daffyTime = 0;
    this.lastDaffyTime = 0;
    this.butterDirection = 0;
    this.butterYaw = 0;
    this.butterTime = 0;
    this.wasButtering = false;
    this.bestButterDegrees = 0;
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.lastAirYaw = 0;
    this.lastAirPitch = 0;
    this.lastAirGrab = null;
    this.lastAirGrabTime = 0;
    this.lastAirGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.lastLandingImpact = 0;
    this.lastLandingSpinError = 0;
    this.lastLandingFlipError = 0;
    this.lastSwitchLanding = false;
    this.justLanded = false;
    this.crashed = false;
    this.justCrashed = false;
    this.crashTimer = 0;
    this.crashReason = '';
    this.grind = null;
    this.grindYaw=0; this.grindDirection=1; this.grindBalance=0; this.grindAge=0;
    this.grindType = null;
    this.grindDistance = 0;
    this.grindEntryBlend = 1;
    this.justEndedGrind = false;
  }

  step(dt) {
    this.stepDt=dt;
    this.justLanded = false;
    this.justCrashed = false;
    this.justEndedGrind = false;
    this.lastSwitchLanding = false;
    if (![this.position.x,this.position.y,this.position.z,this.velocity.x,this.velocity.y,this.velocity.z].every(Number.isFinite)) return {resetRequested:true,reason:'Recovered invalid physics state'};
    this.previousPosition.copy(this.position);
    this.previousContact = this.getContactSurface(this.position.x,this.position.z);
    this.detachTimer = Math.max(0,this.detachTimer-dt);
    this.surface = this.terrain.getSurface(this.position.x, this.position.z);
    this.pumpCooldown = Math.max(0, this.pumpCooldown - dt);

    if (this.crashed) {
      this.stepCrash(dt);
      this.position.addScaledVector(this.velocity, dt);
      this.resolveTerrainContact();
    } else if (this.grind) {
      this.stepGrind(dt);
    } else {
      if (this.grounded) {
        if (this.skisEquipped) this.stepGround(dt);
        else this.stepWalk(dt);
      } else this.stepAir(dt);
      const section=this.grounded&&this.skisEquipped?pipeSection(this.transition,this.position.x,this.position.z):null;
      if(section)advancePipe(this,dt,this.transition,section);
      else this.position.addScaledVector(this.velocity, dt);
      this.resolveTerrainContact();
    }

    if (!this.terrain.contains(this.position.x, this.position.z, 8) || this.position.y < -650) {
      return { resetRequested: true, reason: 'You left the ski area — run reset.' };
    }
    return null;
  }

  stepGround(dt) {
    const contact = this.getContactSurface(this.position.x, this.position.z);
    // Parallel transport preserves tangent speed through concave walls instead
    // of repeatedly projecting it away at every change in surface normal.
    this.transport.setFromUnitVectors(this.normal, contact.normal);
    this.velocity.applyQuaternion(this.transport);
    this.forward.applyQuaternion(this.transport);
    this.normal.copy(contact.normal);
    this.transition = contact.transition || this.terrain.getTransition?.(this.position.x,this.position.z) || null;
    const contactRideHeight = this.surface === 'POWDER' ? CONTACT_HEIGHT - 0.045 : CONTACT_HEIGHT;
    this.position.y = Math.max(this.position.y, contact.height + contactRideHeight);
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };

    if (this.resting) {
      // Holding R is a low, aerodynamic seated tuck rather than a brake. Gravity
      // keeps accelerating the skier down the actual slope and the compact pose
      // adds a small bounded speed-building advantage, while steering stays weak.
      this.velocity.projectOnPlane(this.normal);
      const seatedGravity = this.tmpA.copy(GRAVITY).multiplyScalar(GRAVITY_SCALE * 1.03).projectOnPlane(this.normal);
      this.velocity.addScaledVector(seatedGravity, dt);
      const seatedSpeed = this.velocity.length();
      if (seatedSpeed > 1.0) this.velocity.addScaledVector(this.forward, (0.34 + Math.min(0.34, seatedSpeed * 0.008)) * dt);
      const seatedSteer = this.input.steerAxis() * 0.38;
      if (Math.abs(seatedSteer) > 0.001) {
        this.velocity.applyAxisAngle(this.normal, seatedSteer * dt * 0.72);
        this.forward.copy(this.velocity).projectOnPlane(this.normal).normalize();
      }
      const newSeatedSpeed=this.velocity.length();
      if(newSeatedSpeed>MAX_SPEED)this.velocity.multiplyScalar(MAX_SPEED/newSeatedSpeed);
      this.manualType = null;
      this.polePushing = false;
      this.polePushSide = null;
      this.butterDirection = 0;
      this.butterYaw = 0;
      this.butterTime = 0;
      this.wasButtering = false;
      this.transitionAscending = false;
      this.previousNormalY = this.normal.y;
      return;
    }

    // More energetic than v0.3 while still deriving acceleration from the actual slope.
    const gravityAlongSlope = this.tmpA.copy(GRAVITY).multiplyScalar(GRAVITY_SCALE).projectOnPlane(this.normal);
    this.velocity.addScaledVector(gravityAlongSlope, dt);
    this.velocity.projectOnPlane(this.normal);
    let speed = this.velocity.length();

    if (speed < 0.1) {
      const downhill = this.tmpB.copy(GRAVITY).projectOnPlane(this.normal).normalize();
      this.forward.lerp(downhill, 0.09).projectOnPlane(this.normal).normalize();
    }

    const surface = SURFACE[this.surface] ?? SURFACE.GROOMED;
    const braking = this.input.isBrakeHeld?.() ?? (this.input.isDown('KeyS') || this.input.isDown('ControlLeft') || this.input.isDown('ControlRight'));
    const steer = this.input.steerAxis();
    const butterIntent = speed > 2.2 && this.input.isDown('KeyW') && Math.abs(steer) > 0.001;
    if (butterIntent) {
      // v0.17.1: a nose butter is a stance pivot around the loaded ski tips, not a
      // disguised carve. Keep most travel momentum pointed down the original line
      // while the skier/ski orientation rotates independently through butterYaw.
      const direction = Math.sign(steer);
      const speedFactor = THREE.MathUtils.clamp(speed / 20, 0.2, 1);
      const turnAngle = direction * THREE.MathUtils.lerp(2.25, 3.15, speedFactor) * dt;
      this.butterDirection = direction;
      this.butterYaw += turnAngle;
      this.butterTime += dt;
      this.wasButtering = true;
      this.bestButterDegrees = Math.max(this.bestButterDegrees, Math.abs(this.butterYaw) * 180 / Math.PI);
      // A little scrub keeps the move planted without turning it into an instant
      // stop. Crucially, velocity does not orbit with the body, so a 180 exits switch.
      this.velocity.multiplyScalar(Math.max(0.965, 1 - 0.42 * dt));
      this.slip = THREE.MathUtils.damp(this.slip, 0.08, 10, dt);
      speed = this.velocity.length();
    } else {
      if (this.wasButtering && Math.abs(this.butterYaw) > 0.001) {
        // Preserve the exact visual orientation on release by decomposing the pivot
        // into 180-degree stance flips plus at most +/-90 degrees of heading change.
        // 180/540 => switch, 360/720 => original stance. No snap-back animation.
        const committed = decomposeButterYaw(this.butterYaw);
        if (committed.switchDelta) this.switchStance = !this.switchStance;
        if (Math.abs(committed.residual) > 0.001) {
          this.forward.applyAxisAngle(this.normal, committed.residual).projectOnPlane(this.normal).normalize();
          this.velocity.applyAxisAngle(this.normal, committed.residual);
        }
      }
      if (Math.abs(steer) > 0.001 && speed > 0.35) {
        const turnAngle = steer * turnRateForSpeed(speed) * surface.grip * 1.08 * dt;
        const edge = edgeResponse(speed, steer, surface.grip, braking);
        this.slip = edge.slip;
        this.velocity.applyAxisAngle(this.normal, turnAngle * (1-edge.slip*0.8));
        this.forward.applyAxisAngle(this.normal, turnAngle).projectOnPlane(this.normal).normalize();
        speed = this.velocity.length();
      }
      this.butterDirection = 0;
      this.butterYaw = 0;
      this.butterTime = 0;
      this.wasButtering = false;
    }

    if(Math.abs(steer)<=0.001)this.slip*=Math.exp(-5*dt);

    // Ground controls are intentionally simple now: S is brake, while W loads
    // the ski tips into a nose-butter stance. A/D then pivots around the tips.
    // There is no separate nose-manual or tail-manual mode on snow.
    this.manualType = speed > 2.2 && this.input.isDown('KeyW') ? 'NOSE BUTTER' : null;
    const pipe=contact.section;
    // Rising relative to the pipe floor, not global altitude. A skier can climb
    // a wall while travelling down a graded pipe and still lose world height.
    this.transitionAscending=pipe?pipe.theta>.05&&(this.velocity.x*pipe.c+this.velocity.z*pipe.s)*pipe.side>.005:this.velocity.y>0;
    const tucked = false; // Shift is reserved exclusively for ski on/off.

    // Ground mouse buttons are independent pole pushes: LMB = left pole,
    // RMB = right pole, both = double-pole push. Airborne buttons remain grabs.
    this.polePushSide = polePushMode(this.input.isMouseButtonDown?.(0), this.input.isMouseButtonDown?.(2));
    this.polePushing = Boolean(this.polePushSide) && !braking && speed < 14.5;
    if (this.polePushing) {
      // A new mouse press always starts at the reach/plant rather than resuming
      // halfway through an old stroke. The cycle includes a real recovery pause.
      if (!this.wasPolePushing || this.lastPolePushSide !== this.polePushSide) this.polePushPhase = 0;
      const cadence = 0.82 + Math.min(speed, 10) * 0.012;
      this.polePushPhase = (this.polePushPhase + dt * cadence) % 1;
      // Propulsion only happens while the pole is planted and the hand is driving
      // backwards. Recovery contributes no magical acceleration.
      const p = this.polePushPhase;
      let drive = 0;
      if (p >= 0.16 && p <= 0.62) {
        const u = (p - 0.16) / 0.46;
        drive = Math.sin(Math.PI * u);
      }
      const push = polePushAcceleration(speed) * polePushStrength(this.polePushSide) * drive;
      this.velocity.addScaledVector(this.forward, push * dt);
    } else {
      this.polePushSide = null;
      this.polePushPhase = 0;
    }
    this.wasPolePushing = this.polePushing;
    this.lastPolePushSide = this.polePushSide;

    // Legacy Shift pumping is disabled: Shift is now the ski-toggle key.
    const pumping = false;
    const normalDelta = this.normal.y - this.previousNormalY;
    this.previousNormalY = this.normal.y;
    if (pumping && this.pumpCooldown <= 0) {
      const gain = this.transition ? Math.max(0,this.surfaceLoad-1)*dt*0.8 : pumpChargeGain({ speed, normalDelta, crouched: true, dt });
      this.pumpCharge = Math.min(1, this.pumpCharge + gain);
    }
    if (this.wasPumping && !pumping && this.pumpCooldown <= 0) {
      const boost = this.transition ? transitionPump(this.pumpCharge,speed,this.transitionAscending,this.surfaceLoad) : pumpReleaseBoost(this.pumpCharge, speed);
      if (boost < 0) this.velocity.multiplyScalar(Math.max(0.9,1+boost/Math.max(1,speed)));
      if (boost > 0) {
        this.velocity.addScaledVector(this.forward, boost);
        this.pumpCooldown = 0.32;
      }
      this.pumpCharge = 0;
    }
    if (!pumping && !this.wasPumping) this.pumpCharge *= Math.exp(-2.2 * dt);
    this.wasPumping = pumping;
    const airDrag = aerodynamicDrag(speed, tucked);
    const brakeDrag = stoppingDrag(braking, speed);
    const carveDrag = Math.abs(steer) * Math.min(0.9, speed * 0.021) * surface.carve;
    const manualDrag = this.manualType === 'NOSE BUTTER' ? 0.07 : this.manualType ? 0.035 : 0;
    // Deep snow has noticeable resistance when slow, then starts to plane/float
    // as speed builds. This makes powder feel surfier and less like recoloured
    // groomed snow without turning it into a frustrating speed trap.
    const powderFloat = this.surface === 'POWDER' ? THREE.MathUtils.clamp((speed - 5) / 20, 0, 1) : 0;
    const rollingDrag = this.surface === 'POWDER' ? THREE.MathUtils.lerp(0.78, 0.32, powderFloat) : surface.rolling;
    const totalDrag = rollingDrag + airDrag + brakeDrag + carveDrag + manualDrag;

    if (speed > 0.001) {
      this.tmpB.copy(this.velocity).normalize();
      this.velocity.addScaledVector(this.tmpB, -Math.min(speed, totalDrag * dt));
    }

    // Tucking changes aerodynamic drag only; it is not an engine.

    speed = this.velocity.length();
    if (speed > MAX_SPEED) this.velocity.multiplyScalar(MAX_SPEED / speed);

    if (this.velocity.lengthSq() > 0.35) {
      this.tmpB.copy(this.velocity).projectOnPlane(this.normal).normalize();
      this.forward.lerp(this.tmpB, 1 - Math.exp(-(this.slip>0.1 ? 1.4 : 6.5) * dt)).projectOnPlane(this.normal).normalize();
    }

    if (this.input.consumePress('Space')) {
      const preload = false;
      // On a steep pipe wall, jumping along the surface normal points toward
      // the centre of the pipe. That created the same unwanted centre-pull as
      // the old coping launch. Pop mostly upward instead, preserving the wall-
      // tangent trajectory so the rider comes back to the same wall.
      if (contact.section && contact.transition && contact.section.theta > 0.58) {
        this.preparePipePop(contact.transition, contact.section, preload);
      } else {
        this.launch(preload ? 6.8 : 5.35, preload ? 1.1 : 0.78);
      }
    }
  }

  stepWalk(dt) {
    const contact = this.getContactSurface(this.position.x, this.position.z);
    this.normal.copy(contact.normal);
    this.position.y = contact.height + CONTACT_HEIGHT;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.switchStance = false;
    this.polePushing = false;
    this.polePushSide = null;
    this.manualType = null;

    // Walking deliberately ignores downhill ski acceleration. The skier can now
    // take their skis off to explore stations, forests and freeride viewpoints.
    const turn = this.input.steerAxis();
    if (Math.abs(turn) > 0.001) {
      this.forward.applyAxisAngle(this.normal, turn * 2.35 * dt).projectOnPlane(this.normal).normalize();
    }

    const move = (this.input.isDown('KeyW') ? 1 : 0) - (this.input.isDown('KeyS') ? 1 : 0);
    const running = false;
    const maxForward = running ? 6.6 : 4.4;
    const targetSpeed = move >= 0 ? move * maxForward : move * 2.6;
    this.tmpA.copy(this.forward).projectOnPlane(this.normal).normalize().multiplyScalar(targetSpeed);
    const blend = 1 - Math.exp(-9.5 * dt);
    this.velocity.lerp(this.tmpA, blend).projectOnPlane(this.normal);

    if (Math.abs(move) < 0.01) this.velocity.multiplyScalar(Math.exp(-11 * dt));
    this.grounded = true;
  }

  toggleSkis() {
    if (this.grind || this.crashed || this.activityMode) return null;
    const wasGrounded = this.grounded;
    this.skisEquipped = !this.skisEquipped;
    this.resting = false;
    // On the ground, removing skis enters walking mode and kills ski momentum.
    // In the air, Shift is a true mid-air ski toggle: keep trajectory and rotation.
    if (wasGrounded) {
      this.velocity.multiplyScalar(this.skisEquipped ? 0.25 : 0);
      this.switchStance = false;
      this.airYaw = 0;
      this.airPitch = 0;
      this.yawVelocity = 0;
      this.pitchVelocity = 0;
    }
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    return this.skisEquipped;
  }

  setResting(active) {
    const wantsRest = Boolean(active);
    if (!wantsRest) {
      this.resting = false;
      return false;
    }
    if (!this.grounded || !this.skisEquipped || this.grind || this.crashed || this.activityMode) {
      this.resting = false;
      return null;
    }
    this.resting = true;
    this.manualType = null;
    this.polePushing = false;
    this.polePushSide = null;
    return true;
  }

  toggleResting() {
    return this.setResting(!this.resting);
  }

  stepAir(dt) {
    this.velocity.addScaledVector(GRAVITY, dt);

    // Holding A/D produces continuous aerial rotation. v0.14 fixes the
    // direction convention so A is anticlockwise and D is clockwise.
    const rawYawInput = THREE.MathUtils.clamp(this.input.airSpinAxis(), -1, 1);
    // Pipe airs get a short carve-carry grace period so holding A/D through the
    // coping does not instantly create a false 90-degree landing. After 0.11 s,
    // the same held input becomes a deliberate aerial spin automatically — no
    // awkward release/re-press ritual. Quarterpipe spins and flips also build
    // angular momentum faster than normal piste airs, matching their short hangtime.
    if (this.pipeAir && !this.pipeAir.spinArmed && (Math.abs(rawYawInput) < 0.05 || (this.pipeAir.age||0) >= 0.11)) this.pipeAir.spinArmed = true;
    const yawInput = this.pipeAir && !this.pipeAir.spinArmed ? 0 : rawYawInput;
    const jumpFlight = this.activityMode === 'ski-jump';
    const pitchInput = jumpFlight ? 0 : THREE.MathUtils.clamp(this.input.airFlipAxis() + this.input.axis('ArrowUp', 'ArrowDown') * 0.65, -1, 1);
    const pipeControl = Boolean(this.pipeAir);
    this.yawVelocity = angularVelocity(this.yawVelocity,yawInput,dt,jumpFlight?1.6:pipeControl?5.45:4.4,pipeControl?5.9:3.5);
    this.pitchVelocity = angularVelocity(this.pitchVelocity,pitchInput,dt,pipeControl?5.75:4.45,pipeControl?6.15:3.5);
    this.airYaw += this.yawVelocity*dt;
    this.airPitch += this.pitchVelocity*dt;

    this.spreadEagle = Boolean(this.input.isSpreadEagleHeld?.());
    if (this.spreadEagle) this.spreadEagleTime += dt;
    this.crossSkis = !jumpFlight && !this.spreadEagle && this.input.isDown('KeyQ');
    if (this.crossSkis) this.crossSkisTime += dt;
    this.daffy = !jumpFlight && !this.spreadEagle && !this.crossSkis && Boolean(this.input.isDaffyHeld?.());
    if (this.daffy) this.daffyTime += dt;
    this.skiJumpPose = jumpFlight && !this.spreadEagle && this.input.isDown('KeyW');

    // Simple bounded aerodynamic model. Spread Eagle creates a small measurable
    // lift increase (and extra drag), while V-style remains the best dedicated
    // ski-flying posture for distance.
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const flightPose = this.skiJumpPose ? 'vstyle' : (!this.skisEquipped && this.spreadEagle) ? 'spreadFlight' : this.spreadEagle ? 'spread' : 'neutral';
    this.velocity.y += flightLiftAcceleration(horizontalSpeed, flightPose) * dt;
    const drag = flightHorizontalDrag(horizontalSpeed, flightPose) * dt;
    if (horizontalSpeed > 0.01 && drag > 0) {
      const factor = Math.max(0.985, 1 - drag);
      this.velocity.x *= factor;
      this.velocity.z *= factor;
    }
    // Modest air steering for choosing transfers; yaw/flip keys remain rotations.
    const airSteer=this.input.axis('ArrowRight','ArrowLeft');
    if(airSteer){
      const right=this.tmpB.set(this.forward.z,0,-this.forward.x).normalize();
      this.velocity.addScaledVector(right,airSteer*(this.pipeAir?1.75:2.4)*dt);
    }
    this.manualType = null;
    this.polePushing = false;
    this.polePushSide = null;

    this.currentGrab = this.spreadEagle || this.daffy || jumpFlight ? null : this.input.getGrab(yawInput || Math.sign(this.airYaw));
    if (this.currentGrab) {
      const tweak = this.input.getGrabTweak();
      const scale = this.currentGrab === 'DOUBLE' ? 0.46 : 1;
      this.currentGrabTweak = { x: tweak.x * scale, y: tweak.y * scale, magnitude: tweak.magnitude * scale };
    } else this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    if (this.currentGrab) {
      this.airGrabTime += dt;
      this.airGrab = this.currentGrab;
      if (this.currentGrabTweak.magnitude >= this.airGrabTweak.magnitude) {
        this.airGrabTweak = { ...this.currentGrabTweak };
      }
    }

    const horizontal = this.tmpA.set(this.velocity.x, 0, this.velocity.z);
    if (this.pipeAir) {
      this.pipeAir.age=(this.pipeAir.age||0)+dt;
      // Preserve the wall-relative body orientation through a pipe air instead
      // of snapping the skier upright as soon as the skis leave the coping.
      const projectedSection=pipeSection(this.pipeAir.feature,this.position.x,this.position.z);
      if(projectedSection){
        pipeNormal(this.terrain,this.pipeAir.feature,projectedSection,this.tmpC);
        this.normal.lerp(this.tmpC,1-Math.exp(-1.15*dt)).normalize();
      }else if(this.pipeAir.up){
        this.normal.lerp(this.pipeAir.up,1-Math.exp(-0.65*dt)).normalize();
      }
      const tangentForward=horizontal.clone().projectOnPlane(this.normal);
      if(tangentForward.lengthSq()>0.16)this.forward.lerp(tangentForward.normalize(),1-Math.exp(-1.8*dt)).normalize();
    } else {
      if (horizontal.lengthSq() > 0.2) {
        horizontal.normalize();
        this.forward.lerp(horizontal, 1 - Math.exp(-2.8 * dt)).normalize();
      }
      this.normal.lerp(WORLD_UP, 1 - Math.exp(-4 * dt)).normalize();
    }
  }

  stepGrind(dt) {
    if (!this.grind) return;

    if (this.input.consumePress('Space')) {
      this.endGrind(3.4);
      return;
    }

    this.grindAge+=dt;
    const adjust=(this.input.isDown('KeyA')?1:0)-(this.input.isDown('KeyD')?1:0);
    const centering=this.input.isDown('ControlLeft')||this.input.isDown('ControlRight');
    this.grindYaw=centering?THREE.MathUtils.damp(this.grindYaw,0,5,dt):THREE.MathUtils.clamp(this.grindYaw+adjust*1.8*dt,-2.35,2.35);
    const over=Math.max(0,Math.abs(this.grindYaw)-1.88);
    this.grindBalance=THREE.MathUtils.clamp(this.grindBalance+(over*1.5-0.16)*dt,0,1);
    if(this.grindBalance>=1){this.endGrind(0.1);this.bail('RAIL OVERBALANCE',0.7);return;}
    const yawAbs=Math.abs(this.grindYaw);
    this.grindType=yawAbs>1.05?(this.switchStance?'SWITCH ':'')+(this.grindYaw>0?'FS BOARDSLIDE':'BS BOARDSLIDE'):yawAbs>0.2?'ANGLED SLIDE':'50-50';
    // Keep the chosen grind when the player releases the key. Holding A/D
    // before contact therefore enters a ski slide and does not instantly snap
    // back to 50-50 on the next physics frame.
    if (this.input.isDown('KeyW')) this.grindType = 'NOSE PRESS';
    else if (this.input.isDown('KeyS')) this.grindType = 'TAIL PRESS';
    else if (yawAbs > 0.9 && this.input.isDown('KeyQ')) this.grindType = 'FRONT SKI OFF';
    else if (yawAbs > 0.9 && this.input.isDown('KeyE')) this.grindType = 'BACK SKI OFF';
    else if (this.input.isDown('KeyC')) this.grindType = 'SPLIT-SIDE SLIDE';
    else if (this.input.isDown('KeyZ')) this.grindType = 'LEFT SKI';
    else if (this.input.isDown('KeyX')) this.grindType = 'RIGHT SKI';

    const tangent=railTangent(this.grind,this.grindT,this.tmpB).multiplyScalar(this.grindDirection);
    const speed = Math.max(3.2, this.grindSpeed + (-9.81*tangent.y-0.35)*dt);
    const distance = speed * dt;
    this.grindDistance += distance;
    this.grindT += this.grindDirection * distance / this.grind.length;
    this.grindSpeed = speed;

    if (this.grindT >= 0.999 || this.grindT <= 0.001) {
      this.grindT = this.grindDirection>0?1:0;
      this.position.copy(this.grindDirection>0?this.grind.end:this.grind.start);
      this.position.y += this.grind.grindHeight ?? GRIND_HEIGHT;
      this.endGrind(0.65);
      return;
    }

    const target = railPoint(this.grind,this.grindT,this.tmpA);
    target.y += this.grind.grindHeight ?? GRIND_HEIGHT;

    // Ease out the catch offset over ~0.16 s instead of teleporting directly onto
    // the rail. This removes the most obvious scuffed rail-entry animation.
    this.grindEntryBlend *= Math.exp(-9.5 * dt);
    this.position.copy(target).addScaledVector(this.grindEntryOffset, this.grindEntryBlend);
    railTangent(this.grind,this.grindT,this.forward).multiplyScalar(this.grindDirection);
    this.velocity.copy(this.forward).multiplyScalar(speed);
    this.normal.copy(WORLD_UP);
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
  }

  leaveTerrainLip() {
    if (!this.grounded || this.crashed || this.grind) return false;
    // Preserve the exact tangent velocity generated by the physical inrun and
    // takeoff table. No synthetic upward impulse is added.
    this.grounded = false;
    this.position.y += 0.10;
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.airGrab = null;
    this.currentGrab = null;
    return true;
  }

  preparePipePop(feature, section, preload = false) {
    if (!feature || !section || !this.grounded || this.crashed || this.grind) return false;
    const c = section.c, s = section.s, side = section.side;
    const steep = THREE.MathUtils.clamp(Math.sin(section.theta), 0, 1);
    const pop = preload ? 1.85 : 1.15;
    // A pipe pop is an extension *along the wall tangent*, not a jump along the
    // wall normal. Stay attached until the coping so the normal pipe integrator
    // carries the skier to the lip; the coping then releases vertically without
    // any centreward shove. This also avoids a premature collision with the wall.
    const tangentAcross = side * Math.cos(section.theta);
    const tangentY = Math.sin(section.theta);
    this.velocity.x += tangentAcross * c * pop;
    this.velocity.z += tangentAcross * s * pop;
    this.velocity.y += tangentY * pop * THREE.MathUtils.lerp(0.75, 1.0, steep);
    this.pumpCooldown = Math.max(this.pumpCooldown, 0.12);
    return true;
  }

  launch(upImpulse, forwardBoost = 0.6) {
    this.resting = false;
    this.velocity.addScaledVector(this.normal, upImpulse);
    this.velocity.addScaledVector(this.forward, forwardBoost);
    this.position.addScaledVector(this.normal, 0.2);
    this.grounded = false;
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.spreadEagle = false;
    this.spreadEagleTime = 0;
    this.crossSkis = false;
    this.crossSkisTime = 0;
    this.daffy = false;
    this.daffyTime = 0;
    this.manualType = null;
    this.butterDirection = 0;
    this.butterYaw = 0;
    this.butterTime = 0;
    this.wasButtering = false;
    this.skiJumpPose = false;
  }

  launchFromRamp(boost = 6) {
    if (!this.grounded || this.grind || !this.skisEquipped) return false;
    // Ramp normal already tilts the impulse in the correct takeoff direction.
    this.launch(Math.min(3.4,boost*0.42),0.35);
    return true;
  }

  beginGrind(rail, t = 0) {
    if (this.grind || !this.skisEquipped) return false;
    const contactPoint = railPoint(rail,THREE.MathUtils.clamp(t,0.01,0.98));
    contactPoint.y += rail.grindHeight ?? GRIND_HEIGHT;
    this.grindEntryOffset.copy(this.position).sub(contactPoint);
    this.grindEntryOffset.clampLength(0, 1.18);
    this.grindEntryBlend = 1;

    this.grindDirection=this.velocity.dot(railTangent(rail,t))<0?-1:1;
    let wrapped=THREE.MathUtils.euclideanModulo(this.airYaw+Math.PI,Math.PI*2)-Math.PI;
    if(Math.abs(wrapped)>Math.PI*0.75){this.switchStance=!this.switchStance;wrapped-=Math.sign(wrapped)*Math.PI;}
    this.grindYaw=THREE.MathUtils.clamp(wrapped,-2.35,2.35);
    this.grindBalance=0;this.grindAge=0;this.suspension=0.55;this.suspensionRate=2;
    this.grind = rail;
    this.grindT = THREE.MathUtils.clamp(t, 0.01, 0.98);
    this.grindSpeed = Math.max(5.2, this.velocity.length() * 0.99);
    this.grindDistance = 0;
    this.grindType = this.input.isDown('KeyA') ? 'FS RAIL SLIDE' : this.input.isDown('KeyD') ? 'BS RAIL SLIDE' : '50-50';
    this.grounded = false;
    this.manualType = null;
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.position.copy(contactPoint).add(this.grindEntryOffset);
    railTangent(rail,this.grindT,this.forward).multiplyScalar(this.grindDirection);
    this.velocity.copy(this.forward).multiplyScalar(this.grindSpeed);
    this.normal.copy(WORLD_UP);
    return true;
  }

  endGrind(upImpulse = 0.65) {
    if (!this.grind) return;
    const railDirection = railTangent(this.grind,this.grindT).multiplyScalar(this.grindDirection);
    // Exit stance now comes from the skis/body angle actually held on the rail.
    // Facing mostly uphill produces a switch exit; facing mostly downhill produces
    // a regular exit. A small diagonal launch preserves the slanted grind instead
    // of snapping perfectly straight, while momentum still follows the rail line.
    const exit = grindExitProfile(this.grindYaw || 0, this.switchStance);
    const horizontalRail = this.tmpA.copy(railDirection).setY(0);
    if (horizontalRail.lengthSq() < 1e-6) horizontalRail.set(0,0,1);
    horizontalRail.normalize().applyAxisAngle(WORLD_UP, exit.travelYaw);
    const direction = this.tmpB.set(horizontalRail.x, railDirection.y, horizontalRail.z).normalize();
    this.switchStance = exit.switchStance;
    this.lastExitedRail=this.grind.id;
    this.lastGrindDistance = this.grindDistance;
    this.lastGrindType = this.grindType;
    this.grind = null;
    this.justEndedGrind = true;
    this.grounded = false;
    this.grindType = null;
    this.position.y += 0.16;
    this.velocity.copy(direction).multiplyScalar(Math.max(6, this.grindSpeed));
    this.velocity.y += upImpulse;
    this.forward.copy(direction);
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.airGrab = null;
  }

  resolveTerrainContact() {
    let contact = this.getContactSurface(this.position.x, this.position.z);
    let contactHeight = contact.height + CONTACT_HEIGHT;
    let sweptHit = false;

    // Continuous/swept snow contact for airborne motion. v0.17.32 lowered the
    // global physics rate for performance; a fast skier could occasionally move
    // from above a sharp snow rise to above the far side in one fixed step, never
    // sampling the solid surface between those points. Sample the travelled segment
    // only while airborne, so normal ground skiing keeps the cheaper 90 Hz loop.
    if (!this.grounded && !this.grind && this.previousPosition) {
      const dx = this.position.x - this.previousPosition.x;
      const dy = this.position.y - this.previousPosition.y;
      const dz = this.position.z - this.previousPosition.z;
      const travelSq = dx*dx + dy*dy + dz*dz;
      if (travelSq > 0.16) {
        const previousSurface = this.previousContact || this.getContactSurface(this.previousPosition.x, this.previousPosition.z);
        let lastClearance = this.previousPosition.y - (previousSurface.height + CONTACT_HEIGHT);
        const samples = travelSq > 1.0 ? 5 : 3;
        for (let i = 1; i <= samples; i += 1) {
          const u = i / samples;
          const sx = this.previousPosition.x + dx * u;
          const sy = this.previousPosition.y + dy * u;
          const sz = this.previousPosition.z + dz * u;
          const sampleContact = this.getContactSurface(sx, sz);
          const sampleHeight = sampleContact.height + CONTACT_HEIGHT;
          const clearance = sy - sampleHeight;
          const crossedSurface = clearance <= 0.015 && (lastClearance > 0.015 || clearance < -0.08);
          if (crossedSurface && (this.detachTimer <= 0 || clearance < -0.12)) {
            this.position.set(sx, sampleHeight, sz);
            contact = sampleContact;
            contactHeight = sampleHeight;
            sweptHit = true;
            break;
          }
          lastClearance = clearance;
        }
      }
    }

    const penetration = contactHeight - this.position.y;
    const emergencyDepenetration = penetration > 0.12;
    if (!this.grounded && this.position.y <= contactHeight &&
        (sweptHit || this.velocity.dot(contact.normal) < 0 || penetration > 0.08) &&
        (this.detachTimer <= 0 || emergencyDepenetration)) {
      this.normal.copy(contact.normal);
      const impactSpeed = Math.max(0, -this.velocity.dot(this.normal));
      this.position.y = contactHeight;
      this.velocity.projectOnPlane(this.normal);
      const landingLoss = THREE.MathUtils.clamp(1 - impactSpeed * 0.014, 0.68, 0.992);
      this.velocity.multiplyScalar(landingLoss);

      this.lastAirYaw = this.airYaw;
      this.lastAirPitch = this.airPitch;
      this.lastAirGrab = this.airGrab;
      this.lastAirGrabTime = this.airGrabTime;
      this.lastAirGrabTweak = { ...this.airGrabTweak };
      this.lastSpreadEagleTime = this.spreadEagleTime;
      this.lastCrossSkisTime = this.crossSkisTime;
      this.lastDaffyTime = this.daffyTime;
      this.lastLandingImpact = impactSpeed;
      this.suspensionRate += Math.min(9,impactSpeed*0.65);
      this.landingSerial++;
      const steepLanding = this.normal.y < 0.72;
      // Slightly more forgiving than v0.17.32. The 90 Hz performance build could
      // sample touchdown a fraction later than the old 120 Hz loop, exaggerating
      // the measured normal impact speed on otherwise survivable landings.
      const hardImpactLimit = steepLanding ? 31.0 : 23.0;
      if (impactSpeed > hardImpactLimit) {
        this.bail('HARD IMPACT',1.5);
        return;
      }
      this.lastLandingSpinError = rotationLandingError(this.airYaw);
      this.lastLandingFlipError = flipLandingErrorDegrees(this.airPitch);

      // Do not auto-correct a skier who comes down sideways. v0.5 visually
      // snapped a 90-degree landing back to straight; v0.6 turns that into an
      // actual bail. Near-complete 180/360/etc. rotations still scrub cleanly.
      if (isUnsafeFlipLanding(this.airPitch, steepLanding ? 82 : 60)) {
        const pitchDegrees = Math.abs(this.airPitch) * 180 / Math.PI;
        const reason = this.lastLandingFlipError > 120 || (pitchDegrees % 360 > 120 && pitchDegrees % 360 < 240)
          ? 'HEAD-FIRST LANDING'
          : 'INCOMPLETE FLIP';
        this.grounded = true;
        this.airYaw = 0;
        this.airPitch = 0;
        this.currentGrab = null;
        this.airGrab = null;
        this.spreadEagle = false;
        this.skiJumpPose = false;
        this.bail(reason, THREE.MathUtils.clamp(1.0 + this.lastLandingFlipError / 140, 1.05, 1.7));
        return;
      }

      const samePipeLanding = Boolean(
        this.pipeAir && contact.transition && contact.section &&
        contact.transition.id === this.pipeAir.feature?.id
      );
      // Pipe landings happen on a banked/curved surface and naturally scrub a
      // little more yaw than a flat piste landing. The normal 55° rule was too
      // aggressive here, especially on quarterpipes. A genuine ~90° landing
      // still bails, but clean wall re-entry no longer gets falsely labelled.
      const unsafeSpinLanding = samePipeLanding
        ? isUnsafeSpinLanding(this.airYaw, 87)
        : isUnsafeSpinLanding(this.airYaw, steepLanding ? 84 : 70);
      if (unsafeSpinLanding) {
        this.grounded = true;
        this.airYaw = 0;
        this.airPitch = 0;
        this.currentGrab = null;
        this.airGrab = null;
        this.spreadEagle = false;
        this.skiJumpPose = false;
        this.bail('SIDEWAYS LANDING', THREE.MathUtils.clamp(0.7 + this.lastLandingSpinError, 0.9, 1.55));
        return;
      }

      this.lastSwitchLanding = changesSwitchStance(this.lastAirYaw);
      if (this.lastSwitchLanding) this.switchStance = !this.switchStance;

      this.airYaw = 0;
      this.airPitch = 0;
      this.currentGrab = null;
      this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
      this.airGrab = null;
      this.airGrabTime = 0;
      this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
      this.spreadEagle = false;
      this.spreadEagleTime = 0;
      this.crossSkis = false;
      this.crossSkisTime = 0;
      this.daffy = false;
      this.daffyTime = 0;
      this.skiJumpPose = false;
      this.grounded = true;
      this.pipeAir = null;
      this.justLanded = true;
      return;
    }

    if (this.grounded) {
      const delta = this.position.distanceTo(this.previousPosition);
      const normalSpeed = this.velocity.dot(contact.normal);
      const old = this.previousContact;
      const transition = old?.transition || this.terrain.getTransition?.(this.previousPosition.x,this.previousPosition.z);
      const lip = transition && this.terrain.leavesTransitionLip?.(transition,this.previousPosition,this.position,this.velocity);
      // Detach only at authored lips or meaningful convex terrain unloading.
      // Small undulations remain within suspension travel.
      const fallingAway = this.position.y-contactHeight;
      if (this.skisEquipped && !this.crashed && delta>0.001 &&
          (!contact.section && (lip || (normalSpeed>1.5 && fallingAway>0.06 && this.velocity.length()>9)))) {
        this.leaveTerrainLip();
        this.detachTimer=0.025;
        return;
      }
      this.surfaceLoad = THREE.MathUtils.clamp(1-normalSpeed/Math.max(0.001,this.stepDt||1/120)/9.81,0,6);
      const spring=suspensionStep(this.suspension,this.suspensionRate,(this.surfaceLoad-1)*0.15,this.stepDt||1/120);
      this.suspension=spring.value; this.suspensionRate=spring.rate;
      // Transport to the new tangent once; do not project away kinetic energy.
      this.transport.setFromUnitVectors(this.normal,contact.normal);
      this.velocity.applyQuaternion(this.transport);
      this.forward.applyQuaternion(this.transport).normalize();
      this.normal.copy(contact.normal);
      // Never allow the grounded physics origin to remain beneath the sampled
      // snow surface. This is the final anti-penetration guard after transport.
      this.position.y = contactHeight;
    } else if (!this.grind && this.position.y < contactHeight - 0.12) {
      // Last-resort recovery for pathological terrain/feature discontinuities.
      // A heightfield has no legitimate underground space, so being this deep
      // can only be a tunnelling error. Recover immediately instead of showing
      // the skier travelling under the snow for several frames.
      this.position.y = contactHeight;
      this.normal.copy(contact.normal);
      this.velocity.projectOnPlane(this.normal);
      this.grounded = true;
      this.detachTimer = 0;
    }
  }


  stepCrash(dt) {
    const contact = this.getContactSurface(this.position.x, this.position.z);
    this.normal.copy(contact.normal);
    this.position.y = contact.height + CONTACT_HEIGHT;
    this.velocity.projectOnPlane(this.normal);
    this.velocity.multiplyScalar(Math.exp(-5.2 * dt));
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.crashTimer = Math.max(0, this.crashTimer - dt);
    if (this.crashTimer <= 0) {
      this.crashed = false;
      this.crashReason = '';
      if (this.velocity.lengthSq() < 1) this.velocity.copy(this.forward).multiplyScalar(2.2);
    }
  }

  bail(reason = 'CRASH', severity = 1) {
    if (this.crashed) return false;
    this.resting = false;
    if (this.grind) {
      this.grind = null;
      this.grindType = null;
      this.grindDistance = 0;
    }
    const contact = this.getContactSurface(this.position.x, this.position.z);
    this.position.y = contact.height + CONTACT_HEIGHT;
    this.normal.copy(contact.normal);
    this.velocity.projectOnPlane(this.normal).multiplyScalar(THREE.MathUtils.clamp(0.24 - severity * 0.08, 0.08, 0.2));
    this.grounded = true;
    this.crashed = true;
    this.justCrashed = true;
    this.crashTimer = THREE.MathUtils.clamp(0.62 + severity * 0.34, 0.7, 1.15);
    this.crashReason = reason;
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.spreadEagle = false;
    this.spreadEagleTime = 0;
    this.crossSkis = false;
    this.crossSkisTime = 0;
    this.daffy = false;
    this.daffyTime = 0;
    this.manualType = null;
    this.skiJumpPose = false;
    this.justLanded = false;
    return true;
  }

  escapeRail(rail) {
    if (!rail?.start || !rail?.end) return false;
    const hit=railClosest(rail,this.position);
    const tangent = this.tmpA.copy(hit.tangent);
    tangent.y = 0;
    if (tangent.lengthSq() < 0.001) tangent.set(0, 0, 1);
    tangent.normalize();

    const along = this.tmpB.copy(this.position).sub(rail.start);
    const horizontalLengthSq = Math.max(0.0001, (rail.end.x - rail.start.x) ** 2 + (rail.end.z - rail.start.z) ** 2);
    const rawT = ((this.position.x - rail.start.x) * (rail.end.x - rail.start.x) + (this.position.z - rail.start.z) * (rail.end.z - rail.start.z)) / horizontalLengthSq;
    const t = THREE.MathUtils.clamp(rawT, 0, 1);
    const closestX = hit.point.x;
    const closestZ = hit.point.z;
    const perp = this.tmpC.set(tangent.z, 0, -tangent.x).normalize();
    let side = Math.sign((this.position.x - closestX) * perp.x + (this.position.z - closestZ) * perp.z);
    if (!side) side = this.velocity.dot(perp) >= 0 ? 1 : -1;

    const clearance = (rail.collisionRadius ?? 0.8) + 1.15;
    this.position.set(closestX, this.position.y, closestZ)
      .addScaledVector(perp, side * clearance)
      .addScaledVector(tangent, 1.35);
    const contact = this.getContactSurface(this.position.x, this.position.z);
    this.position.y = contact.height + CONTACT_HEIGHT;
    this.forward.copy(tangent);
    this.velocity.copy(tangent).multiplyScalar(Math.max(2.2, Math.min(6, this.velocity.length() * 0.2)));
    return true;
  }

  applyObstacleCollision(normal, penetration, severity = 1) {
    if (this.grind) this.endGrind(2.2);
    this.position.addScaledVector(normal, penetration + 0.12);
    const toward = this.velocity.dot(normal);
    if (toward < 0) this.velocity.addScaledVector(normal, -toward * 1.25);
    this.velocity.multiplyScalar(THREE.MathUtils.clamp(0.72 - severity * 0.12, 0.42, 0.72));
    if (this.grounded) {
      const contact = this.getContactSurface(this.position.x, this.position.z);
      this.position.y = contact.height + CONTACT_HEIGHT;
    }
  }

  setActivityMode(mode = null) {
    this.activityMode = mode || null;
    if (this.activityMode) this.resting = false;
    return this.activityMode;
  }

  capturePose() {
    return {
      position: this.position.clone(),
      forward: this.forward.clone(),
      speed: Math.max(1.2, this.velocity.length()),
      switchStance: this.switchStance,
      skisEquipped: this.skisEquipped,
      activityMode: this.activityMode,
      resting: this.resting,
      polePushing: this.polePushing,
      polePushSide: this.polePushSide,
      polePushPhase: this.polePushPhase,
      manualType: this.manualType,
      crossSkis: this.crossSkis,
      crossSkisTime: this.crossSkisTime,
      lastCrossSkisTime: this.lastCrossSkisTime,
      daffy: this.daffy,
      daffyTime: this.daffyTime,
      lastDaffyTime: this.lastDaffyTime,
      butterDirection: this.butterDirection,
      butterYaw: this.butterYaw,
      butterTime: this.butterTime,
      wasButtering: this.wasButtering,
      bestButterDegrees: this.bestButterDegrees,
      pumpCharge: this.pumpCharge,
      spreadEagle: this.spreadEagle,
      spreadEagleTime: this.spreadEagleTime,
      lastSpreadEagleTime: this.lastSpreadEagleTime,
      skiJumpPose: this.skiJumpPose,
    };
  }

  restorePose(pose, speed = 2.0) {
    if (!pose?.position || !pose?.forward) return false;
    if(![pose.position.x,pose.position.z,pose.forward.x,pose.forward.z].every(Number.isFinite))return false;
    this.resetAt(pose.position.x,pose.position.z,pose.forward);
    this.position.copy(pose.position);
    const contact = this.getContactSurface(this.position.x, this.position.z);
    this.position.y = contact.height + CONTACT_HEIGHT;
    this.forward.copy(pose.forward).projectOnPlane(WORLD_UP).normalize();
    if (this.forward.lengthSq() < 0.1) this.forward.set(0, 0, 1);
    this.velocity.copy(this.forward).multiplyScalar(speed);
    this.normal.copy(contact.normal);
    this.grounded = true;
    this.crashed = false;
    this.justCrashed = false;
    this.crashTimer = 0;
    this.crashReason = '';
    this.switchStance = Boolean(pose.switchStance);
    this.skisEquipped = pose.skisEquipped !== false;
    this.activityMode = pose.activityMode || null;
    this.resting = Boolean(pose.resting) && this.skisEquipped;
    this.grind = null;
    this.currentGrab = null;
    this.currentGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airGrab = null;
    this.airGrabTime = 0;
    this.airGrabTweak = { x: 0, y: 0, magnitude: 0 };
    this.airYaw = 0;
    this.airPitch = 0;
    this.yawVelocity = 0; this.pitchVelocity = 0;
    return true;
  }

  setWorldPose(position, forward = new THREE.Vector3(0, 0, 1), speed = 0) {
    this.resting = false;
    this.position.copy(position);
    this.forward.copy(forward).normalize();
    this.velocity.copy(this.forward).multiplyScalar(speed);
    this.normal.copy(WORLD_UP);
    this.grounded = false;
    this.crashed = false;
    this.justCrashed = false;
    this.crashTimer = 0;
    this.crashReason = '';
    this.grind = null;
  }

  getState() {
    return {
      position: this.position,
      velocity: this.velocity,
      forward: this.forward,
      normal: this.normal,
      grounded: this.grounded,
      transition: this.transition, transitionAscending:this.transitionAscending, suspension: this.suspension, surfaceLoad: this.surfaceLoad, slip: this.slip,
      grindYaw:this.grindYaw||0,grindBalance:this.grindBalance||0,grindAge:this.grindAge||0,
      yawVelocity: this.yawVelocity, pitchVelocity: this.pitchVelocity, landingSerial: this.landingSerial,
      surface: this.surface,
      speed: this.velocity.length(),
      switchStance: this.switchStance,
      skisEquipped: this.skisEquipped,
      activityMode: this.activityMode,
      resting: this.resting,
      polePushing: this.polePushing,
      polePushSide: this.polePushSide,
      polePushPhase: this.polePushPhase,
      manualType: this.manualType,
      crossSkis: this.crossSkis,
      crossSkisTime: this.crossSkisTime,
      lastCrossSkisTime: this.lastCrossSkisTime,
      daffy: this.daffy,
      daffyTime: this.daffyTime,
      lastDaffyTime: this.lastDaffyTime,
      butterDirection: this.butterDirection,
      butterYaw: this.butterYaw,
      butterTime: this.butterTime,
      wasButtering: this.wasButtering,
      bestButterDegrees: this.bestButterDegrees,
      pumpCharge: this.pumpCharge,
      spreadEagle: this.spreadEagle,
      spreadEagleTime: this.spreadEagleTime,
      lastSpreadEagleTime: this.lastSpreadEagleTime,
      skiJumpPose: this.skiJumpPose,
      airYaw: this.airYaw,
      airPitch: this.airPitch,
      currentGrab: this.currentGrab,
      currentGrabTweak: this.currentGrabTweak,
      justLanded: this.justLanded,
      lastAirYaw: this.lastAirYaw,
      lastAirPitch: this.lastAirPitch,
      lastAirGrab: this.lastAirGrab,
      lastAirGrabTime: this.lastAirGrabTime,
      lastAirGrabTweak: this.lastAirGrabTweak,
      lastLandingImpact: this.lastLandingImpact,
      lastLandingSpinError: this.lastLandingSpinError,
      lastLandingFlipError: this.lastLandingFlipError,
      lastSwitchLanding: this.lastSwitchLanding,
      grinding: Boolean(this.grind),
      grindType: this.grindType,
      grindDistance: this.grindDistance,
      justEndedGrind: this.justEndedGrind,
      lastGrindDistance: this.lastGrindDistance,
      lastGrindType: this.lastGrindType,
      crashed: this.crashed,
      justCrashed: this.justCrashed,
      crashTimer: this.crashTimer,
      crashReason: this.crashReason,
    };
  }
}
