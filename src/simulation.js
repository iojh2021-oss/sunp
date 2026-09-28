// src/simulation.js
// موتور مدل SunP — نسخه ۳
// چرخه: نور خورشید ← ذره نور ← بذر ← جوانه ← گیاه ← درخت ← گل و میوه ← موجود زنده ← تولیدمثل ← بازگشت به خاک ← چرخه دوباره
// موجودات از انرژی خورشید متولد می‌شوند، با چالش‌ها روبه‌رو می‌شوند، تجربه می‌گیرند و در پایان عمر تجربه‌شان را به خورشید برمی‌گردانند.
// خورشید یک عامل یادگیرنده‌ی نمادین است (جدول ارزش سیاست‌ها به تفکیک وضعیت) و حافظه‌اش قابل ذخیره و بارگذاری است.
// این یک مدل نمادین با پارامترهای فرضی است، نه شبیه‌سازی علمی.

export const MEMORY_VERSION = 1;

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

// ---------- زودیاک ----------
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

// ---------- درخت حیات ----------
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

// ---------- گونه‌ها و مراحل ----------
export const SPECIES = {
  tree: { role: "producer", name: "درخت", lifespan: 420, matureAge: 70 },
  flower: { role: "producer", name: "گل", lifespan: 150, matureAge: 20 },
  herbivore: { role: "consumer", diet: ["tree", "flower"], name: "گیاه‌خوار", lifespan: 200, matureAge: 30 },
  pollinator: { role: "consumer", diet: ["flower"], name: "گرده‌افشان", lifespan: 80, matureAge: 10 },
  aquatic: { role: "consumer", diet: ["organic", "algae"], name: "آبزی", lifespan: 180, matureAge: 25 },
  predator: { role: "predator", diet: ["herbivore", "pollinator", "aquatic"], name: "شکارچی", lifespan: 260, matureAge: 45 },
  fungus: { role: "decomposer", name: "قارچ", lifespan: 110, matureAge: 15 },
};
export const LIFE_STAGES = ["seed", "sprout", "immature", "mature", "fruiting", "aging", "returning"];
export const STAGE_FA = {
  seed: "بذر",
  sprout: "جوانه",
  immature: "گیاه (رشد)",
  mature: "بالغ",
  fruiting: "گل و میوه",
  aging: "پیری",
  returning: "بازگشت به خاک",
};

export const SUN_POLICIES = ["repair", "conserve", "balance", "diversity"];
export const POLICY_FA = { repair: "ترمیم", conserve: "صرفه‌جویی", balance: "تعادل", diversity: "تنوع" };

// ---------- چالش‌ها ----------
export const CHALLENGES = {
  drought: { name: "خشکسالی", prior: "conserve" },
  cold: { name: "سرمای شدید", prior: "repair" },
  blight: { name: "بیماری گیاهی", prior: "diversity" },
  flood: { name: "سیل", prior: "balance" },
};
export const STATE_FA = {
  calm: "آرامش",
  drought: CHALLENGES.drought.name,
  cold: CHALLENGES.cold.name,
  blight: CHALLENGES.blight.name,
  flood: CHALLENGES.flood.name,
};
const STATE_KEYS = ["calm", ...Object.keys(CHALLENGES)];

// ---------- کمکی ----------
function stageFor(e) {
  const sp = SPECIES[e.species];
  const a = e.age;
  if (e.health <= 0 || e.energy <= 0 || a >= sp.lifespan) return "returning";
  if (a < sp.matureAge * 0.15) return "seed";
  if (a < sp.matureAge * 0.5) return "sprout";
  if (a < sp.matureAge) return "immature";
  if (a < sp.matureAge * 1.6) return "mature";
  if (a < sp.lifespan * 0.7) return "fruiting";
  return "aging";
}

// هرچه خورشید باتجربه‌تر شود، موجودات تازه‌متولد قوی‌تر (تاب‌آورتر) به دنیا می‌آیند
export function getSunBonus(world) {
  const s = world.sun;
  return Math.min(0.4, s.experienceTotal / 3000 + 0.02 * s.level + 0.03 * s.wisdomCycles);
}

function makeEntity(world, species, parent = null) {
  const sp = SPECIES[species];
  const bonus = getSunBonus(world);
  const parentRes = parent ? parent.resilience : 0;
  const e = {
    id: world.nextId++,
    species,
    role: sp.role,
    stage: "seed",
    age: 0,
    energy: clamp(55 + world.rng() * 20 + bonus * 20),
    health: clamp(70 + world.rng() * 20 + bonus * 10),
    growth: 0,
    biomass: 5,
    pos: { r: 0.15 + world.rng() * 0.8, a: world.rng() * Math.PI * 2 },
    parentId: parent ? parent.id : null,
    childCount: 0,
    gen: parent ? parent.gen + 1 : 0,
    experience: 0,
    resilience: clamp(0.5 * parentRes + 0.5 * bonus + world.rng() * 0.05, 0, 0.95),
    survived: 0,
  };
  world.stats.born += 1;
  if (e.gen > world.stats.generationMax) world.stats.generationMax = e.gen;
  return e;
}

function zeroPolicies() {
  return { repair: 0, conserve: 0, balance: 0, diversity: 0 };
}

function ensureState(sun, key) {
  if (!sun.values[key]) {
    sun.values[key] = zeroPolicies();
    sun.visits[key] = zeroPolicies();
    const prior = key === "calm" ? "balance" : CHALLENGES[key].prior;
    sun.values[key][prior] = 0.5;
  }
  return sun.values[key];
}

function bestPolicy(vals) {
  let best = SUN_POLICIES[0];
  for (const p of SUN_POLICIES) if (vals[p] > vals[best]) best = p;
  return best;
}

const NN_INPUTS=11, NN_HIDDEN=8, NN_OUTPUTS=SUN_POLICIES.length;
function freshNetwork(){
 return {
  w1:Array.from({length:NN_HIDDEN},(_,h)=>Array.from({length:NN_INPUTS},(_,i)=>Math.sin((h+1)*(i+3))*.08)),
  b1:Array(NN_HIDDEN).fill(0),
  w2:Array.from({length:NN_OUTPUTS},(_,o)=>Array.from({length:NN_HIDDEN},(_,h)=>Math.cos((o+2)*(h+1))*.08)),
  b2:Array(NN_OUTPUTS).fill(0),updates:0
 };
}
function neuralFeatures(world){
 const e=world.env,c=world.challenge;
 return [e.light/100,e.temp/60,e.water/100,e.soil/100,e.nutrients/100,e.oxygen/100,e.biomass/100,world.healthIndex/100,c?1:0,c?c.severity:0,world.sun.level/10]
 .map(v=>Math.max(-1,Math.min(1,v*2-1)));
}
function neuralForward(net,x){
 const hidden=net.b1.map((b,h)=>Math.tanh(b+net.w1[h].reduce((s,w,i)=>s+w*x[i],0)));
 return {hidden,output:net.b2.map((b,o)=>b+net.w2[o].reduce((s,w,h)=>s+w*hidden[h],0))};
}
function trainNeural(net,x,action,target){
 const {hidden,output}=neuralForward(net,x),error=Math.max(-10,Math.min(10,target-output[action]));
 const lr=.025/Math.sqrt(1+net.updates/500),old=net.w2[action].slice();
 net.b2[action]=Math.max(-20,Math.min(20,net.b2[action]+lr*error));
 for(let h=0;h<NN_HIDDEN;h++)net.w2[action][h]=Math.max(-5,Math.min(5,net.w2[action][h]+lr*error*hidden[h]));
 for(let h=0;h<NN_HIDDEN;h++){
  const grad=error*old[h]*(1-hidden[h]*hidden[h]);
  net.b1[h]=Math.max(-5,Math.min(5,net.b1[h]+lr*grad));
  for(let i=0;i<NN_INPUTS;i++)net.w1[h][i]=Math.max(-5,Math.min(5,net.w1[h][i]+lr*grad*x[i]));
 }
 net.updates++;
}
function defaultSun() {
  return {
    policy: "balance",
    lastState: "calm",
    values: {},
    visits: {},
    best: {},
    memory: [],
    replay: [],
    xp: 0,
    level: 1,
    wisdomCycles: 0,
    experienceTotal: 0,
    pillarCharge: { mercy: 10, severity: 10, balance: 10 },
    neural: freshNetwork(),
    lastFeatures: null,
    lastActionIndex: 0,
  };
}

function defaultStats() {
  return { totalTicks: 0, epochs: 1, born: 0, died: 0, challengesFaced: 0, challengesSurvived: 0, bestHealth: 0, generationMax: 0 };
}

// ---------- حافظه‌ی ماندگار ----------
const num = (v, d = 0, min = -1e12, max = 1e12) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : d);

export function sanitizeMemory(raw) {
  if (!raw || typeof raw !== "object" || !raw.sun || typeof raw.sun !== "object") return null;
  const s = raw.sun;
  const values = {};
  const visits = {};
  for (const key of STATE_KEYS) {
    const vv = s.values && s.values[key];
    if (!vv || typeof vv !== "object") continue;
    const vi = (s.visits && s.visits[key]) || {};
    values[key] = {};
    visits[key] = {};
    for (const p of SUN_POLICIES) {
      values[key][p] = num(vv[p], 0, -50, 50);
      visits[key][p] = Math.floor(num(vi[p], 0, 0, 1e7));
    }
  }
  const pc = s.pillarCharge || {};
  const rawNet=s.neural||{},fallback=freshNetwork();
  const neural={
    w1:Array.from({length:NN_HIDDEN},(_,h)=>Array.from({length:NN_INPUTS},(_,i)=>num(rawNet.w1?.[h]?.[i],fallback.w1[h][i],-5,5))),
    b1:Array.from({length:NN_HIDDEN},(_,h)=>num(rawNet.b1?.[h],0,-5,5)),
    w2:Array.from({length:NN_OUTPUTS},(_,o)=>Array.from({length:NN_HIDDEN},(_,h)=>num(rawNet.w2?.[o]?.[h],fallback.w2[o][h],-5,5))),
    b2:Array.from({length:NN_OUTPUTS},(_,o)=>num(rawNet.b2?.[o],0,-20,20)),
    updates:Math.floor(num(rawNet.updates,0,0,1e9)),
  };
  const st = raw.stats || {};
  return {
    version: MEMORY_VERSION,
    sun: {
      values,
      visits,
      xp: num(s.xp, 0, 0, 1e6),
      level: Math.floor(num(s.level, 1, 1, 10)),
      wisdomCycles: Math.floor(num(s.wisdomCycles, 0, 0, 1e6)),
      experienceTotal: num(s.experienceTotal, 0, 0, 1e9),
      neural,
      memory: Array.isArray(s.replay) ? s.replay.slice(-256).filter(m => m && Array.isArray(m.features) && m.features.length === NN_INPUTS && Number.isInteger(m.action) && m.action >= 0 && m.action < NN_OUTPUTS).map(m => ({ features: m.features.map(v => num(v, 0, -1, 1)), action: m.action, target: num(m.target, 0, -20, 20) })) : [],
      pillarCharge: {
        mercy: num(pc.mercy, 10, 0, 100),
        severity: num(pc.severity, 10, 0, 100),
        balance: num(pc.balance, 10, 0, 100),
      },
    },
    stats: {
      totalTicks: Math.floor(num(st.totalTicks, 0, 0, 1e12)),
      epochs: Math.floor(num(st.epochs, 1, 1, 1e9)),
      born: Math.floor(num(st.born, 0, 0, 1e12)),
      died: Math.floor(num(st.died, 0, 0, 1e12)),
      challengesFaced: Math.floor(num(st.challengesFaced, 0, 0, 1e9)),
      challengesSurvived: Math.floor(num(st.challengesSurvived, 0, 0, 1e9)),
      bestHealth: num(st.bestHealth, 0, 0, 100),
      generationMax: Math.floor(num(st.generationMax, 0, 0, 1e9)),
    },
  };
}

export function exportMemory(world) {
  return sanitizeMemory({ version: MEMORY_VERSION, sun: world.sun, stats: world.stats });
}

function applyMemory(world, mem) {
  const clean = sanitizeMemory(mem);
  if (!clean) return false;
  const sun = world.sun;
  sun.values = clean.sun.values;
  sun.visits = clean.sun.visits;
  sun.xp = clean.sun.xp;
  sun.level = clean.sun.level;
  sun.wisdomCycles = clean.sun.wisdomCycles;
  sun.experienceTotal = clean.sun.experienceTotal;
  sun.pillarCharge = clean.sun.pillarCharge;
  sun.neural = clean.sun.neural;
  sun.replay = clean.sun.memory;
  for (const key of Object.keys(sun.values)) sun.best[key] = bestPolicy(sun.values[key]);
  world.stats = { ...clean.stats, epochs: clean.stats.epochs + 1 };
  return true;
}

export function getLessons(world) {
  const out = [];
  for (const key of Object.keys(world.sun.values)) {
    const vals = world.sun.values[key];
    const visits = SUN_POLICIES.reduce((a, p) => a + world.sun.visits[key][p], 0);
    const best = bestPolicy(vals);
    out.push({ state: key, stateFa: STATE_FA[key], policy: best, policyFa: POLICY_FA[best], score: vals[best], visits });
  }
  return out.sort((a, b) => b.visits - a.visits);
}

// ---------- ساخت جهان ----------
export function createWorld(seed = 20260101, memory = null) {
  const world = {
    rng: createRng(seed),
    nextId: 1,
    tick: 0,
    day: 0,
    zodiacIndex: 0,
    env: { light: 60, temp: 20, water: 55, soil: 60, nutrients: 50, oxygen: 55, biomass: 45, organic: 15 },
    lightParticles: 0,
    population: [],
    populationCap: 42,
    challenge: null,
    sun: defaultSun(),
    stats: defaultStats(),
    healthIndex: 50,
    avgResilience: 0,
    recentBirths: 0,
    recentReturns: 0,
    history: [],
    events: [],
    selectedId: null,
    turn: { expReturned: 0, premature: 0 },
  };
  applyMemory(world, memory);
  ensureState(world.sun, "calm");
  world.sun.lastState = "calm";
  for (const s of ["tree", "tree", "flower", "flower", "herbivore", "pollinator", "fungus"]) {
    world.population.push(makeEntity(world, s));
  }
  return world;
}

function logEvent(world, text) {
  world.events.unshift({ tick: world.tick, text });
  if (world.events.length > 12) world.events.length = 12;
}

// ---------- محیط و زودیاک ----------
function updateEnvironment(world) {
  world.day += 1;
  if (world.day % DAYS_PER_SIGN === 0) world.zodiacIndex = (world.zodiacIndex + 1) % ZODIAC.length;
  const angle = (world.zodiacIndex / ZODIAC.length) * Math.PI * 2;
  const warmth = Math.cos(angle - Math.PI);
  const env = world.env;
  env.light = clamp(50 + 32 * warmth + (world.rng() - 0.5) * 4);
  env.temp = clamp(18 + 14 * warmth + (world.rng() - 0.5) * 3, -20, 60);
  env.water = clamp(env.water + (world.rng() - 0.5) * 3 - warmth * 0.6);
  env.soil = clamp(env.soil + (world.rng() - 0.5) * 2);
  env.oxygen = clamp(env.oxygen + (world.rng() - 0.5) * 1.5);
}

// ---------- چالش‌ها ----------
function challengeMitigation(world) {
  const s = world.sun;
  return Math.min(0.5, 0.03 * s.level + 0.04 * s.wisdomCycles + s.experienceTotal / 10000);
}

function updateChallenge(world) {
  const c = world.challenge;
  if (c) {
    applyChallengeEffects(world, c);
    c.remaining -= 1;
    if (c.remaining <= 0) {
      world.stats.challengesSurvived += 1;
      logEvent(world, `چالش «${CHALLENGES[c.type].name}» تمام شد؛ جهان دوام آورد.`);
      world.challenge = null;
    }
    return;
  }
  if (world.rng() < 0.02) {
    const types = Object.keys(CHALLENGES);
    const type = types[Math.floor(world.rng() * types.length)];
    const duration = 8 + Math.floor(world.rng() * 13);
    const severity = (0.4 + world.rng() * 0.6) * (1 - challengeMitigation(world));
    world.challenge = { type, remaining: duration, duration, severity };
    world.stats.challengesFaced += 1;
    logEvent(world, `چالش تازه: ${CHALLENGES[type].name} (شدت ${Math.round(severity * 100)}٪)`);
  }
}

function applyChallengeEffects(world, c) {
  const env = world.env;
  const sev = c.severity;
  if (c.type === "drought") {
    env.water = clamp(env.water - 2.4 * sev);
    env.soil = clamp(env.soil - 0.6 * sev);
  } else if (c.type === "cold") {
    env.temp -= 12 * sev;
    env.light = clamp(env.light - 10 * sev);
  } else if (c.type === "blight") {
    env.nutrients = clamp(env.nutrients - 1.0 * sev);
  } else if (c.type === "flood") {
    env.soil = clamp(env.soil - 1.4 * sev);
    env.oxygen = clamp(env.oxygen - 0.8 * sev);
  }
  for (const e of world.population) {
    let dmg = 0;
    const producer = e.role === "producer";
    if (c.type === "drought") dmg = producer || e.species === "aquatic" ? 2.6 : 0.8;
    else if (c.type === "cold") dmg = e.role === "decomposer" ? 0.3 : e.role === "producer" ? 1.0 : 2.0;
    else if (c.type === "blight") dmg = producer ? 3.0 : e.role === "decomposer" ? 0 : 0.3;
    else if (c.type === "flood") dmg = e.species === "aquatic" ? 0 : e.role === "producer" ? 1.0 : 1.8;
    dmg *= sev * (1 - 0.7 * e.resilience);
    if (dmg > 0) {
      e.health = clamp(e.health - dmg);
      e.energy = clamp(e.energy - dmg * 0.4);
      e.experience += 0.5 * sev;
      e.resilience = Math.min(0.95, e.resilience + 0.003 * sev);
      e.survived += 1;
    }
  }
}

// ---------- خورشید تطبیقی ----------
function weakestPillar(sun) {
  return Object.entries(sun.pillarCharge).sort((a, b) => a[1] - b[1])[0][0];
}

function sunDecidePolicy(world) {
  const sun=world.sun,key=world.challenge?world.challenge.type:"calm";
  const vals=ensureState(sun,key),eps=Math.max(.025,.2-.012*sun.level-.01*sun.wisdomCycles);
  const features=neuralFeatures(world),prediction=neuralForward(sun.neural,features).output;
  const qValues=SUN_POLICIES.map((p,i)=>.35*vals[p]+.65*prediction[i]);
  let action=0;
  if(world.rng()<eps)action=Math.floor(world.rng()*SUN_POLICIES.length);
  else {let best=-Infinity;for(let i=0;i<qValues.length;i++)if(qValues[i]>best){best=qValues[i];action=i}}
  sun.lastFeatures=features;sun.lastActionIndex=action;sun.lastState=key;sun.policy=SUN_POLICIES[action];
  const pillar=sun.policy==="repair"?"mercy":sun.policy==="conserve"?"severity":sun.policy==="balance"?"balance":weakestPillar(sun);
  sun.pillarCharge[pillar]=clamp(sun.pillarCharge[pillar]+9);
  for(const k of Object.keys(sun.pillarCharge))if(k!==pillar)sun.pillarCharge[k]=clamp(sun.pillarCharge[k]-2.5);
}

// Policy effects are scored against a normalized ecosystem objective, not raw health delta alone.
function ecosystemObjective(world) {
 const e=world.env,p=world.population,counts={};
 for(const x of p)counts[x.species]=(counts[x.species]||0)+1;
 const richness=Object.keys(counts).length/Math.max(1,Object.keys(SPECIES).length);
 const resource=[e.water,e.soil,e.nutrients,e.oxygen,e.biomass].reduce((a,v)=>a+v,0)/500;
 const health=p.length?p.reduce((a,x)=>a+x.health,0)/p.length/100:0;
 const roleBalance=clamp(100-Math.abs((counts.tree||0)+(counts.flower||0)-(counts.herbivore||0)-(counts.pollinator||0)-(counts.aquatic||0))*2,0,100)/100;
 const diversity=richness;
 return .35*health+.25*resource+.2*diversity+.2*roleBalance;
}

// یادگیری: پاداش این گام به سیاستی که در این گام اجرا شد نسبت داده می‌شود
function sunLearn(world, reward) {
 const sun=world.sun,key=sun.lastState,vals=ensureState(sun,key),visits=sun.visits[key];
 visits[sun.policy]+=1;
 const alpha=Math.max(.03,1/(visits[sun.policy]+2));
 vals[sun.policy]=clamp(vals[sun.policy]+alpha*(reward-vals[sun.policy]),-50,50);
 if(Array.isArray(sun.lastFeatures)&&sun.lastFeatures.length===NN_INPUTS){
  const next=neuralFeatures(world),bootstrap=Math.max(...neuralForward(sun.neural,next).output);
  const target=Math.max(-20,Math.min(20,reward+.88*bootstrap));
  const sample={features:sun.lastFeatures.slice(),action:sun.lastActionIndex,target};
  sun.replay.push(sample);if(sun.replay.length>256)sun.replay.shift();
  trainNeural(sun.neural,sample.features,sample.action,sample.target);
  for(let i=0;i<Math.min(4,sun.replay.length);i++){
   const old=sun.replay[Math.floor(world.rng()*sun.replay.length)];
   trainNeural(sun.neural,old.features,old.action,old.target);
  }
 }
 sun.memory.push({policy:sun.policy,state:key,reward,tick:world.tick});
 if(sun.memory.length>24)sun.memory.shift();
 const best=bestPolicy(vals),total=SUN_POLICIES.reduce((a,p)=>a+visits[p],0);
 if(sun.best[key]&&sun.best[key]!==best&&total>=12)logEvent(world,`خورشید یاد گرفت: در «${STATE_FA[key]}» بهترین سیاست «${POLICY_FA[best]}» است.`);
 sun.best[key]=best;
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

// ---------- نور خورشید ← ذره نور ← بذر ----------
function emitLightAndSeeds(world) {
  const env = world.env;
  const sun = world.sun;
  world.lightParticles = clamp(world.lightParticles * 0.97 + (env.light / 100) * (1.5 + sun.level * 0.5), 0, 60);
  const producers = world.population.filter((e) => e.role === "producer");
  if (
    world.population.length < world.populationCap &&
    producers.length < world.populationCap * 0.5 &&
    world.lightParticles >= 6 &&
    env.soil > 25 && env.water > 20 && env.nutrients > 10 &&
    world.rng() < 0.08
  ) {
    world.lightParticles -= 6;
    const trees = producers.filter((e) => e.species === "tree").length;
    const flowers = producers.length - trees;
    const species = trees * 2 <= flowers ? "tree" : world.rng() < 0.35 ? "tree" : "flower";
    world.population.push(makeEntity(world, species));
    env.nutrients = clamp(env.nutrients - 0.5);
  }
}

// ---------- زیست‌شناسی ----------
function growProducers(world) {
  const env = world.env;
  for (const e of world.population) {
    if (e.role !== "producer") continue;
    const f = (env.light / 100) * 0.5 + (env.water / 100) * 0.3 + (env.soil / 100) * 0.2;
    e.growth = clamp(e.growth + f * 3);
    e.energy = clamp(e.energy + f * 4 - 0.6);
    e.biomass = clamp(e.biomass + f * 1.5);
    env.biomass = clamp(env.biomass + f * 0.15);
    if (e.stage === "fruiting") env.biomass = clamp(env.biomass + 0.12);
  }
}

// منابع خوراکی مشخص‌اند؛ مصرف‌کننده‌ها برای منبع مشترک رقابت می‌کنند.
function feedConsumers(world) {
  const env = world.env;
  const consumers = world.population.filter(e => e.role === "consumer" && e.stage !== "returning");
  for (const e of consumers) {
    const diet = SPECIES[e.species].diet || [];
    let intake = 0;
    if (diet.includes("tree") || diet.includes("flower")) {
      const edible = world.population.filter(p => diet.includes(p.species) && p.role === "producer" && p.stage !== "returning" && p.biomass > 0.5);
      if (edible.length) {
        const target = edible[Math.floor(world.rng() * edible.length)];
        const amount = Math.min(target.biomass, e.species === "pollinator" ? 0.12 : 0.32);
        target.biomass = Math.max(0, target.biomass - amount);
        intake += amount * (e.species === "pollinator" ? 13 : 8);
        if (e.species === "pollinator") target.health = clamp(target.health + 0.12);
      }
    }
    if (diet.includes("organic") || diet.includes("algae")) {
      const amount = Math.min(env.organic, e.species === "aquatic" ? 0.55 : 0.25);
      env.organic = Math.max(0, env.organic - amount);
      intake += amount * 3;
      if (e.species === "aquatic" && env.oxygen < 25) e.health = clamp(e.health - 0.8);
    }
    // محدودیت ظرفیت زیستی و رقابت: با افزایش جمعیت، سهم هر فرد کمتر می‌شود.
    const crowding = Math.max(0, consumers.length / Math.max(1, world.populationCap * 0.42) - 0.55);
    const need = e.species === "pollinator" ? 1.1 : e.species === "aquatic" ? 1.6 : 2.0;
    const net = intake * (1 - Math.min(0.75, crowding * 0.18)) - need;
    e.energy = clamp(e.energy + net);
    e.health = clamp(e.health + (net > 0 ? 0.22 : -0.65));
    if (net < -0.5) e.stress = (e.stress || 0) + 1;
    else e.stress = Math.max(0, (e.stress || 0) - 1);
  }
}

function predatorPressure(world) {
  const predators = world.population.filter(e => e.role === "predator" && e.stage !== "returning");
  for (const hunter of predators) {
    const diet = SPECIES[hunter.species].diet || [];
    const prey = world.population.filter(e => diet.includes(e.species) && e.stage !== "returning" && e.health > 0);
    if (!prey.length) {
      hunter.energy = clamp(hunter.energy - 2.2);
      hunter.health = clamp(hunter.health - 0.35);
      continue;
    }
    const victim = prey[Math.floor(world.rng() * prey.length)];
    const damage = 5.5 * (1 - 0.55 * victim.resilience);
    victim.health = clamp(victim.health - damage);
    hunter.energy = clamp(hunter.energy + damage * 0.55);
    hunter.health = clamp(hunter.health + 0.25);
    // شکار زیست‌توده را به سطح بالاتر شبکه غذایی منتقل می‌کند.
    hunter.biomass = clamp(hunter.biomass + damage * 0.04);
  }
}

function decomposeOrganic(world) {
  const env = world.env;
  let toSoil = 0;
  for (const e of world.population) {
    if (e.role !== "decomposer") continue;
    if (env.organic > 2) {
      env.organic = clamp(env.organic - 1.5);
      toSoil += 1.1;
      e.energy = clamp(e.energy + 1.4);
    }
  }
  env.soil = clamp(env.soil + toSoil);
  env.nutrients = clamp(env.nutrients + toSoil * 0.5);
}

function ageAndProgress(world) {
  for (const e of world.population) {
    e.age += 1;
    e.energy = clamp(e.energy - 0.35);
    e.health = clamp(e.health - 0.2 + (e.energy > 40 ? 0.15 : -0.2));
    e.experience += 0.02;
    e.stage = stageFor(e);
  }
}

function handleReproduction(world) {
  world.recentBirths *= 0.6;
  if (world.population.length >= world.populationCap) return;\n  const producers = world.population.filter(e => e.role === "producer").length;\n  const consumers = world.population.filter(e => e.role === "consumer" || e.role === "predator").length;\n  const producerCapacity = Math.max(2, Math.floor(world.populationCap * 0.48 * (0.35 + world.env.water / 150 + world.env.soil / 180)));\n  const consumerCapacity = Math.max(1, Math.floor(world.populationCap * 0.38 * (0.25 + world.env.biomass / 130 + world.env.oxygen / 220)));
  const counts = {};
  for (const e of world.population) counts[e.species] = (counts[e.species] || 0) + 1;
  const diversityBoost = world.sun.policy === "diversity";
  const born = [];
  for (const e of world.population) {
    if (e.stage !== "mature" && e.stage !== "fruiting") continue;\n    if (e.role === "producer" && producers + born.length >= producerCapacity) continue;\n    if ((e.role === "consumer" || e.role === "predator") && consumers + born.length >= consumerCapacity) continue;
    if (e.health < 55 || e.energy < 45) continue;
    const rarity = diversityBoost ? 1 / (1 + (counts[e.species] || 1)) : 0.15;
    const chance = (0.02 + rarity * 0.06) * (e.stage === "fruiting" ? 1.5 : 1);
    if (world.rng() < chance) {
      born.push(makeEntity(world, e.species, e));
      e.childCount += 1;
      e.energy = clamp(e.energy - 12);
    }
  }
  for (const c of born) world.population.push(c);
  world.recentBirths += born.length;
}

// بازگشت به خاک: مواد به خاک، انرژی و «تجربه» به خورشید
function handleDeaths(world) {
  world.recentReturns *= 0.6;
  const alive = [];
  let biomass = 0;
  let died = 0;
  for (const e of world.population) {
    if (e.stage !== "returning") {
      alive.push(e);
      continue;
    }
    died += 1;
    biomass += e.biomass * 0.6;
    world.sun.experienceTotal += e.experience;
    world.sun.xp += e.experience * 0.15 + e.energy * 0.01;
    world.turn.expReturned += e.experience;
    if (e.age < SPECIES[e.species].lifespan * 0.7) world.turn.premature += 1;
  }
  world.population = alive;
  world.stats.died += died;
  world.recentReturns += died;
  world.env.organic = clamp(world.env.organic + biomass * 0.4);
  world.env.nutrients = clamp(world.env.nutrients + biomass * 0.2);

  if (world.population.length === 0 && world.env.biomass > 25) {
    world.population.push(makeEntity(world, "tree"));
    logEvent(world, "جمعیت نابود شد؛ خورشید درخت بنیان‌گذار ایجاد کرد.");
  }
}

function computeHealth(world) {
  const roles = { producer: 0, consumer: 0, predator: 0, decomposer: 0 };
  let healthSum = 0;
  let resSum = 0;
  const seen = new Set();
  for (const e of world.population) {
    roles[e.role] += 1;
    healthSum += e.health;
    resSum += e.resilience;
    seen.add(e.species);
  }
  const n = world.population.length || 1;
  world.avgResilience = resSum / n;
  const balance = 100 - (Math.abs(roles.producer - roles.consumer) * 3 + Math.abs(roles.consumer - roles.predator * 3) * 1.5);
  const env = world.env;
  const resources = (env.biomass + env.soil + env.water + env.nutrients + env.oxygen) / 5;
  const diversity = (seen.size / Object.keys(SPECIES).length) * 100;
  return clamp((healthSum / n) * 0.35 + clamp(balance) * 0.2 + resources * 0.25 + diversity * 0.2);
}

// ---------- رشد خورشید در درخت حیات ----------
function updateSunGrowth(world, reward) {
  const sun = world.sun;
  sun.xp += Math.max(0, reward) * 0.6 + 0.25;
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

export function step(world) {
  world.tick += 1;
  world.stats.totalTicks += 1;
  world.turn = { expReturned: 0, premature: 0 };
  const healthBefore = world.healthIndex;\n  const objectiveBefore = ecosystemObjective(world);

  updateEnvironment(world);
  updateChallenge(world);
  sunDecidePolicy(world);
  applyPolicyEffects(world);
  emitLightAndSeeds(world);
  growProducers(world);
  feedConsumers(world);
  predatorPressure(world);
  decomposeOrganic(world);
  ageAndProgress(world);
  handleReproduction(world);
  handleDeaths(world);

  world.healthIndex = computeHealth(world);
  if (world.healthIndex > world.stats.bestHealth) world.stats.bestHealth = world.healthIndex;

  const objectiveAfter = ecosystemObjective(world);\n  const reward = clamp((objectiveAfter - objectiveBefore) * 20 + (world.healthIndex - healthBefore) * 0.08 + 0.03 * world.turn.expReturned - 0.25 * world.turn.premature, -10, 10);
  sunLearn(world, reward);
  updateSunGrowth(world, reward);

  world.history.push({ tick: world.tick, health: world.healthIndex, population: world.population.length, sunLevel: world.sun.level });
  if (world.history.length > 120) world.history.shift();
  return world;
}

// ---------- خروجی برای رابط کاربری ----------
export function getTreeOfLifeState(world) {
  return SEPHIROT.map((n) => ({ ...n, lit: n.level <= world.sun.level }));
}
export function getCurrentZodiac(world) {
  return ZODIAC[world.zodiacIndex];
}
export function summarizeEntity(e) {
  return {
    id: e.id,
    species: SPECIES[e.species].name,
    role: e.role,
    stage: STAGE_FA[e.stage],
    age: Math.round(e.age),
    energy: Math.round(e.energy),
    health: Math.round(e.health),
    childCount: e.childCount,
    gen: e.gen,
    experience: Math.round(e.experience * 10) / 10,
    resilience: Math.round(e.resilience * 100),
  };
}
