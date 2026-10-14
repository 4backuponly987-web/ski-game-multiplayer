import * as THREE from 'three';
/** Elliptical garment rings, with deliberate cut, not scaled capsule primitives. */
export function garment(rings,segments=16,foldAmount=.018,foldFrequency=5) {
 const p=[],uv=[],ix=[];
 rings.forEach(([y,w,d,z=0],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const fold=1+foldAmount*Math.sin(a*foldFrequency+j*1.7)+foldAmount*.35*Math.sin(a*(foldFrequency+2)-j*.9);p.push(Math.cos(a)*w*fold,y,Math.sin(a)*d*fold+z);uv.push(i/segments,j/(rings.length-1));}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;ix.push(a,b,a+1,a+1,b,b+1);}
 for(const [j,reverse] of [[0,true],[rings.length-1,false]]){const center=p.length/3;const r=rings[j];p.push(0,r[0],r[3]||0);uv.push(.5,.5);for(let i=0;i<segments;i++){const a=j*(segments+1)+i;ix.push(center,reverse?a+1:a,reverse?a:a+1);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function skiGeometry(widthScale=1,thickness=.025){
 const p=[],uv=[],ix=[],n=44;
 for(let i=0;i<=n;i++){
  const t=i/n,z=-.94+t*1.98;
  const taper=Math.sqrt(Math.max(.025,Math.min(1,t/.055,(1-t)/.07)));
  const w=(.058+.024*Math.pow(Math.abs(t-.47)*2,1.7))*widthScale*taper;
  const y=.007*Math.sin(Math.PI*t)+Math.pow(Math.max(0,z-.69),2)*1.65+Math.pow(Math.max(0,-z-.69),2)*1.15;
  p.push(-w,y+thickness/2,z,w,y+thickness/2,z,-w,y-thickness/2,z,w,y-thickness/2,z);uv.push(0,t,1,t,0,t,1,t);
  if(i<n){const a=i*4,b=a+4;ix.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
 }
 ix.push(0,1,2,1,3,2);const e=n*4;ix.push(e,e+2,e+1,e+1,e+2,e+3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function skiPrint(variant='alpine'){
 const c=document.createElement('canvas');c.width=128;c.height=1024;const x=c.getContext('2d');
 x.fillStyle='#fafafa';x.fillRect(0,0,128,1024);
 if(variant==='stripes'){
  for(let y=-180;y<1200;y+=130){x.fillStyle=(Math.floor(y/130)%2)?'#172833':'#d8e7ec';x.save();x.translate(64,y);x.rotate(-.28);x.fillRect(-150,-32,300,64);x.restore();}
 }else if(variant==='checker'){
  const s=48;for(let y=0;y<1024;y+=s)for(let i=0;i<3;i++){const xx=i*s-8;if(((y/s)+i)%2===0){x.fillStyle='#263b46';x.fillRect(xx,y,s,s);}}
 }else if(variant==='retro'){
  x.fillStyle='#193746';x.fillRect(0,0,128,1024);x.fillStyle='#f2b84b';x.fillRect(0,250,128,85);x.fillStyle='#e46047';x.fillRect(0,350,128,85);x.fillStyle='#f5f2df';x.fillRect(0,450,128,110);
 }else if(variant==='stickers'){
  x.fillStyle='#152832';x.fillRect(0,0,128,1024);for(let i=0;i<20;i++){x.fillStyle=['#f4c84d','#e75c5c','#62c8df','#f1f1e8'][i%4];x.beginPath();x.arc(18+(i*37)%95,70+(i*83)%880,8+(i%3)*3,0,Math.PI*2);x.fill();}
 }else if(variant==='reference'){
  x.fillStyle='#111519';x.fillRect(0,0,128,1024);
  x.fillStyle='#d8d4c8';x.beginPath();x.moveTo(0,40);x.lineTo(128,15);x.lineTo(128,175);x.lineTo(0,220);x.closePath();x.fill();
  x.fillStyle='#ece8dc';x.beginPath();x.moveTo(0,778);x.lineTo(128,720);x.lineTo(128,1008);x.lineTo(0,1024);x.closePath();x.fill();
  x.fillStyle='#252b2f';x.fillRect(0,300,128,34);x.fillRect(0,665,128,26);
  x.strokeStyle='#f0ede4';x.lineWidth=5;x.lineCap='round';
  for(const cy of [132,855]){x.beginPath();x.moveTo(25,cy+22);x.lineTo(56,cy-12);x.lineTo(74,cy+7);x.lineTo(91,cy-7);x.lineTo(111,cy+19);x.stroke();}
  x.fillStyle='rgba(255,255,255,.24)';x.fillRect(8,455,112,2);
 }else{
  x.fillStyle='#172833';x.fillRect(0,0,128,300);x.fillRect(0,680,128,344);for(let i=0;i<4;i++){x.fillStyle=i%2?'#e9ebe3':'#273c48';x.beginPath();x.moveTo(0,410+i*42);x.lineTo(128,340+i*42);x.lineTo(128,361+i*42);x.lineTo(0,431+i*42);x.fill();}
 }
 if(variant!=='reference'){x.save();x.translate(81,890);x.rotate(-Math.PI/2);x.fillStyle='#edf7ef';x.font='bold 30px sans-serif';x.fillText('ALPINE',0,0);x.restore();}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}

export function roundedBox(w,h,d,r=.035){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.002,d-2*r),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.35,bevelThickness:r,curveSegments:3});g.translate(0,0,-d/2+r);g.computeVertexNormals();return g;
}
/** A fixed-length two-bone solve. The endpoint is clamped to a human reach. */
export function jointBetween(a,b,l1,l2,pole,target){
 const dir=new THREE.Vector3().subVectors(b,a),distance=THREE.MathUtils.clamp(dir.length(),.015,l1+l2-.001);dir.normalize();b.copy(a).addScaledVector(dir,distance);
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const bend=pole.clone().addScaledVector(dir,-pole.dot(dir));if(bend.lengthSq()<.001)bend.set(0,0,1);bend.normalize();return target.copy(a).addScaledVector(dir,along).addScaledVector(bend,height);
}
