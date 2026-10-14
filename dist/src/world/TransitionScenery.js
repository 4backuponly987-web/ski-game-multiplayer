import * as THREE from 'three';
import { TRANSITION_FEATURES,TRANSITION_AREAS,TRANSITION_ROUTES } from './TransitionZone.js';
import { signSprite } from './ResortNavigation.js';
import { LIP_ANGLE } from './transitionMath.js';

export class TransitionScenery {
 constructor(scene,terrain){
  this.colliders=[];
  const paint=new THREE.LineBasicMaterial({color:0x4fb7c4,transparent:true,opacity:0.72});
  const copingMat=new THREE.MeshStandardMaterial({color:0x245a68,metalness:0.28,roughness:0.45,emissive:0x0a2b35,emissiveIntensity:0.16});
  const steel=new THREE.MeshStandardMaterial({color:0x334954,metalness:0.5,roughness:0.5});
  for(const f of TRANSITION_FEATURES){
    if(f.major && ['halfpipe','quarterpipe'].includes(f.type)){
      for(const side of f.type==='halfpipe'?[-1,1]:[1]){
        const points=[];const u=side*(f.flat+f.radius*Math.sin(LIP_ANGLE));
        for(let i=0;i<=90;i++){
          const v=(i/90-0.5)*f.length*0.68,c=Math.cos(f.angle||0),s=Math.sin(f.angle||0);
          const x=f.x+u*c-v*s,z=f.z+u*s+v*c;
          points.push(new THREE.Vector3(x,terrain.getHeight(x,z)+0.06,z));
        }
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),paint);line.name=f.name+' lip dye';scene.add(line);
        // A real low-profile coping tube makes the pipe/quarter wall silhouette
        // readable from the normal chase camera instead of disappearing into snow.
        if(points.length>2){
          const curve=new THREE.CatmullRomCurve3(points);
          const coping=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length-1),0.11,7,false),copingMat);
          coping.castShadow=true; coping.receiveShadow=true; coping.name=f.name+' coping'; scene.add(coping);
        }
      }
    }
    if(f.major){
      const sx=f.x-(f.flat+f.radius*2.7+6),sz=f.z+f.length*0.34;
      const sign=signSprite(f.name,[[f.type.toUpperCase(),'NORTH ↓'],['Space · pop','F · spread in air']]);
      sign.position.set(sx,terrain.getHeight(sx,sz)+4.0,sz);sign.scale.multiplyScalar(0.44);scene.add(sign);
    }
  }
  for(const a of TRANSITION_AREAS){
    const sign=signSprite(a.name,[['Main line','NORTH ↓'],['Escape lane','WEST / EAST']]);
    sign.position.set(a.x-60,terrain.getHeight(a.x-60,a.z+180)+6,a.z+180);scene.add(sign);
  }
  const markerGeo=new THREE.CylinderGeometry(0.06,0.075,2.4,6);
  const markerMat=new THREE.MeshStandardMaterial({color:0x35bbae,roughness:0.65});
  const markerPoints=[];
  for(const route of TRANSITION_ROUTES)for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],len=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/len,nz=(b.x-a.x)/len;
    for(let d=0;d<len;d+=55)for(const side of [-1,1]){
      const x=a.x+(b.x-a.x)*d/len+nx*route.width*side,z=a.z+(b.z-a.z)*d/len+nz*route.width*side;
      markerPoints.push([x,terrain.getHeight(x,z)+1.2,z]);
    }
  }
  const markers=new THREE.InstancedMesh(markerGeo,markerMat,markerPoints.length),dummy=new THREE.Object3D();
  markerPoints.forEach((p,i)=>{dummy.position.set(...p);dummy.updateMatrix();markers.setMatrixAt(i,dummy.matrix);});scene.add(markers);
  // The old maintenance bridge cut across the riding line and visually cluttered
  // the transition face. v0.17.13 replaces it with two low-profile gateway
  // pylons at the lower-zone entrance, leaving the snow line completely open.
  const gateZ=-2790,gateY=terrain.getHeight(430,gateZ);
  for(const side of [-1,1]){
    const gx=430+side*115,gy=terrain.getHeight(gx,gateZ);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,3.2,8),steel);
    post.position.set(gx,gy+1.6,gateZ);post.castShadow=true;scene.add(post);
    this.colliders.push({x:gx,y:gy,z:gateZ,radius:.38,height:3.2,kind:'station'});
  }

 }
}
