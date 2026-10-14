import * as THREE from 'three';
import { Skier } from '../player/Skier.js';

const V = (a=[0,0,0]) => new THREE.Vector3(Number(a[0])||0, Number(a[1])||0, Number(a[2])||0);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

class RemoteInput {
  constructor(){ this.steer=0; this.brake=false; }
  steerAxis(){ return this.steer; }
  isBrakeHeld(){ return this.brake; }
  isDown(){ return false; }
  set(packet){ this.steer=clamp(Number(packet?.steer)||0,-1,1); this.brake=Boolean(packet?.brake); }
}

function makeNameSprite(name){
  const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=192;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(3,14,24,.82)'; ctx.beginPath(); ctx.roundRect(22,22,724,148,40); ctx.fill();
  ctx.strokeStyle='rgba(112,229,255,.95)'; ctx.lineWidth=7; ctx.stroke();
  ctx.fillStyle='#f4fcff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='800 68px system-ui,Arial';
  ctx.fillText(String(name||'SKIER').slice(0,18).toUpperCase(),384,96);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));
  sprite.scale.set(7.2,1.8,1); sprite.position.set(0,2.45,0); sprite.renderOrder=50;
  return {sprite,texture};
}

function baseState(){
  return {
    position:new THREE.Vector3(), velocity:new THREE.Vector3(), forward:new THREE.Vector3(0,0,1), normal:new THREE.Vector3(0,1,0),
    grounded:true, transition:null, transitionAscending:false, suspension:0, surfaceLoad:1, slip:0,
    grindYaw:0, grindBalance:0, grindAge:0, yawVelocity:0, pitchVelocity:0, landingSerial:0,
    surface:'GROOMED', speed:0, switchStance:false, skisEquipped:true, activityMode:null, resting:false,
    polePushing:false,polePushSide:null,polePushPhase:0,manualType:null,crossSkis:false,crossSkisTime:0,
    daffy:false,daffyTime:0,butterDirection:0,butterYaw:0,spreadEagle:false,skiJumpPose:false,
    airYaw:0,airPitch:0,currentGrab:null,currentGrabTweak:{x:0,y:0,magnitude:0},
    justLanded:false,lastLandingImpact:0,grinding:false,grindType:null,crashed:false,justCrashed:false,
  };
}

function packetToState(p, target=baseState()){
  target.position.copy(V(p.p)); target.velocity.copy(V(p.v)); target.forward.copy(V(p.f)); target.normal.copy(V(p.n||[0,1,0]));
  if(target.forward.lengthSq()<.001) target.forward.set(0,0,1); else target.forward.normalize();
  if(target.normal.lengthSq()<.001) target.normal.set(0,1,0); else target.normal.normalize();
  const scalars=['suspension','surfaceLoad','slip','grindYaw','grindBalance','grindAge','yawVelocity','pitchVelocity','speed','polePushPhase','crossSkisTime','daffyTime','butterDirection','butterYaw','airYaw','airPitch','lastLandingImpact'];
  for(const k of scalars) target[k]=Number(p[k])||0;
  const bools=['grounded','transitionAscending','switchStance','skisEquipped','resting','polePushing','crossSkis','daffy','spreadEagle','skiJumpPose','grinding','crashed'];
  for(const k of bools) target[k]=Boolean(p[k]);
  target.surface=p.surface||'GROOMED'; target.activityMode=p.activityMode||null; target.polePushSide=p.polePushSide||null; target.manualType=p.manualType||null;
  target.currentGrab=p.currentGrab||null; target.grindType=p.grindType||null; target.currentGrabTweak=p.currentGrabTweak||{x:0,y:0,magnitude:0};
  target.landingSerial=Number(p.landingSerial)||0;
  return target;
}

export class RemotePlayer {
  constructor(game, profile){
    this.game=game; this.id=profile.id; this.name=profile.name||'Skier'; this.input=new RemoteInput();
    this.skier=new Skier(game.scene); this.skier.setQuality('low'); this.skier.applyLoadout(profile.loadout||{}); this.skier.setHeightCm(profile.heightCm||180);
    const label=makeNameSprite(this.name); this.label=label.sprite; this.labelTexture=label.texture; this.skier.root.add(this.label); this.skier.root.visible=false;
    this.buffer=[]; this.state=baseState(); this.ready=false; this.lastPacketAt=performance.now(); this.lastServerTime=0; this.visible=false; this.transport=false;
  }
  setProfile(profile={}){
    if(profile.name) this.name=profile.name;
    if(profile.loadout) this.skier.applyLoadout(profile.loadout);
    if(profile.heightCm) this.skier.setHeightCm(profile.heightCm);
  }
  push(packet){
    this.ready=true;
    const now=performance.now(); this.lastPacketAt=now; this.lastServerTime=Number(packet.serverTime)||Date.now();
    this.buffer.push({at:now, packet}); if(this.buffer.length>8)this.buffer.shift();
  }
  getWorldPose(){ return {position:this.state.position.clone(),forward:this.state.forward.clone(),speed:this.state.speed}; }
  update(dt, localPosition){
    if(!this.buffer.length){ this.skier.root.visible=false; return; }
    const targetTime=performance.now()-105;
    while(this.buffer.length>=3 && this.buffer[1].at<=targetTime)this.buffer.shift();
    const a=this.buffer[0], b=this.buffer[1]||a; const span=Math.max(1,b.at-a.at); const t=clamp((targetTime-a.at)/span,0,1);
    const sa=packetToState(a.packet.state,baseState()), sb=packetToState(b.packet.state,baseState());
    this.state=packetToState(t<.5?a.packet.state:b.packet.state,this.state);
    this.state.position.lerpVectors(sa.position,sb.position,t); this.state.velocity.lerpVectors(sa.velocity,sb.velocity,t);
    this.state.forward.lerpVectors(sa.forward,sb.forward,t).normalize(); this.state.normal.lerpVectors(sa.normal,sb.normal,t).normalize();
    for(const k of ['speed','airYaw','airPitch','butterYaw','grindYaw','grindBalance','polePushPhase','suspension']) this.state[k]=THREE.MathUtils.lerp(sa[k]||0,sb[k]||0,t);
    this.input.set(t<.5?a.packet.input:b.packet.input); this.transport=Boolean((t<.5?a.packet:b.packet).transport);
    const stale=performance.now()-this.lastPacketAt>5000; const d2=localPosition?this.state.position.distanceToSquared(localPosition):0;
    this.visible=!stale && d2<3600*3600; this.skier.root.visible=this.visible;
    if(this.visible)this.skier.update(this.state,this.input,dt,this.transport);
  }
  dispose(){
    this.labelTexture?.dispose?.();
    this.skier.root.traverse(o=>{ if(o.geometry?.dispose)o.geometry.dispose(); const m=o.material; if(Array.isArray(m))m.forEach(x=>x.dispose?.()); else m?.dispose?.(); });
    this.game.scene.remove(this.skier.root);
  }
}
