import * as THREE from 'three';
/** Spatialize large static instance pools once, retaining the same transforms,
 * materials and collision population. No collidable near tree is removed. */
export function partitionInstances(scene,roots,cell=600){
 const source=[];for(const root of roots)root.traverse(o=>{if(o.isInstancedMesh&&o.count>150)source.push(o);});
 const matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 for(const mesh of source){
  mesh.updateWorldMatrix(true,false);const cells=new Map();
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);point.setFromMatrixPosition(matrix);const key=[Math.floor(point.x/cell),Math.floor(point.z/cell)].join(':');if(!cells.has(key))cells.set(key,[]);cells.get(key).push({matrix:matrix.clone(),index:i});}
  if(cells.size<2)continue;
  for(const entries of cells.values()){const part=new THREE.InstancedMesh(mesh.geometry,mesh.material,entries.length);part.name=mesh.name||'Spatial forest';part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;
   entries.forEach((e,i)=>{part.setMatrixAt(i,e.matrix);if(mesh.instanceColor){const c=new THREE.Color();mesh.getColorAt(e.index,c);part.setColorAt(i,c);}});part.computeBoundingSphere();part.computeBoundingBox();scene.add(part);
  }mesh.removeFromParent();
 }
}
export class SceneDetail{
 constructor(scene,excluded=[]){
  const skip=new Set(excluded),matrix=new THREE.Matrix4();this.items=[];this.quality='high';scene.updateMatrixWorld(true);
  const walk=o=>{if(skip.has(o)||o.isLOD)return;if(o.isMesh||o.isLine||o.isSprite){
    if(o.name.includes('snow chunk')||o.name.includes('foothills'))return;
    if(o.isInstancedMesh){if(!o.boundingSphere)o.computeBoundingSphere();}else if(o.geometry&&!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();
    const sphere=(o.boundingSphere||o.geometry?.boundingSphere||new THREE.Sphere(new THREE.Vector3(),10)).clone().applyMatrix4(o.matrixWorld);
    this.items.push({object:o,center:sphere.center,radius:sphere.radius});
   }for(const child of o.children)walk(child);};walk(scene);
 }
 setQuality(q){this.quality=q;}
 update(position){const limit={low:540,medium:820,high:1150,ultra:1650}[this.quality]||820;for(const item of this.items)item.object.visible=item.center.distanceToSquared(position)<(limit+item.radius)**2;}
}
