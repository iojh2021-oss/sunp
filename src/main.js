// src/main.js — داشبورد و کنترل‌ها: اتصال موتور مدل به رابط کاربری.
import { createWorld, step, getTreeOfLifeState, getCurrentZodiac, summarizeEntity, PATHS_22, PILLARS, POLICY_FA, STAGE_FA, SPECIES } from "./simulation.js";
import { initScene, renderScene, hitTestEntity, speciesLabel } from "./scene.js";

const SEED = 20260101;
let world = createWorld(SEED);
let running = false;
let speed = 1;
let timer = null;

const canvas = document.getElementById("world");
const ctx = initScene(canvas);

const el = (id) => document.getElementById(id);
const toggleBtn = el("toggle");
const stepBtn = el("step");
const resetBtn = el("reset");
const speedInput = el("speed");
const speedVal = el("speedVal");
const statsEl = el("stats");
const populationEl = el("population");
const speciesEl = el("species");
const policyEl = el("policy");
const historyEl = el("history");
const eventsEl = el("events");
const entityDetailEl = el("entityDetail");
const zodiacInfoEl = el("zodiacInfo");
const sunLevelEl = el("sunLevel");
const treeSvg = el("treeOfLife");
const lifeCycleEl = el("lifeCycle");

const TICK_BASE_MS = 900;

function renderStats() {
  statsEl.innerHTML = `
    <div class="stat"><span>روز</span><b>${world.day}</b></div>
    <div class="stat"><span>سلامت اکوسیستم</span><b>${Math.round(world.healthIndex)}</b></div>
    <div class="stat"><span>جمعیت</span><b>${world.population.length}</b></div>
    <div class="stat"><span>نور</span><b>${Math.round(world.env.light)}</b></div>
    <div class="stat"><span>آب</span><b>${Math.round(world.env.water)}</b></div>
    <div class="stat"><span>خاک</span><b>${Math.round(world.env.soil)}</b></div>
  `;
}

function renderPopulation() {
  const counts = {};
  for (const e of world.population) counts[e.stage] = (counts[e.stage] || 0) + 1;
  populationEl.innerHTML = Object.entries(STAGE_FA)
    .map(([k, fa]) => `<div class="pill"><span>${fa}</span><b>${counts[k] || 0}</b></div>`)
    .join("");
}

function renderSpecies() {
  const counts = {};
  for (const e of world.population) counts[e.species] = (counts[e.species] || 0) + 1;
  speciesEl.innerHTML = Object.keys(SPECIES)
    .map((s) => `<div class="pill"><span>${speciesLabel(s)}</span><b>${counts[s] || 0}</b></div>`)
    .join("");
}

function renderPolicy() {
  policyEl.textContent = `${POLICY_FA[world.sun.policy]} · سطح خورشید ${world.sun.level} (چرخه خرد: ${world.sun.wisdomCycles})`;
  sunLevelEl.textContent = world.sun.level;
}

function renderZodiac() {
  const z = getCurrentZodiac(world);
  zodiacInfoEl.textContent = `${z.symbol} نشان فعلی: ${z.name} · روز ${world.day}`;
}

function renderHistory() {
  const recent = world.history.slice(-40);
  const max = 100;
  historyEl.innerHTML = recent
    .map((h) => `<span class="bar" style="height:${Math.max(2, (h.health / max) * 40)}px" title="روز ${h.tick}: سلامت ${Math.round(h.health)}"></span>`)
    .join("");
}

function renderEvents() {
  eventsEl.innerHTML = world.events.map((e) => `<li>${e.text}</li>`).join("");
}

function renderTreeOfLife() {
  const nodes = getTreeOfLifeState(world);
  const byLevel = Object.fromEntries(nodes.map((n) => [n.level, n]));
  const W = 220, H = 320;
  const colX = { balance: W / 2, mercy: W * 0.78, severity: W * 0.22 };
  const rowY = (level) => H - 24 - (level - 1) * ((H - 48) / 9);
  const pos = (n) => ({ x: colX[n.pillar], y: rowY(n.level) });

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="tree-svg">`;
  // مسیرها
  for (const [a, b] of PATHS_22) {
    const pa = pos(byLevel[a]);
    const pb = pos(byLevel[b]);
    const lit = byLevel[a].lit && byLevel[b].lit;
    svg += `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" class="path ${lit ? "lit" : ""}" />`;
  }
  // ستون‌ها (برچسب پایین)
  svg += `<text x="${colX.mercy}" y="${H - 4}" class="pillar-label mercy">${PILLARS.mercy.name}</text>`;
  svg += `<text x="${colX.severity}" y="${H - 4}" class="pillar-label severity">${PILLARS.severity.name}</text>`;
  svg += `<text x="${colX.balance}" y="14" class="pillar-label balance">${PILLARS.balance.name}</text>`;
  // گره‌ها
  for (const n of nodes) {
    const p = pos(n);
    svg += `<g class="node ${n.lit ? "lit" : ""} pillar-${n.pillar}" data-level="${n.level}">
      <circle cx="${p.x}" cy="${p.y}" r="13"></circle>
      <text x="${p.x}" y="${p.y}" dy="0.32em">${n.name}</text>
    </g>`;
  }
  svg += `</svg>`;
  treeSvg.innerHTML = svg;
  treeSvg.querySelectorAll(".node").forEach((g) => {
    g.addEventListener("click", () => {
      const level = Number(g.getAttribute("data-level"));
      const n = nodes.find((x) => x.level === level);
      entityDetailEl.innerHTML = `<b>${n.name} (${n.trait})</b><br>سطح ${n.level} از ۱۰ · ${n.lit ? "روشن (رسیده)" : "هنوز روشن نشده"} · ${PILLARS[n.pillar].name}`;
    });
  });
}

const LIFECYCLE_STAGES = ["نور خورشید", "ذره نور", "بذر", "جوانه", "گیاه", "درخت", "گل و میوه", "موجود زنده", "تولید مثل", "بازگشت به خاک", "چرخه دوباره"];
function renderLifeCycle() {
  const activeIdx = world.tick % LIFECYCLE_STAGES.length;
  lifeCycleEl.innerHTML = LIFECYCLE_STAGES
    .map((s, i) => `<div class="lc-step ${i === activeIdx ? "active" : ""}">${s}</div>`)
    .join(`<div class="lc-arrow">←</div>`);
}

function renderAll() {
  renderScene(canvas, ctx, world);
  renderStats();
  renderPopulation();
  renderSpecies();
  renderPolicy();
  renderZodiac();
  renderHistory();
  renderEvents();
  renderTreeOfLife();
  renderLifeCycle();
}

function doStep() {
  step(world);
  renderAll();
}

function scheduleLoop() {
  clearInterval(timer);
  if (!running) return;
  timer = setInterval(doStep, TICK_BASE_MS / speed);
}

toggleBtn.addEventListener("click", () => {
  running = !running;
  toggleBtn.textContent = running ? "⏸ توقف" : "▶ شروع";
  scheduleLoop();
});

stepBtn.addEventListener("click", () => {
  if (running) {
    running = false;
    toggleBtn.textContent = "▶ شروع";
    scheduleLoop();
  }
  doStep();
});

resetBtn.addEventListener("click", () => {
  running = false;
  toggleBtn.textContent = "▶ شروع";
  scheduleLoop();
  world = createWorld(SEED);
  renderAll();
});

speedInput.addEventListener("input", () => {
  speed = Number(speedInput.value);
  speedVal.textContent = `${speed}×`;
  scheduleLoop();
});

canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const id = hitTestEntity(world, x, y);
  world.selectedId = id;
  if (id) {
    const entity = world.population.find((e) => e.id === id);
    if (entity) {
      const s = summarizeEntity(entity);
      entityDetailEl.innerHTML = `<b>${s.species}</b> · ${s.stage}<br>سن ${s.age} · انرژی ${s.energy} · سلامت ${s.health} · فرزندان ${s.childCount}`;
    }
  } else {
    entityDetailEl.textContent = "برای مشاهده جزئیات، روی یکی از موجودات کلیک کن.";
  }
  renderScene(canvas, ctx, world);
});

renderAll();
