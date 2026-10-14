import { transitionHeight, routeHeight } from './TransitionZone.js';
import { RUNS, SOUTH_RUNS, RESORT_CONNECTORS, runWidthAt, nearestRunAt, RUN_START_Z, RUN_END_Z, SOUTH_RUN_BOTTOM_Z, SOUTH_RUN_TOP_Z } from './RunDefinitions.js';
import { specialTerrainBlend } from './SpecialZones.js';

export const WORLD_SIZE = 5200;
export const WORLD_MIN_Z = -3700;
export const WORLD_MAX_Z = 3500;
export const HALF_WORLD = WORLD_SIZE / 2;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0, edge1, value) => {
  const x = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return x * x * (3 - 2 * x);
};

function progress(z) {
  return clamp01((z - RUN_START_Z) / (RUN_END_Z - RUN_START_Z));
}

function routeGradeOffset(runId, z) {
  const p = progress(z);
  if (runId === 'velocity') return -96 * p + Math.sin(z * 0.008) * 1.2;
  if (runId === 'avalanche') return -118 * p + Math.sin(z * 0.011) * 2.2;
  if (runId === 'wild') return -58 * p;
  if (runId === 'glacier') return -42 * p + Math.sin(z * 0.007) * 1.2;
  if (runId === 'pine') return -24 * p + Math.sin(z * 0.011) * 2.4;
  if (runId === 'woodland') return -18 * p + Math.sin(z * 0.016) * 3.1;
  if (runId === 'park') return 8 * p + Math.sin(z * 0.0105) * 1.1;
  if (runId === 'sunset') return 5 * p + Math.sin(z * 0.0048) * 1.4;
  return -9 * p + Math.sin(z * 0.0068) * 2.2;
}

function cliffStep(z, center, drop, halfWidth = 38) {
  return -drop * smoothstep(center - halfWidth, center + halfWidth, z);
}

function runSculpt(run, distance, z) {
  if (!run) return 0;
  const n = distance / Math.max(1, run.width);
  if (run.id === 'flow') {
    // Broad groomer: gentle banks rise at the piste edge and rolling compressions
    // give carving something to work against without becoming bumpy.
    return Math.pow(Math.min(1.25, n), 2.2) * 7.5 + Math.sin(z * 0.0062) * 1.8;
  }
  if (run.id === 'velocity') {
    // High-alpine fall line: narrow centre channel, strong side shoulders and a
    // few compressions that become dramatic at racing speed.
    return Math.pow(Math.min(1.35, n), 2.5) * 13.5 + Math.sin(z * 0.013) * 1.4;
  }
  if (run.id === 'pine') {
    // Forest trail is cut into the mountain slightly, with natural banked sides.
    return -2.0 + Math.pow(Math.min(1.25, n), 2.0) * 9.5 + Math.sin(z * 0.017) * 1.1;
  }
  if (run.id === 'park') {
    // Park lanes are deliberately smooth and consistent for takeoffs/landings.
    const gate=1-Math.pow(Math.abs(Math.sin((z+160)*.006)),8);
    const separators=[26,78,130].reduce((sum,offset)=>sum+1.7*Math.exp(-(((distance-offset)/4.5)**2)),0);
    return Math.pow(Math.min(1.15,n),2.4)*5.2+Math.sin(z*.0048)*.7+separators*gate;
  }
  if (run.id === 'glacier') {
    return Math.pow(Math.min(1.25, n), 2.15) * 8.5 + Math.sin(z * 0.0082) * 2.0 + Math.cos(z * 0.017) * 0.8;
  }
  if (run.id === 'woodland') {
    return -2.5 + Math.pow(Math.min(1.28, n), 2.05) * 10.5 + Math.sin(z * 0.020) * 1.6;
  }
  if (run.id === 'avalanche') {
    const ridge = Math.pow(Math.min(1.42, n), 2.7) * 18.0;
    return ridge + Math.sin(z * 0.015) * 2.1;
  }
  if (run.id === 'sunset') {
    return Math.pow(Math.min(1.20, n), 2.0) * 6.2 + Math.sin(z * 0.0051) * 1.25;
  }
  if (run.id === 'south-aurora') return Math.pow(Math.min(1.25,n),2.15)*7.0 + Math.sin(z*.0060)*1.5;
  if (run.id === 'south-talon') return Math.pow(Math.min(1.35,n),2.45)*11.5 + Math.sin(z*.011)*1.6;
  if (run.id === 'south-meridian') return Math.pow(Math.min(1.22,n),2.05)*6.4 + Math.sin(z*.0054)*1.35;
  if (run.id === 'south-cedar') return -2.2 + Math.pow(Math.min(1.28,n),2.08)*9.8 + Math.sin(z*.018)*1.35;
  if (run.id === 'south-park') return Math.pow(Math.min(1.16,n),2.3)*5.0 + Math.sin(z*.0048)*.65;
  if (run.id === 'south-raven') return Math.pow(Math.min(1.42,n),2.72)*16.5 + Math.sin(z*.014)*2.0;
  if (run.id === 'south-transition') return Math.pow(Math.min(1.18,n),2.35)*4.6 + Math.sin(z*.0046)*.55;
  return 0;
}

/**
 * Authored resort height field for v0.12. The global mountain still uses a
 * deterministic height sampler so rendered terrain, skiing contact, lifts and
 * feature placement always agree. Each route sculpts its own face into a larger
 * ridge/valley mountain rather than flattening five parallel strips.
 */
function terrainForRun(x, z, nearest) {
  const downhillProfile = 355 - z * 0.242;

  const broadRidges =
    Math.sin(x * 0.0041 + z * 0.0011) * 42 +
    Math.cos(x * 0.00255 - z * 0.0034) * 31 +
    Math.sin((x + z) * 0.0073) * 10;

  const fineRelief =
    Math.sin(x * 0.014) * Math.cos(z * 0.012) * 6.3 +
    Math.sin(z * 0.027 + x * 0.0055) * 3.5;


  const run = nearest.run;
  const corridorWidth = runWidthAt(run, z);
  const corridorBlendBase = smoothstep(corridorWidth * 0.82, corridorWidth + 205, nearest.distance);
  const wildMix = run?.id === 'wild'
    ? 1 - smoothstep(corridorWidth - 18, corridorWidth + 96, nearest.distance)
    : 0;
  const corridorBlend = run?.id === 'wild' ? Math.max(0.52, corridorBlendBase) : corridorBlendBase;

  const pisteMicro =
    Math.sin(z * 0.0085 + (run?.id === 'pine' ? 0.8 : 0)) * 1.45 +
    Math.sin(z * 0.0036 + 0.8) * 2.1 +
    Math.sin((x - nearest.center) * 0.021) * 0.45;

  const routeOffset = routeGradeOffset(run?.id ?? 'flow', z) * (1 - corridorBlendBase);
  const channel = -6.0 * (1 - smoothstep(0, corridorWidth + 35, nearest.distance));
  const identitySculpt = runSculpt(run, nearest.distance, z) * (1 - corridorBlendBase);

  // Large mountain-scale landmarks shared by all faces.
  const summitRidge = 42 * Math.exp(-((z + 980) ** 2) / 150000) * Math.exp(-((x + 80) ** 2) / 860000);
  const centralValley = -28 * Math.exp(-((z - 530) ** 2) / 190000) * Math.exp(-((x - 40) ** 2) / 620000);
  const eastShoulder = 35 * Math.exp(-((x - 650) ** 2) / 145000) * Math.exp(-((z + 80) ** 2) / 650000);
  const westRidge = 48 * Math.exp(-((x + 870) ** 2) / 125000) * Math.exp(-((z + 180) ** 2) / 720000);
  const farWestRidge = 58 * Math.exp(-((x + 1120) ** 2) / 95000) * Math.exp(-((z + 80) ** 2) / 650000);
  const eastCruiseShoulder = 38 * Math.exp(-((x - 1100) ** 2) / 180000) * Math.exp(-((z + 60) ** 2) / 760000);

  // The lower 220 m of the mountain forms a broad resort valley. It remains
  // gently downhill but is smooth enough to traverse between labelled lift
  // stations using pole pushes instead of being trapped in isolated run lanes.
  const baseBlend = smoothstep(850, 1130, z);
  const baseValleyTarget = 90 - (z - 900) * 0.035 + Math.sin(x * 0.0035) * 2.0;

  // Off-piste should feel like skiable mountain terrain rather than noisy ground.
  // Keep broad ridges, soften high-frequency relief and layer gentle powder
  // pillows so glades/bowls have readable natural features at speed.
  const powderPillows = corridorBlend * (
    Math.sin(x * 0.0105 + z * 0.0062) * 2.15 +
    Math.cos(x * 0.0068 - z * 0.011) * 1.35
  );
  const offPisteRelief = (broadRidges * 0.78 + fineRelief * 0.58) * corridorBlend + powderPillows;
  const groomedRelief = pisteMicro * (1 - corridorBlendBase) * (1 - wildMix);

  // Wild Bowl: cupped face, powder pillows and four continuous cliff shelves.
  const wildSide = nearest.distance / Math.max(1, corridorWidth);
  const wildBowlWalls = wildMix * Math.pow(Math.min(1.42, wildSide), 1.72) * 30;
  const wildPowder = wildMix * (
    Math.sin(z * 0.020 + x * 0.0105) * 7.6 +
    Math.sin(z * 0.042 - x * 0.0075) * 4.4 +
    Math.cos((x - nearest.center) * 0.047) * 3.6
  );
  const wildCliffs = wildMix * (
    cliffStep(z, -700, 18, 34) +
    cliffStep(z, -250, 24, 42) +
    cliffStep(z, 220, 21, 36) +
    cliffStep(z, 690, 17, 34)
  );

  // Velocity gets two natural compressions and one steeper roll without using
  // separate collision meshes.
  const velocityMix = run?.id === 'velocity' ? 1 - smoothstep(corridorWidth, corridorWidth + 80, nearest.distance) : 0;
  const velocityDrops = velocityMix * (
    cliffStep(z, -420, 8, 52) + cliffStep(z, 360, 10, 60)
  );

  let baseHeight = downhillProfile + summitRidge + centralValley + eastShoulder + westRidge + farWestRidge + eastCruiseShoulder +
    channel + routeOffset + identitySculpt + groomedRelief + offPisteRelief +
    wildBowlWalls + wildPowder + wildCliffs + velocityDrops;

  // Connected-resort valley blend. Preserve enough slope to keep skiing, while
  // making cross-resort traverses and lower lift approaches physically viable.
  baseHeight = baseHeight * (1 - baseBlend * 0.82) + baseValleyTarget * (baseBlend * 0.82);

  return specialTerrainBlend(x, z, baseHeight).height;
}

function nearestFromRuns(x,z,runs){
 let first=null,second=null,d1=Infinity,d2=Infinity;
 for(const run of runs){const center=run.centerAt(z),distance=Math.abs(x-center);const entry={run,center,distance};if(distance<d1){second=first;d2=d1;first=entry;d1=distance;}else if(distance<d2){second=entry;d2=distance;}}
 return {first,second,d1,d2};
}

function southTerrainForRun(x,z,nearest){
 const run=nearest.run;
 const corridorWidth=runWidthAt(run,z);
 const corridorBlend=smoothstep(corridorWidth*.84,corridorWidth+190,nearest.distance);
 const rise=92+(z-SOUTH_RUN_BOTTOM_Z)*0.265;
 const broad=
   Math.sin(x*.0038-z*.0010)*34 +
   Math.cos(x*.0023+z*.0030)*24 +
   Math.sin((x-z)*.0065)*8;
 const fine=(Math.sin(x*.013)*Math.cos(z*.011)*5.1 + Math.sin(z*.023-x*.0048)*2.8);
 const pisteMicro=Math.sin(z*.0081+(run?.id==='south-cedar'?.9:0))*1.25+Math.sin(z*.0033+.4)*1.8+Math.sin((x-nearest.center)*.020)*.40;
 const channel=-5.5*(1-smoothstep(0,corridorWidth+32,nearest.distance));
 const identity=runSculpt(run,nearest.distance,z)*(1-corridorBlend);
 const summitCrown=50*Math.exp(-((z-3060)**2)/155000)*Math.exp(-((x+40)**2)/880000);
 const westShoulder=42*Math.exp(-((x+900)**2)/155000)*Math.exp(-((z-2250)**2)/850000);
 const eastShoulder=45*Math.exp(-((x-930)**2)/165000)*Math.exp(-((z-2200)**2)/820000);
 const centralSaddle=-22*Math.exp(-((z-2050)**2)/190000)*Math.exp(-((x-30)**2)/620000);
 const powderPillows=corridorBlend*(Math.sin(x*.0098-z*.0055)*2.0+Math.cos(x*.0062+z*.0105)*1.25);
 const offPiste=(broad*.74+fine*.56)*corridorBlend+powderPillows;
 const groomed=pisteMicro*(1-corridorBlend);
 const valleyBlend=1-smoothstep(1280,1510,z);
 const valleyTarget=91+(z-1280)*.055+Math.sin(x*.0032)*1.7;
 let h=rise+summitCrown+westShoulder+eastShoulder+centralSaddle+channel+identity+offPiste+groomed;
 h=h*(1-valleyBlend*.82)+valleyTarget*(valleyBlend*.82);

 return h;
}

export function baseTerrainHeightAt(x,z) {
 let first=null,second=null,d1=Infinity,d2=Infinity;
 for(const run of RUNS){const center=run.centerAt(z),distance=Math.abs(x-center);const entry={run,center,distance};if(distance<d1){second=first;d2=d1;first=entry;d1=distance;}else if(distance<d2){second=entry;d2=distance;}}
 const primary=terrainForRun(x,z,first);
 const weight=0.5+0.5*smoothstep(0,110,d2-d1);
 const front=(!second||d2-d1>=110)?primary:primary*weight+terrainForRun(x,z,second)*(1-weight);

 // South of Base Village the valley rises into a fully skiable second mountain.
 // Blend across a broad valley floor so the old and new faces physically meet
 // instead of creating a wall or a trench at the resort centre.
 if(z>=1120){
   const southNearest=nearestFromRuns(x,z,SOUTH_RUNS);
   const sPrimary=southTerrainForRun(x,z,southNearest.first);
   const sWeight=0.5+0.5*smoothstep(0,110,southNearest.d2-southNearest.d1);
   const south=(!southNearest.second||southNearest.d2-southNearest.d1>=110)?sPrimary:sPrimary*sWeight+southTerrainForRun(x,z,southNearest.second)*(1-sWeight);
   const southBlend=smoothstep(1120,1450,z);
   if(southBlend>0)return front*(1-southBlend)+south*southBlend;
 }

 // The opposite watershed on the far north remains Transition Mountain.
 const blend=1-smoothstep(-1760,-1460,z);
 if(blend<=0)return front;
 const ridge=160*Math.exp(-(((x+1050)/470)**2))*Math.exp(-(((z+2100)/1250)**2));
 const valleys=26*Math.sin(x*0.0034)+18*Math.cos(z*0.004+x*0.0011);
 const back=650+(z+1550)*0.28+ridge+valleys;
 return front*(1-blend)+back*blend;
}

const connectorEndpointHeightCache = new WeakMap();
function connectorPointHeight(point) {
  if (Number.isFinite(point.y)) return point.y;
  const cached = connectorEndpointHeightCache.get(point);
  if (cached !== undefined) return cached;
  const height = baseTerrainHeightAt(point.x, point.z);
  connectorEndpointHeightCache.set(point, height);
  return height;
}

function mainConnectorHeight(x, z, base) {
  let total = 0; let weighted = 0; let coverage = 0;
  for (const route of RESORT_CONNECTORS) {
    if (!route.groom) continue;
    for (let i = 1; i < route.points.length; i += 1) {
      const a = route.points[i - 1], b = route.points[i];
      const dx = b.x - a.x, dz = b.z - a.z;
      const denom = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / denom));
      const px = a.x + dx * t, pz = a.z + dz * t;
      const d = Math.hypot(x - px, z - pz);
      const feather = Math.max(28, route.width * 1.25);
      const w = 1 - smoothstep(route.width * .84, route.width + feather, d);
      if (w <= 0) continue;
      const ah = connectorPointHeight(a);
      const bh = connectorPointHeight(b);
      // Smooth, constant-grade traverse between its authored endpoints. A tiny
      // crown keeps wide crossovers readable without turning them into flat pads.
      const target = ah + (bh - ah) * t + Math.min(0.45, d * .012);
      const weight = w / (1 + d * d * .025);
      weighted += target * weight; total += weight; coverage = Math.max(coverage, w);
    }
  }
  if (!total) return base;
  const target = weighted / total;
  return base * (1 - coverage * .94) + target * (coverage * .94);
}

export function terrainHeightAt(x,z) {
  const raw = baseTerrainHeightAt(x,z);
  const connected = z > -1380 ? mainConnectorHeight(x,z,raw) : raw;
  const base=transitionHeight(x,z,connected);
  let height = routeHeight(x,z,base,baseTerrainHeightAt);

  // The South Transition chair crosses the lower ridge immediately above its
  // base. Carve the FINAL terrain result here (after connectors/routes), so the
  // opening cannot be filled back in by a groomed crossover. This is a genuine
  // skiable notch in the mountain beneath the rock portal, not just decoration.
  if (z > 1415 && z < 1555) {
    const transitionRun = SOUTH_RUNS.find((entry) => entry.id === 'south-transition');
    const portalX = transitionRun?.centerAt?.(z) ?? 1390;
    const dx = Math.abs(x - portalX);
    const dz = Math.abs(z - 1485);
    const across = 1 - smoothstep(15, 42, dx);
    const along = 1 - smoothstep(36, 70, dz);
    height -= Math.max(0, across * along) * 14.0;
  }
  return height;
}

export function terrainNormalAt(x, z, sampleDistance = 0.15) {
  const left = terrainHeightAt(x - sampleDistance, z);
  const right = terrainHeightAt(x + sampleDistance, z);
  const back = terrainHeightAt(x, z - sampleDistance);
  const front = terrainHeightAt(x, z + sampleDistance);
  const nx = left - right;
  const ny = sampleDistance * 2;
  const nz = back - front;
  const length = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / length, y: ny / length, z: nz / length };
}

export function isInsideWorld(x, z, margin = 0) {
  const limit = HALF_WORLD - margin;
  return Math.abs(x) <= limit && z >= WORLD_MIN_Z+margin && z <= WORLD_MAX_Z-margin;
}
