import * as THREE from 'three';
import {TRANSITION_FEATURES} from './TransitionZone.js';
import {localSurface} from './transitionMath.js';
export const PIPE_PATCHES=TRANSITION_FEATURES.filter(f=>['halfpipe','quarterpipe','wallride'].includes(f.type));
export function insidePipePatch(f,x,z){const p=localSurface(f,x,z);return Math.abs(p.u)<f.flat+f.radius*2.7&&Math.abs(p.v)<f.length/2;}
export function pipePatchGeometry(f,height,coarse=false){
 const extent=f.flat+f.radius*2.7+12,along=f.length/2+12,us=[];
 for(let u=-extent;u<=extent;u+=coarse?6:2.8)us.push(u);us.push(extent);
 for(const side of [-1,1]){us.push(side*f.flat);for(let i=1;i<= (coarse?7:28);i++)us.push(side*(f.flat+f.radius*Math.sin(i/(coarse?7:28)*Math.PI/2)));}
 us.sort((a,b)=>a-b);const uu=us.filter((v,i)=>!i||v-us[i-1]>.00001),rows=Math.ceil(along*2/(coarse?10:4));
 const p=[],color=[],ix=[],c=Math.cos(f.angle||0),s=Math.sin(f.angle||0);
 for(let j=0;j<=rows;j++)for(let i=0;i<uu.length;i++){
  const u=uu[i],v=(j/rows*2-1)*along,x=f.x+u*c-v*s,z=f.z+u*s+v*c;
  p.push(x,height(x,z)+.018,z);color.push(.92,.945,.97);
  if(i<uu.length-1&&j<rows){const a=j*uu.length+i,b=a+uu.length;ix.push(a,b,a+1,a+1,b,b+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
