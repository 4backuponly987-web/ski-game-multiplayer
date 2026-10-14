import {ResortDressing} from './world/ResortDressing.js';
import { TransitionScenery } from './world/TransitionScenery.js';
import * as THREE from 'three';
import { Terrain } from './world/Terrain.js';
import { Environment } from './world/Environment.js';
import { ResortNavigation } from './world/ResortNavigation.js';
import { FreestyleFeatures } from './world/FreestyleFeatures.js';
import { runSpawn } from './world/RunDefinitions.js';
import { getStation, RESORT_LIFTS } from './world/ResortNetwork.js';
import { Input } from './player/Input.js';
import { SkiPhysics } from './player/SkiPhysics.js';
import { Skier } from './player/Skier.js';
import { CameraController } from './camera/CameraController.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { ChallengeSystem } from './systems/ChallengeSystem.js';
import { TrickSystem } from './systems/TrickSystem.js';
import { LiftSystem } from './systems/LiftSystem.js';
import { SessionMarkerSystem } from './systems/SessionMarkerSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { WeatherSystem } from './systems/WeatherSystem.js';
import { SnowFX } from './systems/SnowFX.js';
import { RaceSystem, RACE_EVENTS } from './systems/RaceSystem.js';
import { DiscoverySystem } from './systems/DiscoverySystem.js';
import { FreestyleEventSystem, FREESTYLE_EVENTS } from './systems/FreestyleEventSystem.js';
import { SkiJumpSystem } from './systems/SkiJumpSystem.js';
import { HeliSystem, HELISKI_DROPS } from './systems/HeliSystem.js';
import { AvalancheSystem } from './systems/AvalancheSystem.js';
import { ReplaySystem } from './systems/ReplaySystem.js';
import { SPECIAL_ZONES } from './world/SpecialZones.js';
import { HUD } from './ui/HUD.js';
import { MenuUI } from './ui/MenuUI.js';
import { MapUI } from './ui/MapUI.js';
import { ReplayUI } from './ui/ReplayUI.js';
import { MultiplayerClient } from './network/MultiplayerClient.js';

const safeRead = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

const FIXED_STEP = 1 / 90;
const MAX_FRAME_DELTA = 0.05;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.paused = false;
    this.hadPointerLock = false;
    this.accumulator = 0;
    this.lastTime = performance.now() / 1000;
    this.currentRunId = 'flow';
    this.mapOpen = false;
    this.corbetsActive = false;
    this.corbetsTimer = 0;
    this.corbetsBest = Number(safeRead('alpine-freeride-corbets-best') || 0) || 0;
    this.legendaryActive = null;
    this.legendaryTimer = 0;
    this.legendaryBests = {
      corbets: this.corbetsBest,
      streif: Number(safeRead('alpine-freeride-streif-best') || 0) || 0,
      swissWall: Number(safeRead('alpine-freeride-swiss-wall-best') || 0) || 0,
    };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x91b9cf);
    this.scene.fog = new THREE.FogExp2(0xaec8d6, 0.00078);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4200);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.shadowRefreshClock = 0;
    this.adaptiveRenderScale = 1;
    this.performanceFrameAverage = 1 / 60;
    this.performanceAdjustClock = 2.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;

    this.input = new Input(this.canvas);
    this.hud = new HUD();
    this.save = new SaveSystem();
    // One-time performance migration: older builds defaulted everyone to High,
    // which enables costly realtime shadows across the huge resort. Start this
    // performance build on Medium once; the player can still select High/Ultra.
    if (!this.save.getSetting('performance1732Migrated', false)) {
      const previousGraphics = this.save.getSetting('graphics', 'medium');
      if (previousGraphics === 'high' || previousGraphics === 'ultra') this.save.setSetting('graphics', 'medium');
      this.save.setSetting('performance1732Migrated', true);
    }
    this.audio = new AudioSystem();

    this.setupLighting();
    this.terrain = new Terrain(this.scene, { segments: 260 });
    this.environment = new Environment(this.scene, this.terrain);
    this.resortNavigation = new ResortNavigation(this.scene, this.terrain);
    this.transitionScenery = new TransitionScenery(this.scene,this.terrain);
    this.features = new FreestyleFeatures(this.scene, this.terrain);
    this.dressing=new ResortDressing(this.scene,this.terrain,this.features);
    this.detail = null;
    this.physics = new SkiPhysics(this.terrain, this.input);
    this.physics.setFeatureSampler((x, z) => this.features.sampleSurface(x, z));
    this.skier = new Skier(this.scene);
    this.cameraController = new CameraController(this.camera, this.canvas, this.input, this.terrain);
    this.cameraController.setEffectsAmount(this.save.getSetting('cameraEffects', 1));
    this.replay = new ReplaySystem(this.skier, this.camera, { sampleRate: 15, maxSeconds: 45 });
    this.lift = new LiftSystem(this.scene, this.terrain);
    this.features.addLiftCableRails(this.lift.getGrindableCableRails());
    this.collisions = new CollisionSystem([...this.environment.colliders, ...this.lift.colliders, ...this.transitionScenery.colliders, ...this.dressing.colliders, ...this.terrain.colliders]);
    this.sessionMarker = new SessionMarkerSystem(this.scene, this.terrain);
    this.challenges = new ChallengeSystem(this.save, this.terrain, this.hud);
    this.tricks = new TrickSystem(this.save, this.hud, this.challenges);
    this.snowFX = new SnowFX(this.scene);
    this.races = new RaceSystem(this.scene, this.terrain, this.save, this.hud, this.challenges);
    this.freestyleEvents = new FreestyleEventSystem(this.save, this.hud, this.challenges);
    this.discoveries = new DiscoverySystem(this.scene, this.terrain, this.save, this.hud, this.challenges);
    this.skiJump = new SkiJumpSystem(this.scene, this.terrain, this.save, this.hud, this.challenges);
    this.heli = new HeliSystem(this.scene, this.terrain, this.hud, this.audio);
    this.avalanche = new AvalancheSystem(this.scene, this.terrain, this.save, this.hud, this.audio, this.challenges);
    this.weather = new WeatherSystem(this.scene, this.renderer, this.sun, this.hemi);
    this.weather.setPreset(this.save.getSetting('weather', 'clear'));
    this.terrain.setNightMode?.(this.weather.current.id === 'night');
    this.renderDistance = this.save.getSetting('renderDistance', 'far');
    this.graphicsQuality = this.save.getSetting('graphics', 'high');
    this.setGraphicsQuality(this.graphicsQuality, false);
    this.setRenderDistance(this.renderDistance, false);
    this.menu = new MenuUI(this);
    this.multiplayer = new MultiplayerClient(this);
    this.map = null;
    this.replayUI = null;
    this.replayReturnTo = 'menu';

    this.applySavedLoadout();
    this.physics.reset();
    this.challenges.resetRun(this.physics.getState());
    this.skier.update(this.physics.getState(), this.input, 1 / 60);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    this.positionCameraForMenu();
    this.updateRenderVisibility(this.camera.position, 1);
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  ensureMapUI() {
    if (!this.map) this.map = new MapUI(this);
    return this.map;
  }

  ensureReplayUI() {
    if (!this.replayUI) this.replayUI = new ReplayUI(this, this.replay);
    return this.replayUI;
  }

  setupLighting() {
    this.hemi = new THREE.HemisphereLight(0xd9efff, 0x44505a, 1.45);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1d7, 3.7);
    this.sun.position.set(-260, 420, -180);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -145;
    this.sun.shadow.camera.right = 145;
    this.sun.shadow.camera.top = 145;
    this.sun.shadow.camera.bottom = -145;
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 900;
    this.sun.shadow.bias = -0.00035;
    this.sun.target.position.set(0, 250, 0);
    this.scene.add(this.sun, this.sun.target);

    const fill = new THREE.DirectionalLight(0x98c7e0, 0.55);
    fill.position.set(350, 180, 280);
    this.scene.add(fill);
  }

  bindEvents() {
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active && !this.replay?.editorOpen) this.pause(); });
    window.addEventListener('beforeunload', () => this.multiplayer?.dispose?.());
    window.addEventListener('blur', () => { if (this.active && !this.paused && !this.replay?.editorOpen) this.pause(); });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => {
      if (event.code === 'F9' && !event.repeat) {
        event.preventDefault();
        if (this.replay?.editorOpen) this.closeReplayEditor();
        else this.openReplayEditor();
        return;
      }
      if (event.code === 'Escape' && this.replay?.editorOpen) {
        event.preventDefault();
        this.closeReplayEditor();
        return;
      }
      if (event.code === 'Escape' && this.active && !document.querySelector('#info-modal:not(.hidden)')) {
        event.preventDefault();
        if (this.mapOpen) this.toggleMap(false);
        else this.paused ? this.resume() : this.pause();
      }
      if (event.code === 'KeyM' && this.active && !event.repeat) {
        event.preventDefault();
        this.toggleMap(!this.mapOpen);
        return;
      }
      if (!this.active || this.paused) return;

      if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && !event.repeat && !this.lift.riding) {
        event.preventDefault();
        const equipped = this.physics.toggleSkis();
        if (equipped === true) this.hud.showMessage('SKIS ON · SHIFT TO TAKE THEM OFF', 1.35);
        else if (equipped === false) this.hud.showMessage('SKIS OFF · SHIFT TO PUT THEM BACK ON · HOLD F IN AIR FOR SPREAD EAGLE', 2.0);
        else this.hud.showMessage('CLEAR THE RAIL / CRASH STATE FIRST', 1.2);
        return;
      }

      if (event.code === 'KeyR' && !event.repeat && this.lift.riding) {
        this.lift.emergencyRecover(this.physics, 'PLAYER_RESET');
        this.hud.showMessage('LIFT RECOVERY · CONTROLS RESTORED', 1.8);
      }
      if (event.code === 'F3' && !event.repeat) {
        this.lift.debugEnabled = !this.lift.debugEnabled;
        this.hud.showMessage(this.lift.debugEnabled ? 'LIFT DEBUG ON' : 'LIFT DEBUG OFF', 1.2);
      }
      if (event.code === 'KeyC' && !event.repeat) {
        const state = this.physics.getState();
        if (state.grinding) {
          this.hud.showMessage('SPLIT-SIDE SLIDE', 0.75);
        } else {
          const mode = this.cameraController.toggleMode();
          this.hud.showMessage(mode === 'first' ? 'FIRST-PERSON CAMERA' : 'THIRD-PERSON CAMERA', 1.25);
        }
      }
      if (event.code === 'KeyT' && !event.repeat && !this.lift.riding) {
        this.sessionMarker.set(this.physics);
        this.hud.showMessage('SESSION MARKER SET · Y TO RETURN', 1.8);
      }
      if (event.code === 'KeyY' && !event.repeat && !this.lift.riding) {
        if (this.sessionMarker.restore(this.physics)) {
          this.challenges.resetRun(this.physics.getState());
          this.hud.showMessage('BACK TO SESSION MARKER', 1.35);
        } else {
          this.hud.showMessage('SET A SESSION MARKER WITH T FIRST', 1.6);
        }
      }
      if (event.code === 'KeyL' && !event.repeat && !this.lift.riding && !this.physics.getState().grinding) {
        if (this.lift.forceBoard(this.physics)) {
          this.audio.liftBoard();
          this.hud.showMessage('CHAIRLIFT · BOARDING · RIDING TO SUMMIT', 2.0);
        }
      }
      if (event.code === 'KeyN' && !event.repeat) {
        const muted = this.audio.toggleMute();
        this.hud.showMessage(muted ? 'AUDIO MUTED' : 'AUDIO ON', 1.2);
      }
      if (event.code === 'KeyO' && !event.repeat) {
        const preset = this.weather.cycle();
        this.save.setSetting('weather', preset.id);
        this.terrain.setNightMode?.(preset.id === 'night');
        this.hud.showMessage(`WEATHER · ${preset.name.toUpperCase()}`, 1.5);
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.active && !this.paused && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.canvas) {
        this.hadPointerLock = true;
      } else if (this.hadPointerLock && this.active && !this.paused) {
        this.hadPointerLock = false;
        this.pause();
      }
    });
  }

  getLoadout() {
    const loadout = {};
    for (const category of ['skin', 'helmet', 'jacket', 'pants', 'skis', 'goggles', 'gloves']) {
      loadout[category] = this.save.getEquippedItem(category);
    }
    return loadout;
  }

  applySavedLoadout() {
    this.skier.applyLoadout(this.getLoadout());
    this.skier.setHeightCm?.(this.save.getSetting('skierHeightCm',180));
    this.multiplayer?.sendProfile?.();
  }

  start() {
    this.audio.ensureStarted();
    if (this.homeResumePose) {
      this.resumeFromHome();
      return;
    }
    this.startResort();
  }

  resumeFromHome() {
    const pose = this.homeResumePose;
    const speed = Math.max(0, Number(pose?.speed) || 0);
    this.active = true;
    this.paused = false;
    this.mapOpen = false;
    this.input.enabled = true;
    this.input.clear();
    this.hadPointerLock = false;
    this.audio.ensureStarted();
    this.audio.setGameplayActive(true);
    if (pose) this.physics.restorePose(pose, speed);
    if (this.homeResumeRunId) this.currentRunId = this.homeResumeRunId;
    this.menu.showMain(false);
    this.menu.showPause(false);
    this.hud.setVisible(true);
    this.hud.showMessage('RESUMED WHERE YOU LEFT OFF', 1.6);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    const play = document.querySelector('#play-button');
    if (play) play.textContent = 'START RIDE';
    this.canvas.requestPointerLock?.();
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.homeResumePose = null;
    this.homeResumeRunId = null;
  }

  startResort() {
    this.homeResumePose = null;
    this.homeResumeRunId = null;
    this.races?.cancel();
    this.freestyleEvents?.cancel();
    this.cancelExtremeActivities();
    this.mapOpen = false;
    this.map?.show(false);
    this.replay?.reset();
    this.active = true;
    this.paused = false;
    this.input.enabled = true;
    this.input.clear();
    this.hadPointerLock = false;
    if (this.lift.riding) this.lift.cancelRide(this.physics);
    this.audio.ensureStarted();
    this.audio.setGameplayActive(true);
    const mainLift = this.lift.lifts.find((item) => item.id === 'main-gondola') || this.lift.lifts[0];
    const approachForward = new THREE.Vector3().subVectors(mainLift.gatePoint, mainLift.approachPoint).setY(0).normalize();
    this.physics.resetAt(mainLift.approachPoint.x, mainLift.approachPoint.z, approachForward);
    this.currentRunId = 'flow';
    this.tricks?.resetLine();
    this.challenges.resetRun(this.physics.getState());
    this.menu.showMain(false);
    this.menu.showPause(false);
    this.hud.setVisible(true);
    this.hud.showMessage('BASE VILLAGE · FOLLOW SIGNS TO A LIFT · EXPLORE WITHOUT FAST TRAVEL', 3.1);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    this.canvas.requestPointerLock?.();
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
  }

  startRun(runId = 'flow', { keepRace = false, keepCompetition = false, keepExtreme = false } = {}) {
    this.homeResumePose = null;
    this.homeResumeRunId = null;
    this.currentRunId = runId;
    if (!keepRace) this.races?.cancel();
    if (!keepCompetition) this.freestyleEvents?.cancel();
    if (!keepExtreme) this.cancelExtremeActivities();
    this.mapOpen = false;
    this.corbetsActive = false;
    this.corbetsTimer = 0;
    this.corbetsBest = Number(safeRead('alpine-freeride-corbets-best') || 0) || 0;
    this.map?.show(false);
    this.replay?.reset();
    this.active = true;
    this.paused = false;
    this.input.enabled = true;
    this.input.clear();
    this.hadPointerLock = false;
    if (this.lift.riding) this.lift.cancelRide(this.physics);
    this.audio.ensureStarted();
    this.audio.setGameplayActive(true);
    const spawn = runSpawn(runId);
    this.physics.resetAt(spawn.x, spawn.z, new THREE.Vector3(0,0,spawn.direction ?? 1));
    this.tricks?.resetLine();
    this.challenges.resetRun(this.physics.getState());
    this.menu.showMain(false);
    this.menu.showPause(false);
    this.hud.setVisible(true);
    const run = this.terrain.getNearestRun(spawn.x, spawn.z).run;
    this.hud.showMessage(`${run?.name?.toUpperCase() || 'SUMMIT'} · DROP IN`, 2.1);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    this.canvas.requestPointerLock?.();
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
  }

  goToLiftBase() {
    this.homeResumePose = null;
    this.homeResumeRunId = null;
    this.races?.cancel();
    this.freestyleEvents?.cancel();
    this.cancelExtremeActivities();
    this.mapOpen = false;
    this.corbetsActive = false;
    this.corbetsTimer = 0;
    this.corbetsBest = Number(safeRead('alpine-freeride-corbets-best') || 0) || 0;
    this.map?.show(false);
    this.replay?.reset();
    const targetRunId = this.currentRunId || 'flow';
    this.active = true;
    this.paused = false;
    this.input.enabled = true;
    this.input.clear();
    this.hadPointerLock = false;
    if (this.lift.riding) this.lift.cancelRide(this.physics);
    this.audio.ensureStarted();
    this.audio.setGameplayActive(true);
    const base = this.lift.getBaseForRun(targetRunId);
    const approachForward = new THREE.Vector3().subVectors(base.lift.gatePoint, base.approachPoint).setY(0).normalize();
    this.physics.resetAt(base.approachPoint.x, base.approachPoint.z, approachForward);
    this.tricks?.resetLine();
    this.challenges.resetRun(this.physics.getState());
    this.menu.showMain(false);
    this.menu.showPause(false);
    this.hud.setVisible(true);
    this.hud.updateCredits(this.save.getCredits());
    this.hud.updateProgress(this.save);
    const liftInfo = this.lift.getLiftForRun(targetRunId);
    this.hud.showMessage(`${liftInfo.name.toUpperCase()} → ${liftInfo.to.name.toUpperCase()} · FOLLOW THE BLUE LANE`, 2.8);
    this.canvas.requestPointerLock?.();
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
  }

  startRace(eventId) {
    this.freestyleEvents?.cancel();
    const event = RACE_EVENTS.find((item) => item.id === eventId);
    if (!event) return false;
    this.startRun(event.runId, { keepRace: true });
    this.races.arm(eventId, this.physics);
    this.currentRunId = event.runId;
    this.snowFX.resetTrackContinuity();
    return true;
  }

  startFreestyle(eventId) {
    const event = FREESTYLE_EVENTS.find((item) => item.id === eventId);
    if (!event) return false;
    this.races?.cancel();
    this.startRun('park', { keepCompetition: true });
    this.freestyleEvents.arm(eventId, this.physics);
    this.currentRunId = 'park';
    this.tricks?.resetLine();
    this.snowFX.resetTrackContinuity();
    return true;
  }

  cancelExtremeActivities() {
    if (this.corbetsActive) this.hud.setRace(null);
    this.skiJump?.cancel(this.physics);
    this.heli?.cancel(this.physics);
    this.avalanche?.reset();
    this.corbetsActive = false;
    this.corbetsTimer = 0;
    this.legendaryActive = null;
    this.legendaryTimer = 0;
    if (['corbets', 'streif', 'swiss-wall'].includes(this.physics?.activityMode) || String(this.physics?.activityMode || '').startsWith('heli-freeride')) this.physics.setActivityMode(null);
  }

  prepareSpecialActivity(runId = 'wild') {
    this.races?.cancel();
    this.freestyleEvents?.cancel();
    this.cancelExtremeActivities();
    this.startRun(runId, { keepExtreme: true });
    this.tricks?.resetLine();
    this.snowFX?.resetTrackContinuity();
  }

  startSkiJump() {
    this.prepareSpecialActivity('flow');
    this.skiJump.start(this.physics);
    this.currentRunId = 'flow';
    return true;
  }

  startCorbets() {
    return this.startLegendary('corbets');
  }

  startLegendary(key = 'corbets') {
    const zone = SPECIAL_ZONES[key];
    if (!zone || zone.activityType !== 'legendary') return false;
    this.prepareSpecialActivity('wild');
    this.physics.resetAt(zone.spawn.x, zone.spawn.z, new THREE.Vector3(0, 0, 1));
    this.physics.setActivityMode(zone.id);
    this.legendaryActive = key;
    this.legendaryTimer = 0;
    this.corbetsActive = key === 'corbets';
    this.corbetsTimer = 0;
    const subtitle = key === 'corbets' ? 'COMMIT TO THE COULOIR' : key === 'streif' ? 'FAST · ICY · SURVIVE THE COMPRESSIONS' : 'STEEP MOGUL WALL · PICK A LINE';
    this.hud.showMessage(`LEGENDARY DESCENT · ${zone.name.toUpperCase()} · ${subtitle}`, 3.4);
    return true;
  }

  startHeliski(dropId = 'central') {
    this.prepareSpecialActivity('wild');
    this.heli.start(this.physics, dropId);
    this.currentRunId = 'wild';
    return true;
  }

  getExtremeActivities() {
    return {
      skiJump: { name: 'Alpine Flight K120', description: 'Distance-focused ski jumping / ski flying venue with V-style flight.' },
      legendary: [
        { id: 'corbets', name: SPECIAL_ZONES.corbets.name, description: 'Narrow rock-lined couloir with a committed entrance drop.' },
        { id: 'streif', name: SPECIAL_ZONES.streif.name, description: 'Gameplay-inspired high-speed icy downhill with compressions and exposed fall-line sections.' },
        { id: 'swissWall', name: SPECIAL_ZONES.swissWall.name, description: 'Gameplay-inspired very steep mogul face where line choice matters more than straight-line speed.' },
      ],
      heliDrops: HELISKI_DROPS,
    };
  }

  updateCorbets(state, dt) {
    return this.updateLegendary(state, dt);
  }

  updateLegendary(state, dt) {
    const key = this.legendaryActive;
    if (!key) return;
    const zone = SPECIAL_ZONES[key];
    if (!zone) return;
    this.legendaryTimer += dt;
    if (key === 'corbets') this.corbetsTimer = this.legendaryTimer;
    const display = zone.name.replace(' · Inspired', '').toUpperCase();
    if (state.crashed) {
      this.hud.setRace({ name: `${display} · SURVIVAL`, timer: this.legendaryTimer, gate: 0, gateCount: 0, failed: true });
      return;
    }
    this.hud.setRace({ name: `${display} · SURVIVAL`, timer: this.legendaryTimer, gate: 0, gateCount: 0 });
    if (state.position.z >= zone.finishZ) {
      const time = this.legendaryTimer;
      const previous = this.legendaryBests[key] || 0;
      const isPB = !previous || time < previous;
      if (isPB) {
        this.legendaryBests[key] = time;
        if (key === 'corbets') this.corbetsBest = time;
        try { localStorage.setItem(`alpine-freeride-${key === 'swissWall' ? 'swiss-wall' : key}-best`, String(time)); } catch {}
        this.save.addCredits(260);
        this.save.addXP(340);
        this.hud.updateCredits(this.save.getCredits());
        this.hud.updateProgress(this.save);
      }
      if (key === 'corbets') this.challenges?.onCorbetsClear();
      this.hud.showMessage(`${display} CLEARED · ${time.toFixed(2)}s${isPB ? ' · PERSONAL BEST · +260 C · +340 XP' : ''}`, 4.0);
      this.legendaryActive = null;
      this.corbetsActive = false;
      this.hud.setRace(null);
      this.physics.setActivityMode(null);
    }
  }

  getBasePixelCap(level = this.graphicsQuality) {
    return { low:0.80, medium:1.00, high:1.25, ultra:1.55 }[level] || 1.0;
  }

  updateAdaptiveResolution(frameDelta) {
    if (!Number.isFinite(frameDelta) || frameDelta <= 0 || document.hidden) return;
    // Exponential frame-time average. Resize only every ~2 seconds to avoid
    // creating its own stutter. This targets a smooth ~50-60 fps experience.
    this.performanceFrameAverage = THREE.MathUtils.lerp(this.performanceFrameAverage, frameDelta, 0.045);
    this.performanceAdjustClock -= frameDelta;
    if (this.performanceAdjustClock > 0 || this.mapOpen || this.replay?.editorOpen) return;
    this.performanceAdjustClock = 2.0;
    let next = this.adaptiveRenderScale;
    if (this.performanceFrameAverage > 0.024) next = Math.max(0.68, next - 0.10);
    else if (this.performanceFrameAverage > 0.0205) next = Math.max(0.74, next - 0.05);
    else if (this.performanceFrameAverage < 0.0168) next = Math.min(1, next + 0.04);
    if (Math.abs(next - this.adaptiveRenderScale) < 0.025) return;
    this.adaptiveRenderScale = next;
    const cap = this.getBasePixelCap() * this.adaptiveRenderScale;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  setGraphicsQuality(level = 'high', persist = true) {
    const presets = {
      low: { pixel: 0.80, shadows: false, shadowSize: 512, particles: 0.30 },
      medium: { pixel: 1.00, shadows: false, shadowSize: 768, particles: 0.50 },
      high: { pixel: 1.25, shadows: true, shadowSize: 1024, particles: 0.72 },
      ultra: { pixel: 1.55, shadows: true, shadowSize: 2048, particles: 1.0 },
    };
    const key = presets[level] ? level : 'high';
    const config = presets[key];
    this.graphicsQuality = key;
    this.adaptiveRenderScale = 1;
    this.performanceFrameAverage = 1 / 60;
    this.performanceAdjustClock = 2.0;
    this.renderer.shadowMap.enabled = config.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.shadowRefreshClock = 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixel));
    this.sun.shadow.mapSize.set(config.shadowSize, config.shadowSize);
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.terrain?.setQuality(key);
    this.environment?.setQuality(key);
    this.dressing?.setQuality(key);
    this.detail?.setQuality(key);
    this.skier?.setQuality?.(key);
    // View distance is independent from graphics quality so players can keep a
    // wide resort view while lowering shadows/resolution for performance.
    this.applyRenderDistance();
    this.weather?.setQualityFactor(config.particles);
    this.snowFX?.setQualityFactor(config.particles);
    if (persist) {
      this.save.setSetting('graphics', key);
      this.hud.showMessage(`GRAPHICS · ${key.toUpperCase()}`, 1.4);
    }
    return key;
  }


  getRenderDistancePresets() {
    return {
      near: { far: 2600, detail: 760, label: 'Near' },
      balanced: { far: 4200, detail: 1080, label: 'Balanced' },
      far: { far: 6200, detail: 1500, label: 'Far' },
      resort: { far: 9000, detail: 1900, label: 'Resort-wide' },
    };
  }

  applyRenderDistance() {
    const presets = this.getRenderDistancePresets();
    const key = presets[this.renderDistance] ? this.renderDistance : 'far';
    const config = presets[key];
    this.renderDistance = key;
    this.camera.far = config.far;
    this.camera.updateProjectionMatrix();
    // Keep the expensive detail radius much smaller than the terrain draw radius.
    // The opposite mountain remains visible as terrain/silhouette while forests,
    // chalets and animated lift carriers only become detailed as you approach.
    this.environment?.setRenderDistance?.(config.detail);
    this.dressing?.setRenderDistance?.(config.detail * 0.92);
    this.lift?.setRenderDistance?.(config.detail * 1.12);
    this.weather?.setRenderDistance?.(config.far);
    return config;
  }

  setRenderDistance(level = 'far', persist = true) {
    const presets = this.getRenderDistancePresets();
    const key = presets[level] ? level : 'far';
    this.renderDistance = key;
    const config = this.applyRenderDistance();
    if (persist) {
      this.save.setSetting('renderDistance', key);
      this.hud.showMessage(`VIEW DISTANCE · ${config.label.toUpperCase()} · ${(config.far / 1000).toFixed(1)} KM`, 1.5);
    }
    return key;
  }

  updateRenderVisibility(position, dt = 0) {
    if (!position) return;
    this.environment?.updateVisibility?.(position, dt);
    this.dressing?.updateVisibility?.(position, dt);
  }


  setSkierHeight(value) {
    const cm = this.skier.setHeightCm?.(value) ?? 180;
    this.save.setSetting('skierHeightCm', cm);
    this.multiplayer?.sendProfile?.();
    this.hud.showMessage(`SKIER HEIGHT · ${Math.round(cm)} CM`, 1.2);
    return cm;
  }

  setCameraEffects(value) {
    const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
    this.cameraController.setEffectsAmount(amount);
    this.save.setSetting('cameraEffects', amount);
    this.hud.showMessage(`CAMERA MOTION · ${amount <= 0.05 ? 'OFF' : amount < 0.75 ? 'REDUCED' : 'FULL'}`, 1.4);
    return amount;
  }

  setWeather(id) {
    const preset = this.weather.setPreset(id);
    this.save.setSetting('weather', preset.id);
    this.terrain.setNightMode?.(preset.id === 'night');
    this.hud.showMessage(`WEATHER · ${preset.name.toUpperCase()}`, 1.5);
    return preset;
  }

  openReplayEditor() {
    if (!this.replay?.hasReplay) {
      if (this.active) this.hud.showMessage('REPLAY · SKI FOR A FEW SECONDS FIRST', 1.8);
      else this.menu.openModal('<p class="eyebrow">REPLAY EDITOR</p><h2>No replay yet</h2><p>Start a ride and ski for a few seconds. Alpine Freeride automatically records the most recent 45 seconds. Press <strong>F9</strong> at any time to edit it.</p>');
      return false;
    }
    this.replayReturnTo = this.active ? 'game' : 'menu';
    if (this.mapOpen) { this.mapOpen = false; this.map?.show(false); this.cameraController.exitSatelliteView(); this.weather?.setSatelliteMode?.(false); }
    this.paused = true;
    this.hadPointerLock = false;
    this.input.enabled = false;
    this.input.clear();
    this.audio.setGameplayActive(false);
    this.menu.closeModal();
    this.menu.showPause(false);
    this.menu.showMain(false);
    this.hud.setVisible(false);
    if (this.map?.worldWaypoint) this.map.worldWaypoint.visible = false;
    this.replaySprayWasVisible = this.snowFX?.spray?.visible !== false;
    if (this.snowFX?.spray) this.snowFX.spray.visible = false;
    document.exitPointerLock?.();
    if (!this.replay.beginEditor()) return false;
    this.ensureReplayUI()?.show(true);
    return true;
  }

  closeReplayEditor() {
    if (!this.replay?.editorOpen) return;
    this.replayUI?.show(false);
    this.replay.endEditor();
    if (this.snowFX?.spray) this.snowFX.spray.visible = this.replaySprayWasVisible !== false;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    if (this.replayReturnTo === 'game' && this.active) {
      this.paused = true;
      this.hud.setVisible(true);
      this.menu.showPause(true);
      this.audio.setGameplayActive(false);
    } else {
      this.active = false;
      this.paused = false;
      this.hud.setVisible(false);
      this.menu.showMain(true);
      this.menu.showPause(false);
      this.positionCameraForMenu();
    }
  }

  toggleMap(show = !this.mapOpen) {
    if (!this.active) return;
    this.mapOpen = Boolean(show);
    this.ensureMapUI()?.show(this.mapOpen);
    if (this.mapOpen) {
      this.paused = true;
      this.hadPointerLock = false;
      this.input.enabled = false;
      this.input.clear();
      this.audio.setGameplayActive(false);
      this.menu.showPause(false);
      this.cameraController.enterSatelliteView(this.physics.getState());
      this.weather?.setSatelliteMode?.(true);
      if (!this.replay?.editorOpen) this.ensureMapUI()?.update(this.physics.getState().position);
      document.exitPointerLock?.();
    } else {
      this.cameraController.exitSatelliteView();
      this.weather?.setSatelliteMode?.(false);
      this.paused = false;
      this.input.enabled = true;
      this.audio.setGameplayActive(true);
      this.lastTime = performance.now() / 1000;
      this.accumulator = 0;
      this.canvas.requestPointerLock?.();
    }
  }

  pause() {
    if (!this.active) return;
    if (this.mapOpen) { this.mapOpen = false; this.map?.show(false); this.cameraController.exitSatelliteView(); this.weather?.setSatelliteMode?.(false); }
    this.paused = true;
    this.hadPointerLock = false;
    this.input.enabled = false;
    this.input.clear();
    this.audio.setGameplayActive(false);
    this.menu.showPause(true);
    document.exitPointerLock?.();
  }

  resume() {
    if (!this.active) return;
    this.menu.closeModal();
    this.paused = false;
    this.hadPointerLock = false;
    this.input.enabled = true;
    this.audio.setGameplayActive(true);
    this.menu.showPause(false);
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.canvas.requestPointerLock?.();
  }

  returnToMenu() {
    if (this.replay?.editorOpen) { this.replayUI?.show(false); this.replay.endEditor(); }
    this.races?.cancel();
    this.freestyleEvents?.cancel();
    this.cancelExtremeActivities();
    this.mapOpen = false;
    this.corbetsActive = false;
    this.corbetsTimer = 0;
    this.corbetsBest = Number(safeRead('alpine-freeride-corbets-best') || 0) || 0;
    this.map?.show(false);
    if (this.lift.riding) this.lift.cancelRide(this.physics);
    // Home is a menu, not a restart. Freeze the skier exactly where they left
    // gameplay and restore that position/speed when START RIDE is pressed again.
    this.homeResumePose = this.physics.capturePose();
    this.homeResumeRunId = this.currentRunId;
    this.active = false;
    this.paused = false;
    this.hadPointerLock = false;
    this.input.enabled = false;
    this.input.clear();
    this.audio.setGameplayActive(false);
    this.hud.setVisible(false);
    this.hud.setInteraction('');
    this.menu.showPause(false);
    this.menu.showMain(true);
    const play = document.querySelector('#play-button');
    if (play) play.textContent = 'RESUME RIDE';
    document.exitPointerLock?.();
    this.skier.setFirstPersonMode(false);
    this.positionCameraForMenu();
  }

  resetPlayer(message = 'RESET', show = true) {
    if (this.lift.riding) this.lift.cancelRide(this.physics);
    if (this.heli?.riding) { this.heli.cancel(this.physics); this.startHeliski(this.heli.drop?.id || 'central'); return; }
    if (this.skiJump?.active) { this.skiJump.start(this.physics); return; }
    if (this.legendaryActive || ['corbets', 'streif', 'swiss-wall'].includes(this.physics.activityMode)) { this.startLegendary(this.legendaryActive || (this.physics.activityMode === 'swiss-wall' ? 'swissWall' : this.physics.activityMode)); return; }
    if (this.races?.event) {
      this.races.arm(this.races.event.id, this.physics);
      return;
    }
    if (this.freestyleEvents?.event) {
      this.freestyleEvents.arm(this.freestyleEvents.event.id, this.physics);
      this.tricks?.resetLine();
      return;
    }
    const spawn = runSpawn(this.currentRunId);
    this.physics.resetAt(spawn.x, spawn.z, new THREE.Vector3(0,0,spawn.direction ?? 1));
    this.tricks?.resetLine();
    this.challenges.resetRun(this.physics.getState());
    if (message && show) this.hud.showMessage(message, 1.3);
  }

  positionCameraForMenu() {
    const y = this.terrain ? this.terrain.getHeight(-70, -500) : 400;
    this.camera.position.set(210, y + 92, -590);
    this.camera.lookAt(0, y - 26, -260);
  }

  updateSun(state) {
    const p = state.position;
    const sunOffset=this.weather?.current.sunOffset||[-260,420,-180];
    this.sun.position.set(p.x+sunOffset[0],p.y+sunOffset[1],p.z+sunOffset[2]);
    this.sun.target.position.copy(p);
    this.sun.target.updateMatrixWorld();
  }

  processPhysicsStep() {
    this.physics.setResting(this.input.isDown('KeyE')); // E is context-sensitive: sit on snow, Daffy in air, back-ski-off on rails.
    if (this.races?.updateFixed(FIXED_STEP, this.physics)) return true;
    if (this.freestyleEvents?.updateFixed(FIXED_STEP, this.physics)) return true;
    const result = this.physics.step(FIXED_STEP);
    if (result?.resetRequested) {
      this.resetPlayer(result.reason);
      return false;
    }

    // SkiPhysics can now reject a badly sideways landing itself instead of
    // silently snapping the body back to straight. Surface that crash here.
    const postPhysicsState = this.physics.getState();
    if (postPhysicsState.justCrashed) {
      this.tricks.resetLine();
      this.audio.collision(Math.max(10, postPhysicsState.lastLandingImpact || 10));
      this.hud.showMessage(`${postPhysicsState.crashReason || 'CRASH'} · GETTING UP…`, 1.25);
    }

    const collision = this.collisions.step(FIXED_STEP, this.physics);
    if (collision) {
      this.hud.collision(collision.kind, collision.speed);
      this.audio.collision(collision.speed);
      if (collision.speed > 14.5) this.tricks.resetLine('LINE LOST');
      if (collision.speed > 17.5 && ['tree', 'rock', 'log', 'station', 'building'].includes(collision.kind)) {
        this.physics.bail(`${collision.kind.toUpperCase()} CRASH`, Math.min(1.5, collision.speed / 20));
        this.hud.showMessage(`${collision.kind.toUpperCase()} CRASH · GETTING UP…`, 1.25);
      }
    }

    const featureEvent = this.features.step(FIXED_STEP, this.physics);
    if (featureEvent?.type === 'rail-crash') {
      // Move the skier clear of the feature before recovery. Combined with the
      // rail safety timer this removes the infinite crash/stand/crash loop.
      this.physics.escapeRail(featureEvent.rail);
      this.physics.bail('RAIL CRASH', Math.min(1.4, featureEvent.speed / 18));
      this.audio.collision(featureEvent.speed);
      this.tricks.resetLine();
      this.hud.showMessage('RAIL CRASH · GETTING UP CLEAR OF FEATURE…', 1.25);
    }

    if (this.lift.tryAutoBoard(this.physics, FIXED_STEP)) {
      this.audio.liftBoard();
      this.hud.showMessage('LIFT BOARDING · CONTROLS LOCKED SAFELY · R ALWAYS RECOVERS', 2.0);
      return false;
    }

    const state = this.physics.getState();
    this.skiJump?.update(state, this.physics, FIXED_STEP);
    this.avalanche?.update(FIXED_STEP, state, this.physics);
    this.updateCorbets(state, FIXED_STEP);
    this.tricks.step(state, FIXED_STEP);
    this.challenges.update(state, FIXED_STEP);
    this.races?.update(state, FIXED_STEP);
    this.freestyleEvents?.update(FIXED_STEP);
    this.discoveries?.update(state);

    if (state.justLanded) {
      this.audio.landing(state.lastLandingImpact);
      if (state.lastLandingImpact > 5) this.cameraController.addLandingShake(state.lastLandingImpact * 0.65);
      if (state.lastLandingImpact > 14.5 && state.lastLandingImpact <= 18.5) {
        this.hud.showMessage(`SKETCHY LANDING · ${state.lastLandingImpact.toFixed(1)} m/s`, 0.75);
      }
    }
    return true;
  }

  animate(nowMs) {
    requestAnimationFrame(this.animate);
    const now = nowMs / 1000;
    const frameDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, now - this.lastTime));
    this.lastTime = now;
    this.updateAdaptiveResolution(frameDelta);
    if (!this.replay?.editorOpen) this.lift.updateVisual(frameDelta, this.camera.position);

    if (this.replay?.editorOpen) {
      this.replay.update(frameDelta);
      this.replayUI?.update();
      this.detail?.update(this.camera.position);
    } else if (this.active && !this.paused) {
      let state;

      if (this.heli?.riding) {
        const skip = this.input.consumePress('Space');
        this.heli.step(frameDelta, this.physics, skip);
        state = this.physics.getState();
        this.hud.setInteraction('HELISKI FLIGHT · SPACE · SKIP TO DROP');
        this.input.endFrame();
      } else if (this.lift.riding) {
        const skip = this.input.consumePress('Space');
        const ride = this.lift.stepRide(frameDelta, this.physics, skip);
        if (ride?.finished) {
          this.challenges.resetRun(this.physics.getState());
          if (ride.runId) this.currentRunId = ride.runId;
          this.hud.showMessage(ride.recovered ? 'LIFT RECOVERY · SAFE EXIT · CONTROLS RESTORED' : `${(ride.runName || 'SUMMIT').toUpperCase()} · TOP STATION · DROP IN`, 2.1);
        }
        state = this.physics.getState();
        const debug = this.lift.getDebugInfo();
        this.hud.setInteraction(this.lift.debugEnabled
          ? `${debug.lift || 'LIFT'} · ${debug.state} · ${Math.round((debug.progress || 0) * 100)}% · R RECOVER · SPACE SKIP`
          : `${debug.lift || 'LIFT'} → ${debug.destination || 'SUMMIT'} · ${debug.state} · SPACE SKIP · R EMERGENCY EXIT`);
        this.input.endFrame();
      } else {
        this.accumulator += frameDelta;
        let safety = 0;
        let physicsStepped = false;
        while (this.accumulator >= FIXED_STEP && safety < 10) {
          physicsStepped = true;
          if (!this.processPhysicsStep()) {
            this.accumulator = 0;
            break;
          }
          this.accumulator -= FIXED_STEP;
          safety += 1;
        }
        state = this.physics.getState();
        const boardingInfo = this.lift.riding ? null : this.lift.findBoardingLift(state.position);
        const boarding = this.lift.riding ? this.lift.state : (boardingInfo?.state || 'NONE');
        const boardingRun = boardingInfo?.lift?.name || '';
        const boardingDestination = boardingInfo?.lift?.to?.name || '';
        if (state.resting) this.hud.setInteraction('SEATED GLIDE · RELEASE R TO STAND');
        else if (state.activityMode === 'ski-jump') this.hud.setInteraction('SKI FLYING · TUCK INRUN · HOLD W IN AIR FOR V-STYLE');
        else if (state.activityMode === 'corbets') this.hud.setInteraction("LEGENDARY DESCENT · COMMIT TO THE COULOIR");
        else if (String(state.activityMode || '').startsWith('heli-freeride')) this.hud.setInteraction('HELISKI BACKCOUNTRY · WATCH FOR AVALANCHE TERRAIN');
        else if (boarding === 'APPROACH') this.hud.setInteraction(`${boardingRun.toUpperCase()} → ${boardingDestination.toUpperCase()} · FOLLOW BLUE LANE`);
        else if (boarding === 'GATE') this.hud.setInteraction(`${boardingRun.toUpperCase()} → ${boardingDestination.toUpperCase()} · BLUE GATE · L TO BOARD`);
        else if (boarding === 'LOADING') this.hud.setInteraction(state.speed > 28 ? `${boardingDestination.toUpperCase()} · SLOW DOWN · L TO BOARD` : `${boardingDestination.toUpperCase()} · PICKUP · L TO BOARD`);
        else {
          const waypoint = this.map?.getWaypointPrompt(state.position) || '';
          if (waypoint) this.hud.setInteraction(waypoint);
          else if (!state.skisEquipped) this.hud.setInteraction('SHIFT · PUT SKIS ON');
          else if(state.grinding)this.hud.setInteraction('RAIL · A/D ROTATE · CTRL CENTRE · SPACE POP');
          else if(state.transition)this.hud.setInteraction('TRANSITION · SPACE POP · ARROWS AIR STEER · SHIFT SKIS ON/OFF');
          else this.hud.setInteraction('SHIFT · TAKE SKIS OFF / WALK · M MAP / WAYPOINTS');
        }
        if (physicsStepped) this.input.endFrame();
      }

      const runInfo = this.terrain.getNearestRun(state.position.x, state.position.z);
      this.weather.update(frameDelta, state.position);
      this.terrain.updateNightLights?.(state.position, frameDelta);
      this.snowFX.update(state, frameDelta, this.input);
      this.input.setGrabContext(!this.lift.riding && !this.heli?.riding && state.skisEquipped && !state.grounded && !state.grinding && !state.crashed && !state.spreadEagle && !state.daffy && !state.skiJumpPose);
      this.skier.setFirstPersonMode(this.cameraController.mode === 'first' && !this.lift.riding && !this.heli?.riding);
      this.skier.update(state, this.input, frameDelta, this.lift.riding || this.heli?.riding);
      this.audio.update(state, { liftRiding: this.lift.riding, weather: this.weather.current });
      this.cameraController.update(state, frameDelta);
      this.updateRenderVisibility(state.position, frameDelta);
      this.replay?.capture(frameDelta, state);
      this.updateSun(state);
      if (this.renderer.shadowMap.enabled) {
        this.shadowRefreshClock -= frameDelta;
        if (this.shadowRefreshClock <= 0) {
          this.renderer.shadowMap.needsUpdate = true;
          this.shadowRefreshClock = 0.085;
        }
      }
      this.hud.update(state, frameDelta, this.input, runInfo);
    } else if (this.active && this.mapOpen) {
      this.cameraController.updateSatellite(frameDelta);
      this.weather.update(frameDelta, this.physics.getState().position);
      this.terrain.updateNightLights?.(this.physics.getState().position, frameDelta);
      this.updateRenderVisibility(this.physics.getState().position, frameDelta);
    } else if (!this.active) {
      const t = now * 0.045;
      const targetX = Math.sin(t) * 65;
      const targetZ = -330 + Math.cos(t * 0.7) * 35;
      const targetY = this.terrain.getHeight(targetX, targetZ) + 42;
      this.camera.lookAt(targetX, targetY, targetZ);
    }

    this.multiplayer?.update(frameDelta, this.physics.getState());
    if (!this.replay?.editorOpen) this.map?.update(this.physics.getState().position);
    this.detail?.update(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    const pixelCaps = { low: 0.80, medium: 1.00, high: 1.25, ultra: 1.55 };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, (pixelCaps[this.graphicsQuality] || 1.0) * this.adaptiveRenderScale));
  }
}
