export const LIFT_LAYOUT = Object.freeze({
  approachZ: 1030,
  gateZ: 1060,
  boardZ: 1090,
  bottomZ: 1110,
  topZ: -1110,
  laneHalfWidth: 4.25,
  gateRadius: 8.5,
  pickupRadius: 15,
  maxAutoBoardSpeed: 28,
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Return useful X/Z metrics for the loading lane.  This deliberately projects
 * onto the gate->chair segment rather than relying on a hard-coded world-Z
 * direction, so the same boarding logic keeps working if a run/lift is moved
 * or curved later.
 */
export function boardingMetrics(position, lift) {
  if (!position || !lift?.gatePoint || !lift?.boardPoint) {
    return {
      laneT: -Infinity,
      lateralDistance: Infinity,
      gateDistance: Infinity,
      boardDistance: Infinity,
      approachDistance: Infinity,
      laneX: 0,
      laneZ: 0,
    };
  }

  const gx = lift.gatePoint.x;
  const gz = lift.gatePoint.z;
  const bx = lift.boardPoint.x;
  const bz = lift.boardPoint.z;
  const dx = bx - gx;
  const dz = bz - gz;
  const lengthSq = Math.max(0.0001, dx * dx + dz * dz);
  const rawT = ((position.x - gx) * dx + (position.z - gz) * dz) / lengthSq;
  const clampedT = clamp01(rawT);
  const laneX = gx + dx * clampedT;
  const laneZ = gz + dz * clampedT;
  const lateralDistance = Math.hypot(position.x - laneX, position.z - laneZ);
  const gateDistance = Math.hypot(position.x - gx, position.z - gz);
  const boardDistance = Math.hypot(position.x - bx, position.z - bz);
  const approachDistance = lift.approachPoint
    ? Math.hypot(position.x - lift.approachPoint.x, position.z - lift.approachPoint.z)
    : Infinity;

  return {
    laneT: rawT,
    lateralDistance,
    gateDistance,
    boardDistance,
    approachDistance,
    laneX,
    laneZ,
  };
}

export function boardingStateAt(position, lift) {
  if (!position || !lift) return 'NONE';
  if (Number.isFinite(position.y) && Number.isFinite(lift.boardPoint?.y) && Math.abs(position.y - lift.boardPoint.y) > 26) return 'NONE';
  const m = boardingMetrics(position, lift);

  // The gate gets a generous circular trigger.  It is intentionally wider than
  // the old exact-Z strip so a skier can enter slightly diagonally without the
  // interaction silently failing.
  if (m.gateDistance <= LIFT_LAYOUT.gateRadius) return 'GATE';

  // The loading lane includes a little space before the gate and past the chair
  // pickup.  This prevents the player from falling out of the interaction state
  // because they crossed one exact coordinate between fixed physics frames.
  if (
    m.laneT >= -0.10 &&
    m.laneT <= 1.34 &&
    m.lateralDistance <= LIFT_LAYOUT.laneHalfWidth
  ) return 'LOADING';

  if (m.approachDistance <= 64) return 'APPROACH';
  return 'NONE';
}

export function canAutoBoard(position, speed, lift) {
  if (!lift || !position) return false;
  if (boardingStateAt(position, lift) !== 'LOADING') return false;
  const m = boardingMetrics(position, lift);

  // Board once the skier is well through the gate OR physically close to the
  // chair pickup.  This is intentionally much more forgiving than the previous
  // 4.8 m sliver which users could skip in a single fast frame.
  const deepEnough = m.laneT >= 0.42 || m.boardDistance <= LIFT_LAYOUT.pickupRadius;
  if (!deepEnough) return false;
  return Number.isFinite(speed) && speed <= LIFT_LAYOUT.maxAutoBoardSpeed;
}

export function canManualBoard(position, lift) {
  if (!lift || !position) return false;
  const state = boardingStateAt(position, lift);
  if (state === 'GATE') return true;
  if (state !== 'LOADING') return false;
  const m = boardingMetrics(position, lift);
  return m.laneT >= 0.18 || m.boardDistance <= LIFT_LAYOUT.pickupRadius + 8;
}

/** Map normalized lift ride progress onto the actual uphill cable curve.
 * The ride begins at the chair pickup point rather than the very end of the
 * cable, so the player and visible chair stay synchronized from frame one.
 */
export function rideCurveT(progress, boardCurveT = 0) {
  const p = clamp01(Number.isFinite(progress) ? progress : 0);
  const start = clamp01(Number.isFinite(boardCurveT) ? boardCurveT : 0);
  return start + (1 - start) * p;
}
