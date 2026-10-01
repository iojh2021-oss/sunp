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
  // ---- ۱۲ موجود زودیاک: با رسیدن خورشید به هر نشان، از نور همان نشان متولد می‌شوند ----
  aries: { role: "consumer", diet: ["tree", "flower"], name: "قوچ", zodiac: "حمل", lifespan: 220, matureAge: 32 },
  taurus: { role: "consumer", diet: ["tree", "flower"], name: "گاو", zodiac: "ثور", lifespan: 260, matureAge: 38 },
  gemini: { role: "consumer", diet: ["flower"], name: "دوقلوها", zodiac: "جوزا", lifespan: 90, matureAge: 12 },
  cancer: { role: "consumer", diet: ["organic", "algae"], name: "خرچنگ", zodiac: "سرطان", lifespan: 170, matureAge: 24 },
  leo: { role: "predator", diet: ["herbivore", "pollinator", "aquatic", "aries", "taurus"], name: "شیر", zodiac: "اسد", lifespan: 280, matureAge: 48 },
  virgo: { role: "producer", name: "خوشه گندم", zodiac: "سنبله", lifespan: 130, matureAge: 18 },
  libra: { role: "decomposer", name: "ترازو", zodiac: "میزان", lifespan: 120, matureAge: 16 },
  scorpio: { role: "predator", diet: ["herbivore", "pollinator", "gemini", "cancer"], name: "کژدم", zodiac: "عقرب", lifespan: 240, matureAge: 40 },
  sagittarius: { role: "predator", diet: ["herbivore", "aries", "taurus", "capricorn"], name: "کمانگیر", zodiac: "قوس", lifespan: 250, matureAge: 42 },
  capricorn: { role: "consumer", diet: ["tree", "flower", "virgo"], name: "بز کوهی", zodiac: "جدی", lifespan: 210, matureAge: 30 },
  aquarius: { role: "consumer", diet: ["organic", "algae"], name: "آبریز", zodiac: "دلو", lifespan: 190, matureAge: 26 },
  pisces: { role: "consumer", diet: ["organic", "algae"], name: "ماهی", zodiac: "حوت", lifespan: 160, matureAge: 20 },
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
  heatwave: { name: "گرمای شدید", prior: "conserve" },
  windstorm: { name: "توفان", prior: "balance" },
};
export const STATE_FA = {
  calm: "آرامش",
  ...Object.fromEntries(Object.entries(CHALLENGES).map(([key, c]) => [key, c.name])),
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

const NN_INPUTS=16, NN_OUTPUTS=SUN_POLICIES.length;
const PLAN_HORIZON=4;
let trainedRLPolicy = null;
function validFF(weights,bias,input,output){
  return Array.isArray(weights)&&weights.length===output&&Array.isArray(bias)&&bias.length===output&&weights.every(row=>Array.isArray(row)&&row.length===input);
}
export function loadSunRLPolicy(model) {
  if (!model || model.inputSize !== NN_INPUTS || model.actions !== NN_OUTPUTS) return false;
  if (model.version === 2) {
    // حافظه‌ی بلندمدت: بدنه‌ی خطی + یک سلول LSTM + سر تصمیم‌گیری (actor)؛ آموزش‌دیده در training/train_ppo.py
    const b=model.body, r=model.lstm, a=model.actor;
    if (!b || !r || !a) return false;
    if (!validFF(b.weights,b.bias,NN_INPUTS,b.weights?.length)) return false;
    const bodyOut=b.weights.length, H=r.hiddenSize;
    if (!Number.isInteger(H) || H<=0 || H>256) return false;
    if (!validFF(r.Wi,r.bi,bodyOut,4*H)) return false;
    if (!validFF(r.Wh,r.bh,H,4*H)) return false;
    if (!validFF(a.weights,a.bias,H,NN_OUTPUTS)) return false;
    trainedRLPolicy=model;
    return true;
  }
  if (model.version !== 1 || !Array.isArray(model.layers)) return false;
  let input=NN_INPUTS;
  for (const layer of model.layers) {
    if (!Array.isArray(layer.weights) || !Array.isArray(layer.bias) || layer.weights.length !== layer.bias.length || layer.weights.some(row => !Array.isArray(row) || row.length !== input)) return false;
    input=layer.bias.length;
  }
  if(input!==NN_OUTPUTS)return false;
  trainedRLPolicy=model;
  return true;
}
const sigmoid=v=>1/(1+Math.exp(-v));
const denseForward=(weights,bias,x)=>bias.map((b,o)=>b+weights[o].reduce((s,w,i)=>s+w*x[i],0));
// یک گام سلول LSTM: حافظه (h,c) از گام قبل خوانده و به‌روزرسانی می‌شود؛ همان «حافظه‌ی بلندمدت» خورشید است.
function lstmStep(r,z,state){
  const H=r.hiddenSize,gate=new Array(4*H);
  for(let g=0;g<4*H;g++){
    let v=r.bi[g]+r.bh[g];
    const wi=r.Wi[g],wh=r.Wh[g];
    for(let i=0;i<wi.length;i++)v+=wi[i]*z[i];
    for(let i=0;i<wh.length;i++)v+=wh[i]*state.h[i];
    gate[g]=v;
  }
  const newH=new Array(H),newC=new Array(H);
  for(let k=0;k<H;k++){
    const i=sigmoid(gate[k]),f=sigmoid(gate[H+k]),g=Math.tanh(gate[2*H+k]),o=sigmoid(gate[3*H+k]);
    const c2=f*state.c[k]+i*g;
    newC[k]=c2;newH[k]=o*Math.tanh(c2);
  }
  state.h=newH;state.c=newC;
  return newH;
}
function trainedPolicyLogits(world, features) {
  const m=trainedRLPolicy;
  if(!m)return null;
  if (m.version===2 && m.lstm) {
    const H=m.lstm.hiddenSize;
    let state=world.sun.rlHidden;
    if(!state||!Array.isArray(state.h)||state.h.length!==H)state=world.sun.rlHidden={h:Array(H).fill(0),c:Array(H).fill(0)};
    const z=denseForward(m.body.weights,m.body.bias,features).map(Math.tanh);
    const h=lstmStep(m.lstm,z,state);
    return denseForward(m.actor.weights,m.actor.bias,h);
  }
  if (!Array.isArray(m.layers)) return null;
  let x=features.slice();
  for(let l=0;l<m.layers.length;l++){
    const layer=m.layers[l],last=l===m.layers.length-1;
    x=layer.bias.map((b,o)=>{const zz=b+layer.weights[o].reduce((sum,w,i)=>sum+w*x[i],0);return last?zz:Math.tanh(zz);});
  }
  return x;
}
const NN_SHAPE=[NN_INPUTS,24,16,12,NN_OUTPUTS];
function freshNetwork(){
 const layers=[];
 for(let l=0;l<NN_SHAPE.length-1;l++){
  const fanIn=NN_SHAPE[l],fanOut=NN_SHAPE[l+1],scale=Math.sqrt(2/(fanIn+fanOut));
  layers.push({
   w:Array.from({length:fanOut},(_,o)=>Array.from({length:fanIn},(_,i)=>Math.sin((l+1)*97+(o+1)*17+(i+1)*13)*scale)),
   b:Array(fanOut).fill(0)
  });
 }
 return {layers,w1:layers[0].w,b1:layers[0].b,w2:layers[layers.length-1].w,b2:layers[layers.length-1].b,updates:0};
}
function neuralFeatures(world){
 const e=world.env,c=world.challenge,p=world.population;
 const counts={};for(const x of p)counts[x.species]=(counts[x.species]||0)+1;
 // بر پایه‌ی نقش (نه اسم گونه) شمرده می‌شود تا موجودات تازه (مثل ۱۲ موجود زودیاک) هم خودشان را در ورودی شبکه نشان دهند.
 const nonPredatorConsumers=p.filter(x=>x.role==="consumer").length;
 const norm=v=>Math.max(-1,Math.min(1,v*2-1));
 return [e.light/100,(e.temp+20)/80,e.water/100,e.soil/100,e.nutrients/100,e.oxygen/100,e.biomass/100,e.organic/100,
  world.healthIndex/100,Math.min(1,p.length/world.populationCap),Math.min(1,(counts.tree||0)/10),Math.min(1,(counts.flower||0)/10),
  Math.min(1,nonPredatorConsumers/20),c?1:0,c?c.severity:0,world.sun.level/10].map(norm);
}
function neuralForward(net,x){
 const activations=[x.slice()];
 for(let l=0;l<net.layers.length;l++){
  const layer=net.layers[l],last=l===net.layers.length-1;
  activations.push(layer.b.map((b,o)=>{
   const z=b+layer.w[o].reduce((sum,w,i)=>sum+w*activations[l][i],0);
   return last?z:Math.tanh(z);
  }));
 }
 return {hidden:activations[activations.length-2],output:activations[activations.length-1],activations};
}
function trainNeural(net,x,action,target){
 const pass=neuralForward(net,x),last=net.layers.length-1;
 const error=Math.max(-5,Math.min(5,target-pass.output[action]));
 const lr=.012/Math.sqrt(1+net.updates/800);
 const deltas=Array(net.layers.length);
 deltas[last]=pass.output.map((_,o)=>o===action?error:0);
 for(let l=last-1;l>=0;l--){
  const next=net.layers[l+1],deltaNext=deltas[l+1],a=pass.activations[l+1];
  deltas[l]=a.map((v,i)=>(1-v*v)*next.w.reduce((sum,row,o)=>sum+row[i]*deltaNext[o],0));
 }
 for(let l=0;l<net.layers.length;l++){
  const layer=net.layers[l],input=pass.activations[l],delta=deltas[l];
  for(let o=0;o<layer.w.length;o++){
   layer.b[o]=Math.max(-8,Math.min(8,layer.b[o]+lr*delta[o]));
   for(let i=0;i<layer.w[o].length;i++)layer.w[o][i]=Math.max(-4,Math.min(4,layer.w[o][i]+lr*delta[o]*input[i]));
  }
 }
 net.w1=net.layers[0].w;net.b1=net.layers[0].b;
 net.w2=net.layers[last].w;net.b2=net.layers[last].b;
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
    rlHidden: null, // حافظه‌ی بلندمدت LSTM (در صورت وجود مدل آموزش‌دیده)؛ بین گام‌ها و بین بارگذاری‌ها حفظ می‌شود
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
  const layers=fallback.layers.map((base,l)=>({
    w:base.w.map((row,o)=>row.map((v,i)=>num(rawNet.layers?.[l]?.w?.[o]?.[i],v,-4,4))),
    b:base.b.map((v,o)=>num(rawNet.layers?.[l]?.b?.[o],0,-8,8)),
  }));
  const neural={layers,w1:layers[0].w,b1:layers[0].b,w2:layers[layers.length-1].w,b2:layers[layers.length-1].b,updates:Math.floor(num(rawNet.updates,0,0,1e9))};
  const rh=s.rlHidden;
  const rlHidden=(rh && Array.isArray(rh.h) && Array.isArray(rh.c) && rh.h.length===rh.c.length && rh.h.length>0 && rh.h.length<=256)
    ? { h: rh.h.map(v=>num(v,0,-20,20)), c: rh.c.map(v=>num(v,0,-20,20)) }
    : null;
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
      rlHidden,
      memory: Array.isArray(s.replay ?? s.memory) ? (s.replay ?? s.memory).slice(-256).filter(m => m && Array.isArray(m.features) && m.features.length === NN_INPUTS && Number.isInteger(m.action) && m.action >= 0 && m.action < NN_OUTPUTS).map(m => ({ features: m.features.map(v => num(v, 0, -1, 1)), action: m.action, target: num(m.target, 0, -20, 20), priority:num(m.priority,.1,.01,8) })) : [],
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
  sun.rlHidden = clean.sun.rlHidden;
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
    populationCap: 60,
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
// فرا رسیدن هر نشان زودیاک، یک موجود همان نشان را از نور خورشید متولد می‌کند (اگر ظرفیت و نور کافی باشد).
function spawnZodiacCreature(world) {
  const sign = ZODIAC[world.zodiacIndex];
  const sp = SPECIES[sign.id];
  if (!sp) return;
  // این تولد نمادین است (فرارسیدن یک نشان)، پس کمی فراتر از سقف معمول جمعیت هم مجاز است؛ مثل بقیه‌ی موجودات با کمبود انرژی/سلامت طبیعی می‌میرد.
  if (world.population.length >= world.populationCap + 6) return;
  if (world.lightParticles < 6) return;
  world.lightParticles = clamp(world.lightParticles - 6, 0, 60);
  world.population.push(makeEntity(world, sign.id));
  logEvent(world, `فرارسیدن ${sign.name} ${sign.symbol}: ${sp.name} از نور خورشید متولد شد.`);
}


function updateEnvironment(world) {
  world.day += 1;
  if (world.day % DAYS_PER_SIGN === 0) {
    world.zodiacIndex = (world.zodiacIndex + 1) % ZODIAC.length;
    spawnZodiacCreature(world);
  }
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
  } else if (c.type === "heatwave") {
    env.temp += 14 * sev;
    env.water = clamp(env.water - 2.0 * sev);
    env.light = clamp(env.light + 6 * sev);
  } else if (c.type === "windstorm") {
    env.biomass = clamp(env.biomass - 1.6 * sev);
    env.organic = clamp(env.organic + 0.8 * sev);
  }
  const isAquaticLike = (e) => e.species === "aquatic" || (SPECIES[e.species].diet || []).includes("algae");
  for (const e of world.population) {
    let dmg = 0;
    const producer = e.role === "producer";
    if (c.type === "drought") dmg = producer || isAquaticLike(e) ? 2.6 : 0.8;
    else if (c.type === "cold") dmg = e.role === "decomposer" ? 0.3 : e.role === "producer" ? 1.0 : 2.0;
    else if (c.type === "blight") dmg = producer ? 3.0 : e.role === "decomposer" ? 0 : 0.3;
    else if (c.type === "flood") dmg = isAquaticLike(e) ? 0 : e.role === "producer" ? 1.0 : 1.8;
    else if (c.type === "heatwave") dmg = producer ? 2.2 : isAquaticLike(e) ? 2.8 : 1.2;
    else if (c.type === "windstorm") dmg = e.role === "predator" ? 0.6 : producer ? 1.4 : 1.0;
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

function stateSimilarity(a,b){
 let d=0;for(let i=0;i<Math.min(a.length,b.length);i++){const z=a[i]-b[i];d+=z*z;}
 return Math.exp(-3*d/Math.max(1,Math.min(a.length,b.length)));
}
// مدل پیش‌بینی تقریبی؛ فقط روی کپی منابع و ویژگی‌های جمعیت کار می‌کند.
function predictPolicyOutcome(world, policy, horizon=PLAN_HORIZON){
 const env={...world.env},pop=world.population.map(e=>({health:e.health,energy:e.energy,role:e.role,species:e.species,resilience:e.resilience}));
 const c=world.challenge;
 let score=0;
 for(let t=0;t<horizon;t++){
  if(policy==="repair"){env.biomass=clamp(env.biomass+3.2);env.soil=clamp(env.soil+1.5);env.nutrients=clamp(env.nutrients-1.2);}
  else if(policy==="conserve"){env.water=clamp(env.water+2.4);env.soil=clamp(env.soil+1.2);env.light=clamp(env.light-1.5);}
  else if(policy==="balance"){env.oxygen=clamp(env.oxygen+1.2);env.biomass=clamp(env.biomass+1);}
  else {env.nutrients=clamp(env.nutrients+3);env.oxygen=clamp(env.oxygen+.8);}
  if(c)for(const e of pop){const stress=c.type==="drought"?env.water<25: c.type==="cold"?env.temp<10:c.type==="blight"?env.nutrients<25:env.oxygen<25;e.health=clamp(e.health-c.severity*(stress?1.2:.55)*(e.role==="producer"?1.1:.7)*(1-.7*e.resilience));}
  const resource=(env.water+env.soil+env.nutrients+env.oxygen+env.biomass)/500;
  const health=pop.length?pop.reduce((a,e)=>a+e.health,0)/(pop.length*100):0;
  const richness=new Set(world.population.map(e=>e.species)).size/Object.keys(SPECIES).length;
  score+=.45*health+.3*resource+.25*richness;
  for(const e of pop)e.health=clamp(e.health-(e.energy<35?.45:.12));
 }
 return score/horizon;
}
// هم‌مقیاس‌سازی خروجی شبکه و جدول ارزش با امتیاز برنامه‌ریزی.
const normalizeLearnedValue = value => .5 + .5 * Math.tanh(value / 4);
function evaluatePolicies(world, features, vals, visits) {
  const memory=world.sun.replay||[];
  const neural=neuralForward(world.sun.neural,features).output;
  const totalVisits=SUN_POLICIES.reduce((sum,p)=>sum+(visits[p]||0),0);
  return SUN_POLICIES.map((policy,action)=>{
    let rollout=0;
    for(let h=1;h<=PLAN_HORIZON;h++)rollout+=predictPolicyOutcome(world,policy,h)/h;
    rollout/=PLAN_HORIZON;
    let similar=0,weight=0;
    for(const m of memory){
      if(m.action!==action)continue;
      const sim=stateSimilarity(features,m.features);
      similar+=sim*normalizeLearnedValue(m.target);weight+=sim;
    }
    const recalled=weight?similar/weight:.5;
    const tabular=normalizeLearnedValue(vals[policy]||0);
    const learned=normalizeLearnedValue(neural[action]);
    const confidence=1-Math.exp(-weight/3);
    const score=.36*rollout+.28*learned+.22*tabular+.14*recalled;
    const exploration=.035*Math.sqrt(Math.log(totalVisits+2)/((visits[policy]||0)+1));
    return {policy,action,score,rollout,learned,tabular,recalled,confidence,exploration,
      decisionScore:score+exploration,visits:visits[policy]||0};
  });
}
function planPolicy(world,features){
  const key=world.challenge?world.challenge.type:"calm";
  const vals=ensureState(world.sun,key);
  return evaluatePolicies(world,features,vals,world.sun.visits[key]).map(x=>x.decisionScore);
}
export function getSunDecisionReport(world) {
  const key=world.challenge?world.challenge.type:"calm";
  const vals=world.sun.values[key]||zeroPolicies();
  const visits=world.sun.visits[key]||zeroPolicies();
  const features=neuralFeatures(world);
  const ranked=evaluatePolicies(world,features,vals,visits).sort((a,b)=>b.decisionScore-a.decisionScore);
  return {state:key,selected:ranked[0]?.policy||"balance",policies:ranked.map(({policy,score,rollout,learned,tabular,recalled,confidence,exploration,visits})=>({policy,score,rollout,learned,tabular,recalled,confidence,exploration,visits}))};
}
function sunDecidePolicy(world, policyOverride=null, cognitiveAdvice=null) {
  const sun=world.sun,key=world.challenge?world.challenge.type:"calm";
  const vals=ensureState(sun,key),eps=Math.max(.025,.2-.012*sun.level-.01*sun.wisdomCycles);
  const features=neuralFeatures(world);
  const evaluations=evaluatePolicies(world,features,vals,sun.visits[key]);
  const qValues=evaluations.map(x=>x.decisionScore);
  const trainedLogits=trainedPolicyLogits(world, features);
  let action=0;
  if(policyOverride && SUN_POLICIES.includes(policyOverride))action=SUN_POLICIES.indexOf(policyOverride);
  else if(world.rng()<eps)action=Math.floor(world.rng()*SUN_POLICIES.length);
  else {
    const scores=(trainedLogits ?? qValues).map((value,i)=>value + (cognitiveAdvice?.policyScores ? 0.12 * (cognitiveAdvice.policyScores[SUN_POLICIES[i]] || 0) : 0));
    let best=-Infinity;
    for(let i=0;i<scores.length;i++)if(scores[i]>best){best=scores[i];action=i}
  }
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
 let producers=0,nonPredConsumers=0;
 for(const x of p){const role=SPECIES[x.species].role;if(role==="producer")producers++;else if(role==="consumer")nonPredConsumers++;}
 const roleBalance=clamp(100-Math.abs(producers-nonPredConsumers)*2,0,100)/100;
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
  const sample={features:sun.lastFeatures.slice(),action:sun.lastActionIndex,target,priority:Math.abs(target-neuralForward(sun.neural,sun.lastFeatures).output[sun.lastActionIndex])};
  sun.replay.push(sample);if(sun.replay.length>256)sun.replay.shift();
  trainNeural(sun.neural,sample.features,sample.action,sample.target);
  for(let i=0;i<Math.min(4,sun.replay.length);i++){
   const weights=sun.replay.map(m=>Math.max(.05,Math.min(8,m.priority||.1)));
   const total=weights.reduce((a,v)=>a+v,0);let pick=world.rng()*total,index=0;
   for(;index<weights.length-1&&pick>weights[index];index++)pick-=weights[index];
   const old=sun.replay[index];trainNeural(sun.neural,old.features,old.action,old.target);
   old.priority=Math.abs(old.target-neuralForward(sun.neural,old.features).output[old.action]);
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
  if (world.population.length >= world.populationCap) return;
  const producers = world.population.filter(e => e.role === "producer").length;
  const consumers = world.population.filter(e => e.role === "consumer" || e.role === "predator").length;
  const producerCapacity = Math.max(2, Math.floor(world.populationCap * 0.48 * (0.35 + world.env.water / 150 + world.env.soil / 180)));
  const consumerCapacity = Math.max(1, Math.floor(world.populationCap * 0.38 * (0.25 + world.env.biomass / 130 + world.env.oxygen / 220)));
  const counts = {};
  for (const e of world.population) counts[e.species] = (counts[e.species] || 0) + 1;
  const diversityBoost = world.sun.policy === "diversity";
  const born = [];
  for (const e of world.population) {
    if (e.stage !== "mature" && e.stage !== "fruiting") continue;
    if (e.role === "producer" && producers + born.length >= producerCapacity) continue;
    if ((e.role === "consumer" || e.role === "predator") && consumers + born.length >= consumerCapacity) continue;
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

export function step(world, options = {}) {
  world.tick += 1;
  world.stats.totalTicks += 1;
  world.turn = { expReturned: 0, premature: 0 };
  const healthBefore = world.healthIndex;
  const objectiveBefore = ecosystemObjective(world);

  updateEnvironment(world);
  updateChallenge(world);
  sunDecidePolicy(world, options.policyOverride || null, options.cognitiveAdvice || null);
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

  const objectiveAfter = ecosystemObjective(world);
  const reward = clamp((objectiveAfter - objectiveBefore) * 20 + (world.healthIndex - healthBefore) * 0.08 + 0.03 * world.turn.expReturned - 0.25 * world.turn.premature, -10, 10);
  world.lastReward = reward;
  if (options.learn !== false) {
    sunLearn(world, reward);
    updateSunGrowth(world, reward);
  }

  world.history.push({ tick: world.tick, health: world.healthIndex, population: world.population.length, sunLevel: world.sun.level });
  if (world.history.length > 120) world.history.shift();
  return world;
}

// ---------- خروجی برای رابط کاربری ----------
// مقایسه‌ی منصفانه: عامل تطبیقیِ در حال یادگیری در برابر خط‌پایه‌ی قاعده‌محور.
 // هر دو روی بذرهای یکسان اجرا می‌شوند؛ خط‌پایه آموزش خورشید را غیرفعال می‌کند.
export function benchmarkEcosystem({seeds=[101,202,303,404,505],ticks=1200,window=200}={}) {
  const variants=["adaptiveAI","heuristicBaseline"];
  const results={};
  for(const variant of variants){
    const runs=[];
    for(const seed of seeds){
      const w=createWorld(seed);
      let healthSum=0,populationSum=0,richnessSum=0,aliveTicks=0;
      let minimumPopulation=Infinity,extinctionTicks=0;
      for(let i=0;i<ticks;i++){
        let policyOverride;
        if(variant==="heuristicBaseline"){
          policyOverride=w.challenge ? (CHALLENGES[w.challenge.type]?.prior||"balance") : "balance";
        }
        step(w,{policyOverride,learn:variant==="adaptiveAI"});
        if(w.population.length>0)aliveTicks++;
        else extinctionTicks++;
        minimumPopulation=Math.min(minimumPopulation,w.population.length);
        if(i>=Math.max(0,ticks-window)){
          healthSum+=w.healthIndex;
          populationSum+=w.population.length;
          richnessSum+=new Set(w.population.map(e=>e.species)).size;
        }
      }
      const samples=Math.min(ticks,window);
      runs.push({
        seed,aliveRate:ticks?aliveTicks/ticks:0,extinctionTicks,
        finalHealth:w.healthIndex,meanHealth: samples?healthSum/samples:0,
        finalPopulation:w.population.length,meanPopulation:samples?populationSum/samples:0,
        minimumPopulation:Number.isFinite(minimumPopulation)?minimumPopulation:0,
        finalRichness:new Set(w.population.map(e=>e.species)).size,
        meanRichness:samples?richnessSum/samples:0,
        challengesFaced:w.stats.challengesFaced,
        challengesSurvived:w.stats.challengesSurvived,
        challengeSurvivalRate:w.stats.challengesFaced?w.stats.challengesSurvived/w.stats.challengesFaced:1,
      });
    }
    const avg=key=>runs.reduce((sum,r)=>sum+r[key],0)/Math.max(1,runs.length);
    results[variant]={
      runs,meanAliveRate:avg("aliveRate"),meanExtinctionTicks:avg("extinctionTicks"),
      meanHealth:avg("meanHealth"),meanPopulation:avg("meanPopulation"),
      meanRichness:avg("meanRichness"),meanFinalRichness:avg("finalRichness"),
      meanChallengeSurvivalRate:avg("challengeSurvivalRate"),
    };
  }
  const ai=results.adaptiveAI,base=results.heuristicBaseline;
  const deltas={};
  for(const key of ["meanAliveRate","meanHealth","meanPopulation","meanRichness","meanFinalRichness","meanChallengeSurvivalRate"])
    deltas[key]=ai[key]-base[key];
  return {seeds:seeds.slice(),ticks,measurementWindow:Math.min(ticks,window),results,deltas};
}

// اجرای ثابت سیاست‌ها برای تحلیل اثر هر سیاست جداگانه.
export function benchmarkPolicies({seeds=[101,202,303],ticks=600}={}){
 const results={};
 for(const policy of SUN_POLICIES){
  const runs=[];
  for(const seed of seeds){
   const w=createWorld(seed);
   for(let i=0;i<ticks;i++)step(w,{policyOverride:policy,learn:false});
   runs.push({seed,health:w.healthIndex,population:w.population.length,richness:new Set(w.population.map(e=>e.species)).size,challengesSurvived:w.stats.challengesSurvived});
  }
  const avg=key=>runs.reduce((a,r)=>a+r[key],0)/runs.length;
  results[policy]={runs,meanHealth:avg("health"),meanPopulation:avg("population"),meanRichness:avg("richness"),meanChallengesSurvived:avg("challengesSurvived")};
 }
 return {seeds:seeds.slice(),ticks,results};
}

export function getSunObservation(world) { return neuralFeatures(world); }

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
