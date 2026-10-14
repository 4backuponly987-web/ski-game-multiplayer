import { RemotePlayer } from './RemotePlayer.js';

const BUILD='0.18.0';
const PROTOCOL=1;
const SEND_INTERVAL=1/12.5;
const validWs=(url)=>/^wss?:\/\//i.test(String(url||''));
const round=(n,p=100)=>Math.round((Number(n)||0)*p)/p;
const vec=(v)=>[round(v?.x,100),round(v?.y,100),round(v?.z,100)];
const safeGet=(k)=>{try{return localStorage.getItem(k)}catch{return null}};
const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
const safeRemove=(k)=>{try{localStorage.removeItem(k)}catch{}};

function cleanServerUrl(url){ return String(url||'').trim().replace(/\/$/,''); }
function configuredUrl(){
  const qp=new URLSearchParams(location.search).get('server'); if(validWs(qp)) return cleanServerUrl(qp);
  const saved=safeGet('alpine-freeride-multiplayer-server'); if(validWs(saved)) return cleanServerUrl(saved);
  const cfg=window.ALPINE_MULTIPLAYER_CONFIG?.serverUrl; if(validWs(cfg)) return cleanServerUrl(cfg);
  if(['127.0.0.1','localhost'].includes(location.hostname)) return 'ws://127.0.0.1:8787';
  return '';
}
function serializeState(s){
  return {
    p:vec(s.position),v:vec(s.velocity),f:vec(s.forward),n:vec(s.normal),speed:round(s.speed,10),grounded:!!s.grounded,surface:s.surface,
    suspension:round(s.suspension,100),surfaceLoad:round(s.surfaceLoad,100),slip:round(s.slip,100),yawVelocity:round(s.yawVelocity,100),pitchVelocity:round(s.pitchVelocity,100),
    switchStance:!!s.switchStance,skisEquipped:s.skisEquipped!==false,activityMode:s.activityMode||null,resting:!!s.resting,
    polePushing:!!s.polePushing,polePushSide:s.polePushSide||null,polePushPhase:round(s.polePushPhase,100),manualType:s.manualType||null,
    crossSkis:!!s.crossSkis,crossSkisTime:round(s.crossSkisTime,100),daffy:!!s.daffy,daffyTime:round(s.daffyTime,100),butterDirection:round(s.butterDirection,100),butterYaw:round(s.butterYaw,100),
    spreadEagle:!!s.spreadEagle,skiJumpPose:!!s.skiJumpPose,airYaw:round(s.airYaw,100),airPitch:round(s.airPitch,100),currentGrab:s.currentGrab||null,currentGrabTweak:s.currentGrabTweak||null,
    grinding:!!s.grinding,grindType:s.grindType||null,grindYaw:round(s.grindYaw,100),grindBalance:round(s.grindBalance,100),grindAge:round(s.grindAge,100),crashed:!!s.crashed,
    landingSerial:Number(s.landingSerial)||0,lastLandingImpact:round(s.lastLandingImpact,10),transitionAscending:!!s.transitionAscending,
  };
}

export class MultiplayerClient {
  constructor(game){
    this.game=game; this.ws=null; this.status='offline'; this.roomCode=''; this.playerId=''; this.playerName=safeGet('alpine-freeride-player-name')||'';
    this.serverUrl=configuredUrl(); this.players=new Map(); this.sendClock=0; this.seq=0; this.pingMs=null; this.lastPingAt=0; this.joinIntent=null; this.explicitLeave=false; this.reconnectTimer=null; this.reconnectAttempts=0;
  }
  get connected(){ return this.status==='connected' && this.ws?.readyState===WebSocket.OPEN; }
  get playerCount(){ return (this.connected?1:0)+this.players.size; }
  getServerUrl(){ return this.serverUrl; }
  setServerUrl(url){ this.serverUrl=cleanServerUrl(url); if(this.serverUrl)safeSet('alpine-freeride-multiplayer-server',this.serverUrl); else safeRemove('alpine-freeride-multiplayer-server'); }
  getRoomFromUrl(){ return String(new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6); }
  getRoster(){ return [...this.players.values()].map(p=>({id:p.id,name:p.name,ready:Boolean(p.ready),distance:p.ready?(this.game.physics?.getState()?.position?.distanceTo?.(p.state.position)||0):null})); }
  inviteUrl(){
    if(!this.roomCode)return '';
    const url=new URL(location.href); url.searchParams.set('room',this.roomCode); if(this.serverUrl)url.searchParams.set('server',this.serverUrl); url.searchParams.delete('qa'); return url.toString();
  }
  async createRoom(name,serverUrl=this.serverUrl){ return this.connect('create','',name,serverUrl); }
  async joinRoom(code,name,serverUrl=this.serverUrl){ return this.connect('join',String(code||'').toUpperCase(),name,serverUrl); }
  connect(intent,room,name,serverUrl){
    this.leave(false); this.explicitLeave=false; this.setServerUrl(serverUrl); this.playerName=String(name||'').trim().slice(0,18)||`Skier${Math.floor(100+Math.random()*900)}`; safeSet('alpine-freeride-player-name',this.playerName);
    if(!validWs(this.serverUrl)){ this.status='error'; this.game.menu?.refreshMultiplayer?.('Enter the WebSocket server URL first.'); return Promise.reject(new Error('Missing multiplayer server URL')); }
    this.status='connecting'; this.joinIntent={intent,room,name:this.playerName}; this.game.menu?.refreshMultiplayer?.();
    return new Promise((resolve,reject)=>{
      let settled=false; let timer;
      try{ this.ws=new WebSocket(this.serverUrl); }catch(err){ this.status='error'; reject(err); return; }
      timer=setTimeout(()=>{ if(!settled){settled=true; reject(new Error('Connection timed out')); this.ws?.close();}},9000);
      this.ws.addEventListener('open',()=>{
        this.send({type:'hello',protocol:PROTOCOL,build:BUILD,intent,room,name:this.playerName,loadout:this.game.getLoadout(),heightCm:this.game.save.getSetting('skierHeightCm',180)});
      });
      this.ws.addEventListener('message',(event)=>{
        let msg; try{msg=JSON.parse(event.data);}catch{return;} this.onMessage(msg);
        if(msg.type==='room_joined'&&!settled){settled=true;clearTimeout(timer);resolve(msg);}
        if(msg.type==='error'&&!settled){settled=true;clearTimeout(timer);reject(new Error(msg.message||'Server error'));}
      });
      this.ws.addEventListener('close',()=>{ clearTimeout(timer); if(!settled){settled=true;reject(new Error('Connection closed'));} this.onClose(); });
      this.ws.addEventListener('error',()=>{ this.status='error'; this.game.menu?.refreshMultiplayer?.('Could not reach the multiplayer server.'); });
    });
  }
  send(obj){ if(this.ws?.readyState===WebSocket.OPEN)this.ws.send(JSON.stringify(obj)); }
  onMessage(msg){
    if(msg.type==='room_joined'){
      this.status='connected';this.roomCode=msg.room;this.playerId=msg.id;this.reconnectAttempts=0;
      for(const p of msg.players||[])if(p.id!==this.playerId)this.addPeer(p);
      this.game.menu?.refreshMultiplayer?.(); this.game.hud?.showMessage?.(`MULTIPLAYER · ROOM ${this.roomCode}`,1.8); return;
    }
    if(msg.type==='peer_joined'){ this.addPeer(msg.player); this.game.hud?.showMessage?.(`${msg.player?.name||'A skier'} JOINED`,1.5); this.game.menu?.refreshMultiplayer?.(); return; }
    if(msg.type==='peer_left'){ this.removePeer(msg.id); this.game.menu?.refreshMultiplayer?.(); return; }
    if(msg.type==='profile'){ const p=this.players.get(msg.id); p?.setProfile(msg); this.game.menu?.refreshMultiplayer?.(); return; }
    if(msg.type==='state'){ const p=this.players.get(msg.id); if(p)p.push(msg); return; }
    if(msg.type==='pong'){ this.pingMs=Math.max(0,Math.round(performance.now()-(Number(msg.clientNow)||performance.now()))); return; }
    if(msg.type==='error'){ this.game.menu?.refreshMultiplayer?.(msg.message||'Multiplayer server error.'); }
  }
  addPeer(profile){ if(!profile?.id||profile.id===this.playerId)return; this.removePeer(profile.id); this.players.set(profile.id,new RemotePlayer(this.game,profile)); }
  removePeer(id){ const p=this.players.get(id); if(p)p.dispose(); this.players.delete(id); }
  updateHud(){
    const root=document.querySelector('#multiplayer-hud'); if(!root)return;
    root.classList.toggle('hidden',!this.connected);
    const room=document.querySelector('#multiplayer-room-hud'); const count=document.querySelector('#multiplayer-count-hud');
    if(room)room.textContent=this.roomCode?`ROOM ${this.roomCode}`:'ONLINE';
    if(count)count.textContent=`${this.playerCount}/4${Number.isFinite(this.pingMs)?` · ${this.pingMs}ms`:''}`;
  }
  update(dt,state){
    this.updateHud();
    for(const p of this.players.values())p.update(dt,state?.position);
    if(!this.connected)return;
    this.sendClock+=dt;
    if(performance.now()-this.lastPingAt>3000){ this.lastPingAt=performance.now(); this.send({type:'ping',clientNow:performance.now()}); }
    if(!this.game.active||this.game.paused||this.game.mapOpen)return;
    if(this.sendClock<SEND_INTERVAL)return; this.sendClock%=SEND_INTERVAL;
    const input={steer:round(this.game.input.steerAxis(),100),brake:Boolean(this.game.input.isBrakeHeld?.())};
    this.send({type:'state',seq:++this.seq,state:serializeState(state),input,transport:Boolean(this.game.lift?.riding||this.game.heli?.riding)});
  }
  sendProfile(){ if(this.connected)this.send({type:'profile',loadout:this.game.getLoadout(),heightCm:this.game.save.getSetting('skierHeightCm',180),name:this.playerName}); }
  teleportTo(id){ const p=this.players.get(id); if(!p?.ready)return false; if(this.game.lift?.riding)this.game.lift.cancelRide(this.game.physics); if(this.game.heli?.riding)this.game.heli.cancel(this.game.physics); const pose=p.getWorldPose(); pose.position.y=this.game.terrain.getHeight(pose.position.x,pose.position.z)+0.7; const ok=this.game.physics.restorePose(pose,Math.min(8,Math.max(2,pose.speed||2))); if(ok){this.game.hud.showMessage(`MET UP WITH ${p.name.toUpperCase()}`,1.6); if(!this.game.active)this.game.start();} return ok; }
  leave(explicit=true){
    if(explicit)this.explicitLeave=true; clearTimeout(this.reconnectTimer); this.reconnectTimer=null;
    if(this.ws?.readyState===WebSocket.OPEN)this.send({type:'leave'}); try{this.ws?.close();}catch{} this.ws=null;
    for(const id of [...this.players.keys()])this.removePeer(id); this.status='offline'; this.playerId=''; this.roomCode=''; this.game.menu?.refreshMultiplayer?.();
  }
  onClose(){
    const shouldReconnect=!this.explicitLeave&&this.roomCode&&this.joinIntent; this.status=shouldReconnect?'reconnecting':'offline';
    if(shouldReconnect&&this.reconnectAttempts<4){ const delay=Math.min(8000,1000*2**this.reconnectAttempts++); const {room,name}=this.joinIntent; this.reconnectTimer=setTimeout(()=>this.connect('join',this.roomCode||room,name,this.serverUrl).catch(()=>{}),delay); }
    this.game.menu?.refreshMultiplayer?.();
  }
  dispose(){ this.leave(true); }
}
