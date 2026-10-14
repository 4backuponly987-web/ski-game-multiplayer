import http from 'node:http';
import crypto from 'node:crypto';

const PORT=Number(process.env.PORT)||8787;
const PROTOCOL=1, MAX_PLAYERS=4, MAX_MESSAGE=16*1024;
const rooms=new Map(), clients=new Set();
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomCode=()=>Array.from({length:6},()=>ALPHABET[Math.floor(Math.random()*ALPHABET.length)]).join('');
const playerId=()=>crypto.randomBytes(8).toString('hex');
const cleanText=(v,n=18)=>String(v||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,n);
const finiteVec=(v)=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(Number(n))&&Math.abs(Number(n))<20000);

function encodeFrame(opcode,payload=Buffer.alloc(0)){
  payload=Buffer.isBuffer(payload)?payload:Buffer.from(String(payload));
  let header;
  if(payload.length<126){header=Buffer.alloc(2);header[1]=payload.length;}
  else if(payload.length<=65535){header=Buffer.alloc(4);header[1]=126;header.writeUInt16BE(payload.length,2);}
  else {header=Buffer.alloc(10);header[1]=127;header.writeBigUInt64BE(BigInt(payload.length),2);}
  header[0]=0x80|(opcode&0x0f); return Buffer.concat([header,payload]);
}
function send(client,obj){if(!client.socket.destroyed)client.socket.write(encodeFrame(1,JSON.stringify(obj)));}
function close(client,code=1000,reason=''){
  if(client.closed)return;client.closed=true;
  const text=Buffer.from(String(reason).slice(0,120));const payload=Buffer.alloc(2+text.length);payload.writeUInt16BE(code,0);text.copy(payload,2);
  try{client.socket.write(encodeFrame(8,payload));}catch{} setTimeout(()=>client.socket.destroy(),30).unref?.();
}
function parseFrames(client,chunk){
  client.buffer=Buffer.concat([client.buffer,chunk]); const out=[];
  while(client.buffer.length>=2){
    const b0=client.buffer[0],b1=client.buffer[1];const fin=!!(b0&0x80),opcode=b0&0x0f,masked=!!(b1&0x80);let len=b1&0x7f,off=2;
    if(!fin){close(client,1003,'fragmentation unsupported');return out;}
    if(len===126){if(client.buffer.length<4)break;len=client.buffer.readUInt16BE(2);off=4;}
    else if(len===127){if(client.buffer.length<10)break;const big=client.buffer.readBigUInt64BE(2);if(big>BigInt(MAX_MESSAGE)){close(client,1009,'too large');return out;}len=Number(big);off=10;}
    if(len>MAX_MESSAGE){close(client,1009,'too large');return out;}
    if(!masked){close(client,1002,'client frames must be masked');return out;}
    if(client.buffer.length<off+4+len)break;const mask=client.buffer.subarray(off,off+4);off+=4;const payload=Buffer.from(client.buffer.subarray(off,off+len));
    for(let i=0;i<payload.length;i++)payload[i]^=mask[i&3];client.buffer=client.buffer.subarray(off+len);out.push({opcode,payload});
  }
  return out;
}
function broadcast(room,obj,except=null){for(const c of room.players.values())if(c!==except)send(c,obj);}
function publicProfile(c){return{id:c.id,name:c.name,loadout:c.loadout,heightCm:c.heightCm,build:c.build};}
function getRoom(requested,create){
  if(create){let code;do{code=roomCode();}while(rooms.has(code));const room={code,players:new Map(),createdAt:Date.now()};rooms.set(code,room);return room;}
  return rooms.get(String(requested||'').toUpperCase())||null;
}
function leave(client){if(!client.room)return;const room=client.room;room.players.delete(client.id);broadcast(room,{type:'peer_left',id:client.id},client);if(!room.players.size)rooms.delete(room.code);client.room=null;}
function handleMessage(client,msg){
  const now=Date.now();if(now-client.msgWindowAt>1000){client.msgWindowAt=now;client.msgCount=0;}if(++client.msgCount>80){close(client,1008,'rate limit');return;}
  if(!client.hello){
    if(msg.type!=='hello'||Number(msg.protocol)!==PROTOCOL){send(client,{type:'error',message:'Multiplayer protocol mismatch.'});close(client,1002);return;}
    const create=msg.intent==='create',room=getRoom(msg.room,create);if(!room){send(client,{type:'error',message:'Room not found. Check the six-character code.'});close(client,1008);return;}
    if(room.players.size>=MAX_PLAYERS){send(client,{type:'error',message:'That room is full (4/4).'});close(client,1008);return;}
    client.hello=true;clearTimeout(client.helloTimer);client.room=room;client.name=cleanText(msg.name)||'Skier';client.loadout=msg.loadout&&typeof msg.loadout==='object'?msg.loadout:{};client.heightCm=Math.max(165,Math.min(195,Number(msg.heightCm)||180));client.build=cleanText(msg.build,24);
    const existing=[...room.players.values()].map(publicProfile);room.players.set(client.id,client);send(client,{type:'room_joined',room:room.code,id:client.id,players:existing,serverTime:Date.now()});broadcast(room,{type:'peer_joined',player:publicProfile(client)},client);return;
  }
  if(msg.type==='leave'){leave(client);close(client);return;}
  if(msg.type==='ping'){send(client,{type:'pong',clientNow:Number(msg.clientNow)||0,serverTime:Date.now()});return;}
  if(msg.type==='profile'&&client.room){client.name=cleanText(msg.name)||client.name;client.loadout=msg.loadout&&typeof msg.loadout==='object'?msg.loadout:client.loadout;client.heightCm=Math.max(165,Math.min(195,Number(msg.heightCm)||client.heightCm));broadcast(client.room,{type:'profile',...publicProfile(client)},client);return;}
  if(msg.type==='state'&&client.room){if(now-client.lastStateAt<35)return;client.lastStateAt=now;const s=msg.state||{};if(!finiteVec(s.p)||!finiteVec(s.f)||!finiteVec(s.n)||!finiteVec(s.v))return;broadcast(client.room,{type:'state',id:client.id,seq:Number(msg.seq)||0,serverTime:now,state:s,input:msg.input||{},transport:Boolean(msg.transport)},client);}
}

const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'});res.end(JSON.stringify({ok:true,service:'Alpine Freeride Multiplayer',protocol:PROTOCOL,rooms:rooms.size,players:[...rooms.values()].reduce((n,r)=>n+r.players.size,0)}));return;}
  res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');
});
server.on('upgrade',(req,socket,head)=>{
  const key=req.headers['sec-websocket-key'];if(!key||String(req.headers.upgrade||'').toLowerCase()!=='websocket'){socket.destroy();return;}
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  const client={socket,id:playerId(),name:'Skier',room:null,hello:false,closed:false,buffer:Buffer.alloc(0),lastStateAt:0,msgWindowAt:Date.now(),msgCount:0,alive:true,loadout:{},heightCm:180,build:'unknown'};clients.add(client);
  client.helloTimer=setTimeout(()=>{if(!client.hello)close(client,1008,'hello timeout');},10000);client.helloTimer.unref?.();
  const onData=(data)=>{for(const frame of parseFrames(client,data)){if(frame.opcode===8){close(client);return;}if(frame.opcode===9){client.socket.write(encodeFrame(10,frame.payload));continue;}if(frame.opcode===10){client.alive=true;continue;}if(frame.opcode!==1)continue;let msg;try{msg=JSON.parse(frame.payload.toString('utf8'));}catch{continue;}handleMessage(client,msg);}};
  socket.on('data',onData);if(head?.length)onData(head);
  const cleanup=()=>{if(client.cleaned)return;client.cleaned=true;clearTimeout(client.helloTimer);leave(client);clients.delete(client);};socket.on('close',cleanup);socket.on('error',cleanup);
});
const heartbeat=setInterval(()=>{for(const c of clients){if(!c.alive){c.socket.destroy();continue;}c.alive=false;try{c.socket.write(encodeFrame(9,Buffer.from('af')));}catch{}}},25000);heartbeat.unref?.();
server.listen(PORT,'0.0.0.0',()=>console.log(`Alpine Freeride multiplayer server listening on ${PORT}`));
process.on('SIGTERM',()=>{clearInterval(heartbeat);for(const c of clients)close(c,1001,'server shutdown');server.close();});
