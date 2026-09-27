// src/simulation.js
// موتور مدل: اکوسیستم چرخه حیات + خورشید تطبیقی (که مثل یک عامل یادگیرنده رشد می‌کند)
// + حلقه زودیاک (۱۲ نشان) که محیط را تحت تاثیر قرار می‌دهد
// + درخت حیات نمادین (۱۰ سفیروت + ۳ ستون + ۲۲ مسیر) که سطح رشد خورشید را نشان می‌دهد.
// این یک مدل نمادین و قابل توضیح است، نه شبیه‌سازی علمی زمین یا خورشید.

export function createRng(seed) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

// ---------- زودیاک: ۱۲ نشان ----------
export const ZODIAC = [
  { id: "aries", name: "حمل", symbol: "♈" },
  { id: "taurus", name: "ثور", symbol: "♉" },
  { id: "gemini", name: "جوزا", symbol: "♊" },
  { id: "cancer", name: "سرطان", symbol: "♋" },
  { id: "leo", name: "اسد", symbol: "♌" },
  { id: "virgo", name: "سنبله", symbol: "♍" },
  { id: "libra", name: "میزان", symbol: "♎" },
  { id: "scorpio", name: "عقرب", symbol: "♏" },
  { id: "sagittarius", name: "قوس", symbol: "♐" },
  { id: "capricorn", name: "جدی", symbol: "♑" },
  { id: "aquarius", name: "دلو", symbol: "♒" },
  { id: "pisces", name: "حوت", symbol: "♓" },
];
export const DAYS_PER_SIGN = 30;

// ---------- درخت حیات: ۱۰ سفیروت (از پایین به بالا = مسیر رشد خورشید) ----------
// level 1 = پایین‌ترین (ملکوت) ... level 10 = بالاترین (کتر)
export const SEPHIROT = [
  { id: "malkuth", level: 1, name: "ملکوت", trait: "تجلی", pillar: "balance" },
  { id: "yesod", level: 2, name: "یسود", trait: "بنیاد", pillar: "balance" },
  { id: "hod", level: 3, name: "هود", trait: "شجاعت", pillar: "severity" },
  { id: "netzach", level: 4, name: "نتسح", trait: "پیروزی", pillar: "mercy" },
  { id: "tiferet", level: 5, name: "تیفرت", trait: "زیبایی", pillar: "balance" },
  { id: "gevurah", level: 6, name: "گورا", trait: "قدرت", pillar: "severity" },
  { id: "chesed", level: 7, name: "حسد", trait: "رحمت", pillar: "mercy" },
  { id: "binah", level: 8, name: "بینا", trait: "فهم", pillar: "severity" },
  { id: "chokhmah", level: 9, name: "حکما", trait: "حکمت", pillar: "mercy" },
  { id: "keter", level: 10, name: "کتر", trait: "تاج", pillar: "balance" },
];
export const PILLARS = {
  mercy: { name: "ستون رحمت", color: "#e8c56b" },
  severity: { name: "ستون سختی", color: "#5fa8e0" },
  balance: { name: "ستون تعادل", color: "#e05f5f" },
};
// ۲۲ مسیر سنتی درخت حیات (فقط برای رسم؛ بر اساس شماره‌ی level گره‌ها)
export const PATHS_22 = [
  [10, 9], [10, 8], [10, 5],
  [9, 8], [9, 7], [9, 5],
  [8, 6], [8, 5],
  [7, 6], [7, 5], [7, 4],
  [6, 5], [6, 3],
  [5, 4], [5, 3], [5, 2],
  [4, 3], [4, 2], [4, 1],
  [3, 2], [3, 1],
  [2, 1],
];

// ---------- گونه‌ها ----------
export const SPECIES = {
  tree: { role: "producer", name: "درخت", lifespan: 420, matureAge: 70 },
  flower: { role: "producer", name: "گل", lifespan: 150, matureAge: 20 },
  herbivore: { role: "consumer", diet: ["producer"], name: "گیاه‌خوار", lifespan: 200, matureAge: 30 },
  pollinator: { role: "consumer", diet: ["producer"], name: "گرده‌افشان", lifespan: 80, matureAge: 10 },
  aquatic: { role: "consumer", diet: ["producer"], name: "آبزی", lifespan: 180, matureAge: 25 },
  predator: { role: "predator", diet: ["consumer"], name: "شکارچی", lifespan: 260, matureAge: 45 },
  fungus: { role: "decomposer", name: "قارچ", lifespan: 110, matureAge: 15 },
};
export const LIFE_STAGES = ["seed", "sprout", "immature", "mature", "aging", "returning"];
export const STAGE_FA = {
  seed: "بذر", sprout: "جوانه", immature: "نابالغ", mature: "بالغ", aging: "پیری", returning: "بازگشت",
};

export const SUN_POLICIES = ["repair", "conserve", "balance", "diversity"];
export const POLICY_FA = {
  repair: "ترمیم", conserve: "صرفه‌جویی", balance: "تعادل", diversity: "تنوع",
};

function stageFor(entity) {
  const sp = SPECIES[entity.species];
  const a = entity.age;
  if (entity.health <= 0 || entity.energy <= 0 || a >= sp.lifespan) return "returning";
  if (a < sp.matureAge * 0.15) return "seed";
  if (a < sp.matureAge * 0.5) return "sprout";
  if (a < sp.matureAge) return "immature";
  if (a < sp.lifespan * 0.75) return "mature";
  return "aging";
}

let idCounter = 1;
function makeEntity(world, species, parentId = null) {
  const sp = SPECIES[species];
  const angle = world.rng() * Math.PI * 2;
  const radius = 0.15 + world.rng() * 0.8;
  const e = {
    id: idCounter++,
    species,
    role: sp.role,
    stage: "seed",
    age: 0,
    energy: 55 + world.rng() * 20,
    health: 70 + world.rng() * 20,
    growth: 0,
    biomass: 5,
    pos: { r: radius, a: angle },
    parentId,
    childCount: 0,
  };
  return e;
}

export function createWorld(seed = 20260101) {
  const world = {
    rng: createRng(seed),
    tick: 0,
    day: 0,
    zodiacIndex: 0,
    env: { light: 60, temp: 20, water: 55, soil: 60, nutrients: 50, oxygen: 55, biomass: 45, organic: 15 },
    population: [],
    populationCap: 42,
    sun: {
      policy: "balance",
      values: { repair: 0, conserve: 0, balance: 0, diversity: 0 },
      memory: [],
      xp: 0,
      level: 1,
      wisdomCycles: 0,
      lastHealth: 50,
      pillarCharge: { mercy: 10, severity: 10, balance: 10 },
    },
    healthIndex: 50,
    history: [],
    events: [],
    selectedId: null,
  };
  seedInitialPopulation(world);
  return world;
}

function seedInitialPopulation(world) {
  const starters = ["tree", "tree", "flower", "flower", "herbivore", "pollinator", "fungus"];
  for (const s of starters) world.population.push(makeEntity(world, s));
}

function logEvent(world, text) {
  world.events.unshift({ tick: world.tick, text });
  if (world.events.length > 12) world.events.length = 12;
}

// ---------- محیط: تحت تاثیر زودیاک ----------
function updateEnvironment(world) {
  world.day += 1;
  if (world.day % DAYS_PER_SIGN === 0) {
    world.zodiacIndex = (world.zodiacIndex + 1) % ZODIAC.length;
  }
  const angle = (world.zodiacIndex / ZODIAC.length) * Math.PI * 2;
  const warmth = Math.cos(angle - Math.PI); // اوج در اسد (تابستان)، کف در دلو (زمستان)
  const env = world.env;
  env.light = clamp(50 + 32 * warmth + (world.rng() - 0.5) * 4);
  env.temp = clamp(18 + 14 * warmth + (world.rng() - 0.5) * 3, -20, 60);
  env.water = clamp(env.water + (world.rng() - 0.5) * 3 - warmth * 0.6);
  env.soil = clamp(env.soil + (world.rng() - 0.5) * 2);
  env.oxygen = clamp(env.oxygen + (world.rng() - 0.5) * 1.5);
}

// ---------- خورشید تطبیقی: انتخاب سیاست + شارژ ستون‌ها ----------
function weakestPillar(sun) {
  return Object.entries(sun.pillarCharge).sort((a, b) => a[1] - b[1])[0][0];
}

function sunDecidePolicy(world) {
  const sun = world.sun;
  const alpha = 0.25;
  const outcome = world.healthIndex - sun.lastHealth;
  sun.values[sun.policy] = sun.values[sun.policy] + alpha * (outcome - sun.values[sun.policy]);
  sun.memory.push({ policy: sun.policy, outcome, tick: world.tick });
  if (sun.memory.length > 24) sun.memory.shift();

  const eps = 0.12;
  let policy;
  if (world.env.biomass < 22) policy = "repair";
  else if (world.env.water < 20 || world.env.soil < 20) policy = "conserve";
  else if (world.env.nutrients < 22) policy = "diversity";
  else if (world.rng() < eps) policy = SUN_POLICIES[Math.floor(world.rng() * SUN_POLICIES.length)];
  else policy = Object.entries(sun.values).sort((a, b) => b[1] - a[1])[0][0];

  sun.policy = policy;
  const pillar = policy === "repair" ? "mercy" : policy === "conserve" ? "severity" : policy === "balance" ? "balance" : weakestPillar(sun);
  sun.pillarCharge[pillar] = clamp(sun.pillarCharge[pillar] + 9);
  for (const k of Object.keys(sun.pillarCharge)) {
    if (k !== pillar) sun.pillarCharge[k] = clamp(sun.pillarCharge[k] - 2.5);
  }
}

function applyPolicyEffects(world) {
  const env = world.env;
  const p = world.sun.policy;
  if (p === "repair") {
    env.biomass = clamp(env.biomass + 3.2);
    env.soil = clamp(env.soil + 1.5);
    env.nutrients = clamp(env.nutrients - 1.2);
  } else if (p === "conserve") {
    env.water = clamp(env.water + 2.4);
    env.soil = clamp(env.soil + 1.2);
    env.light = clamp(env.light - 1.5);
  } else if (p === "balance") {
    env.oxygen = clamp(env.oxygen + 1.2);
    env.biomass = clamp(env.biomass + 1);
  } else if (p === "diversity") {
    env.nutrients = clamp(env.nutrients + 3);
    env.oxygen = clamp(env.oxygen + 0.8);
  }
}

// ---------- زیست‌شناسی ----------
function growProducers(world) {
  const env = world.env;
  for (const e of world.population) {
    if (SPECIES[e.species].role !== "producer") continue;
    const factor = (env.light / 100) * 0.5 + (env.water / 100) * 0.3 + (env.soil / 100) * 0.2;
    e.growth = clamp(e.growth + factor * 3);
    e.energy = clamp(e.energy + factor * 4 - 0.6);
    e.biomass = clamp(e.biomass + factor * 1.5, 0, 100);
    env.biomass = clamp(env.biomass + factor * 0.15);
  }
}

function feedConsumers(world) {
  const env = world.env;
  const producers = world.population.filter((e) => SPECIES[e.species].role === "producer" && e.stage !== "returning");
  for (const e of world.population) {
    const sp = SPECIES[e.species];
    if (sp.role !== "consumer") continue;
    if (producers.length > 0 && env.biomass > 5) {
      env.biomass = clamp(env.biomass - 0.4);
      e.energy = clamp(e.energy + 2.6);
      e.health = clamp(e.health + 0.4);
    } else {
      e.energy = clamp(e.energy - 1.6);
    }
  }
}

function predatorPressure(world) {
  const preyPool = world.population.filter((e) => SPECIES[e.species].role === "consumer" && e.stage !== "returning");
  for (const e of world.population) {
    if (SPECIES[e.species].role !== "predator") continue;
    if (preyPool.length > 2) {
      e.energy = clamp(e.energy + 3);
      e.health = clamp(e.health + 0.5);
      const victim = preyPool[Math.floor(world.rng() * preyPool.length)];
      if (victim) victim.health = clamp(victim.health - 6);
    } else {
      e.energy = clamp(e.energy - 2);
    }
  }
}

function decomposeOrganic(world) {
  const env = world.env;
  let organicToSoil = 0;
  for (const e of world.population) {
    if (SPECIES[e.species].role !== "decomposer") continue;
    if (env.organic > 2) {
      env.organic = clamp(env.organic - 1.5);
      organicToSoil += 1.1;
      e.energy = clamp(e.energy + 1.4);
    }
  }
  env.soil = clamp(env.soil + organicToSoil);
  env.nutrients = clamp(env.nutrients + organicToSoil * 0.5);
}

function ageAndProgressStages(world) {
  for (const e of world.population) {
    e.age += 1;
    e.energy = clamp(e.energy - 0.35);
    e.health = clamp(e.health - 0.2 + (e.energy > 40 ? 0.15 : -0.2));
    e.stage = stageFor(e);
  }
}

function handleReproduction(world) {
  if (world.population.length >= world.populationCap) return;
  const speciesCounts = {};
  for (const e of world.population) speciesCounts[e.species] = (speciesCounts[e.species] || 0) + 1;
  const diversityBoost = world.sun.policy === "diversity";
  const born = [];
  for (const e of world.population) {
    if (e.stage !== "mature") continue;
    if (e.health < 55 || e.energy < 45) continue;
    const rarity = diversityBoost ? 1 / (1 + (speciesCounts[e.species] || 1)) : 0.15;
    const chance = 0.02 + rarity * 0.06;
    if (world.rng() < chance) {
      const child = makeEntity(world, e.species, e.id);
      e.childCount += 1;
      e.energy = clamp(e.energy - 12);
      born.push(child);
    }
  }
  for (const c of born) world.population.push(c);
}

function handleDeaths(world) {
  const alive = [];
  let releasedBiomass = 0;
  let sunFeed = 0;
  for (const e of world.population) {
    const dying = e.stage === "returning" && (e.age > SPECIES[e.species].lifespan || e.health <= 0 || e.energy <= 0);
    if (dying) {
      releasedBiomass += e.biomass * 0.6;
      sunFeed += e.energy * 0.3;
    } else {
      alive.push(e);
    }
  }
  world.population = alive;
  world.env.organic = clamp(world.env.organic + releasedBiomass * 0.4);
  world.env.nutrients = clamp(world.env.nutrients + releasedBiomass * 0.2);
  world.sun.xp += sunFeed * 0.05;

  if (world.population.length === 0 && world.env.biomass > 25) {
    world.population.push(makeEntity(world, "tree"));
    logEvent(world, "جمعیت نابود شد؛ خورشید درخت بنیان‌گذار ایجاد کرد.");
  }
}

function computeEcosystemHealth(world) {
  const roles = { producer: 0, consumer: 0, predator: 0, decomposer: 0 };
  let healthSum = 0;
  const speciesSeen = new Set();
  for (const e of world.population) {
    roles[SPECIES[e.species].role] += 1;
    healthSum += e.health;
    speciesSeen.add(e.species);
  }
  const n = world.population.length || 1;
  const avgHealth = healthSum / n;
  const balance = 100 - (Math.abs(roles.producer - roles.consumer) * 3 + Math.abs(roles.consumer - roles.predator * 3) * 1.5);
  const resources = (world.env.biomass + world.env.soil + world.env.water + world.env.nutrients + world.env.oxygen) / 5;
  const diversity = (speciesSeen.size / Object.keys(SPECIES).length) * 100;
  const score = avgHealth * 0.35 + clamp(balance) * 0.2 + resources * 0.25 + diversity * 0.2;
  return clamp(score);
}

// ---------- رشد خورشید مثل یک عامل هوشمند: صعود از ملکوت تا کتر ----------
function updateSunGrowth(world) {
  const sun = world.sun;
  const reward = world.healthIndex - sun.lastHealth;
  sun.lastHealth = world.healthIndex;
  sun.xp += Math.max(0, reward) * 0.6 + 0.15;
  const need = sun.level * 55 + 40;
  if (sun.xp >= need) {
    sun.xp -= need;
    if (sun.level < 10) {
      sun.level += 1;
      const node = SEPHIROT[sun.level - 1];
      logEvent(world, `خورشید رشد کرد → سطح ${sun.level} (${node.name} / ${node.trait})`);
    } else {
      sun.level = 1;
      sun.wisdomCycles += 1;
      logEvent(world, `خورشید به کتر رسید و دوباره از ملکوت آغاز کرد. (خرد انباشته: ${sun.wisdomCycles})`);
    }
  }
}

function recordHistory(world) {
  world.history.push({ tick: world.tick, health: world.healthIndex, population: world.population.length, sunLevel: world.sun.level });
  if (world.history.length > 120) world.history.shift();
}

export function step(world) {
  world.tick += 1;
  updateEnvironment(world);
  sunDecidePolicy(world);
  applyPolicyEffects(world);
  growProducers(world);
  feedConsumers(world);
  predatorPressure(world);
  decomposeOrganic(world);
  ageAndProgressStages(world);
  handleReproduction(world);
  handleDeaths(world);
  world.healthIndex = computeEcosystemHealth(world);
  updateSunGrowth(world);
  recordHistory(world);
  return world;
}

export function getTreeOfLifeState(world) {
  return SEPHIROT.map((node) => ({ ...node, lit: node.level <= world.sun.level }));
}

export function getCurrentZodiac(world) {
  return ZODIAC[world.zodiacIndex];
}

export function summarizeEntity(e) {
  const sp = SPECIES[e.species];
  return {
    id: e.id,
    species: sp.name,
    role: sp.role,
    stage: STAGE_FA[e.stage],
    age: Math.round(e.age),
    energy: Math.round(e.energy),
    health: Math.round(e.health),
    childCount: e.childCount,
  };
}
