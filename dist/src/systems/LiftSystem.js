import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import { batchStatic } from '../world/staticBatch.js';
import * as THREE from 'three';
import { getRun } from '../world/RunDefinitions.js';
import { RESORT_LIFTS, getLiftEndpoints } from '../world/ResortNetwork.js';
import { boardingMetrics, boardingStateAt, canAutoBoard, canManualBoard, rideCurveT } from './liftMath.js';
import { LIFT_STATES, createLiftRideState, beginLiftRide, advanceLiftRide, forceLiftRecovery } from './liftStateMachine.js';

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function terrainRibbon(terrain, start, end, halfWidth, segments, material, yOffset = 0.065) {
  const positions = [];
  const indices = [];
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len;
  const nz = dx / len;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const cx = THREE.MathUtils.lerp(start.x, end.x, t);
    const cz = THREE.MathUtils.lerp(start.z, end.z, t);
    for (const side of [-1, 1]) {
      const x = cx + nx * halfWidth * side;
      const z = cz + nz * halfWidth * side;
      const y = terrain.getHeight(x, z) + yOffset;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2; const b = a + 1; const c = a + 2; const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function makeTextSprite(text, color = '#dff5ff') {
  if (typeof document === 'undefined') return new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(9,26,39,0.92)';
  ctx.fillRect(12, 20, 1000, 216);
  ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.strokeRect(18, 26, 988, 204);
  ctx.font = '700 62px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.fillText(text, 512, 130);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(16, 4, 1);
  return sprite;
}

export class LiftSystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.visualClock = 0;
    this.visualUpdateAccumulator = 0;
    this.renderDetailRange = 1680;
    this.colliders = [];
    this.lifts = [];
    this.activeLift = null;
    this.playerCarrier = null;
    this.rideSkisEquipped = true;
    this.boardingArmedLift = null;
    this.boardingArmTimer = 0;
    this.rideState = createLiftRideState();
    this.debugEnabled = false;

    this.materials = {
      steel: new THREE.MeshStandardMaterial({ color: 0x3f4a51, roughness: 0.42, metalness: 0.72 }),
      station: new THREE.MeshStandardMaterial({ color: 0x203748, roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ color: 0xcfdde4, roughness: 0.86 }),
      seat: new THREE.MeshStandardMaterial({ color: 0x2b89b9, roughness: 0.55, metalness: 0.18 }),
      gate: new THREE.MeshStandardMaterial({ color: 0x63c9ee, roughness: 0.42, emissive: 0x123745, emissiveIntensity: 0.6 }),
      carpet: new THREE.MeshStandardMaterial({ color: 0x345969, roughness: 0.8 }),
      window: new THREE.MeshStandardMaterial({color:0x91c8da,roughness:.2,metalness:.12,transparent:true,opacity:.28,depthWrite:false}),
      gondola: new THREE.MeshStandardMaterial({ color: 0x73cce8, roughness: 0.28, metalness: 0.12, transparent: true, opacity: 1 }),
    };

    for (const definition of RESORT_LIFTS) this.lifts.push(this.createLift(definition));
    // The visual lift cables are also exposed as lightweight grind paths. No
    // duplicate cable meshes are created, so this adds gameplay without slowing
    // startup appreciably.
    this.cableRails = this.lifts
      .filter((lift) => lift.type === 'CHAIR')
      .flatMap((lift) => [
        { id:`lift-cable-${lift.id}-up`, liftId:lift.id, kind:'CHAIRLIFT CABLE', curve:lift.upCurve },
        { id:`lift-cable-${lift.id}-down`, liftId:lift.id, kind:'CHAIRLIFT CABLE', curve:lift.downCurve },
      ]);
    this.playerCarrier = this.makeCarrier('CHAIR', this.materials.seat);
    this.playerCarrier.visible = false;
    this.scene.add(this.playerCarrier);
  }

  setRenderDistance(range = 1680) { this.renderDetailRange = Math.max(700, Number(range) || 1680); }

  get state() { return this.rideState.state; }
  get riding() { return [LIFT_STATES.BOARDING, LIFT_STATES.RIDING, LIFT_STATES.UNLOADING, LIFT_STATES.RECOVERY].includes(this.rideState.state); }

  makeCarrier(type = 'CHAIR', accentMaterial = this.materials.seat) {
    const group = new THREE.Group();
    const steel = this.materials.steel;
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 7), steel);
    hanger.position.set(0,-1.45,-.25);
    group.add(hanger);
    if (type === 'GONDOLA') {
      // Thin body panels leave the interior floor open around the passenger.
      for(const z of [-1.06,1.36]){const panel=new THREE.Mesh(new THREE.BoxGeometry(3.4,.55,.08),this.materials.gondola);panel.position.set(0,-4.31,z);group.add(panel);}
      for(const x of [-1.66,1.66]){const panel=new THREE.Mesh(new THREE.BoxGeometry(.08,.55,2.42),this.materials.gondola);panel.position.set(x,-4.31,.15);group.add(panel);}
      const windows = new THREE.Mesh(new THREE.BoxGeometry(3.28, 1.7, 2.38), this.materials.window);
      windows.position.set(0,-3.205,.15);windows.castShadow=false;
      const roof=new THREE.Mesh(new THREE.BoxGeometry(3.55,.16,2.65),this.materials.gondola);roof.position.set(0,-2.25,.15);
      group.add(windows,roof);
      for(const x of [-1.65,1.65])for(const z of [-1.04,1.34]){const post=new THREE.Mesh(new THREE.BoxGeometry(.09,1.85,.09),steel);post.position.set(x,-3.2,z);group.add(post);}
      const floor = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 2.6), steel);
      floor.position.set(0, -4.62, 0.15);
      group.add(floor);
    } else {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 0.52), accentMaterial);
      seat.position.set(0, -3.0, 0.13);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 0.15), accentMaterial);
      back.position.set(0, -2.52, -0.13);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 0.08), steel);
      bar.position.set(0, -2.45, 0.62);
      group.add(seat, back, bar);
    }
    group.traverse((obj) => { if (obj.isMesh) obj.castShadow = obj.material !== this.materials.window; });
    const batches=new Map();group.updateMatrixWorld(true);
    for(const child of [...group.children]){if(!child.isMesh)continue;const key=child.material.uuid;if(!batches.has(key))batches.set(key,{material:child.material,geometries:[]});const geometry=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geometry.applyMatrix4(child.matrix);batches.get(key).geometries.push(geometry);group.remove(child);child.geometry.dispose();}
    for(const {material,geometries} of batches.values()){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,material);mesh.castShadow=material!==this.materials.window;group.add(mesh);}
    group.userData.carrierType = type;
    return group;
  }

  buildCurve(from, to, type, tunnel = null) {
    const points = [];
    const segments = 64;
    const terminalHeight = type === 'GONDOLA' ? 6.2 : 5.1;
    const riderOffset = type === 'GONDOLA' ? 4.46 : 3.4;
    const cruiseClearance = type === 'GONDOLA' ? 25 : 20;
    const grounds = [];
    for (let i = 0; i < segments; i += 1) {
      const t = i / (segments - 1);
      const x = THREE.MathUtils.lerp(from.x, to.x, t);
      const z = THREE.MathUtils.lerp(from.z, to.z, t);
      grounds.push(this.terrain.getHeight(x, z));
    }

    // Follow the broad mountain envelope, not every bump. A rolling maximum
    // looks ahead/behind across roughly a dozen samples, so towers stay high and
    // cable runs look much flatter while still clearing major ridges safely.
    const envelope = grounds.map((_, i) => {
      let peak = -Infinity;
      for (let j = Math.max(0, i - 6); j <= Math.min(segments - 1, i + 6); j += 1) peak = Math.max(peak, grounds[j]);
      return peak;
    });
    const smoothEnvelope = envelope.map((_, i) => {
      let sum = 0, weight = 0;
      for (let j = Math.max(0, i - 4); j <= Math.min(segments - 1, i + 4); j += 1) {
        const w = 5 - Math.abs(i - j); sum += envelope[j] * w; weight += w;
      }
      return sum / Math.max(1, weight);
    });

    for (let i = 0; i < segments; i += 1) {
      const t = i / (segments - 1);
      const x = THREE.MathUtils.lerp(from.x, to.x, t);
      const z = THREE.MathUtils.lerp(from.z, to.z, t);
      const stationLine = THREE.MathUtils.lerp(from.y + terminalHeight, to.y + terminalHeight, t);
      const cruiseY = smoothEnvelope[i] + cruiseClearance;
      // Ease out of each terminal over the first/last ~8% of the line.
      const endBlend = THREE.MathUtils.smoothstep(t, 0, 0.09) * THREE.MathUtils.smoothstep(1 - t, 0, 0.09);
      let y = THREE.MathUtils.lerp(stationLine, Math.max(stationLine + 8, cruiseY), endBlend);
      // Never allow the rider body to intersect terrain, even at a sharp crest.
      y = Math.max(y, grounds[i] + riderOffset + 2.3);
      const tunnelBoost = tunnel
        ? Math.max(0, 1 - Math.abs(t - tunnel.t) / Math.max(0.001, tunnel.span || 0.08)) * (tunnel.extraClearance || 0)
        : 0;
      points.push(new THREE.Vector3(x, y + tunnelBoost, z));
    }
    return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  }

  createLift(definition) {
    const initialChildren=new Set(this.scene.children);
    const endpoints = getLiftEndpoints(definition);
    const fromY = this.terrain.getHeight(endpoints.from.x, endpoints.from.z);
    const toY = this.terrain.getHeight(endpoints.to.x, endpoints.to.z);
    const lower = new THREE.Vector3(endpoints.from.x, fromY, endpoints.from.z);
    const upper = new THREE.Vector3(endpoints.to.x, toY, endpoints.to.z);
    const horizontal = new THREE.Vector3(upper.x - lower.x, 0, upper.z - lower.z).normalize();
    // Lower-station loading is approached while skiing DOWNHILL. The cable
    // direction points from lower station to summit, so the gate lives farther
    // uphill and the pickup sits close to the terminal. This matches a real
    // chairlift queue and prevents the old backwards-loading softlock.
    const boardPoint = lower.clone().addScaledVector(horizontal, 10); boardPoint.y = this.terrain.getHeight(boardPoint.x, boardPoint.z) + 0.12;
    const gatePoint = lower.clone().addScaledVector(horizontal, 38); gatePoint.y = this.terrain.getHeight(gatePoint.x, gatePoint.z) + 0.12;
    const approachPoint = lower.clone().addScaledVector(horizontal, 68); approachPoint.y = this.terrain.getHeight(approachPoint.x, approachPoint.z) + 0.12;
    const upCurve = this.buildCurve(lower, upper, definition.type, definition.tunnel);
    const side = new THREE.Vector3(-horizontal.z, 0, horizontal.x).multiplyScalar(6.5);
    const downPoints = upCurve.points.map((p) => p.clone().add(side));
    const downCurve = new THREE.CatmullRomCurve3(downPoints.slice().reverse(), false, 'catmullrom', 0.08);
    const boardCurveT = 0.006;
    const run = getRun(definition.destinationRunId);
    const unloadZ = definition.unload?.z ?? -1035;
    const unloadX = definition.unload?.x ?? run.centerAt(unloadZ);
    const unloadPoint = new THREE.Vector3(unloadX, this.terrain.getHeight(unloadX, unloadZ) + 0.12, unloadZ);
    const lift = { ...definition, from: endpoints.from, to: endpoints.to, lower, upper, approachPoint, gatePoint, boardPoint, unloadPoint, upCurve, downCurve, boardCurveT, run, carriers: [] };
    lift.visualCenter = lower.clone().lerp(upper, 0.5);
    lift.visualRadius = lower.distanceTo(upper) * 0.5 + 650;

    const cableMat = this.materials.steel;
    for (const curve of [upCurve, downCurve]) {
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 42, 0.055, 5, false), cableMat);
      cable.castShadow = false; this.scene.add(cable);
    }
    this.createStation(lift, lower, true);
    this.createStation(lift, upper, false);
    this.createTowers(lift);
    if (definition.tunnel) this.createMountainOpening(lift, definition.tunnel);

    batchStatic(this.scene,this.scene.children.filter(o=>!initialChildren.has(o)));
    const carrierCount = definition.type === 'GONDOLA' ? 5 : 7;
    const accent = new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.48, metalness: 0.16 });
    // Build carrier geometry ONCE per lift. Clones share the merged geometries
    // and material instead of repeating expensive geometry construction/merging
    // five to seven times for every one of the resort's lifts.
    const carrierPrototype = this.makeCarrier(definition.type, accent);
    carrierPrototype.traverse((obj)=>{ if (obj.isMesh) obj.castShadow = false; });
    for (let i = 0; i < carrierCount; i += 1) {
      const carrier = i === 0 ? carrierPrototype : carrierPrototype.clone(true);
      carrier.userData.offset = i / carrierCount;
      carrier.userData.returning = i >= Math.ceil(carrierCount / 2);
      lift.carriers.push(carrier); this.scene.add(carrier);
    }
    return lift;
  }

  createMountainOpening(lift, tunnel) {
    // Deliberate rock-cut opening for the Valley Link Chair. Instead of the
    // carrier visually clipping through a ridge, the line passes through a
    // readable horseshoe-shaped opening with a snow-covered crown.
    const rock = new THREE.MeshStandardMaterial({ color: 0x59636a, roughness: 0.96, metalness: 0.01 });
    const darkRock = new THREE.MeshStandardMaterial({ color: 0x343d43, roughness: 0.98 });
    const snow = new THREE.MeshStandardMaterial({ color: 0xeaf3f7, roughness: 0.94 });
    const radius = tunnel.openingRadius || 7.6;
    const portalDepth = tunnel.portalDepth || 7.0;
    const centerT = tunnel.t ?? 0.56;
    const span = tunnel.span ?? 0.085;
    const zAxis = new THREE.Vector3(0, 0, 1);

    // Two strong portals plus three inner ribs make the opening obvious from
    // both directions without turning the lift into a fully enclosed building.
    for (const offset of [-span, -span * 0.48, 0, span * 0.48, span]) {
      const t = THREE.MathUtils.clamp(centerT + offset, 0.03, 0.97);
      const cable = lift.upCurve.getPointAt(t);
      const tangent = lift.upCurve.getTangentAt(t).setY(0).normalize();
      if (tangent.lengthSq() < 0.5) tangent.set(0, 0, 1);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const ground = this.terrain.getHeight(cable.x, cable.z);
      const archCenterY = cable.y - 2.9;
      const portalHeavy = Math.abs(offset) > span * 0.8;
      const tube = portalHeavy ? 1.2 : 0.68;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 28, Math.PI), portalHeavy ? rock : darkRock);
      arch.position.set(cable.x, archCenterY, cable.z);
      arch.quaternion.setFromUnitVectors(zAxis, tangent);
      arch.castShadow = true;
      this.scene.add(arch);

      if (portalHeavy) {
        const pillarTop = archCenterY;
        const pillarHeight = Math.max(5.5, pillarTop - ground);
        for (const sideSign of [-1, 1]) {
          const pos = cable.clone().addScaledVector(side, sideSign * radius);
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(tunnel.southPortal ? 4.2 : 3.2, pillarHeight, portalDepth), rock);
          pillar.position.set(pos.x, ground + pillarHeight * 0.5, pos.z);
          pillar.rotation.y = Math.atan2(tangent.x, tangent.z);
          pillar.castShadow = pillar.receiveShadow = true;
          this.scene.add(pillar);
          this.colliders.push({ x: pos.x, y: ground, z: pos.z, radius: 1.8, height: pillarHeight, kind: 'building' });
        }
        const crown = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.55, tunnel.southPortal ? 1.65 : 1.15, portalDepth + 1.0), snow);
        crown.position.set(cable.x, archCenterY + radius + 0.45, cable.z);
        crown.rotation.y = Math.atan2(tangent.x, tangent.z);
        crown.castShadow = crown.receiveShadow = true;
        this.scene.add(crown);

        if (tunnel.southPortal) {
          // South Transition starts directly beneath this opening. Build thick
          // rock cheeks behind the portal so it reads as a cut through the
          // mountain rather than a decorative freestanding hoop.
          for (const sideSign of [-1, 1]) {
            const bankPos = cable.clone().addScaledVector(side, sideSign * (radius + 4.8));
            const bank = new THREE.Mesh(new THREE.BoxGeometry(8.5, Math.max(8, pillarHeight * 0.86), portalDepth * 1.55), darkRock);
            bank.position.set(bankPos.x, ground + Math.max(8, pillarHeight * 0.86) * 0.5 - 0.4, bankPos.z);
            bank.rotation.y = Math.atan2(tangent.x, tangent.z);
            bank.castShadow = bank.receiveShadow = true;
            this.scene.add(bank);
            this.colliders.push({ x: bankPos.x, y: ground, z: bankPos.z, radius: 4.4, height: Math.max(8, pillarHeight * 0.86), kind: 'rock' });
          }
          const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.9, 0.52, 8, 28, Math.PI), darkRock);
          inner.position.set(cable.x, archCenterY - 0.1, cable.z);
          inner.quaternion.setFromUnitVectors(zAxis, tangent);
          inner.castShadow = true;
          this.scene.add(inner);

          // A recessed dark portal mouth makes the carved terrain notch read as
          // an actual passage from the South Transition start instead of a hoop
          // floating on the slope. The centre stays physically open.
          const mouth = new THREE.Mesh(
            new THREE.PlaneGeometry(radius * 1.75, radius * 1.15),
            new THREE.MeshBasicMaterial({ color:0x11191e, side:THREE.DoubleSide, transparent:true, opacity:0.78, depthWrite:false })
          );
          mouth.position.set(cable.x, ground + radius * 0.58, cable.z);
          mouth.position.addScaledVector(tangent, portalDepth * 0.52);
          mouth.quaternion.setFromUnitVectors(zAxis, tangent);
          mouth.renderOrder = 1;
          this.scene.add(mouth);
        }
      }
    }
  }


  getGrindableCableRails() {
    return this.cableRails || [];
  }

  createTowers(lift) {
    const steel = this.materials.steel;
    for (const t of [0.20, 0.40, 0.61, 0.82]) {
      const p = lift.upCurve.getPointAt(t);
      const ground = this.terrain.getHeight(p.x, p.z);
      const top = new THREE.Vector3(p.x, p.y - 0.25, p.z);
      this.scene.add(cylinderBetween(new THREE.Vector3(p.x, ground, p.z), top, 0.17, steel));
      const cross = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 0.28), steel);
      cross.position.set(p.x, p.y - 0.45, p.z); cross.castShadow = true; this.scene.add(cross);
    }
  }

  createStation(lift, point, lower) {
    const { station, roof, gate, carpet, steel } = this.materials;
    const dir = new THREE.Vector3(lift.upper.x - lift.lower.x, 0, lift.upper.z - lift.lower.z).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const group = new THREE.Group();
    group.position.copy(point); group.rotation.y = yaw;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.18, 14.5), station);
    floor.position.y = 0.03; floor.receiveShadow = true; group.add(floor);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.8, 12.5), station);
      wing.position.set(side * 5.0, 1.9, 0); wing.castShadow = true; group.add(wing);
      const roofWing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.36, 13.8), roof);
      roofWing.position.set(side * 4.2, 4.05, 0); roofWing.castShadow = true; group.add(roofWing);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.14, 8, 24), steel);
    wheel.position.set(0, lift.type === 'GONDOLA' ? 5.9 : 4.85, lower ? 1.4 : -1.4); wheel.rotation.x = Math.PI / 2; group.add(wheel);
    this.scene.add(group);
    const sideVecStation=new THREE.Vector3(-dir.z,0,dir.x);
    for(const side of [-1,1])for(const offset of [-4,0,4]){
      const p=point.clone().addScaledVector(sideVecStation,side*5).addScaledVector(dir,offset);
      this.colliders.push({x:p.x,y:point.y,z:p.z,radius:1.3,height:4.3,kind:'station'});
    }

    const label = makeTextSprite(lower ? `${lift.name} → ${lift.to.name}` : `${lift.name} · ${lift.to.name}`, `#${lift.color.toString(16).padStart(6, '0')}`);
    label.position.set(point.x, point.y + 7.1, point.z); this.scene.add(label);

    if (lower) {
      const gateY = this.terrain.getHeight(lift.gatePoint.x, lift.gatePoint.z);
      const gateWidth = 5.8;
      const sideVec = new THREE.Vector3(-dir.z, 0, dir.x);
      for (const side of [-1, 1]) {
        const x = lift.gatePoint.x + sideVec.x * gateWidth * 0.5 * side;
        const z = lift.gatePoint.z + sideVec.z * gateWidth * 0.5 * side;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.4, 10), gate);
        post.position.set(x, gateY + 1.7, z); post.castShadow = true; this.scene.add(post);
      }
      const barStart = new THREE.Vector3(lift.gatePoint.x + sideVec.x * gateWidth * 0.5, gateY + 3.15, lift.gatePoint.z + sideVec.z * gateWidth * 0.5);
      const barEnd = new THREE.Vector3(lift.gatePoint.x - sideVec.x * gateWidth * 0.5, gateY + 3.15, lift.gatePoint.z - sideVec.z * gateWidth * 0.5);
      this.scene.add(cylinderBetween(barStart, barEnd, 0.11, gate));
      this.scene.add(terrainRibbon(this.terrain, lift.approachPoint, lift.boardPoint.clone().addScaledVector(dir, 6), 2.85, 20, carpet));
      for (let i = 0; i < 6; i += 1) {
        const t = (i + 1) / 7;
        const x = THREE.MathUtils.lerp(lift.gatePoint.x, lift.boardPoint.x, t);
        const z = THREE.MathUtils.lerp(lift.gatePoint.z, lift.boardPoint.z, t);
        const y = this.terrain.getHeight(x, z) + 0.10;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.035, 0.72), gate);
        stripe.position.set(x, y, z); stripe.rotation.y = yaw; this.scene.add(stripe);
      }
    }
  }

  getRiderPose(lift, curveT) {
    const cablePoint = lift.upCurve.getPointAt(THREE.MathUtils.clamp(curveT, 0, 1));
    const tangent = lift.upCurve.getTangentAt(THREE.MathUtils.clamp(curveT, 0, 1)).normalize();
    const typeOffset = lift.type === 'GONDOLA' ? 4.46 : 3.4;
    const riderPoint = cablePoint.clone().addScaledVector(tangent, 0.1); riderPoint.y -= typeOffset;
    return { cablePoint, tangent, riderPoint };
  }

  ensurePlayerCarrierType(type) {
    if (this.playerCarrier?.userData.carrierType === type) return;
    if (this.playerCarrier) { this.scene.remove(this.playerCarrier); this.playerCarrier.traverse(o=>o.geometry?.dispose()); }
    this.playerCarrier = this.makeCarrier(type, this.materials.seat);
    this.playerCarrier.visible = false; this.scene.add(this.playerCarrier);
  }

  placeCarrierAndRider(lift, physics, curveT) {
    const pose = this.getRiderPose(lift, curveT);
    this.playerCarrier.position.copy(pose.cablePoint);
    this.playerCarrier.rotation.set(0, Math.atan2(pose.tangent.x, pose.tangent.z), 0);
    physics.setWorldPose(pose.riderPoint, pose.tangent, 0);
    return pose;
  }

  updateVisual(dt, focusPosition = null) {
    // Chair/gondola motion used to evaluate hundreds of Catmull-Rom points every
    // rendered frame. 24 Hz is visually smooth for distant lift traffic and cuts
    // that CPU cost dramatically. Far-away carriers are hidden and not updated.
    this.visualUpdateAccumulator += Math.max(0, dt || 0);
    if (this.visualUpdateAccumulator < 1 / 24) return;
    const step = Math.min(0.12, this.visualUpdateAccumulator);
    this.visualUpdateAccumulator = 0;
    this.visualClock = (this.visualClock + step * 0.025) % 1;

    for (const lift of this.lifts) {
      let near = true;
      if (focusPosition && lift.visualCenter) {
        const range = Math.min(lift.visualRadius || 1500, this.renderDetailRange);
        near = lift.visualCenter.distanceToSquared(focusPosition) < range * range;
      }
      if (!near) {
        for (const carrier of lift.carriers) carrier.visible = false;
        continue;
      }
      lift.carriers.forEach((carrier) => {
        carrier.visible = true;
        const local = (this.visualClock + carrier.userData.offset) % 1;
        const curve = carrier.userData.returning ? lift.downCurve : lift.upCurve;
        const p = curve.getPointAt(local);
        const tangent = curve.getTangentAt(local).normalize();
        carrier.position.copy(p);
        carrier.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
      });
    }
  }

  findBoardingLift(position) {
    let best = null; let bestDistance = Infinity;
    for (const lift of this.lifts) {
      const state = boardingStateAt(position, lift);
      if (state === 'NONE') continue;
      const distance = Math.hypot(position.x - lift.boardPoint.x, position.z - lift.boardPoint.z);
      if (distance < bestDistance) { best = { lift, state }; bestDistance = distance; }
    }
    return best;
  }

  getBoardingState(position) { return this.riding ? this.state : (this.findBoardingLift(position)?.state || 'NONE'); }
  getBoardingRunName(position) { return this.findBoardingLift(position)?.lift.name || ''; }
  getBoardingDestination(position) { return this.findBoardingLift(position)?.lift.to.name || ''; }
  canBoard(position) { const info = this.findBoardingLift(position); return Boolean(info && canManualBoard(position, info.lift)); }

  getLiftForRun(runId) { return this.lifts.find((lift) => lift.destinationRunId === runId) || this.lifts[0]; }
  getBaseForRun(runId) { const lift = this.getLiftForRun(runId); return { approachPoint: lift.approachPoint, boardPoint: lift.boardPoint, lift }; }

  forceBoard(physics) {
    if (this.riding || !physics) return false;
    const info = this.findBoardingLift(physics.position);
    if (!info || !physics.grounded || physics.crashed || Math.abs(physics.position.y-this.terrain.getHeight(physics.position.x,physics.position.z))>2 || !canManualBoard(physics.position, info.lift)) return false;
    return this.startRide(physics, info.lift);
  }

  tryAutoBoard(physics, dt = 1 / 120) {
    if (this.riding || !physics) return false;
    this.boardingArmTimer = Math.max(0, this.boardingArmTimer - Math.max(0, dt));
    if (this.boardingArmTimer <= 0) {
      this.boardingArmedLift = null;
      if (this.rideState.state === LIFT_STATES.APPROACH) this.rideState = createLiftRideState();
    }
    const info = this.findBoardingLift(physics.position);
    if (!info) return false;
    if (info.state === 'GATE') {
      this.boardingArmedLift = info.lift;
      this.boardingArmTimer = 10;
      this.rideState = { ...createLiftRideState(), state: LIFT_STATES.APPROACH, reason: 'GATE_ARMED' };
      return false;
    }
    if (info.state !== 'LOADING') return false;
    const metrics = boardingMetrics(physics.position, info.lift);
    const armed = this.boardingArmedLift === info.lift && this.boardingArmTimer > 0;
    if (armed && physics.grounded && !physics.crashed) {
      const laneErrorX = metrics.laneX - physics.position.x;
      const laneErrorZ = metrics.laneZ - physics.position.z;
      physics.position.x += laneErrorX * 0.09; physics.position.z += laneErrorZ * 0.09;
      if (physics.velocity.length() > 13) physics.velocity.multiplyScalar(Math.max(0.86, 1 - dt * 5.5));
    }
    if (!physics.grounded || physics.crashed || Math.abs(physics.position.y-this.terrain.getHeight(physics.position.x,physics.position.z))>2 || !armed || !canAutoBoard(physics.position, physics.velocity.length(), info.lift)) return false;
    return this.startRide(physics, info.lift);
  }

  startRide(physics, lift = null) {
    if (this.riding || !physics) return false;
    lift ||= this.findBoardingLift(physics.position)?.lift;
    if (!lift) return false;
    this.activeLift = lift;
    this.boardingOrigin = physics.position.clone();
    this.rideSkisEquipped = physics.skisEquipped !== false;
    this.rideState = beginLiftRide(createLiftRideState());
    this.boardingArmedLift = null; this.boardingArmTimer = 0;
    physics.velocity.set(0, 0, 0); physics.setActivityMode?.(`lift:${lift.id}`);
    this.ensurePlayerCarrierType(lift.type); this.playerCarrier.visible = true;
    return true;
  }

  finishUnload(physics, recovered = false) {
    const lift = this.activeLift;
    if (!lift) return null;
    const run = lift.run;
    const point = recovered && this.rideState.progress < 0.45 ? lift.approachPoint : lift.unloadPoint;
    const forward = recovered && this.rideState.progress < 0.45
      ? new THREE.Vector3(lift.boardPoint.x - lift.approachPoint.x, 0, lift.boardPoint.z - lift.approachPoint.z).normalize()
      : new THREE.Vector3(0, 0, lift.exitDirection || 1);
    this.playerCarrier.visible = false;
    this.activeLift = null;
    this.boardingArmedLift = null; this.boardingArmTimer = 0;
    this.rideState = createLiftRideState();
    physics.resetAt(point.x, point.z, forward);
    physics.setActivityMode?.(null);
    if (!this.rideSkisEquipped) physics.toggleSkis();
    return { finished: true, recovered, runId: run.id, runName: run.name, liftName: lift.name };
  }

  stepRide(dt, physics, skip = false) {
    if (!this.riding || !this.activeLift) return null;
    if (this.state === LIFT_STATES.RECOVERY) return this.finishUnload(physics, true);
    const previous = this.rideState;
    this.rideState = advanceLiftRide(previous, dt, { skip, rideDuration: this.activeLift.type === 'GONDOLA' ? 9.5 : 8.2, maxTotal: 14 });
    if (this.rideState.state === LIFT_STATES.RECOVERY) return this.finishUnload(physics, true);
    const lift = this.activeLift;
    if (this.rideState.state === LIFT_STATES.BOARDING) {
      const pose=this.placeCarrierAndRider(lift, physics, lift.boardCurveT);
      const t=THREE.MathUtils.smoothstep(this.rideState.elapsed,0,0.55);
      physics.position.copy(this.boardingOrigin).lerp(pose.riderPoint,t);
    } else if (this.rideState.state === LIFT_STATES.RIDING || this.rideState.state === LIFT_STATES.UNLOADING) {
      const cableT = rideCurveT(this.rideState.progress, lift.boardCurveT);
      this.placeCarrierAndRider(lift, physics, cableT);
      if(this.rideState.state===LIFT_STATES.UNLOADING){
        const t=THREE.MathUtils.smoothstep(this.rideState.elapsed,0,0.65);
        physics.position.lerp(lift.unloadPoint,t);
      }
    }
    if (this.rideState.state === LIFT_STATES.IDLE && this.rideState.reason === 'COMPLETE') return this.finishUnload(physics, false);
    return { finished: false, progress: this.rideState.progress, state: this.rideState.state, runId: lift.run.id, runName: lift.run.name, liftName: lift.name };
  }

  emergencyRecover(physics, reason = 'EMERGENCY_EXIT') {
    if (!this.riding || !this.activeLift) return false;
    this.rideState = forceLiftRecovery(this.rideState, reason);
    this.finishUnload(physics, true);
    return true;
  }

  cancelRide(physics) { return this.emergencyRecover(physics, 'CANCELLED'); }
  getDebugInfo() { return { state: this.state, progress: this.rideState.progress, reason: this.rideState.reason, lift: this.activeLift?.name || null, destination: this.activeLift?.to?.name || null }; }
}
