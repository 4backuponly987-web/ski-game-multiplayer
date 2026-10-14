import { getRun } from './RunDefinitions.js';

const station = (id, name, x, z, kind = 'junction') => Object.freeze({ id, name, x, z, kind });
const runPoint = (runId, z, offsetX = 0) => {
  const run = getRun(runId);
  return { x: run.centerAt(z) + offsetX, z };
};

const flowTop = runPoint('flow', -1080);
const glacierTop = runPoint('glacier', -1080);
const pineTop = runPoint('pine', -1080);
const velocityTop = runPoint('velocity', -1080);
const parkTop = runPoint('park', -1080);
const woodlandTop = runPoint('woodland', -1080);
const avalancheTop = runPoint('avalanche', -1080);
const sunsetTop = runPoint('sunset', -1080);
const eagleBasin = runPoint('flow', -125);
const glacierBasin = runPoint('glacier', 250);
const forestHub = runPoint('pine', 345);
const sunTerrace = runPoint('sunset', 275);

// v0.17.19 second mountain / south face. The valley sits between the original
// face and these summits, so every south-side lift unloads to a north-facing
// piste (decreasing Z).
const southAuroraTop = runPoint('south-aurora', 3120);
const southTalonTop = runPoint('south-talon', 3120);
const southMeridianTop = runPoint('south-meridian', 3120);
const southCedarTop = runPoint('south-cedar', 3120);
const southParkTop = runPoint('south-park', 3120);
const southRavenTop = runPoint('south-raven', 3120);
const southTransitionTop = runPoint('south-transition', 3120);
const southTransitionBase = runPoint('south-transition', 1425);
const southWestMid = runPoint('south-talon', 2180);
const southEastMid = runPoint('south-cedar', 2080);

export const RESORT_STATIONS = Object.freeze([
  station('transition-junction','Transition Junction',350,1060,'junction'),
  station('transition-ridge','Transition Ridge',450,-1580,'summit'),
  station('transition-lower','Transition Express Base',900,-3440,'junction'),
  station('transition-ridge-east','Transition Ridge · East Landing',820,-1580,'summit'),

  station('base-main', 'Base Village · Main Plaza', -20, 1100, 'base'),
  station('base-ridge', 'Base Village · Ridge Plaza', -520, 1085, 'base'),
  station('village-annex', 'Village Annex', 875, 1090, 'base'),

  // Shared valley floor between the two main mountains.
  station('south-valley', 'South Valley Hub', 0, 1295, 'base'),
  station('south-west-base', 'South West Base', -690, 1320, 'base'),
  station('south-east-base', 'South East Base', 760, 1300, 'base'),
  station('south-west-mid', 'South West Mid', southWestMid.x, southWestMid.z, 'mid'),
  station('south-east-mid', 'South East Mid', southEastMid.x, southEastMid.z, 'mid'),

  station('south-aurora-top', 'Aurora Summit', southAuroraTop.x, southAuroraTop.z, 'summit'),
  station('south-talon-top', 'Talon Summit', southTalonTop.x, southTalonTop.z, 'summit'),
  station('south-meridian-top', 'Meridian Summit', southMeridianTop.x, southMeridianTop.z, 'summit'),
  station('south-cedar-top', 'Cedar Summit', southCedarTop.x, southCedarTop.z, 'summit'),
  station('south-park-top', 'South Park Summit', southParkTop.x, southParkTop.z, 'summit'),
  station('south-raven-top', 'Raven Summit', southRavenTop.x, southRavenTop.z, 'summit'),
  station('south-transition-base', 'South Transition Base', southTransitionBase.x, southTransitionBase.z, 'base'),
  station('south-transition-top', 'South Transition Summit', southTransitionTop.x, southTransitionTop.z, 'summit'),

  station('eagle-basin', 'Eagle Basin · Mid-Mountain', eagleBasin.x, eagleBasin.z, 'mid'),
  station('glacier-basin', 'Glacier Basin', glacierBasin.x, glacierBasin.z, 'mid'),
  station('forest-hub', 'Forest Hub', forestHub.x, forestHub.z, 'mid'),
  station('sun-terrace', 'Sun Terrace', sunTerrace.x, sunTerrace.z, 'mid'),

  station('forest-junction', 'Pine Valley Junction', getRun('pine').centerAt(930), 930, 'junction'),
  station('glacier-junction', 'Glacier Junction', getRun('glacier').centerAt(900), 900, 'junction'),
  station('resort-junction', 'Park Junction', getRun('park').centerAt(850), 850, 'junction'),
  station('woodland-lower', 'Lower Woodland', getRun('woodland').centerAt(1020), 1020, 'junction'),
  station('avalanche-base', 'Avalanche Ridge Base', getRun('avalanche').centerAt(1010), 1010, 'junction'),

  station('flow-top', 'Alpine Flow Summit', flowTop.x, flowTop.z, 'summit'),
  station('glacier-top', 'Glacier Summit', glacierTop.x, glacierTop.z, 'summit'),
  station('pine-top', 'Pine Line Summit', pineTop.x, pineTop.z, 'summit'),
  station('velocity-top', 'Velocity Summit', velocityTop.x, velocityTop.z, 'summit'),
  station('park-top', 'Summit Park', parkTop.x, parkTop.z, 'summit'),
  station('woodland-top', 'Woodland Escape Summit', woodlandTop.x, woodlandTop.z, 'summit'),
  station('avalanche-top', 'Avalanche Ridge Summit', avalancheTop.x, avalancheTop.z, 'summit'),
  station('sunset-top', 'Sunset Cruise Summit', sunsetTop.x, sunsetTop.z, 'summit'),
]);

export const RESORT_LIFTS = Object.freeze([
  // Transition side remains its own contained network.
  {id:'transition-gondola',name:'Transition Gondola',type:'GONDOLA',from:'transition-junction',to:'transition-ridge',destinationRunId:'transition',color:0x33c8ba,unload:{x:450,z:-1620},exitDirection:-1},
  {id:'transition-express',name:'Transition Express',type:'CHAIR',from:'transition-lower',to:'transition-ridge-east',destinationRunId:'transition',color:0x40b6d4,unload:{x:820,z:-1620},exitDirection:-1},

  // Main valley lifts.
  { id: 'main-gondola', name: 'Main Gondola', type: 'GONDOLA', from: 'base-main', to: 'flow-top', destinationRunId: 'flow', color: 0x54b9e8 },
  { id: 'pine-express', name: 'Pine Express', type: 'CHAIR', from: 'forest-junction', to: 'pine-top', destinationRunId: 'pine', color: 0xd83e45 },
  { id: 'ridge-express', name: 'Ridge Express', type: 'CHAIR', from: 'base-ridge', to: 'velocity-top', destinationRunId: 'velocity', color: 0x626b73 },
  { id: 'glacier-chair', name: 'Glacier Chair', type: 'CHAIR', from: 'glacier-junction', to: 'glacier-top', destinationRunId: 'glacier', color: 0x66cde3 },
  { id: 'park-express', name: 'Park Express', type: 'CHAIR', from: 'resort-junction', to: 'park-top', destinationRunId: 'park', color: 0xb35cff },
  { id: 'woodland-chair', name: 'Woodland Chair', type: 'CHAIR', from: 'woodland-lower', to: 'woodland-top', destinationRunId: 'woodland', color: 0x42a96b },
  { id: 'avalanche-lift', name: 'Avalanche Lift', type: 'CHAIR', from: 'avalanche-base', to: 'avalanche-top', destinationRunId: 'avalanche', color: 0xe6edf1 },
  { id: 'sunset-gondola', name: 'Sunset Gondola', type: 'GONDOLA', from: 'village-annex', to: 'sunset-top', destinationRunId: 'sunset', color: 0xffa75c },

  // v0.17.4 mid-mountain lift hierarchy: you can keep skiing the mountain and
  // ride back upward without dropping all the way to Base Village every lap.
  { id:'eagle-gondola', name:'Eagle Basin Gondola', type:'GONDOLA', from:'eagle-basin', to:'glacier-top', destinationRunId:'glacier', color:0x7dd7ef },
  { id:'forest-gondola', name:'Forest Link Gondola', type:'GONDOLA', from:'forest-hub', to:'park-top', destinationRunId:'park', color:0x67c995 },
  { id:'sun-terrace-gondola', name:'Sun Terrace Gondola', type:'GONDOLA', from:'sun-terrace', to:'sunset-top', destinationRunId:'sunset', color:0xf3a960 },
  { id:'basin-ridge-chair', name:'Basin Ridge Chair', type:'CHAIR', from:'glacier-basin', to:'velocity-top', destinationRunId:'velocity', color:0x9db4c2 },

  // South-face lift network. The Valley Link Chair is the direct physical
  // answer to skiing the original mountain, reaching the valley, then riding
  // straight to the opposite summit without using a menu.
  { id:'south-valley-chair', name:'Valley Link Chair', type:'CHAIR', from:'base-main', to:'south-meridian-top', destinationRunId:'south-meridian', color:0x75c8ef, unload:{x:southMeridianTop.x,z:3060}, exitDirection:-1, tunnel:{t:0.56, span:0.085, extraClearance:9.5, openingRadius:7.6} },
  { id:'south-main-gondola', name:'South Gondola', type:'GONDOLA', from:'south-valley', to:'south-meridian-top', destinationRunId:'south-meridian', color:0x4fb4da, unload:{x:southMeridianTop.x,z:3060}, exitDirection:-1 },
  { id:'south-west-chair', name:'Aurora Chair', type:'CHAIR', from:'south-west-base', to:'south-aurora-top', destinationRunId:'south-aurora', color:0x5aa8df, unload:{x:southAuroraTop.x,z:3060}, exitDirection:-1 },
  { id:'south-talon-chair', name:'Talon Chair', type:'CHAIR', from:'south-west-mid', to:'south-talon-top', destinationRunId:'south-talon', color:0xd44a52, unload:{x:southTalonTop.x,z:3060}, exitDirection:-1 },
  { id:'south-east-gondola', name:'South Park Gondola', type:'GONDOLA', from:'south-east-base', to:'south-park-top', destinationRunId:'south-park', color:0xb35cff, unload:{x:southParkTop.x,z:3060}, exitDirection:-1 },
  { id:'south-cedar-chair', name:'Cedar Chair', type:'CHAIR', from:'south-east-mid', to:'south-cedar-top', destinationRunId:'south-cedar', color:0x4aa873, unload:{x:southCedarTop.x,z:3060}, exitDirection:-1 },
  { id:'south-raven-chair', name:'Raven Chair', type:'CHAIR', from:'south-east-mid', to:'south-raven-top', destinationRunId:'south-raven', color:0x85929c, unload:{x:southRavenTop.x,z:3060}, exitDirection:-1 },
  { id:'cross-valley-gondola', name:'Cross Valley Gondola', type:'GONDOLA', from:'village-annex', to:'south-park-top', destinationRunId:'south-park', color:0x8ad5ee, unload:{x:southParkTop.x,z:3060}, exitDirection:-1 },
  { id:'south-transition-chair', name:'South Transition Chair', type:'CHAIR', from:'south-transition-base', to:'south-transition-top', destinationRunId:'south-transition', color:0x33c8ba, unload:{x:southTransitionTop.x,z:3060}, exitDirection:-1, tunnel:{t:0.045, span:0.060, extraClearance:11.5, openingRadius:10.8, portalDepth:16.0, southPortal:true} },
]);

export const RESORT_JUNCTION_SIGNS = Object.freeze([
  {id:'transition-junction-sign',at:'transition-junction',lines:[['Transition Gondola','NORTH FACE'],['Base Village','WEST · 370 m']]},
  {id:'transition-ridge-sign',at:'transition-ridge',lines:[['Halfpipe Basin','NORTH · DROP IN'],['Alpine Flow','SOUTH · RIDGE RETURN']]},
  {id:'transition-lower-sign',at:'transition-lower',lines:[['Transition Express','BACK TO RIDGE'],['Panorama Return','EAST · BASE VILLAGE']]},
  { id: 'base-main-sign', at: 'base-main', lines: [['Main Gondola', 'Alpine Flow · BLUE'], ['Ridge Plaza', 'Velocity · BLACK'], ['Village Annex', 'Sunset Cruise · BLUE']] },
  { id:'eagle-basin-sign', at:'eagle-basin', lines:[['Eagle Basin Gondola','GLACIER SUMMIT'],['Pine / Woodland','EAST CROSSOVER'],['Velocity / Glacier','WEST CROSSOVER']] },
  { id:'glacier-basin-sign', at:'glacier-basin', lines:[['Basin Ridge Chair','VELOCITY SUMMIT'],['Bluebird Link','FLOW / PINE']] },
  { id:'forest-hub-sign', at:'forest-hub', lines:[['Forest Link Gondola','SUMMIT PARK'],['Woodland Escape','EAST'],['Alpine Flow','WEST RETURN']] },
  { id:'sun-terrace-sign', at:'sun-terrace', lines:[['Sun Terrace Gondola','SUNSET SUMMIT'],['Summit Park','WEST CROSSOVER'],['Village Annex','DOWNHILL']] },
  { id: 'forest-sign', at: 'forest-junction', lines: [['Pine Express', 'Pine Line · RED'], ['Woodland Escape', 'BLUE / RED'], ['Base Village', 'DOWNHILL']] },
  { id: 'glacier-sign', at: 'glacier-junction', lines: [['Glacier Chair', 'GLACIER SUMMIT'], ['Velocity', 'BLACK'], ['Base Village', 'TRAVERSE']] },
  { id: 'park-sign', at: 'resort-junction', lines: [['Park Express', 'Summit Park'], ['Sunset Cruise', 'BLUE'], ['Base Village', 'DOWNHILL']] },
  { id: 'avalanche-sign', at: 'avalanche-base', lines: [['Avalanche Lift', 'Avalanche Ridge · BLACK'], ['West Basin', 'UNMARKED POWDER'], ['Base Village', 'TRAVERSE']] },
  { id:'south-valley-sign', at:'south-valley', lines:[['South Gondola','MERIDIAN SUMMIT'],['Aurora / Talon','WEST'],['South Park / Raven','EAST']] },
  { id:'south-west-sign', at:'south-west-base', lines:[['Aurora Chair','AURORA SUMMIT'],['South Valley Hub','EAST']] },
  { id:'south-east-sign', at:'south-east-base', lines:[['South Park Gondola','PARK SUMMIT'],['South Valley Hub','WEST'],['South Transition','EAST']] },
  { id:'south-transition-sign', at:'south-transition-base', lines:[['South Transition Chair','TRANSITION SUMMIT'],['Raven / South Park','WEST']] },
]);

export function getStation(id) { return RESORT_STATIONS.find((s) => s.id === id) || null; }
export function getLiftDefinition(id) { return RESORT_LIFTS.find((lift) => lift.id === id) || null; }

export function getLiftEndpoints(liftOrId) {
  const lift = typeof liftOrId === 'string' ? getLiftDefinition(liftOrId) : liftOrId;
  if (!lift) return null;
  const from = getStation(lift.from);
  const to = getStation(lift.to);
  return from && to ? { from, to } : null;
}

export function nearestStation(x, z, maxDistance = Infinity) {
  let best = null;
  let bestDistance = Infinity;
  for (const s of RESORT_STATIONS) {
    const distance = Math.hypot(x - s.x, z - s.z);
    if (distance < bestDistance && distance <= maxDistance) { best = s; bestDistance = distance; }
  }
  return best ? { station: best, distance: bestDistance } : null;
}

export const STATION_LINKS = Object.freeze([
 ['base-main','base-ridge'],['base-main','village-annex'],['base-main','forest-junction'],
 ['base-main','glacier-junction'],['base-main','resort-junction'],['forest-junction','woodland-lower'],
 ['base-ridge','avalanche-base'],['base-main','transition-junction'],
 ['transition-ridge','flow-top'],['transition-ridge','transition-ridge-east'],['transition-lower','village-annex'],
 ['eagle-basin','glacier-basin'],['eagle-basin','forest-hub'],['forest-hub','sun-terrace'],
 ['glacier-junction','glacier-basin'],['forest-junction','forest-hub'],['resort-junction','sun-terrace'],
 ['flow-top','glacier-top'],['pine-top','woodland-top'],['park-top','sunset-top'],
 ['base-main','south-valley'],['base-ridge','south-west-base'],['village-annex','south-east-base'],
 ['south-valley','south-west-base'],['south-valley','south-east-base'],
 ['south-west-base','south-west-mid'],['south-east-base','south-east-mid'],
 ['south-west-mid','south-east-mid'],
 ['south-aurora-top','south-talon-top'],['south-talon-top','south-meridian-top'],
 ['south-meridian-top','south-cedar-top'],['south-cedar-top','south-park-top'],['south-park-top','south-raven-top'],
 ['south-raven-top','south-transition-top'],['south-east-base','south-transition-base'],
]);
export function networkIsConnected() {
 const adjacency=new Map(RESORT_STATIONS.map(s=>[s.id,new Set()]));
 const edge=(a,b)=>{adjacency.get(a)?.add(b);adjacency.get(b)?.add(a);};
 for(const lift of RESORT_LIFTS)edge(lift.from,lift.to);
 for(const [a,b] of STATION_LINKS)edge(a,b);
 const seen=new Set(['base-main']),queue=['base-main'];
 while(queue.length)for(const next of adjacency.get(queue.shift())||[])if(!seen.has(next)){seen.add(next);queue.push(next);}
 return RESORT_STATIONS.every(s=>seen.has(s.id));
}
