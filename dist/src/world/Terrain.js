import {PIPE_PATCHES,insidePipePatch,pipePatchGeometry} from './TransitionMesh.js';
import * as THREE from 'three';
import { HALF_WORLD, WORLD_SIZE, WORLD_MIN_Z, WORLD_MAX_Z, isInsideWorld, terrainHeightAt, terrainNormalAt } from './terrainMath.js';
import { RUNS, SOUTH_RUNS, RUN_CROSSINGS, SOUTH_RUN_CROSSINGS, nearestRunAt, nearestConnectorAt, surfaceAt, runWidthAt, runRange } from './RunDefinitions.js';
import { TRANSITION_FEATURES,transitionAt,inTransitionZone,lipCrossed } from './TransitionZone.js';
import { surfaceContains } from './transitionMath.js';
import { specialZoneAt } from './SpecialZones.js';

export class Terrain {
  constructor(scene) {
    this.scene=scene; this.chunks=[]; this.precisionLODs=[]; this.quality='high'; this.colliders=[]; this.nightLampPositions=[]; this.nightLampMesh=null; this.nightHaloMesh=null; this.nightPointLights=[]; this.nightGlowMaterials=[]; this.nightMode=false; this._nightLightClock=0;
    // v0.17: the previous tiled snow textures / finish shader produced visible
    // directional striping across long slopes. Terrain now gets its variation
    // from authored vertex colours plus restrained physical reflectance, so the
    // snow reads as continuous rather than corrugated or fabric-like.
    // Terrain covers most screen pixels, so a Standard material is a major GPU
    // win over MeshPhysicalMaterial. The removed 3.5% clearcoat was visually
    // negligible on rough snow but made every terrain fragment more expensive.
    this.material=new THREE.MeshStandardMaterial({
      vertexColors:true,
      roughness:0.94,
      metalness:0,
    });
    this.buildChunks();
    for(const f of PIPE_PATCHES){
      const lod=new THREE.LOD(),center=new THREE.Vector3(f.x,this.getHeight(f.x,f.z),f.z);lod.position.copy(center);
      for(const coarse of [false,true]){const mesh=new THREE.Mesh(pipePatchGeometry(f,terrainHeightAt,coarse),this.material);mesh.position.copy(center).negate();mesh.receiveShadow=true;mesh.name=f.name+' circular snow wall';lod.addLevel(mesh,coarse?480:0,.12);}
      this.scene.add(lod);this.precisionLODs.push(lod);
    }
    this.addRunMarkers();
  }

  buildChunks() {
    // Startup optimisation: fewer, larger terrain chunks cut synchronous mesh generation
    // substantially while analytic physics/height sampling stays full precision.
    const size=320;
    for(let z=WORLD_MIN_Z;z<WORLD_MAX_Z;z+=size)for(let x=-HALF_WORLD;x<HALF_WORLD;x+=size){
      const detailed=TRANSITION_FEATURES.some(f=>{const c=Math.abs(Math.cos(f.angle||0)),s=Math.abs(Math.sin(f.angle||0)),u=(f.flat||12)+(f.radius||10)*2.7;return Math.abs(f.x-(x+size/2))<size/2+c*u+s*f.length/2 && Math.abs(f.z-(z+size/2))<size/2+s*u+c*f.length/2;});
      const geometry=this.makeChunk(x,z,size,detailed?64:22);
      const mesh=new THREE.Mesh(geometry,this.material);
      mesh.name=detailed?'Transition precision snow':'Mountain snow chunk';
      mesh.receiveShadow=true;mesh.userData={x,z,size,detailed};
      if(detailed){
        const lod=new THREE.LOD(),center=new THREE.Vector3(x+size/2,terrainHeightAt(x+size/2,z+size/2),z+size/2);
        lod.position.copy(center);mesh.position.copy(center).negate();lod.addLevel(mesh,0);
        const distant=new THREE.Mesh(this.makeChunk(x,z,size,14),this.material);
        distant.position.copy(center).negate();distant.receiveShadow=true;
        lod.addLevel(distant,600,0.12);this.scene.add(lod);this.precisionLODs.push(lod);
      }else this.scene.add(mesh);
      this.chunks.push(mesh);
    }
  }

  makeChunk(x0,z0,size,segments) {
    const positions=[],normals=[],colors=[],indices=[];
    const candidates=PIPE_PATCHES.filter(f=>Math.abs(f.x-x0-size/2)<size+f.length/2&&Math.abs(f.z-z0-size/2)<size+f.length/2);
    const masked=(...ids)=>candidates.some(f=>ids.every(i=>insidePipePatch(f,positions[i*3],positions[i*3+2])));
    for(let iz=0;iz<=segments;iz++)for(let ix=0;ix<=segments;ix++){
      const x=x0+ix/segments*size,z=z0+iz/segments*size,y=terrainHeightAt(x,z);
      positions.push(x,y,z);
      const n=terrainNormalAt(x,z);normals.push(n.x,n.y,n.z);
      const surface=surfaceAt(x,z), groomed=surface==='GROOMED'||surface==='PARK';
      const relief=Math.sin(x*0.009+z*0.003)*0.012+Math.cos(z*0.013)*0.009;
      // Powder is deliberately a little deeper/bluer than prepared piste snow.
      // Combined with the rope boundaries and denser tree bands this makes the
      // off-piste transition readable at skiing speed instead of only via HUD text.
      if(surface==='POWDER'){
        const value=0.82+relief*0.72;
        colors.push(value-0.045,value+0.004,Math.min(1,value+0.072));
      }else{
        const value=(surface==='ICY'?0.80:groomed?0.92:0.87)+relief;
        colors.push(value-0.025,value+0.015,Math.min(1,value+0.055));
      }
    }
    const row=segments+1;
    for(let iz=0;iz<segments;iz++)for(let ix=0;ix<segments;ix++){
      const a=iz*row+ix,b=a+1,c=a+row,d=c+1;if(!masked(a,c,b))indices.push(a,c,b);if(!masked(b,c,d))indices.push(b,c,d);
    }
    // Narrow skirts hide cracks where a precision patch meets a coarse chunk.
    const perimeter=[];
    for(let i=0;i<=segments;i++)perimeter.push(i);
    for(let i=1;i<=segments;i++)perimeter.push(i*row+segments);
    for(let i=segments-1;i>=0;i--)perimeter.push(segments*row+i);
    for(let i=segments-1;i>0;i--)perimeter.push(i*row);
    const start=positions.length/3;
    for(const i of perimeter){positions.push(positions[i*3],positions[i*3+1]-8,positions[i*3+2]);normals.push(...normals.slice(i*3,i*3+3));colors.push(...colors.slice(i*3,i*3+3));}
    for(let j=0;j<perimeter.length;j++){const k=(j+1)%perimeter.length;indices.push(perimeter[j],start+j,perimeter[k],perimeter[k],start+j,start+k);}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    // Analytic world-space normals are shared across chunk borders. Do NOT recompute
    // per-chunk normals here: the skirt triangles used to darken every chunk edge,
    // creating the ugly square grid visible both while skiing and in satellite view.
    geometry.computeBoundingSphere();return geometry;
  }

  setQuality(level) {
    if(this.quality===level)return;
    this.quality=level;
    // Geometry is built once. Rebuilding hundreds of chunks on a graphics change
    // caused multi-second stalls; visual quality now changes via LOD distance,
    // shadows and renderer resolution instead.
    for(const lod of this.precisionLODs) {
      if (lod.levels?.[1]) lod.levels[1].distance={low:280,medium:380,high:520,ultra:760}[level]||520;
    }
  }
  getTransition(x,z){return transitionAt(x,z);}
  leavesTransitionLip(feature,a,b,velocity){return lipCrossed(feature,a,b,velocity);}

  getHeight(x, z) {
    return terrainHeightAt(x, z);
  }

  getNormal(x, z, target = new THREE.Vector3()) {
    const n = terrainNormalAt(x, z);
    return target.set(n.x, n.y, n.z);
  }

  getSurface(x, z) {
    return surfaceAt(x, z);
  }

  getNearestRun(x, z) {
    return nearestRunAt(x, z);
  }

  addRunMarkers() {
    const markerGeometry = new THREE.CylinderGeometry(0.14, 0.17, 2.7, 8);
    const capGeometry = new THREE.OctahedronGeometry(0.34, 0);
    const ropeGeometry = new THREE.CylinderGeometry(0.032, 0.032, 1, 6);
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xd94734, roughness: 0.92 });
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3();

    const placeRopeSegment = (mesh, index, a, b) => {
      direction.subVectors(b, a);
      const length = direction.length();
      if (length < 0.01) return index;
      dummy.position.copy(a).add(b).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(up, direction.normalize());
      dummy.scale.set(1, length, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      return index + 1;
    };

    for (const run of [...RUNS, ...SOUTH_RUNS]) {
      if (run.id === 'wild') continue; // western basin is deliberately unmarked off-piste terrain
      const count = run.downhillDirection < 0 ? 58 : 67;
      const material = new THREE.MeshStandardMaterial({
        color: run.color,
        roughness: 0.48,
        emissive: run.color,
        emissiveIntensity: 0,
      });
      const capMaterial = material.clone();
      capMaterial.emissiveIntensity = 0;
      this.nightGlowMaterials.push({ marker: material, cap: capMaterial });
      const left = new THREE.InstancedMesh(markerGeometry, material, count);
      const right = new THREE.InstancedMesh(markerGeometry, material, count);
      const leftCaps = new THREE.InstancedMesh(capGeometry, capMaterial, count);
      const rightCaps = new THREE.InstancedMesh(capGeometry, capMaterial, count);
      const ropes = new THREE.InstancedMesh(ropeGeometry, ropeMaterial, (count - 1) * 4);
      left.name = `${run.name} left piste markers`;
      right.name = `${run.name} right piste markers`;
      ropes.name = `${run.name} piste boundary ropes`;

      const samples = [];
      for (let i = 0; i < count; i += 1) {
        const range=runRange(run);
        const z = range.min + 18 + i * ((range.max - range.min - 36) / (count - 1));
        const center = run.centerAt(z);
        const width = runWidthAt(run, z) + 6 + 3 * Math.sin(z * 0.005 + i);
        const row = { z, left: null, right: null };
        for (const [key, pole, cap, x] of [['left', left, leftCaps, center - width], ['right', right, rightCaps, center + width]]) {
          const ground = this.getHeight(x, z);
          dummy.position.set(x, ground + 1.35, z);
          dummy.quaternion.identity();
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          pole.setMatrixAt(i, dummy.matrix);
          dummy.position.set(x, ground + 2.95, z);
          dummy.rotation.set(0, Math.PI / 4, 0);
          dummy.updateMatrix();
          cap.setMatrixAt(i, dummy.matrix);
          row[key] = new THREE.Vector3(x, ground + 1.75, z);
          if (i % 3 === 0) this.nightLampPositions.push(new THREE.Vector3(x, ground + 3.18, z));
          this.colliders.push({ x, y: ground, z, radius: 0.22, height: 2.9, kind: 'pole' });
        }
        samples.push(row);
      }

      // Real piste-edge rope, with intentional openings at run crossings and
      // occasional access gaps so leaving the piste still feels natural.
      let ropeIndex = 0;
      for (let i = 0; i < samples.length - 1; i += 1) {
        const a = samples[i], b = samples[i + 1];
        const midZ = (a.z + b.z) * 0.5;
        const crossingGap = RUN_CROSSINGS.some((crossing) => crossing.runs.includes(run.id) && Math.abs(midZ - crossing.z) < 46) ||
          SOUTH_RUN_CROSSINGS.some((crossing) => crossing.runs.includes(run.id) && Math.abs(midZ - crossing.z) < 46);
        const accessGap = i % 13 === 7;
        if (crossingGap || accessGap) continue;
        for (const side of ['left', 'right']) {
          const p0 = a[side], p2 = b[side];
          const sag = p0.clone().lerp(p2, 0.5);
          sag.y -= 0.24;
          ropeIndex = placeRopeSegment(ropes, ropeIndex, p0, sag);
          ropeIndex = placeRopeSegment(ropes, ropeIndex, sag, p2);
          if (i % 2 === 0) {
            const ropeMid = p0.clone().lerp(p2, 0.5);
            this.colliders.push({ x: ropeMid.x, y: ropeMid.y - 0.22, z: ropeMid.z, radius: 0.32, height: 0.7, kind: 'rope' });
          }
        }
      }
      ropes.count = ropeIndex;
      ropes.instanceMatrix.needsUpdate = true;
      left.castShadow = right.castShadow = leftCaps.castShadow = rightCaps.castShadow = false;
      ropes.castShadow = false;
      this.scene.add(left, right, leftCaps, rightCaps, ropes);
    }

    // Low-cost piste lighting for Night mode. Hundreds of tiny bulbs are one
    // instanced draw call; only nearby non-shadowing point lights actually
    // illuminate snow, so night remains performant on the browser build.
    if (this.nightLampPositions.length) {
      const bulbGeo = new THREE.SphereGeometry(0.24, 8, 6);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xf0f8ff, transparent:true, opacity:1.0 });
      const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, this.nightLampPositions.length);
      const lampDummy = new THREE.Object3D();
      this.nightLampPositions.forEach((pos, index) => {
        lampDummy.position.copy(pos); lampDummy.scale.set(1,1,1); lampDummy.updateMatrix(); bulbs.setMatrixAt(index, lampDummy.matrix);
      });
      bulbs.instanceMatrix.needsUpdate = true;
      bulbs.computeBoundingSphere();
      bulbs.name = 'Piste night lamps'; bulbs.visible = false; bulbs.frustumCulled = true;
      this.scene.add(bulbs); this.nightLampMesh = bulbs;
      // Oversized additive halos make the piste lighting visibly punchy at night
      // without requiring hundreds of shadow-casting lights.
      const haloGeo = new THREE.SphereGeometry(0.72, 7, 5);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xbfe7ff, transparent: true, opacity: 0.20,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halos = new THREE.InstancedMesh(haloGeo, haloMat, this.nightLampPositions.length);
      this.nightLampPositions.forEach((pos, index) => {
        lampDummy.position.copy(pos); lampDummy.scale.set(1,1,1); lampDummy.updateMatrix(); halos.setMatrixAt(index, lampDummy.matrix);
      });
      halos.instanceMatrix.needsUpdate = true;
      halos.computeBoundingSphere();
      halos.name = 'Piste night lamp halos'; halos.visible = true; halos.material.opacity = 0; halos.frustumCulled = true;
      this.scene.add(halos); this.nightHaloMesh = halos;
      // Two local non-shadowing lights are enough to brighten nearby snow. They
      // stay in the lighting graph at intensity zero during the day, avoiding the
      // expensive shader recompilation that used to happen when Night was toggled.
      for (let i = 0; i < 2; i += 1) {
        const light = new THREE.PointLight(0xc7ecff, 0, 115, 1.45);
        light.castShadow = false; light.visible = true; this.scene.add(light); this.nightPointLights.push(light);
      }
    }
  }

  setNightMode(enabled) {
    this.nightMode = Boolean(enabled);
    // Keep the two instanced lamp draws resident so their shaders/buffers are
    // already warm before the first Night toggle. Opacity is a uniform and does
    // not trigger a program compile; two transparent instanced draws in daytime
    // are dramatically cheaper than a first-night hitch.
    if (this.nightLampMesh) { this.nightLampMesh.visible = true; this.nightLampMesh.material.opacity = this.nightMode ? 1 : 0; }
    if (this.nightHaloMesh) { this.nightHaloMesh.visible = true; this.nightHaloMesh.material.opacity = this.nightMode ? 0.20 : 0; }
    for (const pair of this.nightGlowMaterials) {
      // emissiveIntensity is a uniform: changing it does NOT require material.needsUpdate.
      // Forcing needsUpdate here used to recompile every piste material at once.
      pair.marker.emissiveIntensity = this.nightMode ? 0.48 : 0;
      pair.cap.emissiveIntensity = this.nightMode ? 1.55 : 0;
    }
    if (!this.nightMode) for (const light of this.nightPointLights) light.intensity = 0;
    this._nightLightClock = 0;
  }

  updateNightLights(playerPosition, dt = 0) {
    if (!playerPosition || !this.nightPointLights.length) return;
    if (!this.nightMode) {
      for (const light of this.nightPointLights) light.intensity = 0;
      return;
    }
    this._nightLightClock -= dt;
    if (this._nightLightClock > 0) return;
    this._nightLightClock = 0.22;

    // Linear nearest-two search: avoids allocating/sorting hundreds of temporary
    // objects every few frames.
    let first=null, second=null, d1=Infinity, d2=Infinity;
    for (const p of this.nightLampPositions) {
      const d=p.distanceToSquared(playerPosition);
      if (d<d1) { second=first; d2=d1; first=p; d1=d; }
      else if (d<d2) { second=p; d2=d; }
    }
    const nearest=[{p:first,d:d1},{p:second,d:d2}];
    this.nightPointLights.forEach((light,index)=>{
      const item=nearest[index];
      if(!item?.p){light.intensity=0;return;}
      light.position.copy(item.p);
      light.intensity=item.d<130*130?92:58;
    });
  }

  contains(x, z, margin = 0) {
    return isInsideWorld(x,z,margin);
  }
}
