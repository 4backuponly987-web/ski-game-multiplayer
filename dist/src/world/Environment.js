import {partitionInstances} from './SceneDetail.js';
import { batchStatic } from './staticBatch.js';
import { firGeometry,alpineRockGeometry } from './alpineGeometry.js';
import * as THREE from 'three';
import { HALF_WORLD } from './terrainMath.js';
import { RUNS, SOUTH_RUNS, CHAIRLINE_GLADES, isOnRun, nearestConnectorAt, liftXAt, runWidthAt, RUN_START_Z, RUN_END_Z, SOUTH_RUN_BOTTOM_Z, SOUTH_RUN_TOP_Z } from './RunDefinitions.js';
import { createRockTextures, createCompactSnowTextures } from './ProceduralTextures.js';
import { SPECIAL_ZONES } from './SpecialZones.js';
import { RESORT_LIFTS, getLiftEndpoints } from './ResortNetwork.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


function pointSegmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax; const dz = bz - az;
  const lenSq = Math.max(0.0001, dx * dx + dz * dz);
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
  const px = ax + dx * t; const pz = az + dz * t;
  return Math.hypot(x - px, z - pz);
}

function nearNetworkLift(x, z, width = 18) {
  return RESORT_LIFTS.some((lift) => {
    const endpoints = getLiftEndpoints(lift);
    return endpoints && pointSegmentDistance(x, z, endpoints.from.x, endpoints.from.z, endpoints.to.x, endpoints.to.z) < width;
  });
}

export class Environment {
  constructor(scene, terrain) {
    this.scene = scene;
    const initialChildren=new Set(scene.children);
    this.terrain = terrain;
    this.colliders = [];
    this.random = mulberry32(73421);
    this.addTrees();
    this.addOffPisteTreePockets();
    this.addSouthMountainTrees();
    this.addPineForest();
    this.addWoodlandForest();
    this.addChairlineGlades();
    this.addRocks();
    this.addRunGates();
    this.addExtremeZones();
    this.addRunIdentityDetails();
    this.addMountainDetails();
    this.addResortVillage();
    this.addDistantPeaks();
    batchStatic(scene,scene.children.filter(o=>!initialChildren.has(o)));
    partitionInstances(scene,scene.children.filter(o=>!initialChildren.has(o)));
    this.foliage=[];
    this.scene.traverse(o=>{if(o.isInstancedMesh&&o.geometry.userData.foliage)this.foliage.push(o);});
    this.distanceCullRange=1500;this.distanceCullClock=0;
    this.distanceItems=this.collectDistanceItems(initialChildren);
  }


  collectDistanceItems(initialChildren) {
    const items=[];
    this.scene.updateMatrixWorld(true);
    for(const object of this.scene.children){
      if(initialChildren.has(object)||object.name==='Distant alpine foothills')continue;
      let sphere=null;
      if(object.isInstancedMesh){if(!object.boundingSphere)object.computeBoundingSphere();sphere=object.boundingSphere?.clone();}
      else if(object.geometry){if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();sphere=object.geometry.boundingSphere?.clone();}
      if(sphere)sphere.applyMatrix4(object.matrixWorld);
      else if(object.isGroup){const box=new THREE.Box3().setFromObject(object);if(!box.isEmpty())sphere=box.getBoundingSphere(new THREE.Sphere());}
      if(!sphere)continue;
      const name=String(object.name||'');
      const factor=(object.isInstancedMesh||/tree|forest|woodland|glade/i.test(name))?1.35:/village|chalet|gate/i.test(name)?1.12:1;
      items.push({object,center:sphere.center.clone(),radius:sphere.radius,factor});
    }
    return items;
  }

  setRenderDistance(range=1500){this.distanceCullRange=Math.max(500,Number(range)||1500);this.distanceCullClock=0;}
  updateVisibility(position,dt=0){
    this.distanceCullClock-=Math.max(0,dt||0);if(this.distanceCullClock>0)return;this.distanceCullClock=.18;
    const base=this.distanceCullRange;
    for(const item of this.distanceItems){const limit=base*item.factor+Math.min(item.radius,260);item.object.visible=item.center.distanceToSquared(position)<=limit*limit;}
  }

  setQuality(level) {
    // Thousands of tree shadows were one of the largest GPU costs. The actual
    // trees remain fully visible and collidable at every quality; only Ultra
    // asks foliage to render into the directional-light shadow map.
    const shadows=level==='ultra';
    for(const mesh of this.foliage)mesh.castShadow=shadows;
  }

  addTrees() {
    const treeCount = 1050;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 3.7, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(2.15,7.3,0);
    const snowGeo = firGeometry(1.88,6.7,0,true);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x49372b, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x193d34, roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xddebf1, roughness: 0.96 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const snowCaps = new THREE.InstancedMesh(snowGeo, snowMat, treeCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 28) {
      attempts += 1;
      const z = THREE.MathUtils.lerp(RUN_START_Z + 80, RUN_END_Z - 80, this.random());
      const x = THREE.MathUtils.lerp(-1000, 1000, this.random());
      if (isOnRun(x, z, 26)) continue;
      const nearAnyLift = nearNetworkLift(x, z, 18);
      if (nearAnyLift) continue;
      if (Math.abs(x) > HALF_WORLD - 55) continue;

      const connector=nearestConnectorAt(x,z);
      if(connector.connector && connector.distance < connector.connector.width+9)continue;
      const y = this.terrain.getHeight(x, z);
      const normal = this.terrain.getNormal(x, z);
      if (normal.y < 0.76) continue;

      const scale = THREE.MathUtils.lerp(0.72, 1.38, this.random());
      const rotation = this.random() * Math.PI * 2;

      dummy.position.set(x, y + 1.85 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + 5.5 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.updateMatrix();
      crowns.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + 5.75 * scale, z);
      dummy.scale.set(scale * 0.96, scale * 0.98, scale * 0.96);
      dummy.updateMatrix();
      snowCaps.setMatrixAt(placed, dummy.matrix);

      this.colliders.push({ x, y, z, radius: 0.65 * scale, height: 9.2 * scale, kind: 'tree' });
      placed += 1;
    }

    for (const mesh of [trunks, crowns, snowCaps]) {
      mesh.count = placed;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      this.scene.add(mesh);
    }
  }


  addOffPisteTreePockets() {
    // Dense but irregular pockets just beyond marked piste ropes make the
    // prepared/off-piste boundary obvious. They remain instanced and leave
    // every groomed crossover, lift corridor and run junction clear.
    const runs = RUNS.filter((run) => !['wild', 'park'].includes(run.id));
    const maxTrees = 460;
    const trunkGeo = new THREE.CylinderGeometry(0.20, 0.29, 3.8, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(1.92, 7.1, 1);
    const snowGeo = firGeometry(1.70, 6.4, 2, true);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x43342a, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x173d33, roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xe1edf2, roughness: 0.98 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxTrees);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, maxTrees);
    const caps = new THREE.InstancedMesh(snowGeo, snowMat, maxTrees);
    const dummy = new THREE.Object3D();
    let placed = 0;

    for (const run of runs) {
      for (let z = RUN_START_Z + 120; z <= RUN_END_Z - 100 && placed < maxTrees; z += 74) {
        // Alternating pockets create readable glades rather than continuous walls.
        if (Math.abs(Math.sin((z + run.centerAt(z)) * 0.0105)) < 0.22) continue;
        const center = run.centerAt(z);
        const width = runWidthAt(run, z);
        for (const side of [-1, 1]) {
          const copies = this.random() > 0.42 ? 2 : 1;
          for (let j = 0; j < copies && placed < maxTrees; j += 1) {
            const distance = width + 30 + this.random() * 78;
            const x = center + side * distance + (this.random() - 0.5) * 22;
            const zz = z + (this.random() - 0.5) * 34;
            if (Math.abs(x) > HALF_WORLD - 45 || nearNetworkLift(x, zz, 16)) continue;
            const connector = nearestConnectorAt(x, zz);
            if (connector.connector && connector.distance < connector.connector.width + 12) continue;
            if (isOnRun(x, zz, 24)) continue;
            const y = this.terrain.getHeight(x, zz);
            const normal = this.terrain.getNormal(x, zz);
            if (normal.y < 0.67) continue;
            const scale = THREE.MathUtils.lerp(0.68, 1.30, this.random());
            const rotation = this.random() * Math.PI * 2;
            dummy.rotation.set(0, rotation, 0); dummy.scale.setScalar(scale);
            dummy.position.set(x, y + 1.9 * scale, zz); dummy.updateMatrix(); trunks.setMatrixAt(placed, dummy.matrix);
            dummy.position.set(x, y + 5.45 * scale, zz); dummy.updateMatrix(); crowns.setMatrixAt(placed, dummy.matrix);
            dummy.scale.set(scale * 0.92, scale * 0.95, scale * 0.92);
            dummy.position.set(x, y + 5.72 * scale, zz); dummy.updateMatrix(); caps.setMatrixAt(placed, dummy.matrix);
            this.colliders.push({ x, y, z: zz, radius: 0.60 * scale, height: 9.3 * scale, kind: 'tree' });
            placed += 1;
          }
        }
      }
    }
    for (const mesh of [trunks, crowns, caps]) {
      mesh.count = placed; mesh.receiveShadow = true; mesh.castShadow = mesh !== caps;
      mesh.name = 'Off-piste boundary tree pockets'; this.scene.add(mesh);
    }
  }

  addSouthMountainTrees() {
    // The second mountain should read as a real opposite face rather than a
    // bare terrain extension. Dense lower forests and irregular piste-edge
    // pockets frame open powder bowls higher up, while all lift/connector
    // corridors remain clear.
    const treeCount = 820;
    const trunkGeo = new THREE.CylinderGeometry(0.21, 0.30, 3.8, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(2.0, 7.4, 1);
    const snowGeo = firGeometry(1.76, 6.6, 2, true);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x43342a, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x173d33, roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xe1edf2, roughness: 0.98 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const caps = new THREE.InstancedMesh(snowGeo, snowMat, treeCount);
    const dummy = new THREE.Object3D();
    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 36) {
      attempts += 1;
      const z = THREE.MathUtils.lerp(SOUTH_RUN_BOTTOM_Z + 85, SOUTH_RUN_TOP_Z - 100, this.random());
      const x = THREE.MathUtils.lerp(-1220, 1220, this.random());
      const altitudeFactor = (z - SOUTH_RUN_BOTTOM_Z) / Math.max(1, SOUTH_RUN_TOP_Z - SOUTH_RUN_BOTTOM_Z);
      // Tree line thins naturally near the high south ridge.
      if (altitudeFactor > 0.76 && this.random() < (altitudeFactor - 0.76) * 2.7) continue;
      const nearest = SOUTH_RUNS.reduce((best, run) => {
        const d = Math.abs(x - run.centerAt(z));
        return !best || d < best.distance ? {run,distance:d} : best;
      }, null);
      const edge = nearest ? runWidthAt(nearest.run,z) : 80;
      // Keep the prepared piste open but deliberately bias trees toward the
      // first 35–120 m of powder beyond its rope line.
      if (nearest && nearest.distance < edge + 22) continue;
      if (nearest && nearest.distance > edge + 180 && this.random() < 0.34) continue;
      if (nearNetworkLift(x,z,17)) continue;
      const connector=nearestConnectorAt(x,z);
      if (connector.connector && connector.distance < connector.connector.width + 11) continue;
      const y=this.terrain.getHeight(x,z);
      const normal=this.terrain.getNormal(x,z);
      if(normal.y<0.68)continue;
      const cedarBias=nearest?.run?.id==='south-cedar'?1.16:1;
      const scale=THREE.MathUtils.lerp(.70,1.34,this.random())*cedarBias;
      const rotation=this.random()*Math.PI*2;
      dummy.rotation.set(0,rotation,0);dummy.scale.setScalar(scale);
      dummy.position.set(x,y+1.9*scale,z);dummy.updateMatrix();trunks.setMatrixAt(placed,dummy.matrix);
      dummy.position.set(x,y+5.45*scale,z);dummy.updateMatrix();crowns.setMatrixAt(placed,dummy.matrix);
      dummy.scale.set(scale*.92,scale*.96,scale*.92);dummy.position.set(x,y+5.72*scale,z);dummy.updateMatrix();caps.setMatrixAt(placed,dummy.matrix);
      this.colliders.push({x,y,z,radius:.62*scale,height:9.3*scale,kind:'tree'});
      placed += 1;
    }
    for(const mesh of [trunks,crowns,caps]){
      mesh.count=placed;mesh.receiveShadow=true;mesh.castShadow=false;mesh.name='South mountain powder trees';this.scene.add(mesh);
    }
  }

  addPineForest() {
    const run = RUNS.find((item) => item.id === 'pine');
    if (!run) return;

    // Pine Line is intentionally a forest run, not merely a normal piste with
    // a few distant trees. A clear 34 m ski lane remains through the middle,
    // while dense trees create two walls, pockets and small glades around it.
    const treeCount = 520;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.31, 3.9, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(2.0,7.5,1);
    const crown2Geo = firGeometry(1.58,5.6,2);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d3027, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x12382f, roughness: 1 });
    const crown2Mat = new THREE.MeshStandardMaterial({ color: 0x1b4a3e, roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const innerCrowns = new THREE.InstancedMesh(crown2Geo, crown2Mat, treeCount);
    const dummy = new THREE.Object3D();

    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 35) {
      attempts += 1;
      const z = THREE.MathUtils.lerp(RUN_START_Z + 130, RUN_END_Z - 130, this.random());
      const center = run.centerAt(z);
      const side = this.random() < 0.5 ? -1 : 1;
      // Dense corridor from ~20 m off centre to just outside the piste edge.
      const distance = THREE.MathUtils.lerp(22, run.width + 34, Math.pow(this.random(), 0.78));
      const x = center + side * distance + THREE.MathUtils.lerp(-5, 5, this.random());
      if (Math.abs(x) > HALF_WORLD - 45) continue;
      // Leave a clearly visible corridor under the Pine Line chairlift.
      if (nearNetworkLift(x, z, 14)) continue;
      // Deliberate glades every few hundred metres prevent the run becoming a wall.
      const glade = Math.abs(Math.sin((z + 120) * 0.011));
      if (glade < 0.18 && distance < 50 && this.random() < 0.78) continue;
      const connector=nearestConnectorAt(x,z);
      if(connector.connector && connector.distance < connector.connector.width+9)continue;
      const y = this.terrain.getHeight(x, z);
      const normal = this.terrain.getNormal(x, z);
      if (normal.y < 0.7) continue;

      const scale = THREE.MathUtils.lerp(0.74, 1.42, this.random());
      const rotation = this.random() * Math.PI * 2;
      dummy.position.set(x, y + 1.95 * scale, z);
      dummy.rotation.set(0, rotation, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + 5.65 * scale, z);
      dummy.updateMatrix();
      crowns.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, y + 6.25 * scale, z);
      dummy.scale.set(scale * 0.82, scale * 0.86, scale * 0.82);
      dummy.updateMatrix();
      innerCrowns.setMatrixAt(placed, dummy.matrix);

      this.colliders.push({ x, y, z, radius: 0.62 * scale, height: 9.8 * scale, kind: 'tree' });
      placed += 1;
    }

    for (const mesh of [trunks, crowns, innerCrowns]) {
      mesh.count = placed;
      mesh.castShadow = mesh === trunks || mesh === crowns;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  addWoodlandForest() {
    const run = RUNS.find((item) => item.id === 'woodland');
    if (!run) return;
    const treeCount = 430;
    const trunkGeo = new THREE.CylinderGeometry(0.20, 0.29, 3.7, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(1.9,7.0,2);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x46362b, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x173f31, roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    const dummy = new THREE.Object3D();
    let placed = 0; let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 32) {
      attempts += 1;
      const z = THREE.MathUtils.lerp(RUN_START_Z + 120, RUN_END_Z - 90, this.random());
      const center = run.centerAt(z);
      const side = this.random() < 0.5 ? -1 : 1;
      const distance = THREE.MathUtils.lerp(18, run.width + 26, Math.pow(this.random(), 0.75));
      const x = center + side * distance + THREE.MathUtils.lerp(-4, 4, this.random());
      if (Math.abs(x) > HALF_WORLD - 45 || nearNetworkLift(x, z, 14)) continue;
      // Repeating glades and shortcuts create deliberate gaps rather than a wall.
      if (Math.abs(Math.sin((z + 60) * 0.014)) < 0.22 && distance < 42 && this.random() < 0.8) continue;
      const connector=nearestConnectorAt(x,z);
      if(connector.connector && connector.distance < connector.connector.width+9)continue;
      const y = this.terrain.getHeight(x, z); const normal = this.terrain.getNormal(x, z);
      if (normal.y < 0.68) continue;
      const scale = THREE.MathUtils.lerp(0.72, 1.34, this.random());
      dummy.position.set(x, y + 1.85 * scale, z); dummy.rotation.y = this.random() * Math.PI * 2; dummy.scale.setScalar(scale); dummy.updateMatrix(); trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.set(x, y + 5.2 * scale, z); dummy.updateMatrix(); crowns.setMatrixAt(placed, dummy.matrix);
      this.colliders.push({ x, y, z, radius: 0.58 * scale, height: 9.0 * scale, kind: 'tree' });
      placed += 1;
    }
    trunks.count = placed; crowns.count = placed; trunks.castShadow = true; crowns.castShadow = true; trunks.receiveShadow = true; crowns.receiveShadow = true;
    this.scene.add(trunks, crowns);
  }

  addChairlineGlades() {
    // Tree-lined lift runs: the cable centre stays open and skiable while two
    // irregular bands of firs define a recognisable powder line beneath chairs.
    const maxTrees = 520;
    const trunkGeo = new THREE.CylinderGeometry(0.20, 0.29, 3.8, 6);
    trunkGeo.userData.foliage = true;
    const crownGeo = firGeometry(1.95, 7.2, 1);
    const snowGeo = firGeometry(1.72, 6.5, 2, true);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x44342a, roughness: 1 });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x163a30, roughness: 1 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xe2edf1, roughness: 0.98 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxTrees);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, maxTrees);
    const caps = new THREE.InstancedMesh(snowGeo, snowMat, maxTrees);
    const dummy = new THREE.Object3D();
    let placed = 0;

    for (const glade of CHAIRLINE_GLADES) {
      for (let seg = 0; seg < glade.points.length - 1 && placed < maxTrees; seg += 1) {
        const a = glade.points[seg], b = glade.points[seg + 1];
        const dx = b.x - a.x, dz = b.z - a.z;
        const length = Math.hypot(dx, dz) || 1;
        const nx = -dz / length, nz = dx / length;
        const tx = dx / length, tz = dz / length;
        const samples = Math.max(8, Math.floor(length / 92));
        for (let i = 1; i < samples && placed < maxTrees; i += 1) {
          const t = i / samples;
          // Leave generous gaps near stations and occasional wider glades.
          if (t < 0.07 || t > 0.93 || (i + seg) % 7 === 0) continue;
          const cx = a.x + dx * t, cz = a.z + dz * t;
          for (const side of [-1, 1]) {
            if (placed >= maxTrees) break;
            const band = glade.width + 7 + this.random() * 10;
            const alongJitter = (this.random() - 0.5) * 15;
            const x = cx + nx * side * band + tx * alongJitter;
            const z = cz + nz * side * band + tz * alongJitter;
            if (Math.abs(x) > HALF_WORLD - 45) continue;
            const connector = nearestConnectorAt(x, z);
            if (connector.connector && connector.distance < connector.connector.width + 5) continue;
            const y = this.terrain.getHeight(x, z);
            const normal = this.terrain.getNormal(x, z);
            if (normal.y < 0.66) continue;
            const scale = THREE.MathUtils.lerp(0.72, 1.28, this.random());
            const rotation = this.random() * Math.PI * 2;
            dummy.rotation.set(0, rotation, 0);
            dummy.scale.set(scale, scale, scale);
            dummy.position.set(x, y + 1.9 * scale, z); dummy.updateMatrix(); trunks.setMatrixAt(placed, dummy.matrix);
            dummy.position.set(x, y + 5.45 * scale, z); dummy.updateMatrix(); crowns.setMatrixAt(placed, dummy.matrix);
            dummy.scale.set(scale * 0.92, scale * 0.95, scale * 0.92);
            dummy.position.set(x, y + 5.72 * scale, z); dummy.updateMatrix(); caps.setMatrixAt(placed, dummy.matrix);
            this.colliders.push({ x, y, z, radius: 0.6 * scale, height: 9.3 * scale, kind: 'tree' });
            placed += 1;
          }
        }
      }
    }
    for (const mesh of [trunks, crowns, caps]) {
      mesh.count = placed;
      mesh.receiveShadow = true;
      mesh.castShadow = mesh !== caps;
      mesh.name = 'Chairlift powder glade trees';
      this.scene.add(mesh);
    }
  }

  addRocks() {
    // v0.17.5: remove the old random boulder + hemisphere snow-cap scatter.
    // Those props could read as floating saucers from shallow camera angles.
    // Purposeful cliff walls remain in authored extreme terrain, but ordinary
    // front-side/off-piste snow is kept clean and skiable.
  }

  addRunGates() {
    const postGeo = new THREE.CylinderGeometry(0.13, 0.13, 4.4, 8);
    const barGeo = new THREE.BoxGeometry(8.8, 0.32, 0.32);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x182a37, roughness: 0.55, metalness: 0.25 });

    for (const run of RUNS) {
      if (run.id === 'wild') continue; // retired as a named piste in v0.17.3
      const z = RUN_START_Z + 38;
      const x = run.centerAt(z);
      const y = this.terrain.getHeight(x, z);
      const runMat = new THREE.MeshStandardMaterial({ color: run.color, roughness: 0.58 });
      const group = new THREE.Group();
      group.name = `${run.name} start gate`;
      for (const offset of [-4.4, 4.4]) {
        const post = new THREE.Mesh(postGeo, darkMat);
        post.position.set(x + offset, y + 2.2, z);
        post.castShadow = true;
        group.add(post);
      }
      const top = new THREE.Mesh(barGeo, runMat);
      top.position.set(x, y + 4.25, z);
      top.castShadow = true;
      group.add(top);
      const badge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.05, 0.22), runMat);
      badge.position.set(x, y + 3.45, z + 0.05);
      badge.castShadow = true;
      group.add(badge);
      this.scene.add(group);
    }
  }

  addRunIdentityDetails() {
    const snowTextures = createCompactSnowTextures();
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeaf3f7,
      map: snowTextures.map,
      bumpMap: snowTextures.bumpMap,
      bumpScale: 0.24,
      roughnessMap: snowTextures.roughnessMap,
      roughness: 0.96,
    });

    // Alpine Flow: broad blue piste with obvious banked snow edges.
    const flow = RUNS.find((run) => run.id === 'flow');
    if (flow) {
      const bankGeo = new THREE.SphereGeometry(1, 10, 7);
      for (let z = RUN_START_Z + 150; z <= RUN_END_Z - 150; z += 118) {
        for (const side of [-1, 1]) {
          const x = flow.centerAt(z) + side * (flow.width * 0.82);
          const y = this.terrain.getHeight(x, z);
          const bank = new THREE.Mesh(bankGeo, snowMat);
          bank.position.set(x, y + 0.42, z);
          bank.scale.set(4.5, 0.72, 13);
          bank.rotation.y = side * 0.08;
          bank.receiveShadow = true;
          this.scene.add(bank);
        }
      }
    }

    // Velocity stays exposed and readable through wind flags, but the old
    // isolated procedural rock fins were removed because they looked like
    // floating/flattened props from some camera angles.
    const velocity = RUNS.find((run) => run.id === 'velocity');
    if (velocity) {
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xf6c944, roughness: 0.65, emissive: 0x4a3500, emissiveIntensity: 0.22, side: THREE.DoubleSide });
      for (let z = RUN_START_Z + 175; z <= RUN_END_Z - 190; z += 160) {
        const center = velocity.centerAt(z);
        const side = ((Math.floor((z + 900) / 145) % 2) ? 1 : -1);
        const flagX = center - side * (velocity.width * 0.65);
        const flagY = this.terrain.getHeight(flagX, z);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.2, 7), flagMat);
        pole.position.set(flagX, flagY + 2.1, z);
        this.scene.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.72), flagMat);
        flag.position.set(flagX + side * 0.75, flagY + 3.45, z);
        flag.rotation.y = Math.PI / 2;
        this.scene.add(flag);
      }
    }

    // Summit Park: coloured entry arches every few hundred metres make the park
    // read as a purpose-built feature zone even before a rail/jump is reached.
    const park = RUNS.find((run) => run.id === 'park');
    if (park) {
      const parkMat = new THREE.MeshStandardMaterial({ color: park.color, roughness: 0.5, emissive: 0x2e0c3a, emissiveIntensity: 0.35 });
      for (const z of [-860, -390, 80, 550, 900]) {
        const x = park.centerAt(z);
        const y = this.terrain.getHeight(x, z);
        const group = new THREE.Group();
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.4, 0.28), parkMat);
          post.position.set(x + side * 8.4, y + 2.2, z);
          group.add(post);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(17.1, 0.35, 0.35), parkMat);
        top.position.set(x, y + 4.25, z);
        group.add(top);
        group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
        this.scene.add(group);
      }

      // Three coloured lane portals at the summit make skill progression
      // readable before the rider commits: green progression, blue flow,
      // purple pro. The feature layouts use the same lateral offsets.
      const laneZ = RUN_START_Z + 112;
      const laneDefs = [
        { offset: -52, color: 0x5bd884 },
        { offset: 0, color: 0x4aaee8 },
        { offset: 52, color: park.color },
      ];
      for (const lane of laneDefs) {
        const x = park.centerAt(laneZ) + lane.offset;
        const y = this.terrain.getHeight(x, laneZ);
        const mat = new THREE.MeshStandardMaterial({ color: lane.color, roughness: 0.45, emissive: lane.color, emissiveIntensity: 0.18 });
        const group = new THREE.Group();
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 0.25), mat);
          post.position.set(x + side * 6.1, y + 1.9, laneZ);
          group.add(post);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(12.45, 0.3, 0.3), mat);
        top.position.set(x, y + 3.72, laneZ);
        group.add(top);
        group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
        group.name = lane.offset < 0 ? 'Progression Park Lane' : lane.offset > 0 ? 'Pro Park Lane' : 'Flow Park Lane';
        this.scene.add(group);
      }
    }

    // Glacier Express: translucent blue ice ribs and sparse rock islands make
    // this high-altitude route visually distinct from the normal groomers.
    const glacier = RUNS.find((run) => run.id === 'glacier');
    if (glacier) {
      const iceMat = new THREE.MeshPhysicalMaterial({ color: 0x9fe5f4, roughness: 0.28, transmission: 0.08, transparent: true, opacity: 0.70 });
      for (let z = -820; z <= 760; z += 230) {
        const side = Math.sin(z * 0.01) > 0 ? 1 : -1;
        const x = glacier.centerAt(z) + side * glacier.width * 0.73;
        const y = this.terrain.getHeight(x, z);
        const ice = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 3.4), iceMat);
        ice.position.set(x, y + 0.55, z); ice.rotation.y = side * 0.25; ice.rotation.z = side * 0.08; ice.castShadow = true; this.scene.add(ice);
      }
    }

    // Avalanche Ridge: exposed snow fences and wind flags reinforce the narrow,
    // hazardous ridge identity without filling the skiable centre with clutter.
    const avalanche = RUNS.find((run) => run.id === 'avalanche');
    if (avalanche) {
      const hazard = new THREE.MeshStandardMaterial({ color: 0xe65a34, roughness: 0.62, emissive: 0x401006, emissiveIntensity: 0.2 });
      for (let z = -760; z <= 720; z += 260) {
        const x = avalanche.centerAt(z) + avalanche.width * 0.72;
        const y = this.terrain.getHeight(x, z);
        const fence = new THREE.Mesh(new THREE.BoxGeometry(18, 0.32, 0.32), hazard);
        fence.position.set(x, y + 2.6, z); fence.rotation.z = -0.08; this.scene.add(fence);
      }
    }

    // Sunset Cruise: small chalet/rest-stop silhouettes on the outside of the
    // piste create a relaxed scenic identity without blocking the main line.
    const sunset = RUNS.find((run) => run.id === 'sunset');
    if (sunset) {
      const wall = new THREE.MeshStandardMaterial({ color: 0xa97a58, roughness: 0.9 });
      const roof = new THREE.MeshStandardMaterial({ color: 0x43505a, roughness: 0.84 });
      for (const z of [-380, 260, 760]) {
        const x = sunset.centerAt(z) + sunset.width * 0.82;
        const y = this.terrain.getHeight(x, z);
        const body = new THREE.Mesh(new THREE.BoxGeometry(9, 4.6, 7), wall); body.position.set(x, y + 2.3, z); body.castShadow = true; this.scene.add(body);
        const top = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.8, 4), roof); top.position.set(x, y + 5.8, z); top.rotation.y = Math.PI / 4; this.scene.add(top);
        this.colliders.push({ x, y, z, radius: 4.7, height: 8, kind: 'building' });
      }
    }
  }

  addExtremeZones() {
    const rockTextures = createRockTextures();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x56636a, map: rockTextures.map, roughness: 0.98, flatShading: true });
    const darkRock = new THREE.MeshStandardMaterial({ color: 0x3f484e, map: rockTextures.map, roughness: 0.99, flatShading: true });
    const timber = new THREE.MeshStandardMaterial({ color: 0x5a3824, roughness: 0.96 });
    const hazard = new THREE.MeshStandardMaterial({ color: 0xe55136, roughness: 0.62, emissive: 0x451108, emissiveIntensity: 0.22 });

    // Corbet-inspired couloir: tall rock walls deliberately narrow the upper
    // chute. This is an approximation for gameplay, not geographic survey data.
    const corbet = SPECIAL_ZONES.corbets;
    const wallGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 44; i += 1) {
      const z = THREE.MathUtils.lerp(corbet.entryZ - 45, corbet.finishZ, i / 43);
      const throat = THREE.MathUtils.lerp(34, 58, Math.min(1, (z - corbet.entryZ + 45) / 300));
      for (const side of [-1, 1]) {
        const x = corbet.centerX + side * (throat + 11 + (i % 3) * 1.1);
        const y = this.terrain.getHeight(x, z);
        const rock = new THREE.Mesh(wallGeo, i % 4 === 0 ? darkRock : rockMat);
        rock.position.set(x, y + 4.2 + (i % 5) * 0.72, z);
        rock.scale.set(4.2 + (i % 3) * 1.0, 5.8 + (i % 4) * 1.15, 4.8 + (i % 2) * 1.35);
        rock.rotation.set(this.random() * 0.45, this.random() * Math.PI, this.random() * 0.28);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
        this.colliders.push({ x, y, z, radius: 4.2, height: 13.5, kind: 'rock' });
      }
    }

    // Entry flags make the two commitment lines readable from the ridge.
    for (const side of [-1, 1]) {
      const x = corbet.centerX + side * 15;
      const z = corbet.entryZ - 18;
      const y = this.terrain.getHeight(x, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8), hazard);
      pole.position.set(x, y + 1.8, z);
      this.scene.add(pole);
    }

    // Additional legendary descents. These are explicitly gameplay-inspired
    // interpretations rather than survey-accurate recreations.
    const legendaryMarkerMat = new THREE.MeshStandardMaterial({ color: 0xffc84a, roughness: 0.58, emissive: 0x4b3200, emissiveIntensity: 0.22 });
    const legendaryPole = new THREE.CylinderGeometry(0.075, 0.095, 3.4, 8);
    for (const key of ['streif', 'swissWall']) {
      const zone = SPECIAL_ZONES[key];
      for (let i = 0; i < 11; i += 1) {
        const z = THREE.MathUtils.lerp(zone.entryZ + 20, zone.finishZ - 30, i / 10);
        const edge = key === 'streif' ? 48 + Math.sin(i * 0.8) * 7 : 31 + Math.sin(i * 1.1) * 4;
        for (const side of [-1, 1]) {
          const x = zone.centerX + side * edge;
          const y = this.terrain.getHeight(x, z);
          const pole = new THREE.Mesh(legendaryPole, legendaryMarkerMat);
          pole.position.set(x, y + 1.7, z);
          pole.castShadow = true;
          this.scene.add(pole);
        }
      }
    }

    // Remote powder face: remove the old isolated procedural boulder field.
    // Fallen logs, tree pockets and snow fences still provide line choice without
    // the flattened/floating rock silhouettes called out in playtesting.
    const heli = SPECIAL_ZONES.heli;

    const logGeo = new THREE.CylinderGeometry(0.32, 0.42, 9.5, 8);
    for (let i = 0; i < 14; i += 1) {
      const z = THREE.MathUtils.lerp(-750, 780, this.random());
      const x = heli.centerX + THREE.MathUtils.lerp(-170, 170, this.random());
      const y = this.terrain.getHeight(x, z);
      const log = new THREE.Mesh(logGeo, timber);
      log.rotation.set(Math.PI / 2, this.random() * 0.75, Math.PI / 2);
      log.position.set(x, y + 0.42, z);
      log.castShadow = true;
      this.scene.add(log);
      for (const off of [-3.4, 0, 3.4]) {
        const angle = log.rotation.y;
        this.colliders.push({ x: x + Math.cos(angle) * off, y, z: z - Math.sin(angle) * off, radius: 0.7, height: 1.2, kind: 'log' });
      }
    }

    // Avalanche control fences high on the remote face.
    for (const z of [-720, -650]) {
      for (const offset of [-120, 0, 120]) {
        const x = heli.centerX + offset;
        const y = this.terrain.getHeight(x, z);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 0.32, 0.32), hazard);
        beam.position.set(x, y + 3.2, z);
        beam.rotation.z = -0.12;
        beam.castShadow = true;
        this.scene.add(beam);
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.2, 0.3), hazard);
          post.position.set(x + side * 15.5, y + 2.9, z);
          post.rotation.z = side * 0.08;
          this.scene.add(post);
        }
      }
    }
  }

  addMountainDetails() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b6488, roughness: 0.5, metalness: 0.2 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xe8f6fb, roughness: 0.75, side: THREE.DoubleSide });
    const bermSnow = createCompactSnowTextures();
    const bermMat = new THREE.MeshStandardMaterial({ color: 0xf2f7f9, map: bermSnow.map, bumpMap: bermSnow.bumpMap, bumpScale: 0.2, roughnessMap: bermSnow.roughnessMap, roughness: 0.98 });

    // Repeated piste poles visually tie groomed runs into the terrain. Wild
    // Bowl instead gets sparse orange boundary flags so it still reads as
    // unprepared off-piste terrain.
    for (const run of RUNS) {
      const step = run.id === 'wild' ? 285 : 145;
      const runPoleMat = run.id === 'wild'
        ? new THREE.MeshStandardMaterial({ color: run.color, roughness: 0.58, emissive: run.color, emissiveIntensity: 0.18 })
        : poleMat;
      for (let z = RUN_START_Z + 160; z <= RUN_END_Z - 160; z += step) {
        const center = run.centerAt(z);
        for (const side of [-1, 1]) {
          const localWidth = runWidthAt(run, z);
          const x = center + side * (run.id === 'wild' ? localWidth * 0.9 : Math.min(localWidth * 0.66, 42));
          const y = this.terrain.getHeight(x, z);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, run.id === 'wild' ? 3.2 : 2.6, 7), runPoleMat);
          post.position.set(x, y + (run.id === 'wild' ? 1.6 : 1.3), z);
          post.castShadow = true;
          this.scene.add(post);
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(run.id === 'wild' ? 1.05 : 0.75, run.id === 'wild' ? 0.62 : 0.45), run.id === 'wild' ? runPoleMat : flagMat);
          flag.position.set(x + side * 0.45, y + (run.id === 'wild' ? 2.55 : 2.15), z);
          flag.rotation.y = Math.PI / 2;
          this.scene.add(flag);
        }
      }
    }

    // Sculptural snow berms around the park and lower mountain improve depth without
    // adding expensive unique terrain meshes. They are decorative, not collision walls.
    const bermGeo = new THREE.SphereGeometry(1, 10, 7);
    for (let i = 0; i < 52; i += 1) {
      const z = THREE.MathUtils.lerp(RUN_START_Z + 160, RUN_END_Z - 130, this.random());
      const run = RUNS[Math.floor(this.random() * RUNS.length)];
      const side = this.random() < 0.5 ? -1 : 1;
      const localWidth = runWidthAt(run, z);
      const x = run.centerAt(z) + side * THREE.MathUtils.lerp(localWidth * 0.82, localWidth * 1.25, this.random());
      if (Math.abs(x) > HALF_WORLD - 30) continue;
      const y = this.terrain.getHeight(x, z);
      const berm = new THREE.Mesh(bermGeo, bermMat);
      berm.position.set(x, y + 0.45, z);
      berm.scale.set(THREE.MathUtils.lerp(2.2, 5.5, this.random()), THREE.MathUtils.lerp(0.45, 1.0, this.random()), THREE.MathUtils.lerp(2.8, 7.5, this.random()));
      berm.rotation.y = this.random() * Math.PI;
      berm.receiveShadow = true;
      this.scene.add(berm);
    }
  }


  addResortVillage() {
    // Compact lower-mountain village that gives the resort a believable centre
    // without turning the game into a city renderer. Buildings are original
    // procedural geometry and positioned away from the lift loading lanes.
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc8b9a2, roughness: 0.9 });
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x4d3428, roughness: 0.96 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a454d, roughness: 0.82 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeaf4f7, roughness: 0.97 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x6ab3d1, emissive: 0x173a4b, emissiveIntensity: 0.55, roughness: 0.25 });

    const placements = [
      [-190, 1070, 1.0], [-125, 1125, 0.82], [-35, 1098, 0.92], [55, 1134, 0.78],
      [130, 1082, 1.08], [205, 1130, 0.86], [255, 1050, 0.74], [-250, 1140, 0.74],
    ];

    for (const [x, z, scale] of placements) {
      if (nearNetworkLift(x, z, 24)) continue;
      const y = this.terrain.getHeight(x, z);
      const chalet = new THREE.Group();
      chalet.name = 'Base Village Chalet';
      const body = new THREE.Mesh(new THREE.BoxGeometry(11 * scale, 5.3 * scale, 8 * scale), wallMat);
      body.position.set(x, y + 2.65 * scale, z);
      body.castShadow = true;
      body.receiveShadow = true;
      chalet.add(body);

      // Dark timber bands and glowing windows break up the simple block form.
      for (const level of [1.45, 3.55]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(11.2 * scale, 0.25 * scale, 8.15 * scale), timberMat);
        band.position.set(x, y + level * scale, z);
        chalet.add(band);
      }
      for (const side of [-1, 1]) {
        const window = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 1.15 * scale, 0.12 * scale), windowMat);
        window.position.set(x + side * 2.9 * scale, y + 2.8 * scale, z + 4.08 * scale);
        chalet.add(window);
      }

      const roof = new THREE.Mesh(new THREE.ConeGeometry(7.9 * scale, 3.4 * scale, 4), roofMat);
      roof.position.set(x, y + 6.65 * scale, z);
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = 0.77;
      roof.castShadow = true;
      chalet.add(roof);
      const roofSnow = new THREE.Mesh(new THREE.ConeGeometry(8.05 * scale, 0.34 * scale, 4), snowMat);
      roofSnow.position.set(x, y + 8.22 * scale, z);
      roofSnow.rotation.y = Math.PI / 4;
      roofSnow.scale.z = 0.77;
      chalet.add(roofSnow);

      this.scene.add(chalet);
      this.colliders.push({ x, y, z, radius: 5.5 * scale, height: 9 * scale, kind: 'building' });
    }

    // Snow fences and piste direction boards on the final approach to the base.
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a4f34, roughness: 0.9 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0x224b63, roughness: 0.7, emissive: 0x0a1720, emissiveIntensity: 0.25 });
    for (const run of RUNS) {
      const z = 985;
      const center = run.centerAt(z);
      const y = this.terrain.getHeight(center, z);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.25, 0.22), signMat);
      sign.position.set(center, y + 2.8, z);
      sign.castShadow = true;
      this.scene.add(sign);
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 7), fenceMat);
        post.position.set(center + side * 2.0, y + 1.6, z);
        this.scene.add(post);
      }
    }
  }

  addDistantPeaks() {
    // A connected outer heightfield gives distant peaks foothills and saddles.
    // Its lower edge is below the playable world, never suspended in the sky.
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:false,side:THREE.DoubleSide});
    const peaks=[[-3700,-2100,1850,1250,1600],[-2900,-4600,1850,1500,1150],[-900,-5300,2150,1300,1250],[1300,-5400,1850,1500,1400],[3500,-4000,1950,1100,1650],[4100,-1100,1600,1200,1350],[4200,1700,1550,1650,1250],[1800,3500,1700,1400,1050],[-1700,3600,1800,1800,1100],[-4100,1400,1750,1200,1550],[-6800,-4200,2100,1900,1500],[-7600,-500,1750,1700,2000],[-6900,3300,1900,2100,1500],[6800,-4300,2050,1850,1600],[7800,-700,1800,1850,2100],[6900,3300,1950,2100,1500],[-3000,-7600,2200,2400,1650],[2600,-7700,2250,2400,1700],[-3200,6500,1900,2500,1700],[3000,6500,2000,2500,1700]];
    const sample=(x,z)=>{
      let elevation=-450;
      for(const [px,pz,h,rx,rz] of peaks){const dx=(x-px)/rx,dz=(z-pz)/rz;elevation+=h*Math.exp(-(dx*dx+dz*dz)*1.4);}
      const edge=Math.max(Math.abs(x)-2650,Math.max(-3750-z,z-1950));
      const fade=THREE.MathUtils.smoothstep(edge,0,600);
      const relief=(Math.sin(x*.009+z*.004)*50+Math.sin(x*.019-z*.007)*30+Math.sin(z*.028+x*.003)*17)*fade;
      return -450+(elevation+450)*fade+relief;
    };
    // Four spatial patches retain frustum culling; irregular ridges continue
    // all the way down to the foothills instead of ending on a vertical curtain.
    for(const [x0,z0,w,d] of [[-11000,-9200,22000,5500],[-11000,1900,22000,5700],[-11000,-3700,8400,5600],[2600,-3700,8400,5600]]){
      const nx=Math.ceil(w/145),nz=Math.ceil(d/145),p=[],col=[],ix=[];
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
        const x=x0+w*i/nx,z=z0+d*j/nz,y=sample(x,z);p.push(x,y,z);
        const slope=Math.hypot(sample(x+20,z)-sample(x-20,z),sample(x,z+20)-sample(x,z-20))/40;
        const snow=THREE.MathUtils.smoothstep(y+55*Math.sin(x*.012+z*.008),180,620)*(1-THREE.MathUtils.smoothstep(slope,.95,1.75));
        const value=.76+snow*.20;const steep=THREE.MathUtils.smoothstep(slope,.95,1.8);col.push(value-.055*steep,value-.025*steep,Math.min(1,value+.035));
        if(i<nx&&j<nz){const a=j*(nx+1)+i,b=a+nx+1;ix.push(a,b,a+1,a+1,b,b+1);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(ix);g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat);mesh.name='Distant alpine foothills';this.scene.add(mesh);
    }
  }


}
