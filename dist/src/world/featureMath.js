export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Cross-slope factor for a shaped-snow kicker. The central takeoff is broad and
 * flat-ish, then the shoulders blend smoothly back into the piste instead of
 * ending in vertical side walls.
 */
export function rampLateralFactor(localX, width) {
  const ax = Math.abs(localX);
  const core = width * 0.34;
  const outer = width * 0.72;
  if (ax <= core) return 1;
  if (ax >= outer) return 0;
  return 1 - smoothstep(core, outer, ax);
}

/**
 * Longitudinal shape. t=0 is the start of the takeoff, t=1 is the lip. Values
 * above 1 are the short back shoulder that blends the snow feature to terrain.
 */
export function rampLongitudinalFactor(t, backRatio = 0.22) {
  if (t <= 0) return 0;
  if (t <= 1) {
    // Progressive takeoff retains a positive tangent at its physical lip.
    return t*t;
  }
  const backT = (t - 1) / Math.max(0.05, backRatio);
  if (backT >= 1) return 0;
  return 1 - smoothstep(0, 1, backT);
}

export function rampOffset(localX, t, width, height, backRatio = 0.22, landing=false) {
  if(landing){const profile=t<0||t>1?0:t<.12?smoothstep(0,.12,t):1-smoothstep(.12,1,t);return height*rampLateralFactor(localX,width)*profile;}
  return height * rampLateralFactor(localX, width) * rampLongitudinalFactor(t, backRatio);
}
