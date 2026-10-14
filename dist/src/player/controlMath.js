export function groundSteerFromKeys(leftDown, rightDown) {
  // Physics positive yaw is visually skier-left in this coordinate system.
  return (leftDown ? 1 : 0) - (rightDown ? 1 : 0);
}

export function airSpinFromKeys(leftDown, rightDown) {
  // v0.14 convention: A = anticlockwise, D = clockwise. In this world/camera
  // orientation positive yaw reads anticlockwise, so A must be positive.
  return (leftDown ? 1 : 0) - (rightDown ? 1 : 0);
}

export function airFlipFromKeys(frontDown, backDown) {
  // Positive X rotation is the visible front-flip direction.
  return (frontDown ? 1 : 0) - (backDown ? 1 : 0);
}

export function grabSideFromSpin(spinAxis) {
  if (spinAxis < -0.05) return 'FS';
  if (spinAxis > 0.05) return 'BS';
  return '';
}


export function mouseGrabFromButtons(leftDown, rightDown) {
  if (leftDown && rightDown) return 'DOUBLE';
  if (leftDown) return 'LEFT';
  if (rightDown) return 'RIGHT';
  return null;
}


export function mouseGrabTrick(leftDown, rightDown, tweakX = 0, tweakY = 0, crossSkis = false) {
  const base = mouseGrabFromButtons(leftDown, rightDown);
  if (!base || base === 'DOUBLE') return base;
  if (crossSkis) return base === 'LEFT' ? 'LEFT FRONT' : 'RIGHT FRONT';
  const x = Math.max(-1, Math.min(1, Number.isFinite(tweakX) ? tweakX : 0));
  const y = Math.max(-1, Math.min(1, Number.isFinite(tweakY) ? tweakY : 0));
  if (Math.abs(y) >= 0.28 && Math.abs(y) >= Math.abs(x) + 0.04) {
    if (base === 'LEFT') return y > 0 ? 'LEFT NOSE' : 'LEFT TAIL';
    return y > 0 ? 'RIGHT NOSE' : 'RIGHT TAIL';
  }
  // A small dead-zone keeps the initial grab stable. Past it, horizontal mouse
  // travel chooses a named tweak while remaining continuous in intensity.
  if (Math.abs(x) < 0.14) return base;
  if (base === 'LEFT') return x > 0 ? 'LEFT METHOD' : 'LEFT STIFFY';
  return x > 0 ? 'RIGHT METHOD' : 'RIGHT CROSSBONE';
}

export function clampGrabTweak(x, y) {
  const cx = Math.max(-1, Math.min(1, Number.isFinite(x) ? x : 0));
  const cy = Math.max(-1, Math.min(1, Number.isFinite(y) ? y : 0));
  return { x: cx, y: cy, magnitude: Math.min(1, Math.hypot(cx, cy)) };
}
