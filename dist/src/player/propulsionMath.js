export function polePushAcceleration(speed, { maxAssistSpeed = 16, baseAcceleration = 6.2 } = {}) {
  const s = Math.max(0, Number(speed) || 0);
  if (s >= maxAssistSpeed) return 0;
  const t = 1 - s / maxAssistSpeed;
  return baseAcceleration * t * t;
}

export function pumpChargeGain({ speed = 0, normalDelta = 0, crouched = false, dt = 0 } = {}) {
  if (!crouched || speed < 4 || dt <= 0) return 0;
  const terrainActivity = Math.min(1, Math.max(0, Math.abs(normalDelta) * 85));
  return terrainActivity * Math.min(1, speed / 24) * dt * 2.8;
}

export function pumpReleaseBoost(charge, speed) {
  const c = Math.min(1, Math.max(0, Number(charge) || 0));
  const s = Math.max(0, Number(speed) || 0);
  if (c < 0.08 || s < 4) return 0;
  // A good compression/extension should be noticeable but never function as a
  // free motor. High speed reduces the reward so pumping cannot defeat drag.
  const speedFactor = 1 - Math.min(0.72, s / 70);
  return c * 2.25 * speedFactor;
}

export function polePushMode(leftDown, rightDown) {
  if (leftDown && rightDown) return 'both';
  if (leftDown) return 'left';
  if (rightDown) return 'right';
  return null;
}

export function polePushStrength(mode) {
  if (mode === 'both') return 1.0;
  if (mode === 'left' || mode === 'right') return 0.72;
  return 0;
}
