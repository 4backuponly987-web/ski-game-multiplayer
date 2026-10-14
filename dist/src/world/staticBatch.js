import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const materialCache=new Map();
/** Merge only static scenery, by material and spatial cell. Dynamic actors stay separate. */
export function batchStatic(scene,roots,cellSize=320){
 const batches=new Map();scene.updateMatrixWorld(true);
 for(const root of roots)root.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.visible)return;
  if(o.material.isMeshStandardMaterial&&!o.material.onBeforeCompile.toString().includes('shader.')){
   const m=o.material,key=[m.type,m.color.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.transparent,m.opacity,m.side,m.vertexColors,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.roughnessMap?.uuid,m.transmission,m.clearcoat].join('|');
   if(materialCache.has(key))o.material=materialCache.get(key);else materialCache.set(key,m);
  }
  const center=new THREE.Vector3();o.getWorldPosition(center);
  const signature=Object.keys(o.geometry.attributes).sort().join(',');
  const key=`${o.material.uuid}|${Math.floor(center.x/cellSize)}|${Math.floor(center.z/cellSize)}|${signature}|${o.castShadow}|${o.receiveShadow}`;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
 });
 for(const meshes of batches.values()){
  if(meshes.length<2)continue;
  const geometries=meshes.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g;});
  const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
  if(!geometry)continue;
  geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,meshes[0].material);
  mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;mesh.name='Batched static scenery';
  meshes.forEach(o=>o.removeFromParent());scene.add(mesh);
 }
}
