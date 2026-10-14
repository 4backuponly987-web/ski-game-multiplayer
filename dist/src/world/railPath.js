import * as THREE from 'three';
/** Arc-length polyline used unchanged by render, collision, catch and grinding. */
export class RailPath {
 constructor(points){
  this.points=points;this.distances=[0];this.length=0;
  for(let i=1;i<points.length;i++){this.length+=points[i].distanceTo(points[i-1]);this.distances.push(this.length);}
  this.bounds=new THREE.Box3().setFromPoints(points).expandByScalar(3);
 }
 segment(t){
  const d=Math.max(0,Math.min(1,t))*this.length;
  let low=1,high=this.points.length-1;
  while(low<high){const mid=(low+high)>>1;if(this.distances[mid]<d)low=mid+1;else high=mid;}
  return {i:low,t:(d-this.distances[low-1])/Math.max(1e-6,this.distances[low]-this.distances[low-1])};
 }
 point(t,target=new THREE.Vector3()){const s=this.segment(t);return target.copy(this.points[s.i-1]).lerp(this.points[s.i],s.t);}
 tangent(t,target=new THREE.Vector3()){const s=this.segment(t);return target.copy(this.points[s.i]).sub(this.points[s.i-1]).normalize();}
 closest(p){
  let best=null,distance=Infinity;
  for(let i=1;i<this.points.length;i++){
   const a=this.points[i-1],b=this.points[i],dx=b.x-a.x,dz=b.z-a.z;
   const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/Math.max(1e-8,dx*dx+dz*dz)));
   const point=a.clone().lerp(b,u),d=Math.hypot(p.x-point.x,p.z-point.z);
   if(d<distance){distance=d;best={point,distance:d,t:(this.distances[i-1]+u*(this.distances[i]-this.distances[i-1]))/this.length,tangent:b.clone().sub(a).normalize()};}
  }
  return best;
 }
}
export function railShape(shape,t,length){
 const wave=Math.sin(t*Math.PI);
 switch(shape){
  case 'long-s':return {x:Math.sin(t*Math.PI*2)*length*.14,y:Math.sin(t*Math.PI)*.65};
  case 'bank-c':return {x:Math.sin(t*Math.PI)*length*.32,y:Math.sin(t*Math.PI)*1.1};
  case 'wall-c':return {x:Math.sin(t*Math.PI)*length*.26,y:Math.sin(t*Math.PI)*2.1};
  case 'split-left':return {x:-10*t*t,y:Math.sin(t*Math.PI)*.4};
  case 'split-right':return {x:10*t*t,y:Math.sin(t*Math.PI)*.4};
  case 'stair':return {x:t<.4?0:Math.sin((t-.4)/.6*Math.PI)*3,y:t<.3?.9:t<.7?.9-(t-.3)*1.8:.18};
  case 'log':return {x:Math.sin(t*Math.PI)*.7,y:Math.sin(t*Math.PI)*.25};
  case 'rainbow':return {x:0,y:wave*2.8};
  case 'c':return {x:wave*length*0.28,y:0};
  case 's':return {x:Math.sin(t*Math.PI*2)*length*0.16,y:0};
  case 'curved':return {x:t*t*length*0.22,y:wave*0.6};
  case 'flat-down':return {x:0,y:t<0.5?0:-(t-0.5)*2};
  case 'down-flat-down':return {x:0,y:t<0.3?-t*2:t<0.7?-0.6:-0.6-(t-0.7)*2};
  case 'kink':return {x:t<0.5?t*3:1.5-(t-0.5)*3,y:wave};
  case 'up':return {x:0,y:t*2.5};
  case 'pole-jam':return {x:0,y:t*3.4};
  default:return {x:0,y:0};
 }
}
export const railPoint=(rail,t,target=new THREE.Vector3())=>rail.path?rail.path.point(t,target):target.copy(rail.start).lerp(rail.end,t);
export const railTangent=(rail,t,target=new THREE.Vector3())=>rail.path?rail.path.tangent(t,target):target.copy(rail.direction);
export function railClosest(rail,p){
 if(rail.path)return rail.path.closest(p);
 const ab=rail.end.clone().sub(rail.start),t=Math.max(0,Math.min(1,p.clone().sub(rail.start).dot(ab)/ab.lengthSq()));
 const point=railPoint(rail,t);return {point,t,tangent:rail.direction,distance:Math.hypot(p.x-point.x,p.z-point.z)};
}
