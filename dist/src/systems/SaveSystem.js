const SAVE_KEY = 'alpine-freeride-save-v4';
const LEGACY_SAVE_KEYS = ['alpine-freeride-save-v3','alpine-freeride-save-v2'];
const SAVE_VERSION = 4;

export const CUSTOMIZATION_CATALOG = {
  skin: [
    { id: 'porcelain', name: 'Porcelain', color: '#f2d5c4', price: 0 },
    { id: 'warm', name: 'Warm', color: '#d7a07e', price: 0 },
    { id: 'tan', name: 'Tan', color: '#b87555', price: 0 },
    { id: 'deep', name: 'Deep', color: '#7a4936', price: 0 },
    { id: 'dark', name: 'Dark', color: '#4a2e26', price: 0 },
  ],
  helmet: [
    { id: 'snow', name: 'Reference Matte Black', color: '#15191d', price: 0, style: 'compact' },
    { id: 'obsidian', name: 'Obsidian', color: '#151a20', price: 180, style: 'standard' },
    { id: 'solar', name: 'Solar Orange', color: '#ff7a1a', price: 240, style: 'standard' },
    { id: 'ice', name: 'Ice Blue', color: '#52c7e8', price: 280, style: 'standard' },
    { id: 'patrol', name: 'Patrol Red', color: '#b51f2d', price: 520, levelReq: 5, style: 'race' },
    { id: 'retro-dome', name: 'Retro Dome', color: '#e8d6a8', price: 430, style: 'retro' },
    { id: 'big-lid', name: 'Big Lid', color: '#778a99', price: 620, style: 'oversized' },
    { id: 'sticker-lid', name: 'Sticker Bomb', color: '#f3f1e7', price: 0, passTier: 15, style: 'sticker', pattern: 'stickers' },
    { id: 'cat-lid', name: 'Cat Ears', color: '#d9e7ec', price: 0, passTier: 30, style: 'cat' },
    { id: 'ridge-pro-lid', name: 'Ridge Pro Freeride', color: '#20272c', price: 0, passTier: 35, style: 'freeride' },
    { id: 'carbon-visor-lid', name: 'Carbon Visor Lid', color: '#12181d', price: 0, passTier: 40, style: 'visor' },
    { id: 'summit-carbon', name: 'Summit Carbon Pro', color: '#0f1519', price: 0, passTier: 41, style: 'freeride' },
    { id: 'whiteout-visor', name: 'Whiteout Visor Pro', color: '#e7eef1', price: 0, passTier: 47, style: 'visor' },
  ],
  jacket: [
    { id: 'ember', name: 'Reference Stone Shell', color: '#d9d5c8', price: 0, style: 'baggy' },
    { id: 'alpine', name: 'Alpine Blue', color: '#2d86c8', price: 180, style: 'slim' },
    { id: 'mint', name: 'Mint Park Jacket', color: '#61d8b2', price: 220, style: 'baggy' },
    { id: 'midnight', name: 'Midnight Shell', color: '#172b45', price: 260, style: 'shell' },
    { id: 'sunset', name: 'Sunset Puffer', color: '#e35f86', price: 320, style: 'puffer' },
    { id: 'storm', name: 'Storm Shell', color: '#5f6d83', price: 560, levelReq: 6, style: 'shell' },
    { id: 'stripe-oversize', name: 'Striped Oversize', color: '#477d9d', price: 0, passTier: 10, style: 'oversized', pattern: 'stripes' },
    { id: 'retro-block', name: 'Retro Block Jacket', color: '#ce6650', price: 0, passTier: 20, style: 'retro', pattern: 'retro' },
    { id: 'checker-hoodie', name: 'Checker Hoodie', color: '#6c78a7', price: 0, passTier: 27, style: 'hoodie', pattern: 'checker' },
    { id: 'mountain-anorak', name: 'Mountain Anorak', color: '#c8c3b4', price: 0, passTier: 33, style: 'anorak', pattern: 'plain' },
    { id: 'storm-mega-shell', name: 'Storm Mega Shell', color: '#526878', price: 0, passTier: 38, style: 'oversized', pattern: 'checker' },
    { id: 'summit-overshell', name: 'Summit Overshell', color: '#26343d', price: 0, passTier: 42, style: 'oversized', pattern: 'plain' },
    { id: 'legend-anorak', name: 'Legend Anorak', color: '#c2b89d', price: 0, passTier: 48, style: 'anorak', pattern: 'retro' },
  ],
  pants: [
    { id: 'navy', name: 'Reference Olive Cargo', color: '#424a38', price: 0, style: 'baggy' },
    { id: 'slate', name: 'Slate Slim', color: '#46535d', price: 150, style: 'slim' },
    { id: 'snow', name: 'Snow Cargo', color: '#e5edf2', price: 190, style: 'cargo' },
    { id: 'forest', name: 'Forest Baggy', color: '#264c3b', price: 220, style: 'baggy' },
    { id: 'baggy-black', name: 'Baggy Black', color: '#1b2026', price: 0, passTier: 5, style: 'baggy' },
    { id: 'mega-baggy', name: 'Extra Baggy Park', color: '#35343c', price: 0, passTier: 18, style: 'extraBaggy' },
    { id: 'retro-stripe', name: 'Retro Stripe Trousers', color: '#9e5e49', price: 0, passTier: 24, style: 'retro', pattern: 'stripes' },
    { id: 'race-skinny', name: 'Race Skinny Trousers', color: '#232b31', price: 0, passTier: 32, style: 'skinny' },
    { id: 'powder-bib', name: 'Powder Bib Extra Baggy', color: '#445040', price: 0, passTier: 36, style: 'powderBib' },
    { id: 'summit-bib', name: 'Summit Bib', color: '#283236', price: 0, passTier: 43, style: 'powderBib' },
    { id: 'park-denim', name: 'Park Denim Baggy', color: '#354759', price: 0, passTier: 49, style: 'extraBaggy' },
  ],
  skis: [
    { id: 'glacier', name: 'Reference Black Twins', color: '#ffffff', price: 0, pattern: 'reference', profile: 'park' },
    { id: 'neon', name: 'Neon Twins', color: '#d8ff3e', price: 250, pattern: 'alpine', profile: 'park' },
    { id: 'carbon', name: 'Carbon All-Mountain', color: '#1a1f23', price: 320, pattern: 'alpine', profile: 'allMountain' },
    { id: 'sunburst', name: 'Sunburst Retro', color: '#ff643d', price: 360, pattern: 'retro', profile: 'retro' },
    { id: 'violet', name: 'Violet Park', color: '#8d66ff', price: 420, pattern: 'alpine', profile: 'park' },
    { id: 'powder', name: 'Powder 108', color: '#f0b84e', price: 650, levelReq: 7, pattern: 'retro', profile: 'powder' },
    { id: 'park-pro', name: 'Park Pro', color: '#e95fe4', price: 720, levelReq: 8, pattern: 'checker', profile: 'park' },
    { id: 'stripe-twins', name: 'Striped Twins', color: '#69b8d0', price: 0, passTier: 3, pattern: 'stripes', profile: 'park' },
    { id: 'sticker-twins', name: 'Sticker Bomb Twins', color: '#f3f0e4', price: 0, passTier: 22, pattern: 'stickers', profile: 'allMountain' },
    { id: 'retro-twins', name: 'Retro 90s Twins', color: '#e86b45', price: 0, passTier: 28, pattern: 'retro', profile: 'retro' },
    { id: 'ridge-freeride', name: 'Ridge Freeride 104', color: '#dde6e7', price: 0, passTier: 39, pattern: 'checker', profile: 'powder' },
    { id: 'blackout-twins', name: 'Blackout Twins', color: '#171b20', price: 0, passTier: 44, pattern: 'checker', profile: 'park' },
    { id: 'legend-110', name: 'Legend 110 Freeride', color: '#d8ddd8', price: 0, passTier: 50, pattern: 'retro', profile: 'powder' },
  ],
  goggles: [
    { id: 'ocean', name: 'Blue-Purple Mirror', color: '#ffffff', price: 0, style: 'modern' },
    { id: 'gold', name: 'Gold Frameless', color: '#c88a2b', price: 170, style: 'frameless' },
    { id: 'rose', name: 'Rose Compact', color: '#b84f75', price: 190, style: 'small' },
    { id: 'storm', name: 'Storm Retro', color: '#737f94', price: 360, levelReq: 4, style: 'retro' },
    { id: 'ice-mirror', name: 'Ice Mirror Frameless', color: '#73cde7', price: 0, passTier: 12, style: 'frameless' },
    { id: 'violet-cylinder', name: 'Violet Cylindrical', color: '#745dff', price: 0, passTier: 31, style: 'cylindrical' },
    { id: 'race-low-profile', name: 'Race Low Profile', color: '#ff704f', price: 0, passTier: 37, style: 'race' },
    { id: 'black-ice-lens', name: 'Black Ice Frameless', color: '#263448', price: 0, passTier: 45, style: 'frameless' },
  ],
  gloves: [
    { id: 'black-park', name: 'Black Technical Gloves', color: '#111416', price: 0, style: 'standard' },
    { id: 'storm-glove', name: 'Storm Gloves', color: '#586775', price: 120, style: 'standard' },
    { id: 'cream-mitts', name: 'Cream Mittens', color: '#e7ddc8', price: 210, style: 'mitten' },
    { id: 'big-mitts', name: 'Oversized Park Mitts', color: '#b94d52', price: 340, style: 'oversized' },
    { id: 'gauntlet-pro', name: 'Gauntlet Pro Gloves', color: '#29383f', price: 0, passTier: 34, style: 'gauntlet' },
    { id: 'legend-mitts', name: 'Legend Park Mitts', color: '#171a1d', price: 0, passTier: 46, style: 'oversized' },
  ],
};

export const BATTLE_PASS_TIERS = Array.from({ length: 50 }, (_, index) => {
  const tier = index + 1;
  const rewards = {
    1: { type: 'credits', amount: 100, name: '100 credits' },
    3: { type: 'item', category: 'skis', id: 'stripe-twins', name: 'Striped Twins skis' },
    5: { type: 'item', category: 'pants', id: 'baggy-black', name: 'Baggy Black trousers' },
    8: { type: 'credits', amount: 220, name: '220 credits' },
    10: { type: 'item', category: 'jacket', id: 'stripe-oversize', name: 'Striped Oversize jacket' },
    12: { type: 'item', category: 'goggles', id: 'ice-mirror', name: 'Ice Mirror goggles' },
    15: { type: 'item', category: 'helmet', id: 'sticker-lid', name: 'Sticker Bomb helmet' },
    18: { type: 'item', category: 'pants', id: 'mega-baggy', name: 'Extra Baggy Park trousers' },
    20: { type: 'item', category: 'jacket', id: 'retro-block', name: 'Retro Block jacket' },
    22: { type: 'item', category: 'skis', id: 'sticker-twins', name: 'Sticker Bomb Twins' },
    24: { type: 'item', category: 'pants', id: 'retro-stripe', name: 'Retro Stripe trousers' },
    27: { type: 'item', category: 'jacket', id: 'checker-hoodie', name: 'Checker Hoodie' },
    28: { type: 'item', category: 'skis', id: 'retro-twins', name: 'Retro 90s Twins' },
    30: { type: 'item', category: 'helmet', id: 'cat-lid', name: 'Cat Ears helmet' },
    31: { type: 'item', category: 'goggles', id: 'violet-cylinder', name: 'Violet Cylindrical goggles' },
    32: { type: 'item', category: 'pants', id: 'race-skinny', name: 'Race Skinny trousers' },
    33: { type: 'item', category: 'jacket', id: 'mountain-anorak', name: 'Mountain Anorak' },
    34: { type: 'item', category: 'gloves', id: 'gauntlet-pro', name: 'Gauntlet Pro gloves' },
    35: { type: 'item', category: 'helmet', id: 'ridge-pro-lid', name: 'Ridge Pro helmet' },
    36: { type: 'item', category: 'pants', id: 'powder-bib', name: 'Powder Bib trousers' },
    37: { type: 'item', category: 'goggles', id: 'race-low-profile', name: 'Race Low Profile goggles' },
    38: { type: 'item', category: 'jacket', id: 'storm-mega-shell', name: 'Storm Mega Shell' },
    39: { type: 'item', category: 'skis', id: 'ridge-freeride', name: 'Ridge Freeride 104 skis' },
    40: { type: 'item', category: 'helmet', id: 'carbon-visor-lid', name: 'Carbon Visor helmet' },
    41: { type: 'item', category: 'helmet', id: 'summit-carbon', name: 'Summit Carbon Pro helmet' },
    42: { type: 'item', category: 'jacket', id: 'summit-overshell', name: 'Summit Overshell' },
    43: { type: 'item', category: 'pants', id: 'summit-bib', name: 'Summit Bib trousers' },
    44: { type: 'item', category: 'skis', id: 'blackout-twins', name: 'Blackout Twins' },
    45: { type: 'item', category: 'goggles', id: 'black-ice-lens', name: 'Black Ice Frameless goggles' },
    46: { type: 'item', category: 'gloves', id: 'legend-mitts', name: 'Legend Park Mitts' },
    47: { type: 'item', category: 'helmet', id: 'whiteout-visor', name: 'Whiteout Visor Pro helmet' },
    48: { type: 'item', category: 'jacket', id: 'legend-anorak', name: 'Legend Anorak' },
    49: { type: 'item', category: 'pants', id: 'park-denim', name: 'Park Denim Baggy trousers' },
    50: { type: 'item', category: 'skis', id: 'legend-110', name: 'Legend 110 Freeride skis' },
  };
  const reward = rewards[tier] || { type: 'credits', amount: 60 + tier * 6, name: `${60 + tier * 6} credits` };
  return { tier, requiredXP: (tier - 1) * 350, reward };
});

function defaultUnlocked() {
  const unlocked = {};
  for (const [category, items] of Object.entries(CUSTOMIZATION_CATALOG)) {
    unlocked[category] = items.filter((item) => item.price === 0 && !item.passTier).map((item) => item.id);
  }
  return unlocked;
}

export function makeDefaultSave() {
  return {
    version: SAVE_VERSION,
    credits: 300,
    xp: 0,
    battlePassXP: 0,
    claimedBattlePass: [],
    unlocked: defaultUnlocked(),
    equipped: {
      skin: 'warm',
      helmet: 'snow',
      jacket: 'ember',
      pants: 'navy',
      skis: 'glacier',
      goggles: 'ocean',
      gloves: 'black-park',
    },
    completedChallenges: [],
    challengeProgress: {},
    bestTrick: 0,
    totalTrickScore: 0,
    bestRaceTimes: {},
    bestFreestyleScores: {},
    discoveries: [],
    settings: { weather: 'clear', graphics: 'medium', cameraEffects: 1, skierHeightCm: 180 },
  };
}

function sanitizeSave(raw) {
  const fallback = makeDefaultSave();
  if (!raw || typeof raw !== 'object') return fallback;
  const save = {
    ...fallback,
    ...raw,
    version: SAVE_VERSION,
    credits: Number.isFinite(raw.credits) ? Math.max(0, Math.floor(raw.credits)) : fallback.credits,
    xp: Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : fallback.xp,
    battlePassXP: Number.isFinite(raw.battlePassXP) ? Math.max(0, Math.floor(raw.battlePassXP)) : (Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0),
    claimedBattlePass: Array.isArray(raw.claimedBattlePass) ? [...new Set(raw.claimedBattlePass.filter((x) => Number.isInteger(x) && x >= 1 && x <= BATTLE_PASS_TIERS.length))] : [],
    completedChallenges: Array.isArray(raw.completedChallenges) ? [...new Set(raw.completedChallenges.filter((x) => typeof x === 'string'))] : [],
    challengeProgress: raw.challengeProgress && typeof raw.challengeProgress === 'object' ? { ...raw.challengeProgress } : {},
    bestRaceTimes: raw.bestRaceTimes && typeof raw.bestRaceTimes === 'object' ? { ...raw.bestRaceTimes } : {},
    bestFreestyleScores: raw.bestFreestyleScores && typeof raw.bestFreestyleScores === 'object' ? { ...raw.bestFreestyleScores } : {},
    discoveries: Array.isArray(raw.discoveries) ? [...new Set(raw.discoveries.filter((x) => typeof x === 'string'))] : [],
    settings: raw.settings && typeof raw.settings === 'object' ? { ...fallback.settings, ...raw.settings } : { ...fallback.settings },
    unlocked: { ...fallback.unlocked },
    equipped: { ...fallback.equipped },
  };

  for (const [category, items] of Object.entries(CUSTOMIZATION_CATALOG)) {
    const validIds = new Set(items.map((item) => item.id));
    const rawUnlocked = Array.isArray(raw.unlocked?.[category]) ? raw.unlocked[category] : [];
    save.unlocked[category] = [...new Set([...fallback.unlocked[category], ...rawUnlocked.filter((id) => validIds.has(id))])];
    if (validIds.has(raw.equipped?.[category]) && save.unlocked[category].includes(raw.equipped[category])) {
      save.equipped[category] = raw.equipped[category];
    }
  }
  return save;
}

export class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      let stored = localStorage.getItem(SAVE_KEY);
      if (!stored) {
        for (const key of LEGACY_SAVE_KEYS) {
          stored = localStorage.getItem(key);
          if (stored) break;
        }
      }
      if (!stored) return makeDefaultSave();
      const migrated = sanitizeSave(JSON.parse(stored));
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(migrated)); } catch {}
      return migrated;
    } catch {
      return makeDefaultSave();
    }
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // The game remains playable if storage is unavailable.
    }
  }

  getCredits() {
    return this.data.credits;
  }

  getXP() { return this.data.xp || 0; }

  getLevel() {
    // Gentle progression curve: roughly 500 XP for early levels, increasing
    // gradually so normal play unlocks cosmetics without grind.
    return 1 + Math.floor(Math.sqrt(this.getXP() / 420));
  }

  getLevelProgress() {
    const level = this.getLevel();
    const currentFloor = (level - 1) ** 2 * 420;
    const nextFloor = level ** 2 * 420;
    return { level, xp: this.getXP(), currentFloor, nextFloor, progress: (this.getXP() - currentFloor) / Math.max(1, nextFloor - currentFloor) };
  }

  addXP(amount) {
    const clean = Math.max(0, Math.floor(amount));
    this.data.xp = this.getXP() + clean;
    this.data.battlePassXP = Math.max(0, Math.floor(this.data.battlePassXP || 0)) + clean;
    this.persist();
    return this.data.xp;
  }

  addCredits(amount) {
    const clean = Math.max(0, Math.floor(amount));
    this.data.credits += clean;
    this.persist();
    return this.data.credits;
  }

  spendCredits(amount) {
    const clean = Math.max(0, Math.floor(amount));
    if (this.data.credits < clean) return false;
    this.data.credits -= clean;
    this.persist();
    return true;
  }

  isUnlocked(category, id) {
    return this.data.unlocked?.[category]?.includes(id) ?? false;
  }

  buyOrEquip(category, id) {
    const items = CUSTOMIZATION_CATALOG[category];
    const item = items?.find((entry) => entry.id === id);
    if (!item) return { ok: false, reason: 'Unknown item.' };
    if (item.levelReq && this.getLevel() < item.levelReq) return { ok: false, reason: `Reach level ${item.levelReq} first.` };
    if (item.passTier && !this.isUnlocked(category, id)) return { ok: false, reason: `Unlock this on Free Pass tier ${item.passTier}.` };

    if (!this.isUnlocked(category, id)) {
      if (!this.spendCredits(item.price)) return { ok: false, reason: 'Not enough credits.' };
      this.data.unlocked[category].push(id);
    }
    this.data.equipped[category] = id;
    this.persist();
    return { ok: true, item };
  }

  getEquippedItem(category) {
    const id = this.data.equipped[category];
    return CUSTOMIZATION_CATALOG[category]?.find((item) => item.id === id) ?? CUSTOMIZATION_CATALOG[category]?.[0];
  }

  completeChallenge(id) {
    if (this.data.completedChallenges.includes(id)) return false;
    this.data.completedChallenges.push(id);
    this.persist();
    return true;
  }

  setChallengeProgress(id, value) {
    this.data.challengeProgress[id] = value;
    this.persist();
  }

  hasDiscovery(id) {
    return this.data.discoveries?.includes(id) ?? false;
  }

  addDiscovery(id) {
    if (!id || this.hasDiscovery(id)) return false;
    this.data.discoveries.push(id);
    this.persist();
    return true;
  }

  getRaceBest(id) {
    const value = this.data.bestRaceTimes?.[id];
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  setRaceBest(id, seconds) {
    if (!id || !Number.isFinite(seconds) || seconds <= 0) return false;
    const previous = this.getRaceBest(id);
    if (previous != null && previous <= seconds) return false;
    this.data.bestRaceTimes[id] = seconds;
    this.persist();
    return true;
  }

  getFreestyleBest(id) {
    const value = this.data.bestFreestyleScores?.[id];
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  setFreestyleBest(id, score) {
    if (!id || !Number.isFinite(score) || score < 0) return false;
    const previous = this.getFreestyleBest(id);
    if (previous != null && previous >= score) return false;
    this.data.bestFreestyleScores[id] = Math.round(score);
    this.persist();
    return true;
  }

  getSetting(key, fallback = null) {
    return this.data.settings?.[key] ?? fallback;
  }

  setSetting(key, value) {
    if (!this.data.settings || typeof this.data.settings !== 'object') this.data.settings = {};
    this.data.settings[key] = value;
    this.persist();
  }

  getBattlePassXP() { return Math.max(0, Math.floor(this.data.battlePassXP || 0)); }

  getBattlePassState() {
    const xp = this.getBattlePassXP();
    let tier = 1;
    for (const entry of BATTLE_PASS_TIERS) if (xp >= entry.requiredXP) tier = entry.tier;
    const current = BATTLE_PASS_TIERS[tier - 1];
    const next = BATTLE_PASS_TIERS[Math.min(BATTLE_PASS_TIERS.length - 1, tier)];
    const progress = tier >= BATTLE_PASS_TIERS.length ? 1 : (xp - current.requiredXP) / Math.max(1, next.requiredXP - current.requiredXP);
    return { xp, tier, progress: Math.max(0, Math.min(1, progress)), claimed: [...(this.data.claimedBattlePass || [])] };
  }

  claimBattlePassTier(tier) {
    const entry = BATTLE_PASS_TIERS.find((x) => x.tier === Number(tier));
    if (!entry) return { ok: false, reason: 'Unknown pass tier.' };
    if (this.getBattlePassXP() < entry.requiredXP) return { ok: false, reason: `Need ${entry.requiredXP} Free Pass XP.` };
    if (this.data.claimedBattlePass.includes(entry.tier)) return { ok: false, reason: 'Already claimed.' };
    const reward = entry.reward;
    if (reward.type === 'item') {
      if (!this.data.unlocked[reward.category]) this.data.unlocked[reward.category] = [];
      if (!this.data.unlocked[reward.category].includes(reward.id)) this.data.unlocked[reward.category].push(reward.id);
    } else if (reward.type === 'credits') {
      this.data.credits += Math.max(0, Math.floor(reward.amount || 0));
    }
    this.data.claimedBattlePass.push(entry.tier);
    this.persist();
    return { ok: true, reward, entry };
  }

  addTrickScore(score) {
    const rounded = Math.max(0, Math.round(score));
    this.data.totalTrickScore += rounded;
    this.data.bestTrick = Math.max(this.data.bestTrick, rounded);
    this.persist();
  }
}
