import {localSurface,LIP_ANGLE} from '../world/transitionMath.js';
// Circular walls integrate in arc distance: horizontal Euler steps skip steep lips.
export function pipeSection(f,x,z) {
 if(!f||!['halfpipe','quarterpipe','wallride'].includes(f.type))return null;
 const {u,v}=localSurface(f,x,z),limit=f.flat+f.radius*Math.sin(LIP_ANGLE);
 if(Math.abs(v)>f.length*0.345||Math.abs(u)>limit+0.003)return null;
 if(f.type!=='halfpipe'&&u<0)return null;
 const side=Math.sign(u)||1,theta=Math.asin(Math.min(1,Math.max(0,(Math.abs(u)-f.flat)/f.radius)));
 const arc=side*(Math.min(Math.abs(u),f.flat)+theta*f.radius);
 return {u,v,side,theta,arc,limit,c:Math.cos(f.angle||0),s:Math.sin(f.angle||0)};
}
export function pipeNormal(terrain,f,section,target) {
 const {v,side,theta,c,s}=section,d=0.2,x=f.x-v*s,z=f.z+v*c;
 const along=(terrain.getHeight(x-d*s,z+d*c)-terrain.getHeight(x+d*s,z-d*c))/(2*d);
 const across=(terrain.getHeight(x+d*c,z+d*s)-terrain.getHeight(x-d*c,z-d*s))/(2*d);
 const ct=Math.max(0.001,Math.cos(theta)),st=Math.sin(theta)*side;
 return target.set(-(st+across*ct)*c+along*ct*s,ct,-(st+across*ct)*s-along*ct*c).normalize();
}
export function advancePipe(physics,dt,f,section) {
 const {v,side,theta,c,s,arc}=section,r=f.radius;
 const vx=physics.velocity.x*c+physics.velocity.z*s,vz=-physics.velocity.x*s+physics.velocity.z*c;
 const cx=f.x-v*s,cz=f.z+v*c,d=0.2;
 const grade=(physics.terrain.getHeight(cx-d*s,cz+d*c)-physics.terrain.getHeight(cx+d*s,cz-d*c))/(2*d);
 const cross=vx*Math.cos(theta)+(physics.velocity.y-vz*grade)*Math.sin(theta)*side;
 const nextArc=arc+cross*dt,maximum=f.flat+r*LIP_ANGLE,exited=Math.abs(nextArc)>maximum;
 const a=Math.min(maximum,Math.abs(nextArc)),sign=Math.sign(nextArc)||1;
 const nextU=sign*(a<=f.flat?a:f.flat+r*Math.sin((a-f.flat)/r)),nextV=v+vz*dt;
 physics.position.x=f.x+nextU*c-nextV*s;physics.position.z=f.z+nextU*s+nextV*c;
 physics.position.y=physics.terrain.getHeight(physics.position.x,physics.position.z)+0.12;
 if(exited){
  // Continue the *tangent* of the pipe at the coping. At a vertical lip the
  // across-pipe tangent is vertical, so there must be no synthetic shove toward
  // the centre. The old inward bias was what pulled clean airs across the pipe
  // and caused unavoidable bails even with no input.
  const relativeRise=Math.max(0,sign*cross);
  const launchRise=Math.min(8.2,relativeRise*0.66);
  const lipAcross=sign*launchRise*Math.cos(LIP_ANGLE); // ~= 0 at a 90° coping
  const worldY=launchRise*Math.sin(LIP_ANGLE)+vz*grade;
  const lipUp=physics.normal.clone();
  physics.velocity.set(lipAcross*c-vz*s,worldY,lipAcross*s+vz*c);
  physics.leaveTerrainLip();
  physics.detachTimer=0.055;
  physics.pipeAir={feature:f,side:sign,up:lipUp,age:0,spinArmed:false,lipU:sign*section.limit};
 }
 return true;
}
