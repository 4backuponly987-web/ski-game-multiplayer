export const CHALLENGES = [
  // Core mountain progression
  { id: 'peak-to-base', name: 'Peak to Base', description: 'Start at the summit and reach the lower mountain in one run.', reward: 300, goal: 1, unit: '', category: 'MOUNTAIN', difficulty: 'STANDARD' },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Hit 110 km/h on Velocity.', reward: 220, goal: 110, unit: 'km/h', category: 'SPEED', difficulty: 'STANDARD' },
  { id: 'terminal-velocity', name: 'Terminal Velocity', description: 'Hit 145 km/h anywhere on the mountain.', reward: 420, goal: 145, unit: 'km/h', category: 'SPEED', difficulty: 'HARD' },
  { id: 'speed-king', name: 'No Brakes', description: 'Reach 185 km/h without resetting.', reward: 900, goal: 185, unit: 'km/h', category: 'SPEED', difficulty: 'EXPERT' },
  { id: 'speed-insanity', name: 'White Knuckle', description: 'Reach 205 km/h. Find the fastest line on the mountain and commit.', reward: 1700, goal: 205, unit: 'km/h', category: 'SPEED', difficulty: 'ELITE' },
  { id: 'powder-hound', name: 'Powder Hound', description: 'Ski 350 m off-piste through powder.', reward: 260, goal: 350, unit: 'm', category: 'MOUNTAIN', difficulty: 'STANDARD' },
  { id: 'backcountry', name: 'Backcountry Mission', description: 'Ski 1,000 m off-piste in one session.', reward: 520, goal: 1000, unit: 'm', category: 'MOUNTAIN', difficulty: 'HARD' },
  { id: 'powder-marathon', name: 'Powder Marathon', description: 'Ski 2,500 m of powder without relying on an activity warp.', reward: 1200, goal: 2500, unit: 'm', category: 'MOUNTAIN', difficulty: 'ELITE' },
  { id: 'powder-ultra', name: 'Powder Ultra', description: 'Accumulate 5,000 m of genuine off-piste powder skiing.', reward: 2200, goal: 5000, unit: 'm', category: 'MOUNTAIN', difficulty: 'ELITE' },

  // Park / line challenges
  { id: 'park-rat', name: 'Park Rat', description: 'Bank 1,500 trick points in Summit Park.', reward: 320, goal: 1500, unit: 'pts', category: 'PARK', difficulty: 'STANDARD' },
  { id: 'park-lord', name: 'Park Lord', description: 'Bank 6,000 trick points in Summit Park.', reward: 650, goal: 6000, unit: 'pts', category: 'PARK', difficulty: 'HARD' },
  { id: 'park-royalty', name: 'Park Royalty', description: 'Bank 15,000 trick points in Summit Park.', reward: 1400, goal: 15000, unit: 'pts', category: 'PARK', difficulty: 'ELITE' },
  { id: 'big-line', name: 'Big Line', description: 'Reach a 3.0× score multiplier.', reward: 500, goal: 3, unit: '×', category: 'LINE', difficulty: 'HARD' },
  { id: 'expert-line', name: 'Expert Line', description: 'Build a 4.5× freestyle multiplier.', reward: 850, goal: 4.5, unit: '×', category: 'LINE', difficulty: 'EXPERT' },
  { id: 'perfect-five', name: 'Maximum Heat', description: 'Reach the maximum 5.0× line multiplier.', reward: 1250, goal: 5, unit: '×', category: 'LINE', difficulty: 'ELITE' },
  { id: 'monster-line', name: '20K Line', description: 'Build a live freestyle line worth at least 20,000 points.', reward: 1350, goal: 20000, unit: 'pts', category: 'LINE', difficulty: 'EXPERT' },
  { id: 'legendary-line', name: '40K Line', description: 'Build a live freestyle line worth at least 40,000 points before it banks.', reward: 2200, goal: 40000, unit: 'pts', category: 'LINE', difficulty: 'ELITE' },
  { id: 'sixty-k-line', name: '60K Line', description: 'Build one live line to 60,000 points without letting the combo die.', reward: 3000, goal: 60000, unit: 'pts', category: 'LINE', difficulty: 'ELITE' },
  { id: 'eighty-k-line', name: '80K Line', description: 'Build an 80,000-point live line. This is a full-mountain freestyle challenge.', reward: 4200, goal: 80000, unit: 'pts', category: 'LINE', difficulty: 'ELITE' },
  { id: 'hundred-k-line', name: '100K Line', description: 'Bank a live line worth 100,000 points before the combo dies.', reward: 5200, goal: 100000, unit: 'pts', category: 'LINE', difficulty: 'ELITE' },
  { id: 'one-hit-wonder', name: 'One Hit Wonder', description: 'Land a single trick worth 2,000 points.', reward: 550, goal: 2000, unit: 'pts', category: 'TRICK', difficulty: 'HARD' },
  { id: 'monster-trick', name: 'Monster Trick', description: 'Land a single trick worth 4,000 points.', reward: 900, goal: 4000, unit: 'pts', category: 'TRICK', difficulty: 'EXPERT' },
  { id: 'six-k-trick', name: 'Six Thousand', description: 'Land one trick worth at least 6,000 points.', reward: 1350, goal: 6000, unit: 'pts', category: 'TRICK', difficulty: 'ELITE' },
  { id: 'eight-k-trick', name: 'Eight Thousand', description: 'Land one trick worth at least 8,000 points.', reward: 2000, goal: 8000, unit: 'pts', category: 'TRICK', difficulty: 'ELITE' },
  { id: 'ten-k-trick', name: 'Ten Thousand', description: 'Land one trick worth at least 10,000 points.', reward: 3000, goal: 10000, unit: 'pts', category: 'TRICK', difficulty: 'ELITE' },
  { id: 'twelve-k-trick', name: 'Twelve Thousand', description: 'Land one enormous trick worth at least 12,000 points.', reward: 4200, goal: 12000, unit: 'pts', category: 'TRICK', difficulty: 'ELITE' },

  // Rails
  { id: 'rail-rider', name: 'Rail Rider', description: 'Grind a single rail for at least 25 m.', reward: 250, goal: 25, unit: 'm', category: 'RAIL', difficulty: 'STANDARD' },
  { id: 'endless-steel', name: 'Endless Steel', description: 'Grind a single feature for at least 40 m.', reward: 420, goal: 40, unit: 'm', category: 'RAIL', difficulty: 'HARD' },
  { id: 'rail-marathon', name: 'Rail Marathon', description: 'Stay on one grindable feature for at least 60 m.', reward: 950, goal: 60, unit: 'm', category: 'RAIL', difficulty: 'EXPERT' },
  { id: 'steel-legend', name: 'Steel Legend', description: 'Hold a single grind for at least 90 m.', reward: 1600, goal: 90, unit: 'm', category: 'RAIL', difficulty: 'ELITE' },
  { id: 'grind-collector', name: 'Grind Collector', description: 'Land 5 different grind types.', reward: 450, goal: 5, unit: 'types', category: 'RAIL', difficulty: 'HARD' },
  { id: 'grind-master', name: 'Grind Encyclopaedia', description: 'Land 8 different grind types in your play history.', reward: 1250, goal: 8, unit: 'types', category: 'RAIL', difficulty: 'ELITE' },
  { id: 'one-ski-steel', name: 'One Ski Steel', description: 'Land either Q/E one-ski-off rail variation.', reward: 480, goal: 1, unit: 'grind', category: 'RAIL', difficulty: 'HARD' },
  { id: 'split-side', name: 'Split Decision', description: 'Land the F split-side ski slide.', reward: 560, goal: 1, unit: 'grind', category: 'RAIL', difficulty: 'HARD' },

  // Spins, flips and switch
  { id: 'first-flip', name: 'Upside Down', description: 'Land your first front flip or back flip.', reward: 240, goal: 1, unit: '', category: 'AIR', difficulty: 'STANDARD' },
  { id: 'spin-cycle', name: 'Spin Cycle', description: 'Land a 360 or larger spin.', reward: 230, goal: 360, unit: '°', category: 'AIR', difficulty: 'STANDARD' },
  { id: 'seven-twenty', name: '720 Club', description: 'Land a 720 spin.', reward: 480, goal: 720, unit: '°', category: 'AIR', difficulty: 'HARD' },
  { id: 'nine-hundred', name: '900 Club', description: 'Land a 900 spin.', reward: 700, goal: 900, unit: '°', category: 'AIR', difficulty: 'EXPERT' },
  { id: 'ten-eighty', name: '1080 Club', description: 'Land a 1080 spin.', reward: 900, goal: 1080, unit: '°', category: 'AIR', difficulty: 'EXPERT' },
  { id: 'twelve-sixty', name: '1260 Club', description: 'Land a 1260 spin.', reward: 1300, goal: 1260, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'fourteen-forty', name: '1440 Club', description: 'Land a 1440 spin clean enough to ride away.', reward: 1900, goal: 1440, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'sixteen-twenty', name: '1620 Club', description: 'Land a 1620 and ride away under control.', reward: 2600, goal: 1620, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'eighteen-hundred', name: '1800 Club', description: 'Land a full 1800. Maximum commitment, clean landing required.', reward: 3600, goal: 1800, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'switch-hitter', name: 'Switch Hitter', description: 'Land a 180 and keep skiing switch.', reward: 220, goal: 180, unit: '°', category: 'SWITCH', difficulty: 'STANDARD' },
  { id: 'switch-five', name: 'Switch Five', description: 'Land a 540 and ride away switch.', reward: 420, goal: 540, unit: '°', category: 'SWITCH', difficulty: 'HARD' },
  { id: 'switch-nine', name: 'Switch Nine', description: 'Land a 900 and ride away switch.', reward: 1250, goal: 900, unit: '°', category: 'SWITCH', difficulty: 'ELITE' },
  { id: 'switch-twelve', name: 'Switch 1260', description: 'Land a 1260 and ride away switch.', reward: 2800, goal: 1260, unit: '°', category: 'SWITCH', difficulty: 'ELITE' },
  { id: 'double-flip', name: 'Double Trouble', description: 'Complete at least 720° of flip rotation and land it.', reward: 1450, goal: 720, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'triple-flip', name: 'Triple Flip', description: 'Complete 1080° of flip rotation and land upright.', reward: 3200, goal: 1080, unit: '°', category: 'AIR', difficulty: 'ELITE' },
  { id: 'spin-flip-combo', name: 'Spin + Flip', description: 'Land a trick containing at least a 720 spin and a full flip.', reward: 1400, goal: 1, unit: 'combo', category: 'AIR', difficulty: 'ELITE' },
  { id: 'triple-threat', name: 'Triple Threat', description: 'Land a 720+ spin, a full flip and a grab in the same trick.', reward: 1800, goal: 1, unit: 'combo', category: 'AIR', difficulty: 'ELITE' },
  { id: 'quad-threat', name: 'Quad Threat', description: 'Land a 1080+ spin, a double flip and a grab in the same trick.', reward: 4000, goal: 1, unit: 'combo', category: 'AIR', difficulty: 'ELITE' },

  // Grabs / style
  { id: 'grab-bag', name: 'Grab Bag', description: 'Land 5 different grabs, including modified FS/BS grabs.', reward: 420, goal: 5, unit: 'grabs', category: 'STYLE', difficulty: 'HARD' },
  { id: 'grab-master', name: 'Grab Master', description: 'Land 8 different grab styles.', reward: 1100, goal: 8, unit: 'grabs', category: 'STYLE', difficulty: 'EXPERT' },
  { id: 'grab-legend', name: 'Grab Encyclopaedia', description: 'Land 10 different grab styles, including mouse-modified grabs.', reward: 2600, goal: 10, unit: 'grabs', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'spread-eagle', name: 'Classic Style', description: 'Land a held Spread Eagle.', reward: 260, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'STANDARD' },
  { id: 'method-master', name: 'Method Master', description: 'Land a Method with at least a 55% mouse tweak.', reward: 520, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'HARD' },
  { id: 'tweak-king', name: 'Tweak King', description: 'Land a Method with at least a 90% tweak.', reward: 1200, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'method-1080', name: 'Method 1080', description: 'Land a 1080 or larger while holding a Method-style grab.', reward: 1650, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'method-1440', name: 'Method 1440', description: 'Land a 1440 or larger while holding a Method-style grab.', reward: 3200, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'daffy-style', name: 'Daffy Style', description: 'Hold a Daffy in the air and land it cleanly.', reward: 420, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'HARD' },
  { id: 'daffy-720', name: 'Daffy 720', description: 'Land a 720 or larger while holding a Daffy.', reward: 1350, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'daffy-1080', name: 'Daffy 1080', description: 'Land a 1080 or larger while holding a Daffy.', reward: 2800, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'crossed-720', name: 'Crossed 720', description: 'Land a 720 or larger with crossed skis.', reward: 1350, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'crossed-1080', name: 'Crossed 1080', description: 'Land a 1080 or larger with crossed skis.', reward: 2800, goal: 1, unit: 'trick', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'butter-360', name: 'Butter 360', description: 'Rotate a full 360° nose butter without leaving the snow.', reward: 560, goal: 360, unit: '°', category: 'STYLE', difficulty: 'HARD' },
  { id: 'butter-720', name: 'Butter 720', description: 'Rotate a full 720° nose butter without leaving the snow.', reward: 1450, goal: 720, unit: '°', category: 'STYLE', difficulty: 'ELITE' },
  { id: 'butter-1080', name: 'Butter 1080', description: 'Rotate a full 1080° nose butter without leaving the snow.', reward: 3200, goal: 1080, unit: '°', category: 'STYLE', difficulty: 'ELITE' },

  // Exploration only — races and timed freestyle events were removed from the game in v0.17.12.
  { id: 'secret-stash', name: 'Secret Stash', description: 'Discover three hidden mountain locations.', reward: 600, goal: 3, unit: 'spots', category: 'EXPLORE', difficulty: 'HARD' },
  { id: 'secret-master', name: 'Mountain Detective', description: 'Find all five hidden discovery locations.', reward: 1400, goal: 5, unit: 'spots', category: 'EXPLORE', difficulty: 'EXPERT' },
];

export class ChallengeSystem {
  constructor(save, terrain, hud) {
    this.save = save;
    this.terrain = terrain;
    this.hud = hud;
    this.sessionProgress = Object.fromEntries(CHALLENGES.map((c) => [c.id, Number.isFinite(save.data.challengeProgress?.[c.id]) ? save.data.challengeProgress[c.id] : 0]));
    this.startedHigh = false;
    this.lastPosition = null;
    this.grabSet = new Set();
    this.raceSet = new Set(Object.keys(save.data.bestRaceTimes || {}));
    this.updateAccumulator = 0;
  }

  resetRun(state) {
    this.startedHigh = state.position.z < -1020;
    this.lastPosition = state.position.clone();
  }

  setProgress(id, value) {
    const previous = this.sessionProgress[id] ?? 0;
    const next = Math.max(previous, value);
    this.sessionProgress[id] = next;
    const challenge = CHALLENGES.find((c) => c.id === id);
    this.persistProgress(challenge, id, previous, next);
    if (challenge && next >= challenge.goal) this.complete(id);
  }

  addProgress(id, value) {
    const previous = this.sessionProgress[id] ?? 0;
    const next = previous + value;
    this.sessionProgress[id] = next;
    const challenge = CHALLENGES.find((c) => c.id === id);
    this.persistProgress(challenge, id, previous, next);
    if (challenge && next >= challenge.goal) this.complete(id);
  }

  persistProgress(challenge, id, previous, next) {
    if (!challenge || this.isComplete(id) || !Number.isFinite(next) || next <= previous) return;
    // localStorage is synchronous. Persist partial progress in coarse milestones
    // instead of writing at the 120 Hz physics rate.
    const step = Math.max(1, challenge.goal / 20);
    const saved = Number(this.save.data.challengeProgress?.[id] || 0);
    if (next >= challenge.goal || Math.floor(next / step) > Math.floor(saved / step)) {
      this.save.setChallengeProgress(id, Math.min(next, challenge.goal));
    }
  }

  update(state, dt = 1 / 90) {
    this.updateAccumulator += Math.max(0, Number(dt) || 0);
    if (this.updateAccumulator < 1 / 15) return;
    this.updateAccumulator %= (1 / 15);
    if (!this.lastPosition) this.lastPosition = state.position.clone();
    const distance = state.position.distanceTo(this.lastPosition);
    this.lastPosition.copy(state.position);

    if (this.startedHigh && state.position.z > 1030) this.setProgress('peak-to-base', 1);

    const nearest = this.terrain.getNearestRun(state.position.x, state.position.z);
    const speedKmh = state.speed * 3.6;
    if (nearest.run?.id === 'velocity') this.setProgress('speed-demon', speedKmh);
    this.setProgress('terminal-velocity', speedKmh);
    this.setProgress('speed-king', speedKmh);
    this.setProgress('speed-insanity', speedKmh);

    if (state.skisEquipped !== false && state.surface === 'POWDER' && state.speed > 3 && distance < 6) {
      this.addProgress('powder-hound', distance);
      this.addProgress('backcountry', distance);
      this.addProgress('powder-marathon', distance);
      this.addProgress('powder-ultra', distance);
    }
    if (Number.isFinite(state.bestButterDegrees)) {
      this.setProgress('butter-360', state.bestButterDegrees);
      this.setProgress('butter-720', state.bestButterDegrees);
      this.setProgress('butter-1080', state.bestButterDegrees);
    }
  }

  onTrick(result, state) {
    const nearest = this.terrain.getNearestRun(state.position.x, state.position.z);
    if (nearest.run?.id === 'park' && result.score > 0) {
      this.addProgress('park-rat', result.score);
      this.addProgress('park-lord', result.score);
      this.addProgress('park-royalty', result.score);
    }

    if (result.grindDistance) {
      this.setProgress('rail-rider', result.grindDistance);
      this.setProgress('endless-steel', result.grindDistance);
      this.setProgress('rail-marathon', result.grindDistance);
      this.setProgress('steel-legend', result.grindDistance);
    }
    if (result.uniqueGrinds) {
      this.setProgress('grind-collector', result.uniqueGrinds);
      this.setProgress('grind-master', result.uniqueGrinds);
    }
    if (result.flipDegrees >= 180) this.setProgress('first-flip', 1);
    if (result.flipDegrees >= 720) this.setProgress('double-flip', result.flipDegrees);
    if (result.flipDegrees >= 1080) this.setProgress('triple-flip', result.flipDegrees);

    if (result.spinDegrees) {
      this.setProgress('spin-cycle', result.spinDegrees);
      this.setProgress('seven-twenty', result.spinDegrees);
      this.setProgress('nine-hundred', result.spinDegrees);
      this.setProgress('ten-eighty', result.spinDegrees);
      this.setProgress('twelve-sixty', result.spinDegrees);
      this.setProgress('fourteen-forty', result.spinDegrees);
      this.setProgress('sixteen-twenty', result.spinDegrees);
      this.setProgress('eighteen-hundred', result.spinDegrees);
      if (state.lastSwitchLanding) {
        this.setProgress('switch-hitter', result.spinDegrees);
        this.setProgress('switch-five', result.spinDegrees);
        this.setProgress('switch-nine', result.spinDegrees);
        this.setProgress('switch-twelve', result.spinDegrees);
      }
    }

    if (result.grab) {
      this.grabSet.add(result.grab);
      this.setProgress('grab-bag', this.grabSet.size);
      this.setProgress('grab-master', this.grabSet.size);
      this.setProgress('grab-legend', this.grabSet.size);
    }
    if (result.spreadEagle) this.setProgress('spread-eagle', 1);
    if (result.daffy) this.setProgress('daffy-style', 1);
    if (/METHOD/.test(String(result.grab || '')) && (result.grabTweak || 0) >= 0.55) this.setProgress('method-master', 1);
    if (/METHOD/.test(String(result.grab || '')) && (result.grabTweak || 0) >= 0.90) this.setProgress('tweak-king', 1);
    if (/METHOD/.test(String(result.grab || '')) && result.spinDegrees >= 1080) this.setProgress('method-1080', 1);
    if (/METHOD/.test(String(result.grab || '')) && result.spinDegrees >= 1440) this.setProgress('method-1440', 1);
    if (result.daffy && result.spinDegrees >= 720) this.setProgress('daffy-720', 1);
    if (result.daffy && result.spinDegrees >= 1080) this.setProgress('daffy-1080', 1);
    if (result.crossSkis && result.spinDegrees >= 720) this.setProgress('crossed-720', 1);
    if (result.crossSkis && result.spinDegrees >= 1080) this.setProgress('crossed-1080', 1);
    if (result.spinDegrees >= 720 && result.flipDegrees >= 360) this.setProgress('spin-flip-combo', 1);
    if (result.spinDegrees >= 720 && result.flipDegrees >= 360 && result.grab) this.setProgress('triple-threat', 1);
    if (result.spinDegrees >= 1080 && result.flipDegrees >= 720 && result.grab) this.setProgress('quad-threat', 1);

    if (result.grindType === 'FRONT SKI OFF' || result.grindType === 'BACK SKI OFF') this.setProgress('one-ski-steel', 1);
    if (result.grindType === 'SPLIT-SIDE SLIDE') this.setProgress('split-side', 1);
    if (result.multiplier) {
      this.setProgress('big-line', result.multiplier);
      this.setProgress('expert-line', result.multiplier);
      this.setProgress('perfect-five', result.multiplier);
    }
    if (result.lineScore) {
      this.setProgress('monster-line', result.lineScore);
      this.setProgress('legendary-line', result.lineScore);
      this.setProgress('sixty-k-line', result.lineScore);
      this.setProgress('eighty-k-line', result.lineScore);
      this.setProgress('hundred-k-line', result.lineScore);
    }
    if (result.score) {
      this.setProgress('one-hit-wonder', result.score);
      this.setProgress('monster-trick', result.score);
      this.setProgress('six-k-trick', result.score);
      this.setProgress('eight-k-trick', result.score);
      this.setProgress('ten-k-trick', result.score);
      this.setProgress('twelve-k-trick', result.score);
    }
  }

  onRace() {}

  onDiscovery(count) {
    this.setProgress('secret-stash', count);
    this.setProgress('secret-master', count);
  }

  isComplete(id) { return this.save.data.completedChallenges.includes(id); }

  complete(id) {
    if (this.isComplete(id)) return false;
    const challenge = CHALLENGES.find((entry) => entry.id === id);
    if (!challenge || !this.save.completeChallenge(id)) return false;
    this.save.addCredits(challenge.reward);
    const xp = Math.max(80, Math.round(challenge.reward * 0.62));
    this.save.addXP(xp);
    this.hud.updateProgress(this.save);
    this.hud.showMessage(`${challenge.name.toUpperCase()} COMPLETE · +${challenge.reward} CREDITS · +${xp} XP`, 3.2);
    this.hud.updateCredits(this.save.getCredits());
    return true;
  }

  onFreestyleEvent() {}

  // Retained for compatibility with old activity callbacks. The dedicated
  // Extreme Activities menu was removed in v0.17.3, so these no longer drive
  // visible challenge cards.
  onSkiJump() {}
  onCorbetsClear() {}
  onAvalancheEscape() {}

  getList() {
    return CHALLENGES.map((challenge) => ({
      ...challenge,
      complete: this.isComplete(challenge.id),
      progress: Math.min(challenge.goal, this.sessionProgress[challenge.id] ?? 0),
    }));
  }
}
