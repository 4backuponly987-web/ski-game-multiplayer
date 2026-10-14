import * as THREE from 'three';
/** One geometry per species: radial branch whorls, broken silhouette and snow ledges. */
export function firGeometry(radius=2,height=7,species=0,snow=false) {
 const vertices=[],indices=[];
 const tiers=7,segments=12;
 for(let tier=0;tier<tiers;tier++){
  const p=tier/(tiers-1), y=-height*0.5+p*height*0.83;
  const width=radius*(1-p*0.84)*(1+0.1*Math.sin(tier*2.7+species));
  const start=vertices.length/3;
  vertices.push(0,y+height*0.25*(1-p*0.3),0);
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2+species*0.45+tier*0.48;
   const r=width*(i%2?0.56:1)*(1+0.08*Math.sin(i*3.2+tier));
   vertices.push(Math.cos(a)*r,y+(i%2?height*0.03:-height*0.025)+(snow?0.055:0),Math.sin(a)*r);
  }
  for(let i=1;i<=segments;i++)indices.push(start,start+i+1,start+i);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData.foliage=true;return geometry;
}
export function alpineRockGeometry(radius=1.7) {
 const g=new THREE.IcosahedronGeometry(radius,1),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const f=1+0.18*Math.sin(x*2.1+z*1.3)+0.11*Math.cos(y*3.7-x);
  p.setXYZ(i,x*f+0.13*y,y*(0.86+0.08*Math.sin(x*5)),z*f);
 }
 g.computeVertexNormals();return g;
}
