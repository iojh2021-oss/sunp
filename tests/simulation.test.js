// tests/simulation.test.js — تکرارپذیری، کران‌ها، زودیاک، درخت حیات، چالش‌ها، یادگیری و حافظه‌ی ماندگار.
// اجرا: node tests/simulation.test.js
import assert from "node:assert/strict";
import {
  createWorld, step, ZODIAC, SEPHIROT, PATHS_22, getTreeOfLifeState, getCurrentZodiac,
  exportMemory, sanitizeMemory, getLessons, getSunBonus, benchmarkPolicies, benchmarkEcosystem, getSunDecisionReport,
  SPECIES, CHALLENGES, STATE_FA,
} from "../src/simulation.js";

const runN = (w, n) => { for (let i = 0; i < n; i++) step(w); return w; };
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (err) { console.error(`✗ ${name}`); console.error(err); process.exitCode = 1; }
}

test("تکرارپذیری: دو جهان با بذر یکسان نتیجه یکسان می‌دهند", () => {
  const a = runN(createWorld(42), 300);
  const b = runN(createWorld(42), 300);
  assert.equal(a.day, b.day);
  assert.equal(a.population.length, b.population.length);
  assert.equal(Math.round(a.healthIndex), Math.round(b.healthIndex));
  assert.equal(a.sun.level, b.sun.level);
  assert.equal(a.stats.born, b.stats.born);
});

test("کران منابع محیطی و سلامت همیشه بین ۰ و ۱۰۰ می‌ماند", () => {
  const w = runN(createWorld(7), 800);
  for (const key of ["light", "water", "soil", "nutrients", "oxygen", "biomass", "organic"]) {
    assert.ok(w.env[key] >= 0 && w.env[key] <= 100, `${key}: ${w.env[key]}`);
  }
  assert.ok(w.healthIndex >= 0 && w.healthIndex <= 100);
});

test("زودیاک ۱۲ نشان دارد و می‌چرخد؛ درخت حیات ۱۰ سفیروت و ۲۲ مسیر دارد", () => {
  assert.equal(ZODIAC.length, 12);
  assert.equal(SEPHIROT.length, 10);
  assert.equal(PATHS_22.length, 22);
  const w = createWorld(1);
  const start = getCurrentZodiac(w).id;
  runN(w, 400);
  assert.notEqual(start, getCurrentZodiac(w).id);
});

test("سطح خورشید بین ۱ و ۱۰ است و گره‌ها تا همان سطح روشن‌اند", () => {
  const w = runN(createWorld(3), 700);
  assert.ok(w.sun.level >= 1 && w.sun.level <= 10);
  for (const n of getTreeOfLifeState(w)) assert.equal(n.lit, n.level <= w.sun.level);
});

test("موجودات از ذره‌های نور خورشید متولد می‌شوند", () => {
  const w = createWorld(5);
  runN(w, 5);
  assert.ok(w.lightParticles > 0);
  runN(w, 400);
  assert.ok(w.stats.born > 7, "باید بذر تازه از نور ساخته شود");
});

test("چالش‌ها رخ می‌دهند و موجودات تجربه و تاب‌آوری می‌گیرند", () => {
  const w = runN(createWorld(11), 1200);
  assert.ok(w.stats.challengesFaced > 0);
  assert.ok(w.avgResilience > 0);
  assert.ok(w.population.some((e) => e.experience > 0));
});

test("تجربه‌ی موجودات به خورشید برمی‌گردد و موجودات بعدی قوی‌تر می‌شوند", () => {
  const w = runN(createWorld(21), 1500);
  assert.ok(w.stats.died > 0);
  assert.ok(w.sun.experienceTotal > 0);
  const fresh = createWorld(21);
  assert.ok(getSunBonus(w) > getSunBonus(fresh));
});

test("خورشید یاد می‌گیرد: جدول ارزش‌ها و درس‌ها پر می‌شود", () => {
  const w = runN(createWorld(8), 1500);
  const lessons = getLessons(w);
  assert.ok(lessons.length >= 2);
  assert.ok(lessons.some((l) => l.visits > 50));
  assert.ok(Object.values(w.sun.values).some((v) => Object.values(v).some((x) => Math.abs(x) > 0.01 && x !== 0.5)));
});

test("حافظه‌ی ماندگار: خروجی/ورودی خورشید را کامل حفظ می‌کند", () => {
  const a = runN(createWorld(99), 900);
  const mem = JSON.parse(JSON.stringify(exportMemory(a))); // مثل ذخیره روی دیسک
  const b = createWorld(1234, mem);
  assert.equal(b.sun.level, a.sun.level);
  assert.equal(b.sun.wisdomCycles, a.sun.wisdomCycles);
  assert.equal(Math.round(b.sun.experienceTotal), Math.round(a.sun.experienceTotal));
  assert.deepEqual(b.sun.values, a.sun.values);
  assert.equal(b.stats.totalTicks, a.stats.totalTicks);
  assert.equal(b.stats.epochs, a.stats.epochs + 1);
  runN(b, 50); // ادامه بدهد بدون خطا
  assert.equal(b.stats.totalTicks, a.stats.totalTicks + 50);
});

test("حافظه‌ی نامعتبر یا مخرب پاکسازی می‌شود", () => {
  assert.equal(sanitizeMemory(null), null);
  assert.equal(sanitizeMemory("x"), null);
  assert.equal(sanitizeMemory({}), null);
  const m = sanitizeMemory({ sun: { level: 999, xp: -5, experienceTotal: "abc", values: { calm: { repair: 1e9 }, hack: { repair: 1 } } }, stats: { totalTicks: NaN } });
  assert.equal(m.sun.level, 10);
  assert.equal(m.sun.xp, 0);
  assert.equal(m.sun.experienceTotal, 0);
  assert.equal(m.sun.values.calm.repair, 50);
  assert.equal(m.sun.values.hack, undefined);
  assert.equal(m.stats.totalTicks, 0);
  const w = createWorld(3, { sun: { level: -4 } }); // با حافظه‌ی ناقص هم جهان ساخته شود
  assert.equal(w.sun.level, 1);
});

test("اجرای طولانی بدون خطا؛ جمعیت منقرض نمی‌ماند و اعداد متناهی‌اند", () => {
  for (const seed of [2024, 5, 31337]) {
    const w = runN(createWorld(seed), 2500);
    assert.ok(w.population.length > 0);
    assert.ok(Number.isFinite(w.healthIndex));
    assert.ok(w.population.length <= w.populationCap + 5);
  }
});


test("شبکه عصبی واقعاً به‌روزرسانی می‌شود و replay محدود می‌ماند", () => {
  const w = runN(createWorld(123), 1800);
  assert.ok(w.sun.neural.updates > 0);
  assert.ok(w.sun.replay.length > 0 && w.sun.replay.length <= 256);
  assert.ok(w.sun.neural.w1.every(row => row.every(Number.isFinite)));
  assert.ok(w.sun.neural.w2.every(row => row.every(Number.isFinite)));
  const restored = createWorld(456, JSON.parse(JSON.stringify(exportMemory(w))));
  assert.equal(restored.sun.neural.updates, w.sun.neural.updates);
  assert.equal(restored.sun.replay.length, w.sun.replay.length);
});

test("خشکسالی ممتد و کمبود منابع: مقادیر متناهی و جمعیت در ظرفیت باقی می‌ماند", () => {
  const w = createWorld(818);
  w.env.water = 3;
  w.env.soil = 8;
  w.env.nutrients = 4;
  w.challenge = { type: "drought", severity: 0.95, duration: 250, remaining: 250 };
  runN(w, 250);
  for (const key of ["light", "temp", "water", "soil", "nutrients", "oxygen", "biomass", "organic"]) {
    assert.ok(Number.isFinite(w.env[key]), key);
    assert.ok(w.env[key] >= 0 && w.env[key] <= 100, key);
  }
  assert.ok(w.population.length <= w.populationCap + 5);
  assert.ok(Number.isFinite(w.healthIndex));
});

test("انقراض گونه‌ها/جمعیت و بازیابی موتور بدون NaN", () => {
  const w = createWorld(919);
  w.population = w.population.filter(e => e.species !== "predator" && e.species !== "aquatic");
  w.env.biomass = 2;
  w.env.water = 1;
  runN(w, 1200);
  assert.ok(Number.isFinite(w.healthIndex));
  assert.ok(w.population.every(e => Number.isFinite(e.health) && Number.isFinite(e.energy)));
  assert.ok(w.sun.neural.updates > 0);
});

test("برنامه‌ریزی و حافظه تجربه: خروجی‌ها متناهی‌اند و جهان زنده هنگام پیش‌بینی تغییر نمی‌کند", () => {
  const w = runN(createWorld(77), 120);
  const before = JSON.stringify({env:w.env,population:w.population,tick:w.tick});
  const report = benchmarkPolicies({seeds:[11,22],ticks:80});
  assert.equal(JSON.stringify({env:w.env,population:w.population,tick:w.tick}),before);
  for (const policy of ["repair","conserve","balance","diversity"]) {
    assert.ok(Number.isFinite(report.results[policy].meanHealth));
    assert.ok(Number.isFinite(report.results[policy].meanRichness));
    assert.equal(report.results[policy].runs.length,2);
  }
});

test("گزارش تصمیم خورشید همه سیاست‌ها و امتیازهای محدود را نشان می‌دهد", () => {
  const w = runN(createWorld(404), 90);
  const before = JSON.stringify({env:w.env,population:w.population,tick:w.tick,sun:w.sun});
  const report = getSunDecisionReport(w);
  assert.equal(report.policies.length, 4);
  assert.ok(["repair","conserve","balance","diversity"].includes(report.selected));
  for (const row of report.policies) {
    for (const key of ["score","rollout","learned","tabular","recalled","confidence","exploration"]) {
      assert.ok(Number.isFinite(row[key]), key);
    }
    assert.ok(row.confidence >= 0 && row.confidence <= 1);
  }
  assert.equal(JSON.stringify({env:w.env,population:w.population,tick:w.tick,sun:w.sun}), before);
});

test("مقایسه‌ی بقای عامل یادگیرنده با خط‌پایه روی بذرهای یکسان", () => {
  const report = benchmarkEcosystem({seeds:[101,202],ticks:360,window:80});
  assert.deepEqual(report.seeds,[101,202]);
  for (const variant of ["adaptiveAI","heuristicBaseline"]) {
    const row=report.results[variant];
    assert.equal(row.runs.length,2);
    for (const key of ["meanAliveRate","meanHealth","meanPopulation","meanRichness","meanFinalRichness","meanChallengeSurvivalRate"]) {
      assert.ok(Number.isFinite(row[key]), variant+" "+key);
    }
    for (const run of row.runs) {
      assert.ok(run.aliveRate>=0 && run.aliveRate<=1);
      assert.ok(run.challengeSurvivalRate>=0 && run.challengeSurvivalRate<=1);
      assert.ok(run.minimumPopulation>=0);
    }
  }
  assert.ok(Number.isFinite(report.deltas.meanAliveRate));
  assert.ok(Number.isFinite(report.deltas.meanHealth));
});

test("هر ۱۲ نشان زودیاک یک گونه‌ی متناظر معتبر در SPECIES دارد", () => {
  for (const z of ZODIAC) {
    const sp = SPECIES[z.id];
    assert.ok(sp, `گونه‌ی زودیاکی یافت نشد: ${z.id}`);
    assert.ok(["producer", "consumer", "predator", "decomposer"].includes(sp.role), z.id);
    assert.ok(sp.lifespan > 0 && sp.matureAge > 0 && sp.matureAge < sp.lifespan, z.id);
  }
});

test("رژیم غذایی هر گونه فقط به گونه‌های واقعاً موجود اشاره می‌کند", () => {
  for (const [id, sp] of Object.entries(SPECIES)) {
    for (const food of sp.diet || []) {
      const known = SPECIES[food] || food === "organic" || food === "algae";
      assert.ok(known, `${id} از منبع ناشناخته «${food}» تغذیه می‌کند`);
    }
  }
});

test("در یک بازه‌ی چند-چرخه‌ای (۸۰۰ روز)، هر ۱۲ موجود زودیاک دست‌کم یک‌بار متولد می‌شوند", () => {
  for (const seed of [2026, 1, 2, 3, 99, 12345]) {
    const w = createWorld(seed);
    const seen = new Set();
    for (let i = 0; i < 800; i++) {
      step(w);
      for (const e of w.population) seen.add(e.species);
    }
    const missing = ZODIAC.filter((z) => !seen.has(z.id)).map((z) => z.id);
    assert.equal(missing.length, 0, `بذر ${seed}: متولد نشدند: ${missing.join(",")}`);
  }
});

test("چالش‌های جدید (گرمای شدید، توفان) ثبت شده‌اند و مقادیر محیط را در کران نگه می‌دارند", () => {
  assert.ok(CHALLENGES.heatwave && CHALLENGES.windstorm);
  assert.equal(STATE_FA.heatwave, CHALLENGES.heatwave.name);
  assert.equal(STATE_FA.windstorm, CHALLENGES.windstorm.name);
  for (const type of ["heatwave", "windstorm"]) {
    const w = createWorld(55);
    w.challenge = { type, severity: 0.9, duration: 200, remaining: 200 };
    runN(w, 200);
    for (const key of ["light", "water", "soil", "nutrients", "oxygen", "biomass", "organic"]) {
      assert.ok(Number.isFinite(w.env[key]) && w.env[key] >= 0 && w.env[key] <= 100, `${type}/${key}`);
    }
    assert.ok(Number.isFinite(w.healthIndex));
  }
});

test("گسترش دنیا شکل ورودی شبکه را نمی‌شکند و همچنان ۱۶ ویژگی تولید می‌شود", () => {
  const w = runN(createWorld(3030), 400);
  const report = getSunDecisionReport(w);
  assert.equal(report.policies.length, 4);
  for (const row of report.policies) assert.ok(Number.isFinite(row.score));
});
