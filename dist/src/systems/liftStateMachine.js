export const LIFT_STATES = Object.freeze({
  IDLE: 'IDLE',
  APPROACH: 'APPROACH',
  BOARDING: 'BOARDING',
  RIDING: 'RIDING',
  UNLOADING: 'UNLOADING',
  RECOVERY: 'RECOVERY',
});

export function createLiftRideState() {
  return {
    state: LIFT_STATES.IDLE,
    elapsed: 0,
    totalElapsed: 0,
    progress: 0,
    lastProgress: 0,
    stagnantTime: 0,
    reason: '',
  };
}

export function beginLiftRide(state = createLiftRideState()) {
  return { ...state, state: LIFT_STATES.BOARDING, elapsed: 0, totalElapsed: 0, progress: 0, lastProgress: 0, stagnantTime: 0, reason: '' };
}

export function advanceLiftRide(state, dt, options = {}) {
  const boardingDuration = options.boardingDuration ?? 0.55;
  const rideDuration = options.rideDuration ?? 8.5;
  const unloadingDuration = options.unloadingDuration ?? 0.65;
  const maxTotal = options.maxTotal ?? Math.max(14, boardingDuration + rideDuration + unloadingDuration + 3);
  const minProgressDelta = options.minProgressDelta ?? 0.00002;
  const maxStagnant = options.maxStagnant ?? 2.8;
  const skip = Boolean(options.skip);
  const next = { ...state };
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  next.elapsed += step;
  next.totalElapsed += step;

  if (next.totalElapsed > maxTotal) return { ...next, state: LIFT_STATES.RECOVERY, reason: 'TIMEOUT' };

  if (next.state === LIFT_STATES.BOARDING) {
    if (skip) {
      next.state = LIFT_STATES.UNLOADING;
      next.progress = 1;
      next.lastProgress = 1;
      next.elapsed = 0;
    } else if (next.elapsed >= boardingDuration) {
      next.state = LIFT_STATES.RIDING;
      next.elapsed = 0;
    }
    return next;
  }

  if (next.state === LIFT_STATES.RIDING) {
    if (skip) next.progress = 1;
    else next.progress = Math.min(1, next.progress + step / Math.max(0.1, rideDuration));
    const delta = next.progress - (next.lastProgress ?? 0);
    next.stagnantTime = delta <= minProgressDelta ? (next.stagnantTime ?? 0) + step : 0;
    next.lastProgress = next.progress;
    if (next.stagnantTime > maxStagnant) return { ...next, state: LIFT_STATES.RECOVERY, reason: 'NO_PROGRESS' };
    if (next.progress >= 1) {
      next.state = LIFT_STATES.UNLOADING;
      next.elapsed = 0;
    }
    return next;
  }

  if (next.state === LIFT_STATES.UNLOADING) {
    if (skip || next.elapsed >= unloadingDuration) {
      next.state = LIFT_STATES.IDLE;
      next.elapsed = 0;
      next.progress = 1;
      next.reason = 'COMPLETE';
    }
    return next;
  }

  return next;
}

export function forceLiftRecovery(state, reason = 'MANUAL_RESET') {
  return { ...state, state: LIFT_STATES.RECOVERY, reason, elapsed: 0 };
}
