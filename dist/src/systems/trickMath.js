export function snapHalfTurnDegrees(radians) {
  const degrees = Math.abs(radians) * 180 / Math.PI;
  if (degrees < 105) return 0;
  return Math.max(180, Math.round(degrees / 180) * 180);
}

export function halfTurnCount(radians) {
  // Once the skier has crossed 90 degrees, classify the nearest half-turn and
  // let the landing-safety window decide whether it is actually landable. This
  // is important in pipes, where the wider wall-landing tolerance can accept a
  // ~96 degree scrub: an accepted landing must never then snap back to regular.
  if (Math.abs(radians) < Math.PI * 0.50) return 0;
  return Math.round(radians / Math.PI);
}

export function changesSwitchStance(radians) {
  return Math.abs(halfTurnCount(radians)) % 2 === 1;
}

export function rotationLandingError(radians) {
  const halfTurns = Math.round(radians / Math.PI);
  const target = halfTurns * Math.PI;
  return Math.abs(radians - target);
}

export function rotationLandingErrorDegrees(radians) {
  return rotationLandingError(radians) * 180 / Math.PI;
}

/**
 * Skis can scrub a slightly imperfect landing, but landing substantially
 * sideways should be a crash instead of the character magically snapping
 * back to the travel direction. 55 degrees leaves room for sketchy landings
 * while making ~90-degree landings reliably fail.
 */
export function isUnsafeSpinLanding(radians, thresholdDegrees = 55) {
  return rotationLandingErrorDegrees(radians) > thresholdDegrees;
}


export function flipLandingErrorDegrees(radians) {
  const fullTurns = Math.round(radians / (Math.PI * 2));
  const target = fullTurns * Math.PI * 2;
  return Math.abs(radians - target) * 180 / Math.PI;
}

/**
 * A flip must come back upright. Tiny accidental pitch inputs are tolerated,
 * but once a rider has committed to a flip, landing more than ~55 degrees away
 * from an upright full rotation is a bail. This catches head/shoulder landings
 * and visibly under-rotated flips while still allowing a slightly sketchy 360.
 */
export function isUnsafeFlipLanding(radians, thresholdDegrees = 55) {
  const attemptedDegrees = Math.abs(radians) * 180 / Math.PI;
  if (attemptedDegrees < 80) return false;
  return flipLandingErrorDegrees(radians) > thresholdDegrees;
}
