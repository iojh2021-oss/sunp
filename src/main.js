// src/main.js — داشبورد و کنترل‌ها + حافظه‌ی ماندگار خورشید (سرور در صورت وجود، وگرنه مرورگر).
import {
  createWorld, step, exportMemory, getLessons, getTreeOfLifeState, getCurrentZodiac, summarizeEntity, loadSunRLPolicy,
  PATHS_22, PILLARS, POLICY_FA, STAGE_FA, SPECIES, CHALLENGES, getSunObservation,
} from "./simulation.js";
import { initScene, renderScene, hitTestEntity, speciesLabel } from "./scene.js";
import { getCognitiveAdvice, COGNITION_MODES, COGNITION_LABELS } from "./cognition.js";
import { requestCognitiveProposal } from "../cognition/bridge.js";

const BASE_SEED = 20260101;
const LOCAL_KEY = "sunp-memory-v1";
const TICK_BASE_MS = 900;
const SAVE_EVERY = 10;

let world = null;
let running = true; // «مشاهده چرخه خودکار»
let speed = 1;
let timer = null;
let storageMode = "local"; // "server" | "local"
let saveStatus = "—";
let cognitionMode = "both";
let lastAdvice = null;
let cognitionRequestInFlight = false;
let externalCognitionStatus = "API خارجی هنوز آزمایش نشده";
const DEFAULT_COGNITION_ENDPOINT = "https://sunp-cognition-proxy.iojh2021oss.workers.dev";
const COGNITION_ENDPOINT_KEY = "sunp-cognition-endpoint";

const $ = (id) => document.getElementById(id);
const canvas = $("world");
const ctx = initScene(canvas);

// ---------- ذخیره و بازیابی حافظه ----------
function authHeaders() {
  const h = { "content-type": "application/json" };
  const token = localStorage.getItem("sunpToken");
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function loadMemory() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (hash.get("token")) localStorage.setItem("sunpToken", hash.get("token"));
  try {
    const r = await fetch("api/memory", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      storageMode = "server";
      if (j && j.memory) return j.memory;
      return null;
    }
  } catch (_) { /* سرور نیست؛ به حافظه مرورگر برمی‌گردیم */ }
  storageMode = "local";
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return null;
}

async function persist() {
  if (!world) return;
  const mem = exportMemory(world);
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(mem)); } catch (_) { /* ignore */ }
  if (storageMode === "server") {
    try {
      const r = await fetch("api/memory", { method: "PUT", headers: authHeaders(), body: JSON.stringify(mem), keepalive: true });
      saveStatus = r.ok ? "ذخیره روی سرور ✓" : r.status === 401 ? "سرور: نیاز به کلید" : `سرور: خطا ${r.status}`;
    } catch (_) {
      saveStatus = "سرور در دسترس نیست (نسخه‌ی مرورگر ذخیره شد)";
    }
  } else {
    saveStatus = "ذخیره در مرورگر ✓";
  }
  renderMemory();
}

async function clearMemory() {
  if (!confirm("حافظه‌ی خورشید کاملاً پاک شود و از صفر شروع کند؟")) return;
  try { localStorage.removeItem(LOCAL_KEY); } catch (_) { /* ignore */ }
  if (storageMode === "server") {
    try { await fetch("api/memory", { method: "DELETE", headers: authHeaders() }); } catch (_) { /* ignore */ }
  }
  world = createWorld(BASE_SEED, null);
  saveStatus = "حافظه پاک شد";
  renderAll();
}

// ---------- رندر ----------
function renderStats() {
  const c = world.challenge;
  $("stats").innerHTML = `
    <div class="stat"><span>روز</span><b>${world.day}</b></div>
    <div class="stat"><span>سلامت اکوسیستم</span><b>${Math.round(world.healthIndex)}</b></div>
    <div class="stat"><span>جمعیت</span><b>${world.population.length}</b></div>
    <div class="stat"><span>تاب‌آوری میانگین</span><b>${Math.round(world.avgResilience * 100)}٪</b></div>
    <div class="stat"><span>ذره نور</span><b>${Math.round(world.lightParticles)}</b></div>
    <div class="stat"><span>آب / خاک</span><b>${Math.round(world.env.water)} / ${Math.round(world.env.soil)}</b></div>`;
  $("challenge").className = "challenge" + (c ? " on" : "");
  $("challenge").textContent = c
    ? `⚠ چالش: ${CHALLENGES[c.type].name} · شدت ${Math.round(c.severity * 100)}٪ · ${c.remaining} گام مانده · پاسخ خورشید: ${POLICY_FA[world.sun.policy]}`
    : `وضعیت: آرامش · سیاست خورشید: ${POLICY_FA[world.sun.policy]}`;
}

function renderPopulation() {
  const counts = {};
  for (const e of world.population) counts[e.stage] = (counts[e.stage] || 0) + 1;
  $("population").innerHTML = Object.entries(STAGE_FA)
    .map(([k, fa]) => `<div class="pill"><span>${fa}</span><b>${counts[k] || 0}</b></div>`).join("");
  const sc = {};
  for (const e of world.population) sc[e.species] = (sc[e.species] || 0) + 1;
  $("species").innerHTML = Object.keys(SPECIES)
    .map((s) => `<div class="pill"><span>${speciesLabel(s)}</span><b>${sc[s] || 0}</b></div>`).join("");
}

function renderCognition() {
  const modeSelect = $("cognitionMode");
  if (modeSelect && modeSelect.value !== cognitionMode) modeSelect.value = cognitionMode;
  const advice = lastAdvice || getCognitiveAdvice(world, cognitionMode);
  $("cognitionSummary").textContent = advice.summary || "خورشید تنها تصمیم می‌گیرد.";
  $("cognitionModeLabel").textContent = COGNITION_LABELS[cognitionMode] || cognitionMode;
  const scores = advice.policyScores;
  $("cognitionSignals").innerHTML = scores ? Object.entries(scores).map(([p,v]) => `<span class="pill"><span>${POLICY_FA[p]}</span><b>${Math.round(v*100)}٪</b></span>`).join("") : "<span class=\"hint\">عامل‌های کمکی خاموش‌اند.</span>";
  $("cognitionRules").textContent = advice.hyperon?.rules?.length ? advice.hyperon.rules.join(" · ") : "قاعده نمادین فعالی گزارش نشده.";
  const status = $("cognitionServiceStatus");
  if (status) status.textContent = advice.external ? `اتصال واقعی: ${advice.external.provider || advice.external.source}${advice.external.fallback ? " (بازگشت به baseline)" : ""} · پیشنهاد: ${POLICY_FA[advice.external.policy] || advice.external.policy}` : externalCognitionStatus;
}

function renderPolicy() {
  $("policy").textContent = `${POLICY_FA[world.sun.policy]} · سطح خورشید ${world.sun.level} (چرخه خرد: ${world.sun.wisdomCycles})`;
  $("sunLevel").textContent = world.sun.level;
  const z = getCurrentZodiac(world);
  $("zodiacInfo").textContent = `${z.symbol} ${z.name} · روز ${world.day}`;
}

function renderHistory() {
  $("history").innerHTML = world.history.slice(-40)
    .map((h) => `<span class="bar" style="height:${Math.max(2, (h.health / 100) * 40)}px" title="گام ${h.tick}: سلامت ${Math.round(h.health)}"></span>`).join("");
  $("events").innerHTML = world.events.map((e) => `<li>${e.text}</li>`).join("");
}

function renderMemory() {
  if (!world) return;
  const s = world.stats;
  $("memory").innerHTML = `
    <div class="pill"><span>وضعیت ذخیره</span><b>${saveStatus}</b></div>
    <div class="pill"><span>نسل جهان‌ها</span><b>${s.epochs}</b></div>
    <div class="pill"><span>کل گام‌ها</span><b>${s.totalTicks}</b></div>
    <div class="pill"><span>تجربه‌ی بازگشتی به خورشید</span><b>${Math.round(world.sun.experienceTotal)}</b></div>
    <div class="pill"><span>چرخه خرد</span><b>${world.sun.wisdomCycles}</b></div>
    <div class="pill"><span>بیشترین نسل موجودات</span><b>${s.generationMax}</b></div>
    <div class="pill"><span>چالش‌ها (گذشته/کل)</span><b>${s.challengesSurvived}/${s.challengesFaced}</b></div>
    <div class="pill"><span>بهترین سلامت</span><b>${Math.round(s.bestHealth)}</b></div>`;
  const lessons = getLessons(world);
  $("lessons").innerHTML = lessons.length
    ? lessons.map((l) => `<li>«${l.stateFa}» ← ${l.policyFa} <small>(امتیاز ${l.score.toFixed(2)} · ${l.visits} بار)</small></li>`).join("")
    : "<li>هنوز درسی آموخته نشده.</li>";
}

function renderTreeOfLife() {
  const nodes = getTreeOfLifeState(world);
  const byLevel = Object.fromEntries(nodes.map((n) => [n.level, n]));
  const W = 220, H = 320;
  const colX = { balance: W / 2, mercy: W * 0.78, severity: W * 0.22 };
  const pos = (n) => ({ x: colX[n.pillar], y: H - 24 - (n.level - 1) * ((H - 48) / 9) });
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="tree-svg">`;
  for (const [a, b] of PATHS_22) {
    const pa = pos(byLevel[a]), pb = pos(byLevel[b]);
    svg += `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" class="path ${byLevel[a].lit && byLevel[b].lit ? "lit" : ""}" />`;
  }
  svg += `<text x="${colX.mercy}" y="${H - 4}" class="pillar-label mercy">${PILLARS.mercy.name}</text>`;
  svg += `<text x="${colX.severity}" y="${H - 4}" class="pillar-label severity">${PILLARS.severity.name}</text>`;
  svg += `<text x="${colX.balance}" y="14" class="pillar-label balance">${PILLARS.balance.name}</text>`;
  for (const n of nodes) {
    const p = pos(n);
    svg += `<g class="node ${n.lit ? "lit" : ""} pillar-${n.pillar}" data-level="${n.level}"><circle cx="${p.x}" cy="${p.y}" r="13"></circle><text x="${p.x}" y="${p.y}" dy="0.32em">${n.name}</text></g>`;
  }
  $("treeOfLife").innerHTML = svg + "</svg>";
  $("treeOfLife").querySelectorAll(".node").forEach((g) => {
    g.addEventListener("click", () => {
      const n = nodes.find((x) => x.level === Number(g.getAttribute("data-level")));
      $("entityDetail").innerHTML = `<b>${n.name} (${n.trait})</b><br>سطح ${n.level} از ۱۰ · ${n.lit ? "روشن (رسیده)" : "هنوز روشن نشده"} · ${PILLARS[n.pillar].name}`;
    });
  });
}

// نوار چرخه حیات مطابق عکس مرجع: هر مرحله با شمارنده‌ی واقعی موجودات در همان مرحله
function renderLifeCycle() {
  const P = world.population;
  const n = (fn) => P.filter(fn).length;
  const steps = [
    ["☀️", "نور خورشید", world.sun.level],
    ["✨", "ذره نور", Math.round(world.lightParticles)],
    ["🌰", "بذر", n((e) => e.stage === "seed")],
    ["🌱", "جوانه", n((e) => e.stage === "sprout")],
    ["🌿", "گیاه", n((e) => e.stage === "immature")],
    ["🌳", "درخت", n((e) => e.role === "producer" && e.stage === "mature")],
    ["🌸", "گل و میوه", n((e) => e.stage === "fruiting")],
    ["🦌", "موجود زنده", n((e) => e.role !== "producer" && e.role !== "decomposer")],
    ["🐣", "تولید مثل", Math.round(world.recentBirths * 10) / 10],
    ["🍂", "بازگشت به خاک", Math.round(world.recentReturns * 10) / 10],
    ["♾️", "چرخه دوباره", world.stats.epochs + world.sun.wisdomCycles],
  ];
  $("lifeCycle").innerHTML = steps
    .map(([icon, name, count]) => `<div class="lc-step ${count > 0 ? "active" : ""}"><span class="lc-icon">${icon}</span>${name}<b>${count}</b></div>`)
    .join(`<div class="lc-arrow">←</div>`);
}

function renderAll() {
  renderStats();
  renderPopulation();
  renderPolicy();
  renderCognition();
  renderHistory();
  renderMemory();
  renderTreeOfLife();
  renderLifeCycle();
}

// ---------- حلقه شبیه‌سازی ----------
async function doStep() {
  if (cognitionRequestInFlight) return;
  cognitionRequestInFlight = true;
  try {
    lastAdvice = getCognitiveAdvice(world, cognitionMode);
    if (cognitionMode === "braincog" || cognitionMode === "hyperon" || cognitionMode === "both") {
      const endpoint = (localStorage.getItem(COGNITION_ENDPOINT_KEY) || DEFAULT_COGNITION_ENDPOINT).replace(/\/+$/, "");
      const providers = cognitionMode === "both" ? ["braincog", "hyperon"] : [cognitionMode];
      const proposals = await Promise.all(providers.map(provider => requestCognitiveProposal({
        observation: getSunObservation(world),
        state: world.challenge ? world.challenge.type : "calm",
        provider,
        endpoint: endpoint + "/decide",
        timeoutMs: 1800,
      })));
      const valid = proposals.filter(Boolean);
      if (valid.length) {
        const scores = { ...(lastAdvice.policyScores || { repair: 0, conserve: 0, balance: 0, diversity: 0 }) };
        for (const proposal of valid) scores[proposal.policy] = Math.min(1, (scores[proposal.policy] || 0) + 0.3);
        const names = valid.map(p => p.provider || p.source).join(" + ");
        lastAdvice = { ...lastAdvice, policyScores: scores, external: { ...valid[0], provider: names },
          summary: [lastAdvice.summary, "پیشنهاد API واقعی: " + valid.map(p => POLICY_FA[p.policy] || p.policy).join("، ")].filter(Boolean).join(" · ") };
        externalCognitionStatus = "پاسخ API دریافت شد: " + names;
      } else externalCognitionStatus = "API عامل انتخاب‌شده پاسخ نداد؛ پیشنهاد محلی و PPO ادامه دارند.";
    } else externalCognitionStatus = "حالت خورشید تنها است؛ درخواست API ارسال نمی‌شود.";
    step(world, { cognitiveAdvice: lastAdvice });
    renderAll();
    if (world.tick % SAVE_EVERY === 0) persist();
  } finally { cognitionRequestInFlight = false; }
}

function scheduleLoop() {
  clearInterval(timer);
  if (running) timer = setInterval(doStep, TICK_BASE_MS / speed);
  $("toggle").textContent = running ? "⏸ توقف" : "▶ شروع";
}

function frame(t) {
  if (world) renderScene(canvas, ctx, world, t);
  requestAnimationFrame(frame);
}

function runCognitionBenchmark() {
  const button = $("cognitionBenchmark"), output = $("cognitionBenchmarkResult");
  button.disabled = true; output.textContent = "در حال مقایسه؛ جهان زنده فعلی تغییر نمی‌کند…";
  setTimeout(() => {
    try {
      const modes = ["off", "braincog", "hyperon", "both"], seeds = [101,202,303], ticks = 250;
      const rows = modes.map(mode => {
        const runs = seeds.map(seed => {
          const w = createWorld(seed); let health=0, population=0, richness=0, alive=0;
          for(let i=0;i<ticks;i++){ const advice=getCognitiveAdvice(w,mode); step(w,{cognitiveAdvice:advice}); health+=w.healthIndex; population+=w.population.length; richness+=new Set(w.population.map(e=>e.species)).size; if(w.population.length)alive++; }
          return {health:health/ticks,population:population/ticks,richness:richness/ticks,alive:alive/ticks};
        });
        const avg=k=>runs.reduce((s,r)=>s+r[k],0)/runs.length;
        return {mode,health:avg("health"),population:avg("population"),richness:avg("richness"),alive:avg("alive")};
      });
      const header="<p class=\"hint\">۳ بذر یکسان برای هر حالت · هر اجرا ۲۵۰ گام · PPO در همه حالت‌ها فعال است.</p>";
      const rowsHtml=rows.map(r=>"<tr><td>"+COGNITION_LABELS[r.mode]+"</td><td>"+r.health.toFixed(1)+"</td><td>"+r.population.toFixed(1)+"</td><td>"+r.richness.toFixed(1)+"</td><td>"+(r.alive*100).toFixed(0)+"٪</td></tr>").join("");
      output.innerHTML=header+"<div class=\"benchmark-table\"><table><thead><tr><th>حالت</th><th>سلامت میانگین</th><th>جمعیت</th><th>تنوع</th><th>بقای جمعیت</th></tr></thead><tbody>"+rowsHtml+"</tbody></table></div><p class=\"hint\">آزمون مرورگری مدل نمادین با سیگنال‌های سبک‌شده است؛ اجرای واقعی پکیج‌های Python نیست و به‌تنهایی اثبات برتری محسوب نمی‌شود.</p>";
    } catch(error) { output.textContent="مقایسه ناموفق: "+error.message; }
    finally { button.disabled=false; }
  },30);
}

function bindControls() {
  $("cognitionMode").addEventListener("change", () => { cognitionMode = $("cognitionMode").value; lastAdvice = getCognitiveAdvice(world, cognitionMode); renderCognition(); });
  $("cognitionBenchmark").addEventListener("click", runCognitionBenchmark);
  const endpointInput = $("cognitionEndpoint");
  if (endpointInput) {
    endpointInput.value = localStorage.getItem(COGNITION_ENDPOINT_KEY) || DEFAULT_COGNITION_ENDPOINT;
    endpointInput.addEventListener("change", () => { localStorage.setItem(COGNITION_ENDPOINT_KEY, endpointInput.value.trim().replace(/\/+$/, "")); externalCognitionStatus = "آدرس API ذخیره شد."; renderCognition(); });
  }
  const testApi = $("testCognitionApi");
  if (testApi) testApi.addEventListener("click", async () => {
    const endpoint = (endpointInput?.value || DEFAULT_COGNITION_ENDPOINT).trim().replace(/\/+$/, "");
    testApi.disabled = true; externalCognitionStatus = "در حال بررسی /health…"; renderCognition();
    try { const response = await fetch(endpoint + "/health", { cache: "no-store" }); const data = await response.json(); externalCognitionStatus = response.ok && data.ok ? `API متصل است · provider: ${data.provider}` : `پاسخ سلامت نامعتبر: HTTP ${response.status}`; }
    catch { externalCognitionStatus = "اتصال ناموفق؛ CORS، آدرس یا بیدارشدن Render را بررسی کن."; }
    finally { testApi.disabled = false; renderCognition(); }
  });
  $("toggle").addEventListener("click", () => { running = !running; scheduleLoop(); });
  $("step").addEventListener("click", () => { running = false; scheduleLoop(); doStep(); });
  $("reset").addEventListener("click", async () => {
    await persist();
    const mem = exportMemory(world);
    world = createWorld(BASE_SEED + mem.stats.epochs * 7919, mem);
    renderAll();
  });
  $("saveNow").addEventListener("click", () => persist());
  $("clearMemory").addEventListener("click", clearMemory);
  $("speed").addEventListener("input", () => {
    speed = Number($("speed").value);
    $("speedVal").textContent = `${speed}×`;
    scheduleLoop();
  });
  canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const id = hitTestEntity(world, ev.clientX - rect.left, ev.clientY - rect.top);
    world.selectedId = id;
    const entity = id ? world.population.find((e) => e.id === id) : null;
    if (entity) {
      const s = summarizeEntity(entity);
      $("entityDetail").innerHTML = `<b>${s.species}</b> · ${s.stage} · نسل ${s.gen}<br>سن ${s.age} · انرژی ${s.energy} · سلامت ${s.health} · تاب‌آوری ${s.resilience}٪ · تجربه ${s.experience} · فرزندان ${s.childCount}`;
    } else {
      $("entityDetail").textContent = "برای مشاهده جزئیات، روی یکی از موجودات یا گره‌های درخت حیات کلیک کن.";
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });
  window.addEventListener("pagehide", () => persist());
}

async function init() {
  try {
    const response = await fetch("./public/models/sun-ppo.json", { cache: "no-store" });
    if (response.ok) {
      const model = await response.json();
      if (loadSunRLPolicy(model)) console.info("Sun PPO policy loaded");
      else console.warn("Sun PPO model rejected: incompatible format");
    }
  } catch (error) { console.info("No trained Sun PPO policy available; using built-in learner.", error); }
  const memory = await loadMemory();
  const epoch = memory && memory.stats && Number.isFinite(memory.stats.epochs) ? memory.stats.epochs : 0;
  world = createWorld(BASE_SEED + epoch * 7919, memory);
  saveStatus = memory ? (storageMode === "server" ? "بارگذاری از سرور ✓" : "بارگذاری از مرورگر ✓") : "حافظه‌ی تازه";
  bindControls();
  renderAll();
  scheduleLoop();
  requestAnimationFrame(frame);
}

init();
