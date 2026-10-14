export const FREESTYLE_EVENTS = Object.freeze([
  {
    id: 'progression-jam', name: 'Progression Jam', lane: 'BEGINNER', offsetX: -52, duration: 60,
    thresholds: { bronze: 1200, silver: 2400, gold: 4200 }, reward: 360,
    description: 'A forgiving one-minute line through the progression lane. Clean grabs, boxes and variety beat raw rotation spam.',
  },
  {
    id: 'flow-jam', name: 'Flow Jam', lane: 'INTERMEDIATE', offsetX: 0, duration: 75,
    thresholds: { bronze: 2600, silver: 4800, gold: 7600 }, reward: 520,
    description: 'Link the centre jump-and-rail line without breaking your multiplier. Repeated tricks score less.',
  },
  {
    id: 'pro-session', name: 'Pro Session', lane: 'PRO', offsetX: 52, duration: 90,
    thresholds: { bronze: 5200, silver: 9000, gold: 14000 }, reward: 760,
    description: 'Large kickers and long technical rails. Big scores demand clean landings, held tweaks and varied combinations.',
  },
]);

export function freestyleMedal(score, thresholds) {
  if (score >= thresholds.gold) return 'GOLD';
  if (score >= thresholds.silver) return 'SILVER';
  if (score >= thresholds.bronze) return 'BRONZE';
  return 'FINISH';
}
