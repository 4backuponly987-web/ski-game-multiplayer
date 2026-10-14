export const GRAVITY = 9.81;

export function slopeAccelerationMagnitude(normalY, gravity = GRAVITY) {
  const clampedY = Math.min(1, Math.max(-1, normalY));
  const slopeSin = Math.sqrt(Math.max(0, 1 - clampedY * clampedY));
  return gravity * slopeSin;
}

export function turnRateForSpeed(speedMetersPerSecond) {
  const speed = Math.max(0, speedMetersPerSecond);
  const t = Math.min(1, speed / 45);
  return 1.8 + (0.42 - 1.8) * t;
}

export function aerodynamicDrag(speedMetersPerSecond, tucked = false) {
  const speed = Math.max(0, speedMetersPerSecond);
  const coefficient = tucked ? 0.00115 : 0.00265;
  return coefficient * speed * speed;
}

export function stoppingDrag(braking, speedMetersPerSecond) {
  if (!braking) return 0;
  const speedFactor = Math.min(1, Math.max(0.15, speedMetersPerSecond / 11));
  return 7.2 * speedFactor;
}
