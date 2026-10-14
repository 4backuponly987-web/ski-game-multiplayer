export function flightLiftAcceleration(speed, pose = 'neutral') {
  const s = Math.max(0, Number.isFinite(speed) ? speed : 0);
  if (pose === 'vstyle') return Math.min(2.25, 0.75 + s * 0.025);
  if (pose === 'spreadFlight') return Math.min(1.85, 0.55 + s * 0.020);
  if (pose === 'spread') return Math.min(1.25, 0.35 + s * 0.014);
  return Math.min(0.55, s * 0.006);
}

export function flightHorizontalDrag(speed, pose = 'neutral') {
  const s = Math.max(0, Number.isFinite(speed) ? speed : 0);
  const base = 0.0025 * s;
  if (pose === 'vstyle') return base * 0.80;
  if (pose === 'spreadFlight') return base * 0.94;
  if (pose === 'spread') return base * 1.18;
  return base;
}
