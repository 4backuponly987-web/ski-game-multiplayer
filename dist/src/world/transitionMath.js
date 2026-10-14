/** Shared analytical snow surfaces. Units metres, no runtime/renderer dependencies. */
export const clamp01=v=>Math.max(0,Math.min(1,v));
export const smooth=(a,b,v)=>{const t=clamp01((v-a)/(b-a));return t*t*(3-2*t);};
export const LIP_ANGLE=Math.PI/2;
export function circularWall(distance,radius) {
  if (distance<=0) return 0;
  const lip=radius*Math.sin(LIP_ANGLE), top=radius*(1-Math.cos(LIP_ANGLE));
  if (distance<=lip) return radius-Math.sqrt(Math.max(0,radius*radius-distance*distance));
  // Rolled outer snow shoulder, not an invisible vertical box.
  return top*(1-smooth(lip,lip+radius*1.6,distance));
}
export function localSurface(feature,x,z) {
  const angle=feature.angle||0, c=Math.cos(angle),s=Math.sin(angle);
  const dx=x-feature.x,dz=z-feature.z;
  return {u:dx*c+dz*s,v:-dx*s+dz*c};
}
export function transitionOffset(f,x,z) {
  const {u,v}=localSurface(f,x,z);
  const radius=f.radius||10, flat=f.flat||6;
  if (f.type==='bowl') {
    const r=Math.hypot(u,v), opening=1-smooth(f.length*0.28,f.length*0.49,Math.abs(v));
    return circularWall(r-flat,radius)*opening;
  }
  const envelope=1-smooth(f.length*0.36,f.length*0.5,Math.abs(v));
  if (!envelope) return 0;
  if (f.type==='spine' || f.type==='hip') {
    const width=f.flat||12;
    const shape=1-smooth(0,width,Math.abs(u));
    return (f.height||8)*shape*envelope;
  }
  if (f.type==='bank') return (f.height||5)*smooth(-flat,flat,u)*envelope*(1-smooth(flat,flat+radius*2,u));
  const cross=f.type==='quarterpipe' || f.type==='wallride' ? u-flat : Math.abs(u)-flat;
  return circularWall(cross,radius)*envelope;
}
export function surfaceContains(f,x,z,padding=0) {
  const {u,v}=localSurface(f,x,z);
  const extent=f.type==='bowl' ? f.flat+f.radius*2.7 : (f.flat||12)+(f.radius||10)*2.7;
  return Math.abs(u)<extent+padding && Math.abs(v)<f.length/2+padding;
}
export function lipCrossed(f,a,b,velocity) {
  if (!['halfpipe','quarterpipe','wallride'].includes(f.type)) return false;
  const p=localSurface(f,a.x,a.z),q=localSurface(f,b.x,b.z);
  if (Math.abs(q.v)>f.length*0.35) return false;
  const lip=f.flat+f.radius*Math.sin(LIP_ANGLE);
  const side=f.type==='halfpipe'?Math.sign(p.u)||1:1;
  const upward=velocity.y>1.2;
  return upward && p.u*side<=lip && q.u*side>lip;
}
export function surfaceNormal(height,x,z,d=0.025) {
  const nx=height(x-d,z)-height(x+d,z),nz=height(x,z-d)-height(x,z+d),ny=2*d;
  const len=Math.hypot(nx,ny,nz);return {x:nx/len,y:ny/len,z:nz/len};
}
