import * as THREE from 'three';
import {firGeometry,alpineRockGeometry} from './alpineGeometry.js';
import {batchStatic} from './staticBatch.js';
import {getRun,nearestConnectorAt} from './RunDefinitions.js';
import {TRANSITION_FEATURES,onTransitionRoute} from './TransitionZone.js';
import {surfaceContains} from './transitionMath.js';
import {RESORT_LIFTS,getLiftEndpoints,getStation} from './ResortNetwork.js';
import {PARK_LANES} from './CreativeLines.js';
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
const segmentDistance=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);};
export class ResortDressing{
 constructor(scene,terrain,features){
  this.scene=scene;this.terrain=terrain;this.features=features;this.colliders=[];this.trees=[];this.details=[];this.random=rng(16016);this.stats={trees:0,mainTrees:0,northTrees:0};
  this.materials={wood:new THREE.MeshStandardMaterial({color:0x685047,roughness:.92}),steel:new THREE.MeshStandardMaterial({color:0x384953,metalness:.45,roughness:.6}),snow:new THREE.MeshStandardMaterial({color:0xeeeede,roughness:.92}),glass:new THREE.MeshStandardMaterial({color:0x508493,metalness:.25,roughness:.3}),orange:new THREE.MeshStandardMaterial({color:0xe89652,roughness:.8}),rock:new THREE.MeshStandardMaterial({color:0x657078,roughness:.98,flatShading:true})};
  const before=new Set(scene.children);this.plant();this.parks();this.naturalLines();this.mountainHubs();this.village();batchStatic(scene,scene.children.filter(o=>!before.has(o)),220);
  this.distanceCullRange=1380;this.distanceCullClock=0;this.distanceItems=this.collectDistanceItems(before);
 }
 add(g,mat,x,y,z){const m=new THREE.Mesh(g,typeof mat==='string'?this.materials[mat]:mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
 safe(x,z,pad=0){
  if(onTransitionRoute(x,z))return false;
  const connector=nearestConnectorAt(x,z);if(connector.connector&&connector.distance<connector.connector.width+9+pad)return false;
  if(RESORT_LIFTS.some(l=>{const e=getLiftEndpoints(l);return e&&segmentDistance(x,z,e.from,e.to)<19+pad;}))return false;
  if(TRANSITION_FEATURES.some(f=>surfaceContains(f,x,z,7+pad)))return false;
  if(this.features.ramps.some(r=>Math.abs(x-r.x)<r.width*.76+7+pad&&z>Math.min(r.startZ,r.backEndZ)-20&&z<Math.max(r.startZ,r.backEndZ)+20))return false;
  if(this.features.rails.some(r=>x>r.path.bounds.min.x-5-pad&&x<r.path.bounds.max.x+5+pad&&z>r.path.bounds.min.z-5-pad&&z<r.path.bounds.max.z+5+pad))return false;
  return this.terrain.getNormal(x,z).y>.79;
 }
 plant(){
  const points=[];
  // Main-side edges, glades and park separators; leave the centre and jump runouts clear.
  for(const [id,count,start,end] of [['flow',130,-700,800],['park',285,-1080,980],['sunset',125,-500,900],['pine',75,-300,900],['woodland',80,-200,900]]){
   const run=getRun(id);let n=0;
   for(let attempt=0;n<count&&attempt<count*12;attempt++){
    const z=start+(end-start)*this.random(),side=this.random()<.5?-1:1;
    const distance=id==='park'?128+this.random()*75:(id==='flow'||id==='sunset'?100:run.width+12)+this.random()*60;
    const x=run.centerAt(z)+side*distance;
    if(Math.sin(z*.018+x*.013)<-.35||!this.safe(x,z))continue;
    points.push({x,z,scale:.68+this.random()*.57,north:false});n++;
   }
  }
  // Forest pockets on the lower backside, with sparse wind-pruned upper trees.
  const pockets=[[140,-1900,70,110,45],[840,-1990,80,140,60],[205,-2260,90,160,82],[900,-2540,55,140,68],[210,-2700,100,120,72],[45,-3240,105,130,82],[810,-3150,75,150,95],[1020,-3440,85,85,52]];
  for(const [cx,cz,rx,rz,count] of pockets){let n=0;for(let attempt=0;n<count&&attempt<count*18;attempt++){
   const a=this.random()*Math.PI*2,r=Math.sqrt(this.random()),x=cx+Math.cos(a)*r*rx,z=cz+Math.sin(a)*r*rz;
   if(!this.safe(x,z)||this.terrain.getHeight(x,z)>590)continue;
   points.push({x,z,scale:(z>-2150?.52:.78)+this.random()*.6,north:true});n++;
  }}
  this.treeGroups=new Map();
  const geos=[0,1,2].map(s=>[new THREE.CylinderGeometry(.19,.29,3.5,7),firGeometry(2.1,7.5,s),firGeometry(1.84,6.8,s,true)]);
  const mats=[new THREE.MeshStandardMaterial({color:0x574438,roughness:1}),new THREE.MeshStandardMaterial({color:0x294b3d,roughness:1}),new THREE.MeshStandardMaterial({color:0xe0e7df,roughness:1})];
  for(const p of points){const species=Math.floor(this.random()*3),key=[Math.floor(p.x/600),Math.floor(p.z/600),species].join(':');if(!this.treeGroups.has(key))this.treeGroups.set(key,{species,points:[]});this.treeGroups.get(key).points.push(p);}
  const dummy=new THREE.Object3D();
  for(const {species,points:group} of this.treeGroups.values()){
   const meshes=geos[species].map((g,i)=>{const m=new THREE.InstancedMesh(g,mats[i],group.length);m.castShadow=false;m.receiveShadow=true;m.name='Spatial alpine woodland';this.scene.add(m);this.trees.push(m);return m;});
   group.forEach((p,i)=>{const y=this.terrain.getHeight(p.x,p.z),rotation=this.random()*6.28,width=.8+this.random()*.4,snow=.67+this.random()*.30;
    for(let j=0;j<3;j++){dummy.position.set(p.x,y+[1.75,5.05,5.30][j]*p.scale,p.z);dummy.rotation.set(0,rotation,0);dummy.scale.set(p.scale*width*(j===2?snow:1),p.scale,p.scale*width*(j===2?snow:1));dummy.updateMatrix();meshes[j].setMatrixAt(i,dummy.matrix);}
    this.colliders.push({x:p.x,y,z:p.z,radius:.48*p.scale,height:9*p.scale,kind:'tree'});this.stats.trees++;this.stats[p.north?'northTrees':'mainTrees']++;
   });meshes.forEach(m=>{m.computeBoundingBox();m.computeBoundingSphere();});
  }
 }
 sign(title,subtitle,x,z,color=0x57accc,width=8){
  const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#172b35';ctx.fillRect(0,0,512,192);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,12,192);ctx.fillStyle='#f0f2e8';ctx.font='bold 35px sans-serif';ctx.fillText(title,30,72);ctx.font='21px sans-serif';ctx.fillStyle='#b9c9c8';ctx.fillText(subtitle,30,122);ctx.fillStyle='#efb963';ctx.font='bold 17px sans-serif';ctx.fillText('ALPINE / MOUNTAIN WORKS',30,169);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
  const y=this.terrain.getHeight(x,z);this.add(new THREE.BoxGeometry(width,.08,1.15),'snow',x,y+4.35,z);const board=this.add(new THREE.PlaneGeometry(width,width*.375),material,x,y+3.1,z);board.rotation.y=z<-1450?0:Math.PI;
  for(const side of [-1,1]){this.add(new THREE.CylinderGeometry(.11,.15,4.3,8),'wood',x+side*width*.39,y+2.15,z);this.colliders.push({x:x+side*width*.39,y,z,radius:.18,height:4.4,kind:'tree'});}
 }
 fence(x,z,length,direction=1,color=0xe69b65){
  const mat=new THREE.MeshStandardMaterial({color,transparent:true,opacity:.54,forceSinglePass:true,side:THREE.DoubleSide,roughness:1,depthWrite:false});
  for(let j=0;j<length;j+=8){const z0=z+j*direction,z1=z+(j+8)*direction,y0=this.terrain.getHeight(x,z0),y1=this.terrain.getHeight(x,z1);
   this.add(new THREE.CylinderGeometry(.035,.045,1.65,6),'orange',x,y0+.82,z0);
   const pos=[x,y0+.30,z0,x,y0+1.45,z0,x,y1+.30,z1,x,y1+1.45,z1],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();this.add(geo,mat,0,0,0).castShadow=false;
  }
 }
 hut(x,z,label){
  const y=this.terrain.getHeight(x,z);this.add(new THREE.BoxGeometry(9,3.8,6.5),'wood',x,y+1.9,z);
  for(const side of [-1,1]){const roof=this.add(new THREE.BoxGeometry(5.7,.36,7.8),'snow',x+side*2.45,y+4.75,z);roof.rotation.z=-side*.38;}
  for(const side of [-1,1])this.add(new THREE.BoxGeometry(1.9,1.5,.08),'glass',x+side*2.4,y+2.25,z+3.29);
  this.add(new THREE.BoxGeometry(1.25,2.55,.10),'steel',x,y+1.28,z+3.31);
  for(let i=0;i<4;i++)this.add(new THREE.BoxGeometry(.08,3.8,6.6),'steel',x-4.3+i*2.86,y+1.9,z);
  this.colliders.push({x,y,z,radius:5.1,height:6.5,kind:'building'});this.sign(label,'REST / MEET / DROP IN',x+11,z,0xe8b863,6);
 }
 parks(){
  const park=getRun('park');
  for(const z of [-1080,-565,165,760]){
   for(const lane of PARK_LANES){const x=park.centerAt(z)+lane.offset;this.sign(lane.name,lane.description,x+12,z,lane.color,7);}
   this.fence(park.centerAt(z)-145,z+12,96,1);this.fence(park.centerAt(z)+145,z+12,96,1);
  }
  for(const lane of PARK_LANES){const z=-1030,x=park.centerAt(z)+lane.offset,y=this.terrain.getHeight(x,z),mat=new THREE.MeshStandardMaterial({color:lane.color,roughness:.65});
    for(const side of [-1,1]){this.add(new THREE.CylinderGeometry(.13,.18,5.5,8),'wood',x+side*6.5,y+2.75,z);this.colliders.push({x:x+side*6.5,y,z,radius:.22,height:5.5,kind:'tree'});}
    this.add(new THREE.BoxGeometry(13.5,.60,.4),mat,x,y+5.2,z);
  }
  this.hut(park.centerAt(-1000)-177,-1000,'SUMMIT WORKSHOP');this.hut(park.centerAt(420)+181,420,'PARK PATROL');
  for(const [title,sub,x,z] of [['UPPER BASIN','SMALL / 3 m WALLS',165,-1690],['RIDGE PIPE','MEDIUM / 5.5 m WALLS',486,-1720],['CENTRAL LINES','MEDIUM / ADVANCED',512,-2115],['LOWER BASIN','ADVANCED / EXPERT',548,-2710]])this.sign(title,sub,x,z,0x65bcaf,9);
  this.hut(920,-2100,'NORTH WORKSHOP');this.hut(965,-3385,'EXPRESS CAFE');
  for(const [x,z,l] of [[208,-1690,100],[481,-1740,180],[490,-2155,190],[605,-2740,100]])this.fence(x,z,l,-1,0x67a49c);

  // South Park gets a small but readable base/summit identity without covering
  // the new second mountain in signs. The actual feature density comes from
  // FreestyleFeatures, so these are just visual anchors.
  const southPark=getRun('south-park');
  if(southPark){
   this.hut(southPark.centerAt(3050)+170,3050,'SOUTH PARK SUMMIT');
   this.hut(southPark.centerAt(1600)-175,1600,'SOUTH PARK PATROL');
   for(const z of [2920,2320,1740]){const x=southPark.centerAt(z);this.fence(x-145,z-15,80,-1,0x8767bd);this.fence(x+145,z-15,80,-1,0x8767bd);}
  }
 }
 naturalLines(){
  // Deliberate, readable 12 m trunk gates beyond small existing side hits.
  for(const [id,z,offset] of [['pine',-735,-20],['woodland',-400,20],['flow',-750,-24],['transition',-2070,-100]]){
   const x=getRun(id).centerAt(z)+offset;
   for(const side of [-1,1]){const px=x+side*9,y=this.terrain.getHeight(px,z),scale=1.15;
    this.add(new THREE.CylinderGeometry(.3,.42,4.6,8),'wood',px,y+2.3,z);this.add(firGeometry(2.6,8.5,1),new THREE.MeshStandardMaterial({color:0x2c4e3c,roughness:1}),px,y+6.1,z);
    this.colliders.push({x:px,y,z,radius:.55,height:10,kind:'tree'});
   }
  }
  const rockGeo=alpineRockGeometry(1);
  for(const [id,z] of [['flow',-450],['park',-700],['park',360],['sunset',260],['woodland',500],['transition',-2400],['transition',-3090]]){
   const run=getRun(id),center=run.centerAt(z),offset=id==='transition'?220:run.width+35;
   for(let j=0;j<13;j++){const x=center+offset+(this.random()-.5)*36,rz=z+(this.random()-.5)*90;if(!this.safe(x,rz,3))continue;const y=this.terrain.getHeight(x,rz),sx=1.3+this.random()*3.4,sy=.8+this.random()*2.3;
    const m=this.add(rockGeo,'rock',x,y+sy*.2,rz);m.scale.set(sx,sy,sx*.7);m.rotation.set(.15,this.random()*6,.15);const cap=this.add(rockGeo,'snow',x,y+sy*.63,rz);cap.scale.set(sx*.82,sy*.23,sx*.55);cap.rotation.copy(m.rotation);
    this.colliders.push({x,y,z:rz,radius:sx*.73,height:sy*1.4,kind:'rock'});
   }
  }
 }
 mountainHubs(){
  // Mid-mountain lodges make the front side read as a real lift-linked resort
  // rather than a collection of top-to-bottom lanes. They sit just off the
  // groomed junctions so the through-route stays skiable.
  const hubs=[
   ['eagle-basin','EAGLE BASIN LODGE',30,18],
   ['glacier-basin','GLACIER CHALET',-29,14],
   ['forest-hub','FOREST HUB',28,18],
   ['sun-terrace','SUN TERRACE',30,16],
   ['south-valley','SOUTH VALLEY LODGE',28,18],
   ['south-west-mid','AURORA MID LODGE',-27,15],
   ['south-east-mid','CEDAR MID LODGE',28,16],
  ];
  for(const [id,label,dx,dz] of hubs){
   const s=getStation(id);if(!s)continue;
   this.hut(s.x+dx,s.z+dz,label);
   // A short snow terrace visually ties the lodge to the junction without
   // adding another collision wall across the piste.
   const y=this.terrain.getHeight(s.x+dx*.45,s.z+dz*.45);
   const terrace=this.add(new THREE.BoxGeometry(15,.12,8),'snow',s.x+dx*.45,y+.04,s.z+dz*.45);terrace.receiveShadow=true;terrace.castShadow=false;
  }
 }

 village(){
  for(const [x,z] of [[120,1078],[286,1104],[810,1130]]){
   const y=this.terrain.getHeight(x,z);this.add(new THREE.BoxGeometry(3.7,.16,.65),'wood',x,y+.65,z);for(const side of [-1,1])this.add(new THREE.BoxGeometry(.16,.66,.62),'steel',x+side*1.35,y+.33,z);
   this.add(new THREE.CylinderGeometry(.08,.12,6.2,8),'steel',x+4,y+3.1,z);this.add(new THREE.BoxGeometry(.6,.12,1.1),'snow',x+4,y+6.25,z);
  }
  this.sign('NORTH / SOUTH','GONDOLA JUNCTION',270,1095,0xe6ac64,8);
 }

 collectDistanceItems(before){
  const items=[];this.scene.updateMatrixWorld(true);
  for(const object of this.scene.children){if(before.has(object))continue;let sphere=null;
   if(object.isInstancedMesh){if(!object.boundingSphere)object.computeBoundingSphere();sphere=object.boundingSphere?.clone();}
   else if(object.geometry){if(!object.geometry.boundingSphere)object.geometry.computeBoundingSphere();sphere=object.geometry.boundingSphere?.clone();}
   if(sphere)sphere.applyMatrix4(object.matrixWorld);else if(object.isGroup){const box=new THREE.Box3().setFromObject(object);if(!box.isEmpty())sphere=box.getBoundingSphere(new THREE.Sphere());}
   if(!sphere)continue;const name=String(object.name||'');const factor=(object.isInstancedMesh||/woodland|tree/i.test(name))?1.3:1;items.push({object,center:sphere.center.clone(),radius:sphere.radius,factor});
  }return items;
 }
 setRenderDistance(range=1380){this.distanceCullRange=Math.max(450,Number(range)||1380);this.distanceCullClock=0;}
 updateVisibility(position,dt=0){this.distanceCullClock-=Math.max(0,dt||0);if(this.distanceCullClock>0)return;this.distanceCullClock=.2;const base=this.distanceCullRange;for(const item of this.distanceItems){const limit=base*item.factor+Math.min(item.radius,220);item.object.visible=item.center.distanceToSquared(position)<=limit*limit;}}

 setQuality(level){for(const m of this.trees)m.castShadow=level==='ultra'&&m.material!==this.trees[2]?.material;}
}
