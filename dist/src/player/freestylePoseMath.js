const PI = Math.PI;

export function decomposeButterYaw(yaw = 0) {
  const safeYaw = Number.isFinite(yaw) ? yaw : 0;
  const rawHalfTurns = safeYaw / PI;
  let halfTurns = Math.trunc(rawHalfTurns);
  const fractional = rawHalfTurns - halfTurns;
  // Keep a deliberate 90° butter as a 90° exit instead of prematurely calling
  // it switch. Near a true half-turn (>=135° into the next segment), settle into
  // that stance so 180/540-style exits are forgiving rather than frame-perfect.
  if (Math.abs(fractional) >= 0.75) halfTurns += Math.sign(fractional);
  const residual = safeYaw - halfTurns * PI;
  return {
    halfTurns,
    residual,
    switchDelta: Math.abs(halfTurns) % 2 === 1,
  };
}

export function grabTweakStrength(tweakX = 0, tweakY = 0, deadZone = 0.14) {
  const x = Math.max(-1, Math.min(1, Number.isFinite(tweakX) ? tweakX : 0));
  const y = Math.max(-1, Math.min(1, Number.isFinite(tweakY) ? tweakY : 0));
  const horizontal = Math.max(0, (Math.abs(x) - deadZone) / Math.max(0.001, 1 - deadZone));
  const total = Math.min(1, Math.hypot(x, y));
  return {
    x,
    y,
    horizontal,
    total,
    direction: Math.sign(x),
  };
}

export function grabPoseProfile(name = '', tweak = { x: 0, y: 0 }) {
  const clean = String(name || '').replace(/^(FS|BS)\s+/, '');
  const strength = grabTweakStrength(tweak?.x, tweak?.y);
  const isLeft = clean.startsWith('LEFT');
  const isRight = clean.startsWith('RIGHT');
  const handSide = isLeft ? -1 : isRight ? 1 : 0;
  const method = clean.includes('METHOD');
  const stiffy = clean.includes('STIFFY');
  const crossbone = clean.includes('CROSSBONE');
  const double = clean === 'DOUBLE';
  const nose = clean.endsWith('NOSE');
  const tail = clean.endsWith('TAIL');
  const front = clean.endsWith('FRONT');
  const named = method || stiffy || crossbone || nose || tail || front;
  // Directional grabs should show a visible style even just past the dead-zone,
  // while still leaving lots of range for a full mouse-driven tweak.
  const style = (nose || tail || front)
    ? 0.38 + strength.total * 0.62
    : named ? 0.30 + strength.horizontal * 0.70 : strength.total * 0.55;
  return {
    clean,
    handSide,
    method,
    stiffy,
    crossbone,
    nose,
    tail,
    front,
    double,
    style: Math.max(0, Math.min(1, style)),
    vertical: strength.y,
    total: strength.total,
  };
}

export function daffyLegPose(side, amount = 1) {
  const t = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  const front = side < 0;
  return {
    x: side * (0.18 + 0.035 * t),
    y: 0.39 + (front ? 0.075 : -0.015) * t,
    z: front ? 0.42 + 0.26 * t : -0.40 - 0.24 * t,
    pitch: (front ? -1 : 1) * (0.18 + 0.60 * t),
    yaw: side * (0.05 + 0.13 * t),
    roll: (front ? -side : side) * 0.05 * t,
  };
}

export function grindPoseProfile(type = '', grindYaw = 0) {
  const clean = String(type || '');
  // When the body is rotated positive into a boardslide, the skier's +X ski is
  // the leading/front-facing ski in character-local space; negative yaw mirrors it.
  const frontSide = grindYaw >= 0 ? 1 : -1;
  const backSide = -frontSide;
  if (clean === 'FRONT SKI OFF') return { kind: 'oneSki', freeSide: frontSide, supportSide: backSide };
  if (clean === 'BACK SKI OFF') return { kind: 'oneSki', freeSide: backSide, supportSide: frontSide };
  if (clean === 'SPLIT-SIDE SLIDE') return { kind: 'split', freeSide: 0, supportSide: 0 };
  return { kind: 'base', freeSide: 0, supportSide: 0 };
}


export function grindExitProfile(grindYaw = 0, switchStance = false) {
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  // Actual ski-heading angle relative to rail travel. switchStance means the
  // ski tips already point roughly 180° opposite travel before grindYaw is added.
  const skiAngle = wrap((Number.isFinite(grindYaw) ? grindYaw : 0) + (switchStance ? PI : 0));
  const abs = Math.abs(skiAngle);
  // Hysteresis around a true boardslide prevents a tiny +/- frame wobble around
  // 90° from randomly changing the stance selected for the landing.
  let exitSwitch = Boolean(switchStance);
  if (abs > PI * 0.56) exitSwitch = true;
  else if (abs < PI * 0.44) exitSwitch = false;
  let stanceRelative = skiAngle;
  if (exitSwitch) stanceRelative = wrap(skiAngle - Math.sign(skiAngle || 1) * PI);
  // Keep momentum mainly along the rail/downhill while allowing the grind angle
  // to send the skier diagonally out. This avoids the old tangent snap without
  // launching a 90° boardslide sideways across the whole landing.
  const travelYaw = Math.max(-PI * 0.18, Math.min(PI * 0.18, stanceRelative * 0.45));
  return { switchStance: exitSwitch, travelYaw, skiAngle, stanceRelative };
}

export function cosmeticShapeProfile({ pants = 'regular', jacket = 'regular', helmet = 'standard', goggles = 'modern', gloves = 'standard', skiProfile = 'allMountain' } = {}) {
  // v0.17.4 intentionally exaggerates clothing silhouette differences enough
  // to read during normal third-person play. These remain visual-only scales.
  const pantsScale = {
    skinny: 0.67,
    slim: 0.76,
    regular: 0.94,
    baggy: 1.32,
    extraBaggy: 1.58,
    powderBib: 1.62,
    cargo: 1.38,
    retro: 1.14,
  }[pants] ?? 1;
  const jacketScale = {
    slim: 0.80,
    regular: 0.96,
    baggy: 1.20,
    oversized: 1.40,
    puffer: 1.29,
    retro: 1.10,
    windbreaker: 0.94,
    shell: 1.00,
    hoodie: 1.20,
    anorak: 1.25,
  }[jacket] ?? 1;
  const helmetScale = {
    compact: 0.90,
    standard: 0.98,
    race: 0.90,
    retro: 1.08,
    oversized: 1.17,
    sticker: 1.00,
    cat: 1.02,
    freeride: 1.05,
    visor: 1.08,
  }[helmet] ?? 0.98;
  const goggleScale = { small: 0.76, modern: 1, frameless: 1.15, retro: 0.88, cylindrical: 1.12, race: 0.90 }[goggles] ?? 1;
  const gloveScale = { park: 0.88, standard: 1, mitten: 1.14, oversized: 1.27, gauntlet: 1.10 }[gloves] ?? 1;
  const skiWidth = { park: 0.91, allMountain: 1, powder: 1.19, retro: 1.07 }[skiProfile] ?? 1;
  const skiLength = { park: 0.97, allMountain: 1, powder: 1.03, retro: 1.01 }[skiProfile] ?? 1;
  return { pantsScale, jacketScale, helmetScale, goggleScale, gloveScale, skiWidth, skiLength };
}
