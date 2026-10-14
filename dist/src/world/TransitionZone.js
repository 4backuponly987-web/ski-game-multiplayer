import { transitionOffset,surfaceContains,smooth,lipCrossed } from './transitionMath.js';

// Back of the summit ridge: descent is toward negative Z, opposite the original pistes.
export const TRANSITION_ZONE=Object.freeze({id:'transition',name:'Transition Mountain',color:0x33c8ba,
  minX:-180,maxX:980,minZ:-3540,maxZ:-1460,spawn:{x:450,z:-1580},base:{x:900,z:-3440}});
export const SOUTH_TRANSITION_ZONE=Object.freeze({id:'south-transition',name:'South Transition',color:0x33c8ba,
  minX:1160,maxX:1605,minZ:1400,maxZ:3205,spawn:{x:1390,z:3120},base:{x:1390,z:1425}});

// v0.17.22 resort-wide transition hits. These are one-sided quarterpipes placed
// beside ordinary pistes on both mountain faces, so transition riding is no
// longer limited to the two dedicated parks. They use the exact same circular
// snow-wall physics as the main Transition areas.
export const RESORT_QUARTERPIPES=Object.freeze([
 {id:'resort-qp-flow',name:'Flow Side Quarter',type:'quarterpipe',x:-94.9,z:-650,flat:4.2,radius:5.9,length:96,angle:0,major:true,resort:true},
 {id:'resort-qp-glacier',name:'Glacier Side Quarter',type:'quarterpipe',x:-415.4,z:-250,flat:4.0,radius:5.7,length:92,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-pine',name:'Pine Side Quarter',type:'quarterpipe',x:478.0,z:200,flat:4.0,radius:5.6,length:92,angle:0,major:true,resort:true},
 {id:'resort-qp-velocity',name:'Velocity Side Quarter',type:'quarterpipe',x:-598.9,z:450,flat:3.8,radius:6.1,length:98,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-park',name:'Park Side Quarter',type:'quarterpipe',x:849.5,z:50,flat:4.4,radius:6.2,length:102,angle:0,major:true,resort:true},
 {id:'resort-qp-woodland',name:'Woodland Side Quarter',type:'quarterpipe',x:615.6,z:650,flat:3.8,radius:5.4,length:88,angle:0,major:true,resort:true},
 {id:'resort-qp-avalanche',name:'Avalanche Side Quarter',type:'quarterpipe',x:-714.2,z:150,flat:3.8,radius:6.3,length:100,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-sunset',name:'Sunset Side Quarter',type:'quarterpipe',x:1007.5,z:520,flat:4.2,radius:5.8,length:96,angle:0,major:true,resort:true},
 {id:'resort-qp-aurora-high',name:'Aurora High Quarter',type:'quarterpipe',x:-996.6,z:2850,flat:4.1,radius:6.0,length:98,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-talon',name:'Talon Side Quarter',type:'quarterpipe',x:-461.8,z:2500,flat:3.9,radius:5.8,length:94,angle:0,major:true,resort:true},
 {id:'resort-qp-meridian-high',name:'Meridian High Quarter',type:'quarterpipe',x:-249.9,z:2700,flat:4.2,radius:6.0,length:100,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-cedar',name:'Cedar Side Quarter',type:'quarterpipe',x:354.2,z:2200,flat:3.8,radius:5.6,length:92,angle:0,major:true,resort:true},
 {id:'resort-qp-south-park',name:'South Park Side Quarter',type:'quarterpipe',x:707.4,z:2300,flat:4.4,radius:6.2,length:104,angle:0,major:true,resort:true},
 {id:'resort-qp-raven',name:'Raven Side Quarter',type:'quarterpipe',x:814.1,z:1950,flat:3.8,radius:6.2,length:98,angle:Math.PI,major:true,resort:true},
 {id:'resort-qp-meridian-low',name:'Meridian Low Quarter',type:'quarterpipe',x:-147.0,z:1650,flat:4.1,radius:5.7,length:94,angle:0,major:true,resort:true},
 {id:'resort-qp-aurora-low',name:'Aurora Low Quarter',type:'quarterpipe',x:-881.5,z:1800,flat:4.1,radius:5.7,length:94,angle:0,major:true,resort:true},
]);

export const TRANSITION_AREAS=Object.freeze([
 {name:'Drop-In Deck',x:450,z:-1760,color:'#6dd8d0'},
 {name:'Upper Stadium',x:450,z:-2080,color:'#b8d7ff'},
 {name:'Transfer Plaza',x:450,z:-2480,color:'#d1abff'},
 {name:'Lower Arena',x:450,z:-2890,color:'#ffb979'},
 {name:'South Transition Summit',x:1390,z:3020,color:'#65ddd4'},
 {name:'South Pipe Deck',x:1390,z:2560,color:'#b8d7ff'},
 {name:'South Transfer Yard',x:1390,z:2100,color:'#d1abff'},
 {name:'South Finish Walls',x:1390,z:1640,color:'#ffb979'},
]);

// v0.17.17: compact stadium rebuild. The riding area is deliberately packed
// into three close lanes so every few seconds there is another quarter wall,
// pipe, spine, rail or gap. The structural snow is kept to fifteen large forms;
// density comes from the interleaved jumps and rails rather than terrain clutter.
export const TRANSITION_FEATURES=Object.freeze([
 // DROP-IN DECK
 {id:'drop-quarter-west',name:'West Mega Quarter',type:'quarterpipe',x:300,z:-1760,flat:4.6,radius:8.8,length:155,angle:Math.PI,major:true},
 {id:'drop-quarter-east',name:'East Mega Quarter',type:'quarterpipe',x:600,z:-1760,flat:4.6,radius:8.8,length:155,angle:0,major:true},
 {id:'drop-spine',name:'Drop-In Spine',type:'spine',x:450,z:-1835,flat:21,radius:9,height:5.6,length:88,angle:0.03,major:true},

 // UPPER STADIUM — main pipe is in the normal sightline, quarters sit one carve away.
 {id:'stadium-superpipe',name:'Main Superpipe',type:'halfpipe',x:380,z:-2070,flat:6.2,radius:6.8,length:250,major:true},
 {id:'upper-quarter-east',name:'Upper Quarter',type:'quarterpipe',x:605,z:-2055,flat:4.8,radius:6.8,length:145,angle:0,major:true},
 {id:'upper-quarter-west',name:'Upper West Quarter',type:'quarterpipe',x:264,z:-2150,flat:4.6,radius:6.8,length:145,angle:Math.PI,major:true},

 // TRANSFER PLAZA
 {id:'plaza-quarter-west',name:'West Plaza Quarter',type:'quarterpipe',x:300,z:-2385,flat:4.8,radius:6.4,length:145,angle:Math.PI,major:true},
 {id:'plaza-quarter-east',name:'East Plaza Quarter',type:'quarterpipe',x:600,z:-2395,flat:4.8,radius:6.4,length:145,angle:0,major:true},
 {id:'plaza-spine',name:'Plaza Spine',type:'spine',x:450,z:-2440,flat:18,radius:9,height:4.8,length:82,angle:0.08,major:true},
 {id:'plaza-mini-pipe',name:'Plaza Mini Pipe',type:'halfpipe',x:355,z:-2545,flat:5.2,radius:5.4,length:190,major:true},

 // LOWER ARENA
 {id:'stadium-bowl',name:'Stadium Bowl',type:'bowl',x:485,z:-2670,flat:18,radius:6.6,length:175,major:true},
 {id:'lower-pipe',name:'Lower Pipe',type:'halfpipe',x:410,z:-2865,flat:5.8,radius:6.0,length:225,major:true},
 {id:'finish-quarter-west',name:'West Finish Quarter',type:'quarterpipe',x:300,z:-3015,flat:4.9,radius:6.8,length:150,angle:Math.PI,major:true},
 {id:'finish-quarter-east',name:'East Finish Quarter',type:'quarterpipe',x:600,z:-3015,flat:4.9,radius:6.8,length:150,angle:0,major:true},
 {id:'finish-spine',name:'Finish Spine',type:'spine',x:450,z:-3075,flat:18,radius:8,height:4.0,length:78,angle:0.02},

 // v0.17.20 south-face transition lane. This sits directly beside Raven Face
 // and South Park, descends north toward the valley, and reuses the proven
 // circular pipe surfaces / coping geometry from the original Transition side.
 {id:'south-drop-quarter-west',name:'South Drop Quarter W',type:'quarterpipe',x:1295,z:3000,flat:4.7,radius:7.4,length:150,angle:Math.PI,major:true,south:true},
 {id:'south-drop-quarter-east',name:'South Drop Quarter E',type:'quarterpipe',x:1490,z:3000,flat:4.7,radius:7.4,length:150,angle:0,major:true,south:true},
 {id:'south-superpipe',name:'South Superpipe',type:'halfpipe',x:1390,z:2735,flat:6.0,radius:6.6,length:270,major:true,south:true},
 {id:'south-flow-spine',name:'South Flow Spine',type:'spine',x:1390,z:2500,flat:19,radius:8.5,height:4.8,length:88,angle:0.02,major:true,south:true},
 {id:'south-mid-quarter-west',name:'South Mid Quarter W',type:'quarterpipe',x:1298,z:2290,flat:4.5,radius:6.2,length:138,angle:Math.PI,major:true,south:true},
 {id:'south-mid-quarter-east',name:'South Mid Quarter E',type:'quarterpipe',x:1485,z:2290,flat:4.5,radius:6.2,length:138,angle:0,major:true,south:true},
 {id:'south-mini-pipe',name:'South Mini Pipe',type:'halfpipe',x:1380,z:2070,flat:5.2,radius:5.4,length:220,major:true,south:true},
 {id:'south-transfer-spine',name:'South Transfer Spine',type:'spine',x:1390,z:1880,flat:17,radius:8,height:4.2,length:78,angle:-0.03,major:true,south:true},
 {id:'south-finish-bowl',name:'South Finish Bowl',type:'bowl',x:1390,z:1710,flat:16,radius:6.2,length:145,major:true,south:true},
 {id:'south-finish-quarter-west',name:'South Finish Quarter W',type:'quarterpipe',x:1300,z:1570,flat:4.4,radius:6.0,length:125,angle:Math.PI,major:true,south:true},
 {id:'south-finish-quarter-east',name:'South Finish Quarter E',type:'quarterpipe',x:1480,z:1570,flat:4.4,radius:6.0,length:125,angle:0,major:true,south:true},
 ...RESORT_QUARTERPIPES,
]);
export const TRANSITION_ROUTES=Object.freeze([
 {id:'transition-east-unload',name:'East Landing · Halfpipe Basin',width:25,points:[{x:820,z:-1620,y:630.4},{x:650,z:-1640,y:624.8},{x:450,z:-1680,y:613.6}]},
 {id:'transition-lift-return',name:'Transition Express Approach',width:25,points:[{x:440,z:-3370,y:140.4},{x:680,z:-3390,y:134.8},{x:900,z:-3400,y:132}]},
 {id:'transition-saddle',name:'Ridge Return · Alpine Flow',width:34,points:[{x:450,z:-1580,y:640},{x:220,z:-1490,y:637},{x:0,z:-1330,y:625},{x:-68,z:-1080}]},
 {id:'transition-valley-return',name:'Panorama Return · Base Village',width:32,points:[{x:440,z:-3440,y:121},{x:1200,z:-3520,y:116},{x:2250,z:-3320,y:110},{x:2350,z:-1900,y:103},{x:2340,z:-300,y:96},{x:2300,z:950,y:88},{x:875,z:1090}]},
 {id:'transition-junction-link',name:'Transition Junction',width:26,points:[{x:60,z:960},{x:170,z:1010},{x:350,z:1060}]},
]);
export function inNorthTransitionZone(x,z) {
 return x>=TRANSITION_ZONE.minX&&x<=TRANSITION_ZONE.maxX&&z>=TRANSITION_ZONE.minZ&&z<=TRANSITION_ZONE.maxZ;
}
export function inSouthTransitionZone(x,z) {
 return x>=SOUTH_TRANSITION_ZONE.minX&&x<=SOUTH_TRANSITION_ZONE.maxX&&z>=SOUTH_TRANSITION_ZONE.minZ&&z<=SOUTH_TRANSITION_ZONE.maxZ;
}
export function inTransitionZone(x,z) {
 return inNorthTransitionZone(x,z)||inSouthTransitionZone(x,z);
}
export function transitionAt(x,z) {
 let best=null,value=0;
 for(const f of TRANSITION_FEATURES) {
  // Ordinary-map quarterpipes are valid transition contacts even though they
  // sit outside the two dedicated Transition zones.
  if(!f.resort && !inTransitionZone(x,z))continue;
  if(!surfaceContains(f,x,z))continue;
  const h=transitionOffset(f,x,z);
  if(h>value||!best){value=h;best=f;}
 }
 return best;
}
export function transitionHeight(x,z,base) {
 let resortOffset=0;
 for(const f of RESORT_QUARTERPIPES)if(surfaceContains(f,x,z))resortOffset=Math.max(resortOffset,transitionOffset(f,x,z));
 if(resortOffset>0)base+=resortOffset;
 if (inSouthTransitionZone(x,z)) {
  const blend=smooth(SOUTH_TRANSITION_ZONE.minZ,SOUTH_TRANSITION_ZONE.minZ+95,z)*(1-smooth(SOUTH_TRANSITION_ZONE.maxZ-110,SOUTH_TRANSITION_ZONE.maxZ,z))*smooth(SOUTH_TRANSITION_ZONE.minX,SOUTH_TRANSITION_ZONE.minX+70,x)*(1-smooth(SOUTH_TRANSITION_ZONE.maxX-70,SOUTH_TRANSITION_ZONE.maxX,x));
  const grade=92+(z-1280)*0.265;
  const sideBanks=8*Math.pow(Math.max(0,Math.abs(x-1390)/210-.72),2);
  let offset=0;
  for(const f of TRANSITION_FEATURES)if(f.south&&surfaceContains(f,x,z))offset=Math.max(offset,transitionOffset(f,x,z));
  return base*(1-blend)+(grade+sideBanks+offset)*blend;
 }
 if(z > -1400 || z < -3650 || x < -300 || x >1100)return base;
 const blend=(1-smooth(-1500,-1400,z))*smooth(-3650,-3540,z)*smooth(-300,-180,x)*(1-smooth(980,1100,x));
 const grade=650+(z+1550)*0.28;
 const sideBanks=12*Math.pow(Math.max(0,Math.abs(x-400)/550-0.7),2);
 let offset=0;
 for(const f of TRANSITION_FEATURES)if(!f.south&&surfaceContains(f,x,z))offset=Math.max(offset,transitionOffset(f,x,z));
 return base*(1-blend)+(grade+sideBanks+offset)*blend;
}
export function routeHeight(x,z,base,baseSampler) {
 let total=0,weighted=0,coverage=0;
 for(const route of TRANSITION_ROUTES)for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  const d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz),w=1-smooth(route.width,route.width+65,d);
  if(w<=0)continue;
  const ah=a.y??baseSampler(a.x,a.z),bh=b.y??baseSampler(b.x,b.z);
  const weight=w/(1+d*d*0.05);
  weighted+=(ah+(bh-ah)*t)*weight;total+=weight;coverage=Math.max(coverage,w);
 }
 return total?base*(1-coverage)+weighted/total*coverage:base;
}
export {lipCrossed};

export function onTransitionRoute(x,z) {
 for(const r of TRANSITION_ROUTES)for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  if(Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<=r.width)return true;
 }
 return false;
}
