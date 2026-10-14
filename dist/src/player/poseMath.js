export function carveKneeBend(steer, speedRatio, grounded = true) {
  if (!grounded) return 0;
  const s = Math.min(1, Math.max(0, Math.abs(Number(steer) || 0)));
  const speed = Math.min(1, Math.max(0, Number(speedRatio) || 0));
  // Deliberately more visible than v0.13: even medium-speed carves should read
  // through the legs, while high-speed full-lock turns become a deep athletic flex.
  return Math.min(1, s * (0.40 + speed * 0.64));
}

export function shouldAutoFlipTuck({ grounded, grinding = false, liftMode = false, spreadEagle = false, skiJumpPose = false, airPitch = 0 } = {}) {
  return !grounded && !grinding && !liftMode && !spreadEagle && !skiJumpPose && Math.abs(Number(airPitch) || 0) > 0.055;
}
