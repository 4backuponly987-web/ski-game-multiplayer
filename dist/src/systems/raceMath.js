export function medalForTime(time, thresholds) {
  if (!Number.isFinite(time) || time <= 0) return null;
  if (time <= thresholds.gold) return 'GOLD';
  if (time <= thresholds.silver) return 'SILVER';
  if (time <= thresholds.bronze) return 'BRONZE';
  return 'FINISH';
}

export function passedGate(lastZ, position, gate) {
  if (!gate || !position || !Number.isFinite(lastZ)) return false;
  if (!(lastZ < gate.z && position.z >= gate.z)) return false;
  return Math.abs(position.x - gate.x) <= gate.halfWidth;
}

export function missedGate(position, gate) {
  return Boolean(gate && position?.z > gate.z + 14 && Math.abs(position.x - gate.x) > gate.halfWidth);
}

export function raceDirectionYaw(from, target) {
  if (!from || !target) return 0;
  const dx = Number(target.x) - Number(from.x);
  const dz = Number(target.z) - Number(from.z);
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < 1e-8) return 0;
  return Math.atan2(dx, dz);
}
