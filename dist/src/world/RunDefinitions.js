import { TRANSITION_ROUTES,inTransitionZone,onTransitionRoute,transitionAt } from './TransitionZone.js';
export const RUN_START_Z = -1180;
export const RUN_END_Z = 1180;
export const SOUTH_RUN_BOTTOM_Z = 1280;
export const SOUTH_RUN_TOP_Z = 3220;

const gaussian = (z, center, span) => Math.exp(-((z - center) ** 2) / (2 * span * span));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const variableWidth = (base, z, a = .16, b = .08, phase = 0) => clamp(base * (1 + a * Math.sin(z * .0036 + phase) + b * Math.sin(z * .0081 - phase * .7)), base * .58, base * 1.24);
const crossToward = (value, z, at, target, span = 118) => value + (target - value) * gaussian(z, at, span);

// v0.17.7: actual piste-on-piste junctions. These are real shared centre-line
// points, not connector traverses drawn between otherwise parallel runs. The
// runs blend toward the same anchor, cross, then separate again.
export const RUN_CROSSINGS = Object.freeze([
  { id:'glacier-flow-cross', runs:['glacier','flow'], z:-680, x:-224 },
  { id:'flow-pine-cross', runs:['flow','pine'], z:-180, x:95 },
  { id:'velocity-avalanche-cross', runs:['velocity','avalanche'], z:120, x:-628 },
  { id:'pine-woodland-cross', runs:['pine','woodland'], z:340, x:407 },
  { id:'park-sunset-cross', runs:['park','sunset'], z:520, x:870 },
]);

/**
 * v0.17.4 Mountain Network.
 *
 * The front side is no longer a row of parallel pistes. Each run has its own
 * width changes and authored lateral movement, while the resort connector graph
 * stitches the faces together at several elevations. The former Wild Bowl is
 * retained internally as unmarked terrain only, so its terrain sculpt can stay
 * safe without appearing as a named piste.
 */
export const RUNS = [
  {
    id: 'flow', name: 'Alpine Flow', difficulty: 'BLUE', color: 0x2f8fd0,
    width: 164, biome: 'OPEN_GROOMER', liftSide: -1, liftOffset: 96,
    description: 'Broad blue boulevard that widens into Eagle Basin, narrows through a shoulder and branches toward Pine, Glacier and the lower village.',
    centerAt(z) { let x=-45 + 74 * Math.sin(z * 0.00255 + 0.22) + 22 * Math.sin(z * 0.0062 - 0.55) + 78 * gaussian(z, -90, 250) - 38 * gaussian(z, 610, 220); x=crossToward(x,z,-680,-224,125); x=crossToward(x,z,-180,95,118); return x; },
    widthAt(z) { return variableWidth(132, z, .18, .10, .25) + 24 * gaussian(z, -80, 230) - 20 * gaussian(z, 525, 150); },
  },
  {
    id: 'glacier', name: 'Glacier Express', difficulty: 'RED', color: 0x66cde3,
    width: 136, biome: 'GLACIER', liftSide: -1, liftOffset: 84,
    description: 'Glacial red that funnels through a narrow ice neck, then opens into Glacier Basin with crossovers toward Flow and Velocity.',
    centerAt(z) { let x=-330 + 58 * Math.sin(z * 0.0021 - 0.35) + 18 * Math.sin(z * 0.0071 + 0.9) + 78 * gaussian(z, -230, 260) + 45 * gaussian(z, 340, 240); x=crossToward(x,z,-680,-224,125); return x; },
    widthAt(z) { return variableWidth(104, z, .20, .09, 1.2) - 22 * gaussian(z, -520, 150) + 22 * gaussian(z, 220, 190); },
  },
  {
    id: 'velocity', name: 'Velocity', difficulty: 'BLACK', color: 0x20252a,
    width: 110, biome: 'HIGH_ALPINE', liftSide: 1, liftOffset: 78,
    description: 'Steep black face with a tight upper chute, fast open apron and two mountain links into Glacier Basin and the western ridge.',
    centerAt(z) { let x=-590 + 44 * Math.sin(z * 0.00195 + 0.82) + 17 * Math.sin(z * 0.0086) + 105 * gaussian(z, 110, 300); x=crossToward(x,z,120,-628,132); return x; },
    widthAt(z) { return variableWidth(82, z, .22, .08, 2.0) - 16 * gaussian(z, -690, 130) + 19 * gaussian(z, 180, 220); },
  },
  {
    id: 'avalanche', name: 'Avalanche Ridge', difficulty: 'BLACK', color: 0x11181f,
    width: 86, biome: 'RIDGE', liftSide: -1, liftOffset: 70,
    description: 'A genuinely narrow ridgeline that bends into Velocity through the mid-mountain before peeling back toward a lower ridge return.',
    centerAt(z) { let x=-1045 + 54 * Math.sin(z * 0.0027 + 0.45) + 14 * Math.sin(z * 0.0102 - 0.4) + 175 * gaussian(z, 90, 300); x=crossToward(x,z,120,-628,132); return x; },
    widthAt(z) { return variableWidth(64, z, .15, .08, .9) - 11 * gaussian(z, -420, 150) + 8 * gaussian(z, 430, 160); },
  },
  {
    id: 'wild', name: 'West Powder Basin', difficulty: 'OFF-PISTE', color: 0x718594,
    width: 205, biome: 'FREERIDE_BOWL', liftSide: -1, liftOffset: 112,
    description: 'Unmarked western powder terrain. No piste gate, no dedicated route markers and no menu fast-travel entry.',
    centerAt(z) { return -825 + 72 * Math.sin(z * 0.0028 + 0.45) + 32 * Math.sin(z * 0.0084 - 0.5); },
    widthAt() { return 205; },
  },
  {
    id: 'pine', name: 'Pine Line', difficulty: 'RED', color: 0xd83e45,
    width: 108, biome: 'FOREST', liftSide: 1, liftOffset: 58,
    description: 'Forest red with a narrow upper ribbon, wider glades, a mid-mountain hub and several signed cut-throughs to Flow, Woodland and Park.',
    centerAt(z) { let x=300 + 88 * Math.sin(z * 0.0047 + 1.15) + 22 * Math.sin(z * 0.0122 - 0.5) - 125 * gaussian(z, -80, 250) + 38 * gaussian(z, 560, 200); x=crossToward(x,z,-180,95,118); x=crossToward(x,z,340,407,112); return x; },
    widthAt(z) { return variableWidth(78, z, .23, .10, 1.7) - 13 * gaussian(z, -620, 150) + 18 * gaussian(z, 350, 190); },
  },
  {
    id: 'woodland', name: 'Woodland Escape', difficulty: 'BLUE/RED', color: 0x42a96b,
    width: 90, biome: 'DEEP_FOREST', liftSide: -1, liftOffset: 58,
    description: 'Twisting woodland piste with tight upper bends, broad lower glades and signed branches into Pine Valley and Summit Park.',
    centerAt(z) { let x=520 + 84 * Math.sin(z * 0.0052 - 0.7) + 27 * Math.sin(z * 0.0135 + 0.2) - 92 * gaussian(z, 130, 260); x=crossToward(x,z,340,407,112); return x; },
    widthAt(z) { return variableWidth(66, z, .22, .10, 2.4) - 12 * gaussian(z, -250, 130) + 14 * gaussian(z, 500, 190); },
  },
  {
    id: 'park', name: 'Summit Park', difficulty: 'PARK', color: 0xb35cff,
    width: 178, biome: 'TERRAIN_PARK', liftSide: 1, liftOffset: 105,
    description: 'Five marked lanes plus transfer links into the normal mountain. The park now connects to forest and sunset terrain instead of acting as an isolated strip.',
    centerAt(z) { let x=735 + 36 * Math.sin(z * 0.00245 + 0.2) + 13 * Math.sin(z * 0.0092 + 1.1) - 105 * gaussian(z, 210, 290); x=crossToward(x,z,520,870,130); return x; },
    widthAt(z) { return variableWidth(150, z, .10, .05, .5) + 18 * gaussian(z, 120, 320); },
  },
  {
    id: 'sunset', name: 'Sunset Cruise', difficulty: 'BLUE', color: 0xffa75c,
    width: 172, biome: 'SCENIC_CRUISE', liftSide: 1, liftOffset: 92,
    description: 'Scenic blue that swings inward through Sun Terrace before opening again toward the Village Annex and Park crossover.',
    centerAt(z) { let x=1080 + 82 * Math.sin(z * 0.00215 + 0.95) + 22 * Math.sin(z * 0.0060 - 0.15) - 165 * gaussian(z, 290, 300); x=crossToward(x,z,520,870,130); return x; },
    widthAt(z) { return variableWidth(138, z, .17, .07, 2.8) - 18 * gaussian(z, -360, 170) + 20 * gaussian(z, 310, 220); },
  },
];


// v0.17.19: a second skiable mountain rises out of the resort valley on the
// south side. These pistes descend north (decreasing Z) back toward Base
// Village, so they deliberately carry a -1 downhillDirection. They cross and
// merge just like the original face instead of reading as parallel stripes.
export const SOUTH_RUN_CROSSINGS = Object.freeze([
  { id:'aurora-talon-cross', runs:['south-aurora','south-talon'], z:2660, x:-625 },
  { id:'talon-meridian-cross', runs:['south-talon','south-meridian'], z:2260, x:-330 },
  { id:'meridian-cedar-cross', runs:['south-meridian','south-cedar'], z:1880, x:70 },
  { id:'cedar-park-cross', runs:['south-cedar','south-park'], z:2440, x:450 },
  { id:'park-raven-cross', runs:['south-park','south-raven'], z:1770, x:790 },
  { id:'raven-transition-cross', runs:['south-raven','south-transition'], z:2240, x:1240 },
]);

export const SOUTH_RUNS = [
  {
    id:'south-aurora', name:'Aurora Bowl', difficulty:'BLUE', color:0x3f9fe0, width:146, biome:'OPEN_GROOMER', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'Wide south-face blue with a high bowl, rolling powder shoulders and a genuine crossover into Talon.',
    centerAt(z){let x=-900+86*Math.sin(z*.0022+.4)+22*Math.sin(z*.0064)-95*gaussian(z,2350,300);x=crossToward(x,z,2660,-625,90);return x;},
    widthAt(z){return variableWidth(122,z,.18,.08,.7)+26*gaussian(z,2800,220)-16*gaussian(z,1820,150);},
  },
  {
    id:'south-talon', name:'Talon', difficulty:'RED', color:0xe44e55, width:112, biome:'HIGH_ALPINE', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'A quicker red line with a narrow upper shoulder, two shared crossings and a fast lower pitch into the valley.',
    centerAt(z){let x=-560+62*Math.sin(z*.0028-1.1)+18*Math.sin(z*.0082+.4)+80*gaussian(z,2150,270);x=crossToward(x,z,2660,-625,90);x=crossToward(x,z,2260,-330,90);return x;},
    widthAt(z){return variableWidth(86,z,.22,.09,1.1)-18*gaussian(z,2900,150)+18*gaussian(z,2050,220);},
  },
  {
    id:'south-meridian', name:'Meridian', difficulty:'BLUE', color:0x2f83d8, width:158, biome:'SCENIC_CRUISE', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'The central south-face boulevard. Broad, quick and connected to both sides of the mountain by mid-level crossovers.',
    centerAt(z){let x=-160+76*Math.sin(z*.00245+.8)+20*Math.sin(z*.0069-.5)-55*gaussian(z,1900,300);x=crossToward(x,z,2260,-330,90);x=crossToward(x,z,1880,70,90);return x;},
    widthAt(z){return variableWidth(130,z,.17,.08,2.2)+20*gaussian(z,2500,240)-14*gaussian(z,1660,140);},
  },
  {
    id:'south-cedar', name:'Cedar Maze', difficulty:'RED', color:0xd2464e, width:104, biome:'DEEP_FOREST', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'Tree-lined red with tight turns, glades and multiple exits into Meridian and South Park.',
    centerAt(z){let x=300+92*Math.sin(z*.0044-.55)+25*Math.sin(z*.0113+.2)-85*gaussian(z,2020,260);x=crossToward(x,z,1880,70,90);x=crossToward(x,z,2440,450,90);return x;},
    widthAt(z){return variableWidth(76,z,.24,.10,.5)-12*gaussian(z,2780,160)+16*gaussian(z,1880,190);},
  },
  {
    id:'south-park', name:'South Park', difficulty:'PARK', color:0xb35cff, width:180, biome:'TERRAIN_PARK', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'A broad freestyle face with jump and rail lines that also crosses into Cedar and Raven instead of being isolated.',
    centerAt(z){let x=650+54*Math.sin(z*.0026+.25)+16*Math.sin(z*.0087+1.2)-70*gaussian(z,2140,280);x=crossToward(x,z,2440,450,90);x=crossToward(x,z,1770,790,90);return x;},
    widthAt(z){return variableWidth(152,z,.12,.06,1.7)+18*gaussian(z,2200,280);},
  },
  {
    id:'south-raven', name:'Raven Face', difficulty:'BLACK', color:0x161d24, width:92, biome:'RIDGE', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'Steep south-face black with a narrow upper entry, exposed powder shoulders and shared crossings into South Park and South Transition.',
    centerAt(z){let x=1030+56*Math.sin(z*.0027+.9)+17*Math.sin(z*.0095)-135*gaussian(z,1770,290);x=crossToward(x,z,1770,790,90);x=crossToward(x,z,2240,1240,105);return x;},
    widthAt(z){return variableWidth(68,z,.18,.08,2.7)-10*gaussian(z,2860,140)+12*gaussian(z,1900,180);},
  },
  {
    id:'south-transition', name:'South Transition', difficulty:'TRANSITION', color:0x33c8ba, width:126, biome:'TRANSITION_PARK', downhillDirection:-1, zMin:SOUTH_RUN_BOTTOM_Z, zMax:SOUTH_RUN_TOP_Z,
    description:'Dedicated south-face transition line with halfpipes, quarterpipes, spines, gaps and rail transfers flowing back to the valley.',
    centerAt(z){let x=1390+28*Math.sin(z*.0023+.55)+12*Math.sin(z*.0068-.3);x=crossToward(x,z,2240,1240,105);return x;},
    widthAt(z){return variableWidth(112,z,.10,.05,1.35)+12*gaussian(z,2680,260)+8*gaussian(z,1840,220);},
  },
];

export const ALL_RUNS = Object.freeze([...RUNS, ...SOUTH_RUNS]);

export const TRANSITION_RUN = {id:'transition',name:'Transition Mountain',difficulty:'TRANSITION',color:0x33c8ba,width:510,biome:'TRANSITION',liftSide:1,liftOffset:150,description:'Backside pipes, bowls, spines and transfers. Descend north; lifts return to the ridge.',centerAt(){return 450;},widthAt(){return 510;}};

export function getRun(id) { if(id==='transition')return TRANSITION_RUN; return ALL_RUNS.find((run) => run.id === id) || RUNS[0]; }
export function runWidthAt(runOrId, z) { const run=typeof runOrId==='string'?getRun(runOrId):runOrId; return Math.max(18, Number(run?.widthAt?.(z) ?? run?.width ?? 90)); }
export function runRange(runOrId){const run=typeof runOrId==='string'?getRun(runOrId):runOrId;if(run?.id==='transition')return {min:-3560,max:-1480};return {min:Number.isFinite(run?.zMin)?run.zMin:RUN_START_Z,max:Number.isFinite(run?.zMax)?run.zMax:RUN_END_Z};}
export function runContainsZ(runOrId,z,margin=90){const r=runRange(runOrId);return z>=r.min-margin&&z<=r.max+margin;}
const point=(runId,z,offsetX=0)=>({x:getRun(runId).centerAt(z)+offsetX,z});

// Multi-elevation front-side links. Every link descends overall as Z increases,
// so switching pistes does not require skating uphill or taking skis off.
export const RESORT_CONNECTORS = Object.freeze([
  ...TRANSITION_ROUTES,

  { id:'skyline-west-link', name:'Skyline Link · Avalanche → Velocity', width:18, groom:true, points:[point('avalanche',-900),{x:-820,z:-850},point('velocity',-770)] },
  { id:'ice-ridge-link', name:'Ice Ridge Link · Velocity → Glacier', width:21, groom:true, points:[point('velocity',-865),{x:-490,z:-825},point('glacier',-760)] },
  { id:'summit-blue-link', name:'Summit Blue Link · Glacier → Flow', width:26, groom:true, points:[point('glacier',-900),{x:-205,z:-850},point('flow',-785)] },
  { id:'upper-forest-crossover', name:'Upper Forest Crossover · Flow → Pine → Woodland', width:28, groom:true, points:[point('flow',-800),{x:100,z:-755},point('pine',-690),point('woodland',-620)] },
  { id:'upper-east-link', name:'Upper East Link · Woodland → Park → Sunset', width:27, groom:true, points:[point('woodland',-760),point('park',-665),point('sunset',-565)] },

  { id:'west-basin-crossover', name:'West Basin Crossover · Avalanche → Velocity → Glacier', width:22, groom:true, points:[point('avalanche',-330),point('velocity',-220),point('glacier',-105)] },
  { id:'eagle-basin-west', name:'Eagle Basin Traverse · Glacier → Flow', width:34, groom:true, hub:'eagle-basin', points:[point('glacier',-260),{x:-130,z:-205},point('flow',-135)] },
  { id:'eagle-basin-east', name:'Eagle Basin Link · Flow → Pine → Woodland', width:36, groom:true, hub:'eagle-basin', points:[point('flow',-125),{x:115,z:-70},point('pine',5),point('woodland',95)] },
  { id:'park-forest-arc', name:'Forest Arc · Pine → Woodland → Park', width:30, groom:true, hub:'forest-hub', points:[point('pine',165),point('woodland',245),point('park',330)] },
  { id:'sun-terrace-link', name:'Sun Terrace Crossover · Park → Sunset', width:31, groom:true, hub:'sun-terrace', points:[point('park',120),{x:820,z:190},point('sunset',275)] },

  { id:'glacier-bluebird-link', name:'Bluebird Link · Glacier → Flow → Pine', width:34, groom:true, hub:'glacier-basin', points:[point('glacier',250),point('flow',355),point('pine',470)] },
  { id:'forest-hub-link', name:'Forest Hub Link · Pine → Woodland → Park', width:31, groom:true, hub:'forest-hub', points:[point('pine',345),point('woodland',440),point('park',540)] },
  { id:'ridge-return-link', name:'Ridge Return · Avalanche → Velocity → Flow', width:29, groom:true, points:[point('avalanche',405),point('velocity',515),{x:-265,z:600},point('flow',685)] },
  { id:'east-return-link', name:'East Return · Sunset → Park → Pine', width:32, groom:true, points:[point('sunset',430),point('park',535),point('pine',650)] },
  { id:'flow-forest-return', name:'Flow Forest Return · Flow → Pine → Woodland', width:32, groom:true, points:[point('flow',625),point('pine',720),point('woodland',815)] },

  { id: 'flow-pine-traverse', name: 'Pine Valley Traverse', width: 34, groom:true, points: [
    point('flow',850), { x: 70, z: 885 }, point('pine',930),
  ] },
  { id: 'flow-glacier-traverse', name: 'Glacier Link', width: 32, groom:true, points: [
    point('flow',820), { x: -125, z: 855 }, point('glacier',900),
  ] },
  { id: 'pine-woodland-traverse', name: 'Woodland Link', width: 30, groom:true, points: [
    point('pine',930), { x: 360, z: 975 }, point('woodland',1020),
  ] },
  { id: 'park-sunset-traverse', name: 'Sunset Link', width: 34, groom:true, points: [
    point('park',850), { x: 900, z: 930 }, point('sunset',1010),
  ] },
  { id: 'velocity-ridge-traverse', name: 'Ridge Base Traverse', width: 34, groom:true, points: [
    point('velocity',955), { x: -540, z: 1030 }, { x: -520, z: 1085 },
  ] },
  { id: 'wild-avalanche-traverse', name: 'West Ridge Return', width: 28, groom:true, points: [
    point('wild',925), { x: -920, z: 970 }, point('avalanche',1010),
  ] },
  { id: 'base-valley-traverse', name: 'Village Traverse', width: 46, groom:true, points: [
    { x: -520, z: 1085 }, { x: -20, z: 1100 }, { x: 420, z: 1098 }, { x: 875, z: 1090 },
  ] },

  // Valley bridge and second-mountain network. Every connector slopes toward
  // the central valley, so no south-face crossover requires skating uphill.
  { id:'south-valley-bridge', name:'South Valley Link', width:52, groom:true, points:[{x:-520,z:1085},{x:-320,z:1205},{x:0,z:1295},{x:360,z:1300},{x:760,z:1300}] },
  { id:'south-west-base-link', name:'South West Base Link', width:38, groom:true, points:[point('south-aurora',1380),point('south-talon',1430),point('south-meridian',1470)] },
  { id:'south-east-base-link', name:'South East Base Link', width:38, groom:true, points:[point('south-meridian',1480),point('south-cedar',1435),point('south-park',1390),point('south-raven',1360),point('south-transition',1345)] },
  { id:'south-upper-west', name:'South Upper West Crossover', width:28, groom:true, points:[point('south-aurora',2860),{x:-700,z:2790},point('south-talon',2700),point('south-meridian',2600)] },
  { id:'south-upper-east', name:'South Upper East Crossover', width:29, groom:true, points:[point('south-meridian',2810),point('south-cedar',2700),point('south-park',2600),point('south-raven',2500),point('south-transition',2440)] },
  { id:'south-mid-west', name:'South Mid West Link', width:32, groom:true, points:[point('south-aurora',2220),point('south-talon',2160),point('south-meridian',2085)] },
  { id:'south-mid-east', name:'South Mid East Link', width:31, groom:true, points:[point('south-meridian',2110),point('south-cedar',2050),point('south-park',1980),point('south-raven',1900),point('south-transition',1840)] },
  { id:'south-low-cross', name:'South Low Traverse', width:34, groom:true, points:[point('south-aurora',1680),point('south-talon',1625),point('south-meridian',1580),point('south-cedar',1540),point('south-park',1500),point('south-raven',1460),point('south-transition',1425)] },
]);

// v0.17.5: dedicated chairline powder glades. These are intentionally
// ungroomed strips beneath selected front-side chairs, bordered by tree bands
// in Environment.js. They make lift-line skiing a real resort option instead
// of an empty utility corridor.
export const CHAIRLINE_GLADES = Object.freeze([
  { id:'ridge-chairline', name:'Ridge Express Chairline', width:17, points:[{x:-520,z:1085},point('velocity',-1080)] },
  { id:'pine-chairline', name:'Pine Express Chairline', width:15, points:[point('pine',930),point('pine',-1080)] },
  { id:'glacier-chairline', name:'Glacier Chairline', width:15, points:[point('glacier',900),point('glacier',-1080)] },
  { id:'park-chairline', name:'Park Express Chairline', width:17, points:[point('park',850),point('park',-1080)] },
  { id:'woodland-chairline', name:'Woodland Chairline', width:15, points:[point('woodland',1020),point('woodland',-1080)] },
  { id:'avalanche-chairline', name:'Avalanche Chairline', width:14, points:[point('avalanche',1010),point('avalanche',-1080)] },
  { id:'basin-ridge-chairline', name:'Basin Ridge Chairline', width:16, points:[point('glacier',250),point('velocity',-1080)] },
  { id:'south-west-chairline', name:'South West Chairline', width:16, points:[point('south-aurora',1380),point('south-aurora',3120)] },
  { id:'south-central-chairline', name:'South Central Chairline', width:18, points:[{x:0,z:1295},point('south-meridian',3120)] },
  { id:'south-cedar-chairline', name:'South Cedar Chairline', width:15, points:[point('south-cedar',2050),point('south-cedar',3120)] },
  { id:'south-park-chairline', name:'South Park Chairline', width:17, points:[{x:760,z:1300},point('south-park',3120)] },
  { id:'south-raven-chairline', name:'South Raven Chairline', width:15, points:[point('south-raven',1900),point('south-raven',3120)] },
  { id:'south-transition-chairline', name:'South Transition Chairline', width:15, points:[point('south-transition',1425),point('south-transition',3120)] },
]);


export function chairlineXAt(id, z) {
  const glade = CHAIRLINE_GLADES.find((item) => item.id === id);
  if (!glade || glade.points.length < 2) return null;
  for (let i = 0; i < glade.points.length - 1; i += 1) {
    const a = glade.points[i];
    const b = glade.points[i + 1];
    const minZ = Math.min(a.z, b.z);
    const maxZ = Math.max(a.z, b.z);
    if (z >= minZ && z <= maxZ) {
      const denom = b.z - a.z;
      const t = Math.abs(denom) < 1e-6 ? 0 : (z - a.z) / denom;
      return a.x + (b.x - a.x) * t;
    }
  }
  const first = glade.points[0];
  const last = glade.points.at(-1);
  return Math.abs(z - first.z) <= Math.abs(z - last.z) ? first.x : last.x;
}

function pointSegmentProjection(x, z, a, b) {
  const vx = b.x - a.x; const vz = b.z - a.z;
  const wx = x - a.x; const wz = z - a.z;
  const denom = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / denom));
  const px=a.x+vx*t,pz=a.z+vz*t;
  return {distance:Math.hypot(x-px,z-pz),t,x:px,z:pz};
}

export function nearestConnectorAt(x, z) {
  let best = null; let distance = Infinity; let segmentIndex=-1; let projection=null;
  for (const connector of RESORT_CONNECTORS) {
    for (let i = 0; i < connector.points.length - 1; i += 1) {
      const p = pointSegmentProjection(x,z,connector.points[i],connector.points[i+1]);
      if (p.distance < distance) { best = connector; distance = p.distance; segmentIndex=i; projection=p; }
    }
  }
  return { connector: best, distance, segmentIndex, projection };
}

export function nearestChairlineGladeAt(x, z) {
  let best = null; let distance = Infinity; let segmentIndex = -1; let projection = null;
  for (const glade of CHAIRLINE_GLADES) {
    for (let i = 0; i < glade.points.length - 1; i += 1) {
      const p = pointSegmentProjection(x, z, glade.points[i], glade.points[i + 1]);
      if (p.distance < distance) { best = glade; distance = p.distance; segmentIndex = i; projection = p; }
    }
  }
  return { glade: best, distance, segmentIndex, projection };
}

/** Legacy helper retained for old scenery code. v0.14+ lifts use ResortNetwork. */
export function liftXAt(runOrId, z) {
  const run = typeof runOrId === 'string' ? getRun(runOrId) : runOrId;
  const side = run.liftSide ?? (run.centerAt(0) >= 0 ? 1 : -1);
  const offset = run.liftOffset ?? (runWidthAt(run,z) + 34);
  return run.centerAt(z) + side * offset;
}

export function nearestRunAt(x, z) {
  if(z < 0 && inTransitionZone(x,z)) return {run:TRANSITION_RUN,distance:Math.abs(x-450),center:450};
  let best = null;
  let bestDistance = Infinity;
  const candidates = z >= 1200 ? SOUTH_RUNS : RUNS;
  for (const run of candidates) {
    if (!runContainsZ(run,z,140)) continue;
    const center = run.centerAt(z);
    const distance = Math.abs(x - center);
    if (distance < bestDistance) { best = run; bestDistance = distance; }
  }
  // The valley overlap is deliberately shared. Fall back to the opposite face
  // only when no candidate is valid, preserving old front-side behaviour.
  if (!best) {
    for (const run of ALL_RUNS) {
      if (!runContainsZ(run,z,220)) continue;
      const center=run.centerAt(z),distance=Math.abs(x-center);
      if(distance<bestDistance){best=run;bestDistance=distance;}
    }
  }
  return { run: best, distance: bestDistance, center: best?.centerAt(z) ?? 0 };
}

export function isOnRun(x, z, extra = 0) {
  const nearest = nearestRunAt(x, z);
  return Boolean(nearest.run && nearest.distance <= runWidthAt(nearest.run,z) + extra);
}

export function runSpawn(id, z = null) {
  if(id==='transition')return {x:450,z:-1580,direction:-1};
  const run = getRun(id);
  const direction=run.downhillDirection ?? 1;
  const spawnZ = Number.isFinite(z) ? z : direction < 0 ? SOUTH_RUN_TOP_Z - 78 : RUN_START_Z + 72;
  return { x: run.centerAt(spawnZ), z: spawnZ, direction };
}

export function runProgress(z, runOrId=null) { const run=runOrId? (typeof runOrId==='string'?getRun(runOrId):runOrId):null; if(run?.downhillDirection<0)return Math.max(0,Math.min(1,(SOUTH_RUN_TOP_Z-z)/(SOUTH_RUN_TOP_Z-SOUTH_RUN_BOTTOM_Z))); return Math.max(0, Math.min(1, (z - RUN_START_Z) / (RUN_END_Z - RUN_START_Z))); }

import { specialSurfaceAt, specialZoneAt } from './SpecialZones.js';

export function surfaceAt(x, z) {
  // Prepared links and the Transition zone are explicit exceptions. Everywhere
  // else, the rope/pole piste envelope is the authoritative powder boundary.
  if(onTransitionRoute(x,z))return 'GROOMED';
  const connector = nearestConnectorAt(x, z);
  if (connector.connector && connector.distance <= connector.connector.width) return 'GROOMED';
  if(inTransitionZone(x,z)) {
    if (transitionAt(x,z)) return 'PARK';
    if (z > 0) {
      const southTransition = SOUTH_RUNS.find((run) => run.id === 'south-transition');
      if (southTransition && Math.abs(x - southTransition.centerAt(z)) <= runWidthAt(southTransition,z) + 6.2) return 'PARK';
    }
    return 'POWDER';
  }

  const chairline = nearestChairlineGladeAt(x, z);
  if (chairline.glade && chairline.distance <= chairline.glade.width) return 'POWDER';

  const nearest = nearestRunAt(x, z);
  const pisteEdge = nearest.run ? runWidthAt(nearest.run, z) + 6.2 : 0;
  const onNamedPiste = Boolean(nearest.run && nearest.run.id !== 'wild' && nearest.distance <= pisteEdge);

  // Authored activity venues may have their own prepared/icy snow, but only
  // inside their true footprint. The much wider terrain-blend feather is powder.
  const special = specialSurfaceAt(x, z);
  const specialZone = specialZoneAt(x, z);
  // Off-piste means powder everywhere on the ordinary mountain. The only
  // prepared exception outside a named piste is the purpose-built ski-jump
  // venue; retired/hidden extreme-zone surface overrides no longer create
  // random dry/icy patches in what visually reads as freeride snow.
  if (!onNamedPiste) {
    if (specialZone?.id === 'ski-jump' && special) return special;
    return 'POWDER';
  }

  if (nearest.run.id === 'park' || nearest.run.id === 'south-park' || nearest.run.id === 'south-transition') return 'PARK';
  if (nearest.run.id === 'velocity' || nearest.run.id === 'glacier' || nearest.run.id === 'avalanche' || nearest.run.id === 'south-raven' || nearest.run.id === 'south-talon') {
    const phase = nearest.run.id === 'glacier' ? 1.1 : nearest.run.id === 'avalanche' ? 1.75 : nearest.run.id === 'south-raven' ? 2.2 : nearest.run.id === 'south-talon' ? .85 : 0.4;
    const icyBand = Math.sin(z * 0.010 + phase) > ((nearest.run.id === 'avalanche' || nearest.run.id === 'south-raven') ? 0.15 : -0.15);
    return icyBand ? 'ICY' : 'GROOMED';
  }
  return 'GROOMED';
}
