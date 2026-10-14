export const SPECIAL_ZONES = {
  skiJump: {
    id: 'ski-jump', name: 'Alpine Flight Centre', centerX: 1450, halfWidth: 86,
    startZ: -1380, takeoffZ: -360, finishZ: 960, terrainEndZ: 1150,
    spawn: { x: 1450, z: -1325 },
  },
  corbets: {
    id: 'corbets', name: "Corbet's Couloir · Inspired", centerX: -1180, halfWidth: 78,
    startZ: -1260, entryZ: -1080, finishZ: -410, terrainEndZ: 1150,
    spawn: { x: -1180, z: -1228 },
    activityType: 'legendary',
  },
  streif: {
    id: 'streif', name: 'Streif · Inspired', centerX: 1080, halfWidth: 108,
    startZ: -1260, entryZ: -1110, finishZ: 900, terrainEndZ: 1150,
    spawn: { x: 1080, z: -1228 },
    activityType: 'legendary',
  },
  swissWall: {
    id: 'swiss-wall', name: 'Swiss Wall · Inspired', centerX: 1760, halfWidth: 72,
    startZ: -1220, entryZ: -1120, finishZ: 420, terrainEndZ: 1150,
    spawn: { x: 1760, z: -1185 },
    activityType: 'legendary',
  },
  heli: {
    id: 'heli', name: 'Remote Freeride Face', centerX: -1535, halfWidth: 260,
    startZ: -1250, finishZ: 1050, terrainEndZ: 1250,
    spawn: { x: -1535, z: -1190 },
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};

export function specialZoneAt(x, z) {
  for (const zone of Object.values(SPECIAL_ZONES)) {
    if (z < zone.startZ - 80 || z > (zone.terrainEndZ ?? zone.finishZ + 80)) continue;
    const feather = zone.id === 'corbets' ? 125 : 70;
    if (Math.abs(x - zone.centerX) <= zone.halfWidth + feather) return zone;
  }
  return null;
}

function jumpTargetHeight(x, z) {
  const zone = SPECIAL_ZONES.skiJump;
  const lateral = Math.abs(x - zone.centerX) / zone.halfWidth;
  let center;
  if (z <= zone.takeoffZ) {
    const t = clamp01((z - zone.startZ) / (zone.takeoffZ - zone.startZ));
    center = 708 - 455 * (0.72 * t + 0.28 * t * t);
    // Physical takeoff table: the final 105 m rises progressively, giving the
    // skier a real upward tangent before the terrain drops away at the lip.
    const lip = smoothstep(zone.takeoffZ - 105, zone.takeoffZ, z);
    center += 8.5 * lip * lip;
  } else {
    const d = z - zone.takeoffZ;
    // Landing hill deliberately begins below the takeoff table so leaving the
    // lip naturally creates flight; the skier is not launched by an invisible
    // upward impulse.
    center = 245 - d * 0.37 + 0.000105 * d * d;
    // Beyond 430 m of flight distance, flatten into the real village elevation.
    // The earlier landing hill and takeoff geometry are preserved.
    if(d>430){const start=245-430*0.37+0.000105*430*430;center=start-16*(1-Math.exp(-(d-430)/57))-0.002*(d-430);}
  }
  const sideBank = Math.max(0, lateral - 0.58) ** 2 * 115;
  return center + sideBank + Math.sin(z * 0.018) * 0.45;
}

function corbetsTargetHeight(x, z) {
  // v0.13.3: smooth, continuous couloir floor with restrained side banks.
  // The dramatic rock walls are visual meshes; the skiable snow surface itself
  // no longer rises tens of metres over a few vertices, which caused camera/
  // terrain tearing on steep approaches.
  const zone = SPECIAL_ZONES.corbets;
  const dx = x - zone.centerX;
  const lateral = Math.abs(dx);
  const p = clamp01((z - zone.startZ) / (zone.finishZ - zone.startZ));

  // Continuous fall line: roughly 430 m vertical over the playable descent,
  // with a small but skiable entrance roll instead of a discontinuous drop.
  let center = 700 - p * 430;
  center -= 3.2 * smoothstep(zone.entryZ - 8, zone.entryZ + 34, z);
  center += Math.sin((Math.min(z,zone.finishZ) - zone.entryZ) * 0.018) * 0.7;
  // A descent ending below surrounding terrain needs a valley runout, not
  // a short blend that creates an unrideable uphill wall at the finish.
  center -= Math.max(0,z-zone.finishZ)*0.12;

  // Keep the throat narrow but avoid near-vertical snow walls. Rock meshes in
  // Environment.js provide the visual enclosure without corrupting collision.
  const bankStart = 25;
  const bankT = clamp01((lateral - bankStart) / Math.max(1, zone.halfWidth - bankStart));
  const bank = Math.pow(bankT, 2.0) * 18;
  const asymmetricCamber = dx * 0.025 * Math.exp(-((z + 920) ** 2) / 85000);
  return center + bank + asymmetricCamber;
}

function streifTargetHeight(x, z) {
  const zone = SPECIAL_ZONES.streif;
  const dx = x - zone.centerX;
  const lateral = Math.abs(dx) / zone.halfWidth;
  const p = clamp01((z - zone.startZ) / (zone.finishZ - zone.startZ));
  // Approximate gameplay interpretation: very fast fall-line sections,
  // compressions and a traverse rather than a geographical replica.
  let center = 704 - p * 610;
  center -= 18 * smoothstep(-940, -870, z);
  center -= 24 * smoothstep(-250, -165, z);
  center += 12 * Math.exp(-((z - 210) ** 2) / 9500); // compression / exit rise
  center += Math.sin(Math.min(z,zone.finishZ) * 0.018) * 1.7;
  center += 55*smoothstep(250,850,z);
  center -= Math.max(0,z-zone.finishZ)*0.12;
  const banking = Math.pow(Math.max(0, lateral - 0.66), 1.9) * 34;
  const traverseCamber = dx * 0.035 * Math.exp(-((z + 520) ** 2) / 100000);
  return center + banking + traverseCamber;
}

function swissWallTargetHeight(x, z) {
  const zone = SPECIAL_ZONES.swissWall;
  const dx = x - zone.centerX;
  const lateral = Math.abs(dx) / zone.halfWidth;
  const p = clamp01((z - zone.startZ) / (zone.finishZ - zone.startZ));
  let center = 690 - p * 520;
  // Dense deterministic mogul field that becomes stronger below the rollover.
  const mogulMix = smoothstep(-1060, -900, z) * (1 - smoothstep(250, 440, z));
  const moguls = mogulMix * (
    Math.sin(z * 0.105 + dx * 0.045) * 3.0 +
    Math.sin(z * 0.071 - dx * 0.082) * 2.1
  );
  center += moguls;
  center += 70*smoothstep(-200,420,z);
  center -= Math.max(0,z-zone.finishZ)*0.205;
  center += Math.pow(Math.max(0, lateral - 0.72), 2.0) * 28;
  return center;
}

function heliTargetHeight(x, z) {
  const zone = SPECIAL_ZONES.heli;
  const dx = x - zone.centerX;
  const lateral = Math.abs(dx) / zone.halfWidth;
  const p = clamp01((z - zone.startZ) / (zone.finishZ - zone.startZ));
  let center = 690 - p * 650;
  center += Math.sin(z * 0.012 + dx * 0.006) * 14 + Math.sin(z * 0.031 - dx * 0.016) * 6;
  center += Math.pow(Math.max(0, lateral - 0.7), 1.8) * 76;
  for (const [cz, drop, width] of [[-610, 18, 30], [-40, 25, 38], [560, 16, 32]]) {
    center -= drop * smoothstep(cz - width, cz + width, z);
  }
  center += 110*smoothstep(300,1000,z);
  center -= Math.max(0,z-zone.finishZ)*0.04;
  // Distinct sub-faces make the three heli drops genuinely different.
  center += 14 * Math.exp(-((dx + 165) ** 2) / 3800) * Math.exp(-((z + 760) ** 2) / 120000); // north ridge
  center -= 20 * Math.exp(-((dx + 115) ** 2) / 3400) * Math.exp(-((z + 320) ** 2) / 150000); // north chute
  center -= 18 * Math.exp(-((dx - 8) ** 2) / 5200) * Math.exp(-((z - 120) ** 2) / 210000); // central bowl
  center -= 22 * Math.exp(-((dx - 175) ** 2) / 3600) * Math.exp(-((z + 40) ** 2) / 150000); // south chute
  center += 10 * Math.exp(-((dx - 150) ** 2) / 4700) * Math.exp(-((z - 520) ** 2) / 95000); // south rollover
  return center;
}

export function specialTerrainBlend(x, z, baseHeight) {
  const zone = specialZoneAt(x, z);
  if (!zone) return { height: baseHeight, zone: null, blend: 0 };
  const lateral = Math.abs(x - zone.centerX);
  const feather = zone.id === 'corbets' ? 125 : 70;
  const blend = (1 - smoothstep(zone.halfWidth, zone.halfWidth + feather, lateral)) * smoothstep(zone.startZ-80,zone.startZ,z) * (1-smoothstep(zone.terrainEndZ?zone.terrainEndZ-220:zone.finishZ,zone.terrainEndZ??zone.finishZ+80,z));
  let target = baseHeight;
  if (zone.id === 'ski-jump') target = jumpTargetHeight(x, z);
  else if (zone.id === 'corbets') target = corbetsTargetHeight(x, z);
  else if (zone.id === 'streif') target = streifTargetHeight(x, z);
  else if (zone.id === 'swiss-wall') target = swissWallTargetHeight(x, z);
  else if (zone.id === 'heli') target = heliTargetHeight(x, z);
  return { height: baseHeight * (1 - blend) + target * blend, zone, blend };
}

export function specialSurfaceAt(x, z) {
  const zone = specialZoneAt(x, z);
  if (!zone) return null;
  // Terrain blending uses a wide feather outside each authored activity venue,
  // but the feather is NOT prepared piste. Only the actual venue footprint may
  // override normal surface classification; its blended shoulders stay powder.
  if (Math.abs(x - zone.centerX) > zone.halfWidth) return null;
  if (zone.id === 'heli') return 'POWDER';
  if (zone.id === 'corbets') return z < -1030 ? 'ICY' : 'POWDER';
  if (zone.id === 'streif') return 'ICY';
  if (zone.id === 'swiss-wall') return z < -970 ? 'ICY' : 'GROOMED';
  return 'GROOMED';
}
